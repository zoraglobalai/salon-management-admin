import * as dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getOptionalEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    return '';
  }

  return value.trim();
}

function requireEnvWhen(condition: boolean, name: string) {
  return condition ? requireEnv(name) : getOptionalEnv(name);
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

export const ENV = {
  PORT: process.env.PORT || '5000',
  NODE_ENV,
  IS_PRODUCTION,
  DB_HOST: requireEnv('DB_HOST'),
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: requireEnv('DB_NAME'),
  DB_USER: requireEnv('DB_USER'),
  DB_PASSWORD: requireEnv('DB_PASSWORD'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  SMTP_HOST: requireEnvWhen(IS_PRODUCTION, 'SMTP_HOST'),
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: getOptionalEnv('SMTP_SECURE') === 'true',
  SMTP_SERVICE: getOptionalEnv('SMTP_SERVICE'),
  SMTP_USER: requireEnvWhen(IS_PRODUCTION, 'SMTP_USER'),
  SMTP_PASS: requireEnvWhen(IS_PRODUCTION, 'SMTP_PASS'),
  SMTP_FROM: requireEnvWhen(IS_PRODUCTION, 'SMTP_FROM') || 'noreply@salongrowth.com',
  SUPER_ADMIN_EMAIL: getOptionalEnv('SUPER_ADMIN_EMAIL'),
  SUPER_ADMIN_PASSWORD: getOptionalEnv('SUPER_ADMIN_PASSWORD'),
  SUPER_ADMIN_NAME: getOptionalEnv('SUPER_ADMIN_NAME') || 'Super Admin',
};

export const env = ENV;
