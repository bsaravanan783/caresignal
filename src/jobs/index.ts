import { Queue, Worker, } from "bullmq";
import { Redis } from 'ioredis';
import { handleProcessingJob } from "./worker";

const redisConfig = {
    host: Bun.env.REDIS_HOST,
    port: Number(Bun.env.REDIS_PORT)
}
export const redisConnection = new Redis({ ...redisConfig, maxRetriesPerRequest: null });

export const queue = new Queue('pickup', { connection: redisConnection });

export const worker = new Worker('pickup',
    handleProcessingJob
    , { connection: redisConnection });
