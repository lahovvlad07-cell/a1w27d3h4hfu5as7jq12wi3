/**
 * redis.ts — клиент Upstash Redis (REST, serverless-friendly).
 * Ждёт переменные окружения UPSTASH_REDIS_REST_URL и UPSTASH_REDIS_REST_TOKEN
 * (подставляются автоматически, если подключить Upstash через Vercel
 * Storage, либо задайте вручную из консоли upstash.com).
 */

import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();
