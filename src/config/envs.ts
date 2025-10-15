import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;

  MERCADOPAGO_ACCESS_TOKEN: string;

  MERCADOPAGO_PUBLIC_KEY: string;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),

    MERCADOPAGO_ACCESS_TOKEN: joi.string().required(),

    MERCADOPAGO_PUBLIC_KEY: joi.string().required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envsVars: EnvVars = value;

export const envs = {
  port: envsVars.PORT,

  mercadopagoAccessToken: envsVars.MERCADOPAGO_ACCESS_TOKEN,
  mercadopagoPublicKey: envsVars.MERCADOPAGO_PUBLIC_KEY,
};
