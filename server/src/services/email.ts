import nodemailer from 'nodemailer';
import { config } from '../config.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TRANSACTIONAL EMAIL — INTEGRATION POINT
 * ─────────────────────────────────────────────────────────────────────────────
 * All transactional email flows through `sendEmail`. In development the
 * 'console' driver simply logs the message, so nothing is ever sent by
 * accident and the full order lifecycle stays testable offline.
 *
 * TO CONNECT A REAL PROVIDER (Resend, Postmark, SendGrid, plain SMTP...):
 *
 *   1. npm --workspace server install nodemailer   (or the provider SDK)
 *   2. Implement `smtpDriver` below.
 *   3. Configure via environment variables — never hardcode credentials:
 *        EMAIL_DRIVER=smtp
 *        EMAIL_FROM="LUMÉRA <hello@yourdomain.com>"
 *        SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASSWORD=...
 *
 * Failures are logged and swallowed: a transient email outage must never take
 * down checkout or lose an order that has already been paid for.
 */

export type EmailEvent =
  | 'order_confirmation'
  | 'payment_confirmation'
  | 'order_shipped'
  | 'order_delivered'
  | 'password_reset'
  | 'email_verification';

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  event: EmailEvent;
};

async function consoleDriver(message: EmailMessage): Promise<void> {
  console.log(
    [
      '',
      '┌── ✉  EMAIL (development console driver — nothing was actually sent)',
      `│ event:   ${message.event}`,
      `│ from:    ${config.email.from}`,
      `│ to:      ${message.to}`,
      `│ subject: ${message.subject}`,
      '├──────────────────────────────────────────────────────────────',
      message.text
        .split('\n')
        .map((l) => `│ ${l}`)
        .join('\n'),
      '└──────────────────────────────────────────────────────────────',
      '',
    ].join('\n'),
  );
}

let smtpTransport: nodemailer.Transporter | null = null;

async function smtpDriver(message: EmailMessage): Promise<void> {
  if (!config.email.smtpHost || !config.email.smtpUser || !config.email.smtpPassword) {
    throw new Error('EMAIL_DRIVER=smtp requires SMTP_HOST, SMTP_USER, and SMTP_PASSWORD.');
  }
  smtpTransport ??= nodemailer.createTransport({
    host: config.email.smtpHost,
    port: config.email.smtpPort,
    secure: config.email.smtpPort === 465,
    auth: { user: config.email.smtpUser, pass: config.email.smtpPassword },
  });
  await smtpTransport.sendMail({
    from: config.email.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
  });
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  try {
    if (config.email.driver === 'smtp') {
      await smtpDriver(message);
    } else {
      await consoleDriver(message);
    }
  } catch (err) {
    console.error(`[email] failed to send "${message.event}" to ${message.to}:`, err);
  }
}

/* ── Templates ──────────────────────────────────────────────────────────── */

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);

/**
 * Templates accept either a raw database row (snake_case) or a serialized
 * order (camelCase), so they can be called from anywhere without adapters.
 */
export type OrderLike = Record<string, any>;

type NormalizedOrder = {
  orderNumber: string;
  email: string;
  firstName: string;
  totalCents: number;
  currency: string;
  trackingNumber?: string | null;
  shippingCarrier?: string | null;
};

function normalize(order: OrderLike): NormalizedOrder {
  const fullName = String(order.full_name ?? order.fullName ?? 'there');
  return {
    orderNumber: String(order.order_number ?? order.orderNumber ?? ''),
    email: String(order.email ?? ''),
    firstName: fullName.trim().split(/\s+/)[0] || 'there',
    totalCents: Number(order.total_cents ?? order.totalCents ?? 0),
    currency: String(order.currency ?? 'USD'),
    trackingNumber: order.tracking_number ?? order.trackingNumber ?? null,
    shippingCarrier: order.shipping_carrier ?? order.shippingCarrier ?? null,
  };
}

export function orderConfirmationEmail(
  raw: OrderLike,
  items: { product_name?: string; name?: string; quantity: number }[],
): EmailMessage {
  const order = normalize(raw);
  return {
    to: order.email,
    event: 'order_confirmation',
    subject: `Your LUMÉRA order ${order.orderNumber}`,
    text: [
      `Hi ${order.firstName},`,
      '',
      'Thank you for your order. We have received it and will be in touch as soon as it ships.',
      '',
      `Order number: ${order.orderNumber}`,
      ...items.map((i) => `  • ${i.quantity} × ${i.product_name ?? i.name}`),
      `Total: ${money(order.totalCents, order.currency)}`,
      '',
      'LUMÉRA — Simple skincare. Beautifully made.',
    ].join('\n'),
  };
}

export function paymentConfirmationEmail(raw: OrderLike): EmailMessage {
  const order = normalize(raw);
  return {
    to: order.email,
    event: 'payment_confirmation',
    subject: `Payment received for ${order.orderNumber}`,
    text: [
      `Hi ${order.firstName},`,
      '',
      `We have received your payment of ${money(order.totalCents, order.currency)} for order ${order.orderNumber}.`,
      'Your order is now being prepared.',
      '',
      'LUMÉRA — Simple skincare. Beautifully made.',
    ].join('\n'),
  };
}

export function orderShippedEmail(raw: OrderLike): EmailMessage {
  const order = normalize(raw);
  return {
    to: order.email,
    event: 'order_shipped',
    subject: `Your LUMÉRA order ${order.orderNumber} is on its way`,
    text: [
      `Hi ${order.firstName},`,
      '',
      `Good news — order ${order.orderNumber} has shipped.`,
      order.trackingNumber
        ? `Tracking: ${order.trackingNumber}${order.shippingCarrier ? ` (${order.shippingCarrier})` : ''}`
        : 'Tracking details will follow shortly.',
      '',
      'LUMÉRA — Simple skincare. Beautifully made.',
    ].join('\n'),
  };
}

export function orderDeliveredEmail(raw: OrderLike): EmailMessage {
  const order = normalize(raw);
  return {
    to: order.email,
    event: 'order_delivered',
    subject: `Your LUMÉRA order ${order.orderNumber} has been delivered`,
    text: [
      `Hi ${order.firstName},`,
      '',
      `Order ${order.orderNumber} has been marked as delivered. We hope you enjoy it.`,
      'If anything is not right, reply to this email within 30 days and we will help.',
      '',
      'LUMÉRA — Simple skincare. Beautifully made.',
    ].join('\n'),
  };
}

export function emailVerificationEmail(
  email: string,
  firstName: string,
  verificationUrl: string,
): EmailMessage {
  return {
    to: email,
    event: 'email_verification',
    subject: 'Verify your LUMÉRA account',
    text: [
      `Hi ${firstName},`,
      '',
      'Welcome to LUMÉRA! Please verify your email address to activate your account.',
      '',
      `Verification link: ${verificationUrl}`,
      '',
      'This link will expire in 24 hours.',
      '',
      'If you did not create this account, you can safely ignore this email.',
      '',
      'LUMÉRA — Simple skincare. Beautifully made.',
    ].join('\n'),
  };
}

export function emailVerificationResendEmail(
  email: string,
  firstName: string,
  verificationUrl: string,
): EmailMessage {
  return {
    to: email,
    event: 'email_verification',
    subject: 'Verify your LUMÉRA account',
    text: [
      `Hi ${firstName},`,
      '',
      'Here is your new verification link. This link will expire in 24 hours.',
      '',
      `Verification link: ${verificationUrl}`,
      '',
      'If you did not request this email, you can safely ignore it.',
      '',
      'LUMÉRA — Simple skincare. Beautifully made.',
    ].join('\n'),
  };
}
