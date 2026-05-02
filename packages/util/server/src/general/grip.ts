import { WebSocketMessageFormat } from "@fanoutio/grip";
import { ServeGrip } from "@fanoutio/serve-grip/node";
import { config } from "./config";
import * as Sentry from "@sentry/node";
import { metrics } from "./metrics";

export const serveGrip = new ServeGrip({
  grip: [
    {
      control_uri: config.grip.url,
      key: config.grip.key,
    },
  ],
});

export enum WSBroadcastEventType {
  MealPlanUpdated = "mealplan:updated",
  ShoppingListUpdated = "shoppinglist:updated",
  JobUpdated = "job:updated",
}

export type WSBroadcastEventData = {
  [WSBroadcastEventType.MealPlanUpdated]: {
    reference: string;
    mealPlanId: string;
  };
  [WSBroadcastEventType.ShoppingListUpdated]: {
    reference: string;
    shoppingListId: string;
  };
  [WSBroadcastEventType.JobUpdated]: {
    jobId: string;
  };
};

export const broadcastWSEvent = async function <T extends WSBroadcastEventType>(
  channel: string,
  type: T,
  data: WSBroadcastEventData[T],
) {
  if (process.env.NODE_ENV === "test") return;

  const body = {
    type: type,
    data: data || {},
  };

  const publisher = serveGrip.getPublisher();
  await publisher.publishFormats(
    channel,
    new WebSocketMessageFormat(JSON.stringify(body)),
  );

  metrics.websocketMessageOutgoing.inc({
    message_type: type,
  });
};

export const broadcastWSEventIgnoringErrors = async function <
  T extends WSBroadcastEventType,
>(channel: string, type: T, data: WSBroadcastEventData[T]) {
  try {
    await broadcastWSEvent(channel, type, data);
  } catch (e) {
    Sentry.captureException(e);
  }
};
