import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = req.header('x-request-id') ?? randomUUID();
  const startedAt = process.hrtime.bigint();

  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const line = JSON.stringify({
      time: new Date().toISOString(),
      level: 'info',
      context: 'HTTP',
      requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
    });

    if (res.statusCode >= 500) {
      console.error(line);
    } else {
      console.log(line);
    }
  });

  next();
}
