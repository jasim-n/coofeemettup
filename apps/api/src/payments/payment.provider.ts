import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Env } from '../config/env';

export interface CreateCheckoutInput {
  bookingId: string;
  amountPKR: number;
  returnUrl: string;
}

export interface Checkout {
  paymentRef: string;
  checkoutUrl: string;
}

export interface WebhookResult {
  paymentRef: string;
  status: 'PAID' | 'FAILED';
}

/** HMAC over the canonical `paymentRef.status` string (shared by signer + verifier). */
export function paymentSignature(
  secret: string,
  paymentRef: string,
  status: string,
): string {
  return createHmac('sha256', secret)
    .update(`${paymentRef}.${status}`)
    .digest('hex');
}

/**
 * Hosted-checkout + signed-webhook gateway abstraction. A real PK gateway
 * (Safepay / Paymob / Easypaisa / JazzCash / Raast) implements this:
 *  - createCheckout → create a session, return the hosted-payment URL
 *  - the gateway later POSTs a signed webhook → verifyWebhook confirms it
 * Swap the provider binding in PaymentsModule; nothing else changes.
 */
export abstract class PaymentProvider {
  abstract createCheckout(input: CreateCheckoutInput): Promise<Checkout>;
  abstract verifyWebhook(
    signature: string | undefined,
    paymentRef: string,
    status: string,
  ): WebhookResult;
  /** Reverse a captured payment. Real gateways call their refund API here. */
  abstract refund(paymentRef: string, amountPKR: number): Promise<void>;
}

@Injectable()
export class MockPaymentProvider extends PaymentProvider {
  constructor(private readonly config: ConfigService<Env, true>) {
    super();
  }

  createCheckout(input: CreateCheckoutInput): Promise<Checkout> {
    const paymentRef = `mock_${input.bookingId}_${Date.now().toString(36)}`;
    const url = new URL(
      `${this.config.get('API_ORIGIN', { infer: true })}/api/payments/mock/pay`,
    );
    url.searchParams.set('ref', paymentRef);
    url.searchParams.set('amount', String(input.amountPKR));
    url.searchParams.set('redirect', input.returnUrl);
    return Promise.resolve({ paymentRef, checkoutUrl: url.toString() });
  }

  verifyWebhook(
    signature: string | undefined,
    paymentRef: string,
    status: string,
  ): WebhookResult {
    if (!signature) throw new Error('Missing signature');
    const expected = paymentSignature(
      this.config.get('PAYMENTS_WEBHOOK_SECRET', { infer: true }),
      paymentRef,
      status,
    );
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error('Invalid signature');
    }
    if (status !== 'PAID' && status !== 'FAILED') throw new Error('Bad status');
    return { paymentRef, status };
  }

  // Mock gateway: refunds settle instantly, nothing to call.
  refund(): Promise<void> {
    return Promise.resolve();
  }
}
