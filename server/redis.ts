import { createClient } from "redis";
import { logger } from "./logger";

// Create a single shared Redis client instance
export const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => {
  // Prevent crashing if Redis goes down, but log it
  logger.error("Redis Client Error", { error: String(err) });
});

redisClient.on("connect", () => {
  logger.info("Redis Client Connected", { source: "REDIS" });
});

redisClient.on("reconnecting", () => {
  logger.info("Redis Client Reconnecting...", { source: "REDIS" });
});

/**
 * Connect to Redis if configured.
 * Call this at application startup.
 */
export async function connectRedis() {
  if (!process.env.REDIS_URL) {
    logger.warn("REDIS_URL not set. Redis features (rate limiting, sessions) will use in-memory fallbacks.", { 
      source: "REDIS" 
    });
    return;
  }

  try {
    await redisClient.connect();
  } catch (error) {
    logger.error("Failed to connect to Redis", { error: String(error) });
    // Decide if we want to crash or continue with in-memory fallbacks.
    // For now, let's continue but features using Redis must handle disconnected state.
  }
}

/**
 * Check if Redis is ready to use.
 */
export function isRedisConnected(): boolean {
  return redisClient.isOpen;
}
