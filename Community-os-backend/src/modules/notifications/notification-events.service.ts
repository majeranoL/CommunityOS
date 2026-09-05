import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export interface NotificationStreamEvent {
  type: string;
  data: unknown;
}

/**
 * In-process event bus for real-time notification delivery (SSE).
 *
 * Emitted events carry the target `userId` so connected SSE clients can
 * filter which notifications belong to them.
 */
@Injectable()
export class NotificationEventsService {
  private readonly emitter = new EventEmitter();

  emitCreated(userId: string, event: NotificationStreamEvent) {
    this.emitter.emit('notification.created', userId, event);
  }

  onCreated(
    listener: (userId: string, event: NotificationStreamEvent) => void,
  ): () => void {
    const wrapper = (userId: string, event: NotificationStreamEvent) =>
      listener(userId, event);
    this.emitter.on('notification.created', wrapper);
    return () => {
      this.emitter.off('notification.created', wrapper);
    };
  }
}