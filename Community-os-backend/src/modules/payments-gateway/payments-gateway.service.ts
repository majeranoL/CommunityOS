import { Injectable } from '@nestjs/common';

import { PayMongoClient } from './paymongo.client';

@Injectable()
export class PaymentsGatewayService {
  constructor(private readonly paymongo: PayMongoClient) {}

  get enabled(): boolean {
    return this.paymongo.enabled;
  }

  // Provider-agnostic checkout creation. Delegates to the configured gateway
  // adapter (PayMongo) and returns the hosted checkout URL + gateway id.
  async createCheckout(params: {
    amount: number;
    currency?: string;
    description?: string;
    metadata?: Record<string, string>;
    successUrl?: string;
    failureUrl?: string;
  }) {
    return this.paymongo.createCheckout(params);
  }

  // Verifies a webhook request signature using the configured gateway secret.
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    return this.paymongo.verifyWebhookSignature(rawBody, signature);
  }

  // Maps a gateway webhook event to a payment lifecycle status.
  mapWebhookStatus(
    eventType: string,
  ): 'VERIFIED' | 'FAILED' | 'EXPIRED' | null {
    return this.paymongo.mapStatus(eventType);
  }
}
