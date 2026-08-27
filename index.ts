import fastify from "fastify"
import { db } from "./src/db/client.ts"
import * as schema from './src/db/schema';
import promClient from "prom-client";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "@fastify/type-provider-zod";
import { notificationRequestSchema } from "./src/zod_schemas/index.ts";
import { and, eq } from "drizzle-orm";
import "./src/jobs/jobs.ts";
import "./src/utils/defineLua.ts"
import { rateLimiter } from "./src/hooks/rateLimitter.ts";
import { authPreHandler } from "./src/hooks/auth.ts";
import { withTenant } from "./src/db/withTenantHelper.ts";
import { AuditLog } from "./src/utils/insertAuditLog.ts";
import { decryptHelper, encryptHelper } from "./src/utils/fieldEncrypt.ts";
import { generateHash } from "./src/utils/hashHelper.ts";
const app = fastify({
    logger: true
}).withTypeProvider<ZodTypeProvider>();

app.decorateRequest('clinicId', 0);
app.decorateRequest('apiKeyId', 0);

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

promClient.collectDefaultMetrics();

app.get('/healthz', (req, res) => {

    res.status(200).send("Hi there !");
})

app.get('/metrics', async (req, res) => {
    try {
        const metrics = await promClient.register.metrics();

        res.status(200).header('content-type', promClient.register.contentType).send(metrics);
    } catch (err) {
        console.log("Metrics endpoint failed: ", err);
    }


})

app.post("/v1/notification-requests",
    {
        preHandler: [authPreHandler, rateLimiter],
        schema: {
            body: notificationRequestSchema,
        }
    }
    ,
    async (req, res) => {
        try {
            const clinicId = req.clinicId;
            if (!clinicId) {
                return res.status(401).send({ message: "Unauthorised access " });
            }

            const result = await withTenant(clinicId, async (tx) => {
                const { email, isDefaultOffset, name, phoneNumber, targetDate, offset } = req.body;
                const idempotencyKey = req.headers["idempotency-key"] ? String(req.headers["idempotency-key"]) : undefined;
                const defaultOffset = [0, 1, 2, 7, 14];
                let offestToUse = defaultOffset;
                if (!isDefaultOffset && offset) {
                    offestToUse = offset
                }
                if (idempotencyKey) {
                    const idempotencyRecord = await tx.query.idempotencyTable.findFirst({
                        where: {
                            key: idempotencyKey,
                            clinicId: clinicId
                        }
                    })

                    if (idempotencyRecord) {
                        if (idempotencyRecord.body === JSON.stringify(req.body)) {
                            return { kind: 'replay', status: 201, message: "Request created successfully", data: JSON.parse(idempotencyRecord.response) };
                        } else {
                            return { kind: 'conflict', status: 400, message: "Idempotency key already exists" };
                        }
                    }
                } else {
                    return { kind: 'noKey', status: 400, message: "Idempotency key missing " };
                }
                const emailHash = generateHash(email + String(clinicId));
                let patient = await tx.query.patientTable.findFirst({
                    where: {
                        emailHash: emailHash,
                        clinicId: clinicId
                    }
                });

                if (!patient) {
                    const encryptedEmail = await encryptHelper(email);
                    const [newPatient] = await tx.insert(schema.patientTable).values({
                        email: encryptedEmail,
                        name: name,
                        clinicId: clinicId,
                        phoneNumber: phoneNumber,
                        emailHash: emailHash
                    }).returning();
                    if (!newPatient) {
                        return { kind: 'createPatientFail', status: 500, message: "Failed to create patient " };
                    }
                    patient = newPatient;
                }
                const notificationRequest = await tx.insert(schema.notificationRequestTable).values({
                    targetDate: targetDate,
                    clinicId: clinicId,
                    patientId: patient.id,
                }).returning();


                await tx.insert(schema.idempotencyTable).values({
                    body: JSON.stringify(req.body),
                    clinicId: clinicId,
                    key: idempotencyKey,
                    response: JSON.stringify(notificationRequest[0])
                }).returning();

                await tx.insert(schema.notificationOffsetTable).values(
                    offestToUse.map((offsetNo) => ({
                        notificationRequestId: notificationRequest[0]!.id,
                        offset: offsetNo,
                        type: "EMAIL" as const
                    }))
                );
                await AuditLog(tx, { action: "CREATE", apiKeyId: Number(req.apiKeyId), clinicId: Number(req.clinicId), entityId: notificationRequest[0]!.id, entityState: notificationRequest[0]!.status, entityType: "NOTIFICATION_REQUEST" })
                return { kind: 'success', status: 201, message: "Request created successfully", data: notificationRequest[0] };
            });

            switch (result.kind) {
                case 'replay':
                    return res.status(result.status).send({ message: result.message, data: result.data });

                case 'conflict':
                    return res.status(result.status).send({ message: result.message });

                case 'noKey':
                    return res.status(result.status).send({ message: result.message });

                case 'createPatientFail':
                    return res.status(result.status).send({ message: result.message });

                default:
                    return res.status(result.status).send({ message: result.message, data: result.data });
            }


        } catch (err) {
            console.error("Failed to create notification request: ", err);
        }

    });

