import { Injectable, OnModuleInit } from '@nestjs/common';

import { MercadoPagoConfig, Preference } from 'mercadopago';
import { envs } from 'src/config/envs';
import { PaymentSessionDto } from './dto/session-payment.dto';
import { Request, Response } from 'express';

@Injectable()
export class PaymentsService implements OnModuleInit {
  private clientMp: MercadoPagoConfig;
  private preference: Preference;

  onModuleInit() {
    this.clientMp = new MercadoPagoConfig({
      accessToken: envs.mercadopagoAccessToken,
      options: { timeout: 5000 },
    });

    this.preference = new Preference(this.clientMp);
  }

  //CREA UNA PREFERENCIA DE MERCADOPAGO Y PAGAR CON CHECKOUT
  async createPaymentSession(paymentSessionDto: PaymentSessionDto) {
    const { orderId, currency, items } = paymentSessionDto;

    const preferenceItems = items.map((item) => {
      return {
        id: item.productId.toString(),
        title: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        currency_id: currency.toUpperCase(), // 'ARS' o 'USD' ( en este caso se usa ARS )
      };
    });

    const preference = await this.preference.create({
      body: {
        items: preferenceItems,
        external_reference: orderId,
        metadata: {
          order_id: orderId,
        },

        binary_mode: true,
        notification_url: 'https://hkdk.events/ifaeytvmlfil04',
      },
    });

    return {
      id: preference.id,
      url: preference.init_point,
    };
  }

  findAll() {
    return `This action returns all payments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} payment`;
  }

  async mpWebhook(req: Request, res: Response) {
    console.log('Webhook MP recibido puto:', req.body);

    const sig = req.headers['x-signature'] as string;

    res.status(200).json({ sig });
    return;
  }
}
