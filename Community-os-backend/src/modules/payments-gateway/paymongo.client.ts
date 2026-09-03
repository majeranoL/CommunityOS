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
  ): Promise<PayMongoCheckoutResult> {
    const { amount, currency, description, metadata, successUrl, failureUrl } =
      params;

    const attributes: Record<string, unknown> = {
      amount: Math.round(amount * 100),
      currency: currency ?? 'PHP',
      description: description ?? 'CommunityOS payment',
      send_email_receipt: true,
      payment_method_types: ['gcash', 'maya', 'card'],
      metadata,
    };

    if (successUrl) attributes.success_url = successUrl;
    if (failureUrl) attributes.failure_url = failureUrl;

    const payload = {
      data: {
        attributes,
      },
    };

    const response = await fetch(`${this.baseUrl}/checkout_sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.secretKey}:`).toString(
          'base64',
        )}`,
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

  async retrieveCheckout(gatewayId: string): Promise<Record<string, unknown>> {
    const response = await fetch(
      `${this.baseUrl}/checkout_sessions/${gatewayId}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.secretKey}:`).toString(
            'base64',
          )}`,
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

  // Verifies the PayMongo webhook signature. Returns true when the signature
  // matches an HMAC-SHA256 of the raw request body computed with the webhook
  // secret, or when PayMongo webhooks are not configured (dev fallback).
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const secret = this.webhookSecret;
    if (!secret) {
      return true;
    }
    if (!signature) {
      return false;
    }
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const provided = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);
    if (provided.length !== expectedBuf.length) {
      return false;
    }
    return timingSafeEqual(provided, expectedBuf);
  }

  mapStatus(eventType: string): 'VERIFIED' | 'FAILED' | 'EXPIRED' | null {
    switch (eventType) {
      case 'checkout_session.payment_paid':
      case 'payment.payment_intent.succeeded':
        return 'VERIFIED';
      case 'payment.payment_intent.payment_failed':
        return 'FAILED';
      case 'payment.payment_intent.expired':
      case 'checkout_session.expires_at':
        return 'EXPIRED';
      default:
        return null;
    }
  }
}
