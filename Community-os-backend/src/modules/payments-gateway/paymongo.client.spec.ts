import { PayMongoClient } from './paymongo.client';

describe('PayMongoClient checkout sessions', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.PAYMONGO_SECRET_KEY = 'sk_test_example';
    delete process.env.PAYMONGO_PAYMENT_METHOD_TYPES;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.PAYMONGO_SECRET_KEY;
    delete process.env.PAYMONGO_PAYMENT_METHOD_TYPES;
  });

  it('creates a PayMongo-compatible hosted checkout payload', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            id: 'cs_test_123',
            attributes: { checkout_url: 'https://checkout.paymongo.com/test' },
          },
        }),
    });
    global.fetch = fetchMock;

    const result = await new PayMongoClient().createCheckout({
      amount: 123.45,
      description: 'Invoice INV-000001',
      successUrl: 'https://community-os-red.vercel.app/app/billing',
      failureUrl: 'https://community-os-red.vercel.app/app/billing',
    });

    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request.data.attributes).toEqual(
      expect.objectContaining({
        line_items: [
          {
            amount: 12345,
            currency: 'PHP',
            description: 'Invoice INV-000001',
            name: 'Invoice INV-000001',
            quantity: 1,
          },
        ],
        success_url: 'https://community-os-red.vercel.app/app/billing',
        cancel_url: 'https://community-os-red.vercel.app/app/billing',
      }),
    );
    expect(request.data.attributes.payment_method_types).toBeUndefined();
    expect(result).toEqual({
      checkoutUrl: 'https://checkout.paymongo.com/test',
      gatewayId: 'cs_test_123',
    });
  });

  it('allows deployments to restrict checkout payment methods', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            id: 'cs_test_456',
            attributes: { checkout_url: 'https://checkout.paymongo.com/test' },
          },
        }),
    });
    global.fetch = fetchMock;
    process.env.PAYMONGO_PAYMENT_METHOD_TYPES = 'gcash, qrph';

    await new PayMongoClient().createCheckout({ amount: 50 });

    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request.data.attributes.payment_method_types).toEqual([
      'gcash',
      'qrph',
    ]);
  });
});
