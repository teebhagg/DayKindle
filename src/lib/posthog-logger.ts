import { posthog } from './posthog';

type LogAttributes = Record<string, boolean | number | string>;

export const plannerSyncLogger = {
  info: (body: string, attributes: LogAttributes) => posthog?.logger.info(body, attributes),
  error: (body: string, attributes: LogAttributes) => posthog?.logger.error(body, attributes),
};
