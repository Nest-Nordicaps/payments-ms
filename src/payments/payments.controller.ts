import { Controller, Post, Req, Res } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentSessionDto } from './dto/session-payment.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type { Request, Response } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @MessagePattern({ cmd: 'create_payment_session' })
  async createPaymentSession(@Payload() paymentSessionDto: PaymentSessionDto) {
    return await this.paymentsService.createPaymentSession(paymentSessionDto);
  }

  @Post('webhook')
  async mpWebhook(@Req() req: Request, @Res() res: Response) {
    return this.paymentsService.mpWebhook(req, res);
  }
}
