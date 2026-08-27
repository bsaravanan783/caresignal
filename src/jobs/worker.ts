import { Job } from "bullmq";
import { sendEmailNotification } from "../provider/emailProvider";
import { workerDb as db } from "../db/client";
import * as schema from "../db/schema";
import { and, desc, eq } from "drizzle-orm";
import { decryptHelper } from "../utils/fieldEncrypt";

export interface QueueInterface {
    reqId: number,
    notificationId: number
}
export interface ResolveUpInterface extends QueueInterface { };

const resolveUp = async (data: ResolveUpInterface) => {
    const { notificationId, reqId } = data;
    const totalOffsets = await db.query.notificationOffsetTable.findMany({
        where: {
            notificationRequestId: reqId
        }
    });

    const notifications = await db.query.notificationTable.findMany({
        where: {
            notificationRequestId: reqId
        }
    });
    const sentCount = notifications.filter(n => n.status === "SENT").length;
    const failedCount = notifications.filter(n => n.status === "FAILED").length;
    const allResolved = sentCount + failedCount === totalOffsets.length;


    if (allResolved) {
        if (sentCount === totalOffsets.length) {
            await db.update(schema.notificationRequestTable).set({
                status: "COMPLETED"
            }
            ).where(
                and(
                    eq(schema.notificationRequestTable.status, "SUBMITTED"),
                    eq(schema.notificationRequestTable.id, reqId)
                )
            );

        } else if (failedCount === totalOffsets.length) {
            await db.update(schema.notificationRequestTable).set({
                status: "FAILED"
            }).where(
                and(
                    eq(schema.notificationRequestTable.status, "SUBMITTED"),
                    eq(schema.notificationRequestTable.id, reqId)
                )
            );
        } else {
            await db.update(schema.notificationRequestTable).set({
                status: "PARTIAL_COMPLETED"
            }).where(
                and(
                    eq(schema.notificationRequestTable.status, "SUBMITTED"),
                    eq(schema.notificationRequestTable.id, reqId)
                )
            );
        }
    }

    return;

}

export const handleProcessingJob = async (job: Job<QueueInterface>) => {

    try {
        const { notificationId, reqId } = job.data;
        const patientEmail = await db.select({ patientEmail: schema.patientTable.email }).from(schema.notificationRequestTable)
            .innerJoin(schema.patientTable,
                and(
                    eq(schema.notificationRequestTable.patientId, schema.patientTable.id),
                    eq(schema.notificationRequestTable.clinicId, schema.patientTable.clinicId)
                )
            ).where(
                eq(schema.notificationRequestTable.id, reqId)
            );

        const emailToUse = patientEmail[0]?.patientEmail;
        const decryptedEmail = await decryptHelper(emailToUse!);
        if (!emailToUse) {
            await db.update(schema.notificationTable).set({
                status: "FAILED"
            }).where(
                and(
                    eq(schema.notificationTable.id, notificationId),
                    eq(schema.notificationTable.status, "PROCESSING")
                )
            )

            await db.insert(schema.notificationLogTable).values({
                attemptNo: 0,
                notificationId: notificationId,
                response: "Notification failed as no email found",
            });

            await resolveUp({ reqId, notificationId });
            return;
        }
        const [logs] = await db.select().from(schema.notificationLogTable).where(
            eq(schema.notificationLogTable.notificationId, notificationId),
        ).orderBy(desc(schema.notificationLogTable.attemptNo)).limit(1);
        const attemptNo: number | undefined = logs?.attemptNo;
        const attemptNoToUse = attemptNo !== undefined ? attemptNo + 1 : 0;
        const numberOfRetry = Number(Bun.env.RETRY);
        const retryBaseDelay = Number(Bun.env.BASE_RETRY_DELAY);
        const response = await sendEmailNotification({ patientEmail: decryptedEmail }, attemptNoToUse);
        await db.insert(schema.notificationLogTable).values({
            attemptNo: attemptNoToUse,
            notificationId: notificationId,
            response: JSON.stringify(response),
            messageProviderId: response.providerId
        });



        if (response.success) {
            await db.update(schema.notificationTable).set({
                status: "SENT"
            }).where(
                and(
                    eq(schema.notificationTable.id, notificationId),
                    eq(schema.notificationTable.status, "PROCESSING")
                ))

        } else if (response.retryable && !response.success && attemptNoToUse <= numberOfRetry) {
            const nextAttemptTime = new Date(Date.now() + retryBaseDelay * Math.pow(2, attemptNoToUse));
            await db.update(schema.notificationTable).set({
                nextAttemptAt: nextAttemptTime,
                status: "QUEUED"
            }).where(
                and(
                    eq(schema.notificationTable.id, notificationId),
                    eq(schema.notificationTable.status, "PROCESSING")
                )
            );
        } else {
            await db.update(schema.notificationTable).set({
                status: "FAILED"
            }).where(
                and(
                    eq(schema.notificationTable.id, notificationId),
                    eq(schema.notificationTable.status, "PROCESSING")
                )
            )

        }

        await resolveUp({ reqId, notificationId });

    } catch (err) {
        console.error("Handle processing job failed", err);

    }

}

