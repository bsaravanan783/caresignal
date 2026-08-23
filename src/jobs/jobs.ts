import { workerDb as db } from '../db/client';
import * as schema from "../db/schema"
import { and, eq, isNull, notExists, or, sql } from 'drizzle-orm';
import { queue } from '.';

const createNotificationsJob = async () => {
    try {
        const notificationReqs = await db.select().from(schema.notificationRequestTable).innerJoin(
            schema.notificationOffsetTable, eq(schema.notificationRequestTable.id, schema.notificationOffsetTable.notificationRequestId))
            .where(and(eq(schema.notificationRequestTable.status, "SUBMITTED"),
                sql`${schema.notificationRequestTable.targetDate} - INTERVAL '1 day' * ${schema.notificationOffsetTable.offset} <= CURRENT_DATE`,
                notExists(db.select().from(schema.notificationTable).where(
                    eq(schema.notificationTable.notificationOffsetId, schema.notificationOffsetTable.id)
                ))
            ));

        if (notificationReqs.length > 0) {
            await db.insert(schema.notificationTable).values(
                notificationReqs.map((req) => ({
                    notificationOffsetId: req.notification_offset.id,
                    notificationRequestId: req.notification_request.id
                }))
            );
        };
    } catch (err) {
        console.error("create notifications job failed: ", err);
    }


}


const addToQueueJob = async () => {
    try {
        const notifications = await db.update(schema.notificationTable).set({
            status: "PROCESSING"
        }).where(and(eq(schema.notificationTable.status, "QUEUED"),
            or(
                sql`${new Date()} >= ${schema.notificationTable.nextAttemptAt}`,
                isNull(schema.notificationTable.nextAttemptAt),
            )
        )).returning();

        await Promise.all(
            notifications.map((val) =>
                queue.add('send-email', {
                    reqId: val.notificationRequestId,
                    notificationId: val.id
                })
            )
        );
    } catch (err) {
        console.error("Add to Queue Job failed : ", err);
    }

}


setInterval(addToQueueJob, 5 * 1000);
setInterval(createNotificationsJob, 60000);
