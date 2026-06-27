import Redis from "ioredis";

let redisClient: Redis | null = null;
let isConnected = false;

const redisUrl = process.env.REDIS_URL;

if (redisUrl) {
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy(times) {
        // Retry connection up to 3 times, then stop to avoid blocking server boot
        if (times > 3) return null;
        return Math.min(times * 100, 2000);
      },
    });

    redisClient.on("connect", () => {
      isConnected = true;
      console.log("> Redis connected successfully.");
    });

    redisClient.on("error", (err) => {
      isConnected = false;
      console.warn("> Redis connection failed:", err.message);
    });
  } catch (err: any) {
    console.error("> Failed to initialize Redis client:", err.message);
  }
}

export const redisService = {
  getBrokerStatus: () => {
    if (!redisUrl) {
      return {
        enabled: false,
        connected: false,
        host: "Bypassed",
        port: 0,
        mode: "SQLite Memory Fallback",
      };
    }

    try {
      const parsedUrl = new URL(redisUrl);
      return {
        enabled: true,
        connected: isConnected,
        host: parsedUrl.hostname,
        port: Number(parsedUrl.port) || 6379,
        mode: isConnected ? "Redis Distributed Broker" : "SQLite Memory Fallback",
      };
    } catch {
      return {
        enabled: true,
        connected: isConnected,
        host: "redis-host",
        port: 6379,
        mode: isConnected ? "Redis Distributed Broker" : "SQLite Memory Fallback",
      };
    }
  },

  getClient: () => redisClient,
};
export default redisService;
