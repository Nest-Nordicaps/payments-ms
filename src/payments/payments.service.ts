import { Body, Inject, Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { envs } from 'src/config/envs';

@Injectable()
export class PaymentsService {
  private readonly clientMp = new MercadoPagoConfig({
    accessToken: envs.mercadopagoAccessToken,
    options: { timeout: 5000 },
  });

  private readonly preference = new Preference(this.clientMp);

  //ANDA, CREA UNA PREFERENCIA DE MERCADOPAGO Y PAGAR CON CHECKOUT
  create() {
    const createOrder = this.preference.create({
      body: {
        items: [
          {
            id: '1',
            title: 'Mi producto',
            quantity: 1,
            unit_price: 2000,
          },
        ],
      },
    });

    return createOrder;
  }

  findAll() {
    return `This action returns all payments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} payment`;
  }

  update(id: number, updatePaymentDto: UpdatePaymentDto) {
    return `This action updates a #${id} payment`;
  }

  remove(id: number) {
    return `This action removes a #${id} payment`;
  }
}
