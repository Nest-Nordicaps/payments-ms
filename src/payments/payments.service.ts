import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { envs } from 'src/config/envs';
import { PaymentSessionDto } from './dto/session-payment.dto';
import { Request, Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { NATS_SERVICE } from 'src/config';
import * as crypto from 'crypto';

interface MpWebhookV2Body {
  action?: string;
  api_version?: string;
  data?: { id: string };
  date_created?: string;
  id?: string;
  live_mode?: boolean;
  type?: string;
  user_id?: string;
}

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);
  private clientMp: MercadoPagoConfig;
  private preference: Preference;
  private payment: Payment;

  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {}

  onModuleInit() {
    this.clientMp = new MercadoPagoConfig({
      accessToken: envs.mercadopagoAccessToken,
      // options: { timeout: 5000 },
    });

    this.preference = new Preference(this.clientMp);
    this.payment = new Payment(this.clientMp);
  }

  // CREATE PAYMENT SESSION
  async createPaymentSession(paymentSessionDto: PaymentSessionDto) {
    const { orderId, currency, items } = paymentSessionDto;

    const preferenceItems = items.map((item) => ({
      id: item.productId.toString(),
      title: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      currency_id: currency.toUpperCase(),
    }));

    const preference = await this.preference.create({
      body: {
        items: preferenceItems,
        external_reference: orderId,
        metadata: { order_id: orderId },
        binary_mode: true,
        notification_url: envs.mercadopagoWebhookUrl,
      },
    });

    return {
      id: preference.id,
      url: preference.init_point,
    };
  }

  // MP WEBHOOK
  async mpWebhook(req: Request, res: Response) {
    const body = req.body as MpWebhookV2Body;

    if (body.type !== 'payment') {
      this.logger.debug(`Evento ignorado (Tipo: ${body.type})`);
      return res.status(200).json({ received: true });
    }

    let resourceId: string;

    try {
      resourceId = this.verifyWebhookSignature(req);
    } catch (err) {
      this.logger.error(
        `Firma inválida o ataque detectado: ${(err as Error).message}`,
      );
      return res.status(401).json({ error: 'Invalid signature' });
    }

    if (!resourceId) {
      this.logger.error('Webhook de pago recibido sin ID de pago');
      return res.status(400).json({ error: 'Missing payment ID' });
    }

    await this.processPayment(resourceId);

    return res.status(200).json({ received: true });
  }

  // PROCESS PAYMENT
  private async processPayment(paymentId: string) {
    if (!paymentId) {
      this.logger.error('Webhook de pago recibido sin ID de pago');
      return;
    }

    try {
      const paymentInfo = await this.payment.get({ id: paymentId });
      const {
        status,
        external_reference: orderId,
        id,
        transaction_amount: amount,
        currency_id: currency,
      } = paymentInfo;

      // this.logger.log(
      //   `Procesando pago ${id} / orden ${orderId} -> Estado: ${status}`,
      // );

      // Emitir eventos
      if (status === 'approved') {
        this.client.emit('payment.succeeded', {
          orderId,
          paymentId: String(id),
          amount,
          currency,
          status,
        });
      } else if (status === 'rejected' || status === 'cancelled') {
        this.client.emit('payment.failed', {
          orderId,
          paymentId: String(id),
          status,
        });
      }
    } catch (error) {
      this.logger.error(
        `Error al consultar pago en MP: ${JSON.stringify(error, null, 2)}`,
      );
    }
  }

  // VERIFY WEBHOOK SIGNATURE
  private verifyWebhookSignature(req: Request): string {
    if (!req.body?.data?.id) {
      throw new Error('Missing data.id in webhook body');
    }

    const xSignature = req.headers['x-signature'] as string;
    const xRequestId = req.headers['x-request-id'] as string;

    const dataID = req.body.data.id;

    // Separating the x-signature into parts
    const parts = xSignature.split(',');

    // Initializing variables to store ts and hash
    let ts;
    let hash;

    // Iterate over the values to obtain ts and v1
    parts.forEach((part) => {
      // Split each part into key and value
      const [key, value] = part.split('=');
      if (key && value) {
        const trimmedKey = key.trim();
        const trimmedValue = value.trim();
        if (trimmedKey === 'ts') {
          ts = trimmedValue;
        } else if (trimmedKey === 'v1') {
          hash = trimmedValue;
        }
      }
    });

    // Obtain the secret key for the user/application from Mercadopago developers site
    const secret = envs.mercadopagoWebhookSecret;

    // Generate the manifest string
    const manifest = `id:${dataID};request-id:${xRequestId};ts:${ts};`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(manifest);

    const sha = hmac.digest('hex');

    if (sha === hash) {
      // HMAC verification passed
      this.logger.log('Firma válida');
      return dataID;
    } else {
      // HMAC verification failed
      this.logger.error('Firma inválida');
      throw new Error('Invalid signature');
    }
  }
}
