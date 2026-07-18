import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';
import { paymentSignature } from './payment.provider';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { Public } from '../auth/decorators/public.decorator';
import { SkipCsrf } from '../auth/decorators/skip-csrf.decorator';
import type { Env } from '../config/env';

function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ] as string,
  );
}

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Gateway → server webhook. Server-to-server; authenticated by signature, not session. */
  @Public()
  @SkipCsrf() // external webhook; verified via HMAC signature instead of CSRF
  @Post('webhook')
  @HttpCode(200)
  webhook(
    @Headers('x-payment-signature') signature: string,
    @Body() body: PaymentWebhookDto,
  ) {
    return this.payments.handleWebhook(signature, body.paymentRef, body.status);
  }

  // ---------- DEV-ONLY mock hosted checkout ----------
  private assertDev(): void {
    if (this.config.get('NODE_ENV', { infer: true }) === 'production') {
      throw new NotFoundException();
    }
  }

  @Public()
  @SkipCsrf()
  @Get('mock/pay')
  mockPay(
    @Query('ref') ref: string,
    @Query('amount') amount: string,
    @Query('redirect') redirect: string,
    @Res() res: Response,
  ): void {
    this.assertDev();
    const webOrigin = this.config.get('WEB_ORIGIN', { infer: true });
    res.setHeader('Content-Type', 'text/html');
    // Dev mock page: relax CSP so the form may redirect back to the web app.
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'self'; style-src 'self' 'unsafe-inline'; form-action 'self' ${webOrigin}`,
    );
    res.send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mock checkout</title>
<style>body{font-family:system-ui;max-width:24rem;margin:4rem auto;padding:0 1rem;text-align:center}button{padding:.6rem 1rem;border-radius:.5rem;border:0;background:#111;color:#fff;font-size:1rem;cursor:pointer;width:100%}</style></head>
<body><h2>Mock payment gateway</h2><p>Amount: <strong>PKR ${esc(amount)}</strong></p>
<form method="POST" action="/api/payments/mock/complete">
<input type="hidden" name="ref" value="${esc(ref)}"><input type="hidden" name="redirect" value="${esc(redirect)}">
<button type="submit">Pay now (mock)</button></form>
<p style="color:#888;font-size:.8rem">Dev only — no real money moves.</p></body></html>`);
  }

  @Public()
  @SkipCsrf()
  @Post('mock/complete')
  async mockComplete(
    @Body() body: { ref?: string; redirect?: string },
    @Res() res: Response,
  ): Promise<void> {
    this.assertDev();
    const ref = body.ref ?? '';
    const signature = paymentSignature(
      this.config.get('PAYMENTS_WEBHOOK_SECRET', { infer: true }),
      ref,
      'PAID',
    );
    await this.payments.handleWebhook(signature, ref, 'PAID');

    const webOrigin = this.config.get('WEB_ORIGIN', { infer: true });
    const target = body.redirect?.startsWith(webOrigin)
      ? body.redirect
      : webOrigin;
    res.redirect(303, target);
  }
}
