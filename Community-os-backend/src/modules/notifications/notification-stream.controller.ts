import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { AccountStatus, UserStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { NotificationEventsService } from './notification-events.service';

/**
 * Real-time notification stream (Server-Sent Events).
 *
 * EventSource cannot attach Authorization headers, so the stream accepts the
 * JWT access token as a `?token=` query parameter instead.
 */
@ApiTags('Notifications')
@Controller('notifications')
export class NotificationStreamController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly events: NotificationEventsService,
  ) {}

  @Get('stream')
  async stream(
    @Req() req: Request,
    @Res() res: Response,
    @Query('token') token?: string,
  ) {
    const userId = await this.validateStreamToken(token);

    if (!userId) {
      if (res.headersSent) {
        res.end();
        return;
      }
      throw new UnauthorizedException('Invalid or expired token.');
    }

    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    res.write(`event: connected\ndata: {"ok":true}\n\n`);

    const heartbeat = setInterval(() => {
      res.write(`: heartbeat\n\n`);
    }, 25_000);

    const unsubscribe = this.events.onCreated((targetUserId, event) => {
      if (targetUserId === userId) {
        res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
      }
    });

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  }

  private async validateStreamToken(
    token?: string,
  ): Promise<string | null> {
    if (!token) return null;

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        token,
        { secret: process.env.JWT_SECRET },
      );

      const user = await this.prisma.user.findFirst({
        where: {
          id: payload.sub,
          deletedAt: null,
          status: UserStatus.ACTIVE,
          account: {
            deletedAt: null,
            status: AccountStatus.ACTIVE,
          },
        },
        select: { id: true },
      });

      return user?.id ?? null;
    } catch {
      return null;
    }
  }
}