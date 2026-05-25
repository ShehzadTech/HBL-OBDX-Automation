/**
 * Lightweight structured logger.
 *
 * Replaces ad-hoc console.log calls so log lines carry timestamp + level
 * and can be grepped / filtered. DEBUG output is suppressed unless the
 * DEBUG env var is set.
 *
 * For richer features (file output, transports, structured search) swap
 * the implementation for winston/pino without touching call sites.
 */

type Level = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function emit(level: Level, message: string, meta?: Record<string, unknown>): void {
  const ts = new Date().toISOString();
  const tail = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  const line = `[${ts}] ${level} ${message}${tail}`;
  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const log = {
  info:  (message: string, meta?: Record<string, unknown>): void => emit('INFO',  message, meta),
  warn:  (message: string, meta?: Record<string, unknown>): void => emit('WARN',  message, meta),
  error: (message: string, meta?: Record<string, unknown>): void => emit('ERROR', message, meta),
  debug: (message: string, meta?: Record<string, unknown>): void => {
    if (process.env.DEBUG) emit('DEBUG', message, meta);
  },
};
