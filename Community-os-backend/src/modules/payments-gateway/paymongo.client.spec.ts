import { PayMongoClient } from './paymongo.client';

describe('PayMongoClient checkout sessions', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.PAYMONGO_SECRET_KEY = 'sk_test_example';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.PAYMONGO_SECRET_KEY;
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
        payment_method_types: ['gcash', 'paymaya', 'card'],
        success_url: 'https://community-os-red.vercel.app/app/billing',
        cancel_url: 'https://community-os-red.vercel.app/app/billing',
      }),
    );
    expect(result).toEqual({
      checkoutUrl: 'https://checkout.paymongo.com/test',
      gatewayId: 'cs_test_123',
    });
  });
});
