import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;

  MERCADOPAGO_ACCESS_TOKEN: string;
  MERCADOPAGO_PUBLIC_KEY: string;
  MERCADOPAGO_WEBHOOK_SECRET: string;
  MERCADOPAGO_WEBHOOK_URL: string;

  NATS_SERVERS: string[];
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),

    MERCADOPAGO_ACCESS_TOKEN: joi.string().required(),
    MERCADOPAGO_PUBLIC_KEY: joi.string().required(),
    MERCADOPAGO_WEBHOOK_SECRET: joi.string().required(),
    MERCADOPAGO_WEBHOOK_URL: joi.string().required(),

    NATS_SERVERS: joi.array().items(joi.string()).required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS?.split(','),
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envsVars: EnvVars = value;

export const envs = {
  port: envsVars.PORT,

  mercadopagoAccessToken: envsVars.MERCADOPAGO_ACCESS_TOKEN,
  mercadopagoPublicKey: envsVars.MERCADOPAGO_PUBLIC_KEY,
  mercadopagoWebhookSecret: envsVars.MERCADOPAGO_WEBHOOK_SECRET,
  mercadopagoWebhookUrl: envsVars.MERCADOPAGO_WEBHOOK_URL,

  natsServers: envsVars.NATS_SERVERS,
};
