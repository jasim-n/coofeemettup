import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MockPaymentProvider, PaymentProvider } from './payment.provider';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    // Swap MockPaymentProvider for a real PK gateway provider in Phase 2.
    { provide: PaymentProvider, useClass: MockPaymentProvider },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
