import { Injectable, LoggerService, LogLevel } from '@nestjs/common';

const DEFAULT_LEVELS: LogLevel[] = [
  'fatal',
  'error',
  'warn',
  'log',
  'debug',
  'verbose',
];

function toText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

@Injectable()
export class JsonLogger implements LoggerService {
  private levels: LogLevel[] = DEFAULT_LEVELS;

  private write(
    level: LogLevel,
    message: unknown,
    context?: string,
    stack?: string,
  ) {
    if (!this.levels.includes(level)) {
      return;
    }

    const line: Record<string, unknown> = {
      time: new Date().toISOString(),
      level,
      context,
      message: toText(message),
    };

    if (stack) {
      line.stack = stack;
    }

    const output = JSON.stringify(line);
    if (level === 'error' || level === 'fatal') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  log(message: any, context?: string) {
    this.write('log', message, context);
  }

  error(message: any, stack?: string, context?: string) {
    this.write('error', message, context, stack);
  }

  warn(message: any, context?: string) {
    this.write('warn', message, context);
  }

  debug(message: any, context?: string) {
    this.write('debug', message, context);
  }

  verbose(message: any, context?: string) {
    this.write('verbose', message, context);
  }

  fatal(message: any, stack?: string, context?: string) {
    this.write('fatal', message, context, stack);
  }

  setLogLevels(levels: LogLevel[]) {
    this.levels = levels;
  }
}
