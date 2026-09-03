import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';

import { PaymentsGatewayService } from '../payments-gateway/payments-gateway.service';
import { PaymentsService } from '../finance/payments.service';
import { InvoicesService } from '../subscriptions/invoices.service';

interface WebhookEvent {
  data?: {
    id?: string;
  };
  type?: string;
}

@Controller('payments')
export class GatewayWebhookController {
  constructor(
    private readonly gateway: PaymentsGatewayService,
    private readonly paymentsService: PaymentsService,
    private readonly invoicesService: InvoicesService,
  ) {}

  // Intentionally NOT behind JWT/permissions guards. Authenticity is
  // established via the gateway webhook signature on the raw body.
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: any,
    @Headers('paymongo-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      return { success: false, message: 'Missing raw body' };
    }

    const valid = this.gateway.verifyWebhookSignature(rawBody, signature);
    if (!valid) {
      return { success: false, message: 'Invalid webhook signature' };
    }

    let event: WebhookEvent;
    try {
      event = JSON.parse(rawBody.toString('utf8')) as WebhookEvent;
    } catch {
      return { success: false, message: 'Invalid JSON body' };
    }

    const status = this.gateway.mapWebhookStatus(event.type ?? '');
    if (!status) {
      return { received: true, ignored: true };
    }

    const gatewayId = event.data?.id;
    if (!gatewayId) {
      return { success: false, message: 'Missing gateway id' };
    }

    if (status === 'VERIFIED') {
      const paymentResult =
        await this.paymentsService.markGatewaySucceeded(gatewayId);
      if (paymentResult.success) {
        return { received: true, applied: 'payment' };
      }
      const invoiceResult =
        await this.invoicesService.markGatewayPaidByGateway(gatewayId);
      if (invoiceResult.success) {
        return { received: true, applied: 'invoice' };
      }
      return { received: true, reason: paymentResult.reason };
    }

    if (status === 'FAILED') {
      await this.paymentsService.markGatewayFailed(gatewayId);
      return { received: true, applied: 'payment-failed' };
    }

    if (status === 'EXPIRED') {
      await this.paymentsService.markGatewayExpired(gatewayId);
      return { received: true, applied: 'payment-expired' };
    }

    return { received: true, ignored: true };
  }
}
