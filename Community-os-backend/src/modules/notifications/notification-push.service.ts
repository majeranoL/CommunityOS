import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';

export interface PushRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushSendResult {
  ok: boolean;
  /** True when the subscription is no longer valid and should be removed. */
  expired?: boolean;
}

/**
 * Thin wrapper around `web-push` that is safe to run in development.
 *
 * When VAPID keys are missing the service logs pushes to the console
 * instead of sending them, mirroring the MailService dev fallback.
 */
@Injectable()
export class NotificationPushService {
  private readonly logger = new Logger(NotificationPushService.name);
  private readonly vapidConfigured: boolean;

  constructor() {
    const subject = process.env.VAPID_SUBJECT;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    this.vapidConfigured = Boolean(subject && publicKey && privateKey);

    if (this.vapidConfigured) {
      webpush.setVapidDetails(subject!, publicKey!, privateKey!);
    } else {
      this.logger.warn(
        'VAPID keys are not configured. Web push notifications will be logged instead of sent.',
      );
    }
  }

  get isConfigured(): boolean {
    return this.vapidConfigured;
  }

  get publicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  async send(
    subscription: PushRecord,
    payload: string,
  ): Promise<PushSendResult> {
    if (!this.vapidConfigured) {
      this.logger.log(`[DEV] Push: ${payload}`);
      return { ok: true };
    }

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        payload,
        { TTL: 60 * 60 * 24 * 7 },
      );
      return { ok: true };
    } catch (error) {
      const statusCode = (error as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        this.logger.log(
          `Push subscription for ${subscription.endpoint} is no longer valid (${statusCode}).`,
        );
        return { ok: false, expired: true };
      }

      this.logger.warn(
        `Push delivery failed: ${(error as Error)?.message ?? error}`,
      );
      return { ok: false };
    }
  }
}
