import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    this.from = process.env.MAIL_FROM || 'no-reply@communityos.app';

    if (!host) {
      this.logger.warn(
        'SMTP_HOST is not configured. Emails will be logged to the console instead of sent.',
      );
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.transporter) {
      this.logger.log(`[DEV] Email to ${to} — subject: "${subject}"`);
      this.logger.log(`[DEV] ${html}`);
      return;
    }

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject,
      html,
    });
  }

  async sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
    await this.send(
      to,
      'Reset your CommunityOS password',
      `
        <p>Hi ${name},</p>
        <p>We received a request to reset your password.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>This link is valid for 30 minutes. If you did not request this, you can safely ignore this email.</p>
      `,
    );
  }

  async sendRegistrationOtpEmail(
    to: string,
    name: string,
    code: string,
    expiresInMinutes: number,
  ) {
    await this.send(
      to,
      'Your CommunityOS registration code',
      `
        <p>Hi ${name},</p>
        <p>Use the code below to complete your CommunityOS registration:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
        <p>This code is valid for ${expiresInMinutes} minutes. If you did not request this, you can safely ignore this email.</p>
      `,
    );
  }

  async sendAccountCreatedEmail(to: string, name: string, resetUrl: string) {
    await this.send(
      to,
      'Your CommunityOS account is ready',
      `
        <p>Hi ${name},</p>
        <p>An account was created for you in CommunityOS.</p>
        <p>Set your password to start using it:</p>
        <p><a href="${resetUrl}">Set your password</a></p>
        <p>This link is valid for 30 minutes.</p>
      `,
    );
  }

  private wrap(title: string, body: string, communityName?: string) {
    return `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
        <div style="padding: 24px 24px 8px;">
          <h2 style="margin: 0 0 4px; color: #111827; font-size: 20px;">${title}</h2>
          <p style="margin: 0; font-size: 13px; color: #6b7280;">
            ${communityName ? `${communityName} · ` : ''}CommunityOS
          </p>
        </div>
        <div style="padding: 16px 24px 24px;">
          ${body}
        </div>
        <div style="padding: 0 24px 24px; font-size: 12px; color: #9ca3af;">
          You received this email because notification preferences on your account allow it.
          Update your preferences in CommunityOS Settings &gt; Notifications at any time.
        </div>
      </div>
    `;
  }

  private button(label: string, url: string) {
    return `
      <p style="margin: 24px 0 8px;">
        <a href="${url}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
          ${label}
        </a>
      </p>
    `;
  }

  /** Generic notification email used for opt-in module alerts. */
  async sendNotificationEmail(to: string, name: string, data: {
    subject: string;
    title: string;
    message?: string | null;
    link?: string | null;
    communityName?: string | null;
  }) {
    const body = `
      <p>Hi ${name},</p>
      <p style="color: #374151;">${data.message ?? ''}</p>
      ${data.link ? this.button('View details', data.link) : ''}
    `;
    await this.send(
      to,
      data.subject,
      this.wrap(data.title, body, data.communityName ?? undefined),
    );
  }

  /** Specialized "dues issued" email for household charges. */
  async sendDuesIssuedEmail(to: string, name: string, data: {
    periodLabel: string;
    amount: string;
    dueDate: string;
    communityName?: string | null;
    link?: string | null;
  }) {
    const body = `
      <p>Hi ${name},</p>
      <p style="color: #374151;">A new <strong>${data.periodLabel}</strong> has been issued for your household.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #4b5563;">Amount due</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: 700;">${data.amount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #4b5563;">Due date</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: 700;">${data.dueDate}</td>
        </tr>
      </table>
      <p style="color: #6b7280; font-size: 13px;">Please settle before the due date to keep your household in good standing.</p>
      ${data.link ? this.button('Pay now', data.link) : ''}
    `;
    await this.send(
      to,
      `${data.periodLabel} issued for your household`,
      this.wrap(`${data.periodLabel} issued`, body, data.communityName ?? undefined),
    );
  }
}
