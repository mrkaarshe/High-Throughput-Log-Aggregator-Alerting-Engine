import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://redis-server:6379";

const redis = new Redis(redisUrl);

redis.on("connect", () => {
  console.log(`redis connected: ${redisUrl}`);
});

redis.on("error", (err) => {
  console.error("Redis Connection Error", err);
});

export default redis;