interface GetNotificationRequest {
    id: String
}
app.get<{ Params: GetNotificationRequest }>("/v1/notification-requests/:id", {
    preHandler: authPreHandler
}, async (req, res) => {
    try {

        const result = await withTenant(req.clinicId, async (tx) => {

            const notifcationReqId = Number(req.params.id);
            const clinicId = req.clinicId;
            const notifcationReq = await tx.query.notificationRequestTable.findFirst({
                where: {
                    id: notifcationReqId,
                    clinicId,
                }
            });
            await AuditLog(tx, { action: "READ", apiKeyId: Number(req.apiKeyId), clinicId: Number(req.clinicId), entityId: notifcationReqId, entityState: notifcationReq!.status, entityType: "NOTIFICATION_REQUEST" })

            return notifcationReq;

        });

        if (!result) {
            return res.status(404).send("The notification request does not exists");
        }

        return res.status(200).send({
            data: result
        });

    } catch (err) {
        console.error("Failed to get notification request: ", err);
    }

});

app.delete<{ Params: { id: String } }>("/v1/notification-requests/:id",
    {
        preHandler: authPreHandler
    }, async (req, res) => {
        try {
            const result = await withTenant(req.clinicId, async (tx) => {
                const notifcationReqId = Number(req.params.id);
                const clinicId = req.clinicId;
                const [canceledNotificationReq] = await tx.update(schema.notificationRequestTable).set({

                    status: "CANCELLED"

                }).where(and(eq(schema.notificationRequestTable.id, notifcationReqId), eq(schema.notificationRequestTable.clinicId, clinicId),
                    eq(schema.notificationRequestTable.status, "SUBMITTED")
                )).returning();

                if (!canceledNotificationReq) {

                    return null;

                }
                const cancelledNotification = await tx.update(schema.notificationTable).set({
                    status: "CANCELLED"
                }).where(and(eq(schema.notificationTable.status, "QUEUED"), eq(schema.notificationTable.notificationRequestId, canceledNotificationReq.id))).returning();

                await AuditLog(tx, { action: "CANCEL", apiKeyId: Number(req.apiKeyId), clinicId: Number(req.clinicId), entityId: canceledNotificationReq.id, entityState: canceledNotificationReq.status, entityType: "NOTIFICATION_REQUEST" })

                return {
                    canceledNotificationReq,
                    cancelledNotification
                }
            })
            if (!result) {
                return res.status(404).send("Notification request cancellation failed");
            }

            return res.status(200).send({
                data: result
            });
        } catch (err) {
            console.error("Cancellation request failed: ", err);
        }

    });
app.listen({ port: Number(Bun.env.PORT) || 3000, host: '0.0.0.0' });

process.on('SIGINT', () => app.close(() => process.exit(0)))
process.on('SIGTERM', () => app.close(() => process.exit(0)))
