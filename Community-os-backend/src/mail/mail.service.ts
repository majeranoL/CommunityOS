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
}
