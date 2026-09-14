import { env } from "@orch/env/server";
import Redis from "ioredis";

let publisher: Redis | null = null;
let subscriber: Redis | null = null;

function createRedisClient() {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
    retryStrategy(times) {
      return Math.min(times * 200, 5_000);
    },
  });
  client.on("error", (error) => {
    console.warn("[redis] connection error:", error.message);
  });
  return client;
}

export function getRedisPublisher(): Redis {
  if (!publisher) {
    publisher = createRedisClient();
  }
  return publisher;
}

export function getRedisSubscriber(): Redis {
  if (!subscriber) {
    subscriber = createRedisClient();
  }
  return subscriber;
}

export async function closeRedisConnections() {
  const closing = [publisher?.quit(), subscriber?.quit()].filter(Boolean);
  publisher = null;
  subscriber = null;
  await Promise.all(closing);
}
