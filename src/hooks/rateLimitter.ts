import type { FastifyReply, FastifyRequest } from "fastify";
import { redisConnection } from "../jobs";

export const rateLimiter = async (req: FastifyRequest, res: FastifyReply) => {
    const clinicId = req.clinicId;
    if (!clinicId) {
        return res.status(401).send({

            message: "Unauthorised access"

        });
    }
    const capacity = Number(Bun.env.RL_TOKEN_BUCKET_CAPACITY);
    const refill_sec = Number(Bun.env.RL_REFILL_SECOND);
    const refill_rate = 1 / refill_sec;
    const key = `bucket:clinic:${clinicId}`;
    const response = await redisConnection.rateLimiterTokenBucket(key, capacity, refill_rate, Date.now() / 1000);

    if (!response[0]) {
        return res.status(429).send({
            message: "Too many request!! please slow down."
        });
    }
}
