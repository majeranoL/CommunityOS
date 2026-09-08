import { createHmac, timingSafeEqual } from 'crypto';

import { Injectable } from '@nestjs/common';

export interface PayMongoCheckoutResult {
  checkoutUrl: string;
  gatewayId: string;
}

export interface CreateCheckoutParams {
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
  successUrl?: string;
  failureUrl?: string;
}

@Injectable()
export class PayMongoClient {
  private readonly baseUrl = 'https://api.paymongo.com/v1';

  private get secretKey(): string {
    const key = process.env.PAYMONGO_SECRET_KEY;
    if (!key) {
      throw new Error('PAYMONGO_SECRET_KEY is not configured');
    }
    return key;
  }

  private get webhookSecret(): string | undefined {
    return process.env.PAYMONGO_WEBHOOK_SECRET;
  }

  private get isConfigured(): boolean {
    return Boolean(process.env.PAYMONGO_SECRET_KEY);
  }

  get enabled(): boolean {
    return this.isConfigured;
  }

  async createCheckout(
    params: CreateCheckoutParams,
    secretKey?: string,
  ): Promise<PayMongoCheckoutResult> {
    const { amount, currency, description, metadata, successUrl, failureUrl } =
      params;

    const configuredPaymentMethods = process.env.PAYMONGO_PAYMENT_METHOD_TYPES
      ?.split(',')
      .map((method) => method.trim())
      .filter(Boolean);

    const attributes: Record<string, unknown> = {
      line_items: [
        {
          currency: currency ?? 'PHP',
          amount: Math.round(amount * 100),
          description: description ?? 'CommunityOS payment',
          name: description ?? 'CommunityOS payment',
          quantity: 1,
        },
      ],
      send_email_receipt: true,
      metadata,
    };

    if (configuredPaymentMethods?.length) {
      attributes.payment_method_types = configuredPaymentMethods;
    }

    if (successUrl) attributes.success_url = successUrl;
    if (failureUrl) attributes.cancel_url = failureUrl;

    const payload = {
      data: {
        attributes,
      },
    };

    const response = await fetch(`${this.baseUrl}/checkout_sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${secretKey ?? this.secretKey}:`,
        ).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(
        `PayMongo checkout failed (${response.status}): ${
          body?.errors?.[0]?.detail ?? response.statusText
        }`,
      );
    }

    const checkoutUrl = body?.data?.attributes?.checkout_url as string;
    const gatewayId = body?.data?.id as string;

    if (!checkoutUrl || !gatewayId) {
      throw new Error('PayMongo checkout returned no checkout_url or id');
    }

    return { checkoutUrl, gatewayId };
  }

  async retrieveCheckout(
    gatewayId: string,
    secretKey?: string,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(
      `${this.baseUrl}/checkout_sessions/${gatewayId}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${secretKey ?? this.secretKey}:`,
          ).toString('base64')}`,
        },
      },
    );

    const body = await response.json();
    if (!response.ok) {
      throw new Error(
        `PayMongo retrieve failed (${response.status}): ${
          body?.errors?.[0]?.detail ?? response.statusText
        }`,
      );
    }

    return body;
  }

  // Verifies PayMongo's timestamped webhook signature. The header contains
  // test/live signatures in the form t=...,te=...,li=....
  verifyWebhookSignature(
    rawBody: Buffer,
    signature: string,
    webhookSecret?: string,
  ): boolean {
    const secret = webhookSecret ?? this.webhookSecret;
    if (!secret) {
      return true;
    }
    if (!signature) {
      return false;
    }

    const parts = Object.fromEntries(
      signature.split(',').map((part) => {
        const [key, ...value] = part.trim().split('=');
        return [key, value.join('=')];
      }),
    );
    const timestamp = parts.t;
    const timestampedSignatures = [parts.te, parts.li].filter(
      (value): value is string => Boolean(value),
    );

    if (timestamp && timestampedSignatures.length > 0) {
      const expected = createHmac('sha256', secret)
        .update(`${timestamp}.${rawBody.toString('utf8')}`)
        .digest('hex');

      return timestampedSignatures.some((providedSignature) => {
        const provided = Buffer.from(providedSignature);
        const expectedBuffer = Buffer.from(expected);
        return (
          provided.length === expectedBuffer.length &&
          timingSafeEqual(provided, expectedBuffer)
        );
      });
    }

    // Keep compatibility with the original raw HMAC format for existing
    // integrations while they migrate to PayMongo's structured header.
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const provided = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    return (
      provided.length === expectedBuffer.length &&
      timingSafeEqual(provided, expectedBuffer)
    );
  }

  mapStatus(eventType: string): 'VERIFIED' | 'FAILED' | 'EXPIRED' | null {
    switch (eventType) {
      case 'checkout.session.paid':
      case 'checkout.session.payment.paid':
      case 'checkout_session.payment.paid':
      case 'checkout_session.payment_paid':
      case 'payment.payment_intent.succeeded':
        return 'VERIFIED';
      case 'checkout.session.payment_failed':
      case 'checkout_session.payment.failed':
      case 'payment.payment_intent.payment_failed':
        return 'FAILED';
      case 'checkout.session.expired':
      case 'checkout_session.expired':
      case 'checkout_session.expires_at':
      case 'payment.payment_intent.expired':
        return 'EXPIRED';
      default:
        return null;
    }
  }
}
