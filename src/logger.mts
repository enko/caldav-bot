import pino from 'pino';
import type { DestinationStream } from 'pino';

const level = process.env.LOG_LEVEL ?? 'info';

/**
 * pino-pretty is a devDependency, so it is only reached on a TTY, and a
 * production image (`npm ci --omit=dev`) that is nevertheless given one -
 * `docker run -t` - falls back to NDJSON rather than failing to start.
 */
async function prettyDestination(): Promise<DestinationStream | undefined> {
  if (!process.stdout.isTTY) {
    return undefined;
  }

  try {
    const { default: pretty } = await import('pino-pretty');

    return pretty({ colorize: true, sync: true });
  } catch {
    return undefined;
  }
}

// Both branches are synchronous: no worker thread, so no flush-on-exit race.
const destination: DestinationStream =
  (await prettyDestination()) ?? pino.destination({ dest: 1, sync: true });

const rootLogger = pino({ level }, destination);

export function createLogger(name: string) {
  return rootLogger.child({ module: name });
}
