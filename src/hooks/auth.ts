import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db/client";
import * as schema from "../db/schema";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";

declare module 'fastify' {
    interface FastifyRequest {
        clinicId: number
    }
}

export const authPreHandler = async (req: FastifyRequest, res: FastifyReply) => {
    const key = req.headers.authorization?.startsWith('Bearer') && req.headers.authorization?.split(' ')[1];
    if (!key) {
        return res.status(401).send({
            message: "Unauthorised Access"
        })
    }
    const hash = createHash('sha256').update(key).digest('hex');
    const [response] = await db.select().from(schema.apiKeysTable).where(
        and(
            eq(schema.apiKeysTable.hash, hash),
            eq(schema.apiKeysTable.isActive, true)
        )
    )
    if (!response) {
        return res.status(401).send({
            message: "Unauthorised Access"
        })
    }

    req.clinicId = response.clinicId;
}
