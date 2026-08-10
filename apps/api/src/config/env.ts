import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(8),
  WEB_ORIGIN: z.string().min(1),
  PAYMENTS_WEBHOOK_SECRET: z.string().min(8).default('dev-webhook-secret'),
  API_ORIGIN: z.string().min(1).default('http://localhost:4000'),
  // Pilot convenience: when 'true', request-otp returns the code in the response
  // even in production (no email provider yet). Unset once real SMTP is wired.
  EXPOSE_DEV_OTP: z.string().optional(),
  // Default OTP sender when the DB setting is unset. Falls back to whichever
  // provider is actually configured. Admins can override at runtime.
  MAIL_PROVIDER: z.enum(['brevo', 'gmail']).optional(),
  // Legacy SMTP config (all optional). Used as the Gmail provider fallback when
  // GMAIL_* is not set. When no provider is configured, OTP is only logged in dev.
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().optional(),
  MAIL_USER: z.string().optional(),
  MAIL_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  // Brevo (Sendinblue) SMTP — primary transactional provider.
  BREVO_HOST: z.string().optional(),
  BREVO_PORT: z.coerce.number().optional(),
  BREVO_USER: z.string().optional(),
  BREVO_PASS: z.string().optional(),
  BREVO_FROM: z.string().optional(),
  // Gmail SMTP — fallback provider (falls back to MAIL_* if these are unset).
  GMAIL_HOST: z.string().optional(),
  GMAIL_PORT: z.coerce.number().optional(),
  GMAIL_USER: z.string().optional(),
  GMAIL_PASS: z.string().optional(),
  GMAIL_FROM: z.string().optional(),
  // Cloudinary config (all optional; when absent, photo uploads are disabled)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
    );
  }
  return parsed.data;
}
