import { Controller, Get, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentSessionDto } from './dto/session-payment.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { envs } from 'src/config';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @MessagePattern({ cmd: 'create_payment_session' })
  async createPaymentSession(@Payload() paymentSessionDto: PaymentSessionDto) {
    return await this.paymentsService.createPaymentSession(paymentSessionDto);
  }
}
