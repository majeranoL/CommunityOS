import { createHmac } from 'crypto';

import { Test, TestingModule } from '@nestjs/testing';

import { PayMongoClient } from './paymongo.client';
import { PaymentsGatewayService } from './payments-gateway.service';

describe('PayMongoClient webhook signature', () => {
  let client: PayMongoClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PayMongoClient],
    }).compile();
    client = module.get<PayMongoClient>(PayMongoClient);
  });

  afterEach(() => {
    delete process.env.PAYMONGO_WEBHOOK_SECRET;
  });

  it('accepts a valid HMAC signature for the raw body', () => {
    process.env.PAYMONGO_WEBHOOK_SECRET = 'test-secret';
    const rawBody = Buffer.from('{"event":"x"}');
    const sig = createHmac('sha256', 'test-secret')
      .update(rawBody)
      .digest('hex');

    expect(client.verifyWebhookSignature(rawBody, sig)).toBe(true);
  });

  it('rejects an invalid signature', () => {
    process.env.PAYMONGO_WEBHOOK_SECRET = 'test-secret';
    const rawBody = Buffer.from('{"event":"x"}');

    expect(client.verifyWebhookSignature(rawBody, 'bad')).toBe(false);
    expect(client.verifyWebhookSignature(rawBody, '')).toBe(false);
  });

  it('accepts any body when no webhook secret is configured (dev fallback)', () => {
    const rawBody = Buffer.from('{"event":"x"}');
    expect(client.verifyWebhookSignature(rawBody, 'anything')).toBe(true);
  });
});

describe('PaymentsGatewayService', () => {
  let service: PaymentsGatewayService;
  let paymongo: { enabled: boolean; mapStatus: jest.Mock };

  beforeEach(async () => {
    paymongo = {
      enabled: true,
      mapStatus: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsGatewayService,
        { provide: PayMongoClient, useValue: paymongo },
      ],
    }).compile();
    service = module.get<PaymentsGatewayService>(PaymentsGatewayService);
  });

  describe('mapWebhookStatus', () => {
    it('maps success events to VERIFIED', () => {
      paymongo.mapStatus.mockReturnValue('VERIFIED');
      expect(service.mapWebhookStatus('checkout_session.payment_paid')).toBe(
        'VERIFIED',
      );
    });

    it('maps failed events to FAILED', () => {
      paymongo.mapStatus.mockReturnValue('FAILED');
      expect(
        service.mapWebhookStatus('payment.payment_intent.payment_failed'),
      ).toBe('FAILED');
    });

    it('maps expired events to EXPIRED', () => {
      paymongo.mapStatus.mockReturnValue('EXPIRED');
      expect(service.mapWebhookStatus('payment.payment_intent.expired')).toBe(
        'EXPIRED',
      );
    });

    it('returns null for unrelated events', () => {
      paymongo.mapStatus.mockReturnValue(null);
      expect(service.mapWebhookStatus('source.chargeable')).toBeNull();
    });
  });
});
