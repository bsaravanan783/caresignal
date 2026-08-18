import fastify from "fastify"
import { db } from "./src/db/client.ts"
import * as schema from './src/db/schema';
import promClient from "prom-client";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "@fastify/type-provider-zod";
import { notificationRequestSchema } from "./src/zod_schemas/index.ts";

const app = fastify({
    logger: true
}).withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

promClient.collectDefaultMetrics();

app.get('/healthz', (req, res) => {

    res.status(200).send("Hi there !");
})

app.get('/metrics', async (req, res) => {
    const metrics = await promClient.register.metrics();

    res.status(200).header('content-type', promClient.register.contentType).send(metrics);

})

app.post("/v1/notification-requests",
    {
        schema: {
            body: notificationRequestSchema,
        }
    }
    ,
    async (req, res) => {
        const { email, isDefaultOffset, name, phoneNumber, targetDate, offset } = req.body;
        const clinicId = Number(req.headers["x-clinic-id"]);
        const idempotencyKey = req.headers["idempotency-key"] ? String(req.headers["idempotency-key"]) : undefined;
        const defaultOffset = [0, 1, 2, 7, 14];
        let offestToUse = defaultOffset;
        if (!isDefaultOffset && offset) {
            offestToUse = offset
        }

        if (!clinicId) {
            return res.status(401).send({ message: "Unauthorised access " });
        }

        if (idempotencyKey) {
            const idempotencyRecord = await db.query.idempotencyTable.findFirst({
                where: {
                    key: idempotencyKey,
                    clinicId: clinicId
                }
            })

            if (idempotencyRecord) {
                if (idempotencyRecord.body === JSON.stringify(req.body)) {
                    return res.status(201).send({ data: JSON.parse(idempotencyRecord.response), message: "Request created successfully" });
                } else {
                    return res.status(400).send({ message: "Idempotency key already exists" })
                }
            }
        } else {
            return res.status(400).send({ message: "Idempotency key missing " });
        }

        let patient = await db.query.patientTable.findFirst({
            where: {
                email: email,
                clinicId: clinicId
            }
        });
        const notificationRequest = await db.transaction(async (tx) => {

            if (!patient) {
                const newPatient = await tx.insert(schema.patientTable).values({
                    email: email,
                    name: name,
                    clinicId: clinicId,
                    phoneNumber: phoneNumber
                }).returning();

                if (!newPatient[0]) {
                    throw new Error("Failed to create patient");
                }
                patient = newPatient[0];
            }
            const notificationRequest = await tx.insert(schema.notificationRequestTable).values({
                targetDate: targetDate,
                clinicId: clinicId,
                patientId: patient.id,
            }).returning();

            if (!notificationRequest[0]) {
                throw new Error("Failed to create notification request");
            }

            await tx.insert(schema.idempotencyTable).values({
                body: JSON.stringify(req.body)!,
                clinicId: clinicId,
                key: idempotencyKey,
                response: JSON.stringify(notificationRequest[0])!
            }).returning();

            await tx.insert(schema.notificationOffsetTable).values(
                offestToUse.map((offsetNo) => ({
                    notificationRequestId: notificationRequest[0]!.id,
                    offset: offsetNo,
                    type: "EMAIL" as const
                }))
            );

            return notificationRequest[0];
        })

        return res.status(201).send({
            message: "Request created successfully",
            data: notificationRequest
        })


    });

app.listen({ port: Number(Bun.env.PORT) || 3000, host: '0.0.0.0' });

process.on('SIGINT', () => app.close(() => process.exit(0)))
process.on('SIGTERM', () => app.close(() => process.exit(0)))
