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
  // SMTP config (all optional; when absent, OTP is only logged in dev)
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().optional(),
  MAIL_USER: z.string().optional(),
  MAIL_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
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
