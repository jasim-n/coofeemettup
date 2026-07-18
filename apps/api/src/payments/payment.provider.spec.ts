import type { ConfigService } from '@nestjs/config';
import { MockPaymentProvider, paymentSignature } from './payment.provider';
import type { Env } from '../config/env';

const SECRET = 'test-secret-123';

function makeProvider(): MockPaymentProvider {
  const config = {
    get: (key: string): string | undefined => {
      if (key === 'PAYMENTS_WEBHOOK_SECRET') return SECRET;
      if (key === 'API_ORIGIN') return 'http://localhost:4000';
      return undefined;
    },
  } as unknown as ConfigService<Env, true>;
  return new MockPaymentProvider(config);
}

describe('paymentSignature', () => {
  it('is deterministic and varies with secret / ref / status', () => {
    const base = paymentSignature(SECRET, 'ref1', 'PAID');
    expect(base).toBe(paymentSignature(SECRET, 'ref1', 'PAID'));
    expect(base).not.toBe(paymentSignature(SECRET, 'ref1', 'FAILED'));
    expect(base).not.toBe(paymentSignature(SECRET, 'ref2', 'PAID'));
    expect(base).not.toBe(paymentSignature('other-secret', 'ref1', 'PAID'));
  });
});

describe('MockPaymentProvider.verifyWebhook', () => {
  const p = makeProvider();

  it('accepts a valid signature', () => {
    const sig = paymentSignature(SECRET, 'ref1', 'PAID');
    expect(p.verifyWebhook(sig, 'ref1', 'PAID')).toEqual({
      paymentRef: 'ref1',
      status: 'PAID',
    });
  });

  it('rejects a tampered payload', () => {
    const sig = paymentSignature(SECRET, 'ref1', 'PAID');
    expect(() => p.verifyWebhook(sig, 'ref1', 'FAILED')).toThrow();
    expect(() => p.verifyWebhook(sig, 'ref2', 'PAID')).toThrow();
  });

  it('rejects a missing signature', () => {
    expect(() => p.verifyWebhook(undefined, 'ref1', 'PAID')).toThrow();
  });

  it('rejects an unknown status even with a valid signature', () => {
    const sig = paymentSignature(SECRET, 'ref1', 'REFUNDED');
    expect(() => p.verifyWebhook(sig, 'ref1', 'REFUNDED')).toThrow();
  });
});

describe('MockPaymentProvider.createCheckout', () => {
  it('returns a checkout URL and a ref tied to the booking', async () => {
    const checkout = await makeProvider().createCheckout({
      bookingId: 'bk1',
      amountPKR: 900,
      returnUrl: 'http://localhost:3000/events/e1',
    });
    expect(checkout.paymentRef).toContain('bk1');
    expect(checkout.checkoutUrl).toContain('/api/payments/mock/pay');
    expect(checkout.checkoutUrl).toContain('ref=');
  });
});
