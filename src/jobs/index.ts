import { db } from '../db/client';
import * as schema from "../db/schema"
import { and, eq, notExists, sql } from 'drizzle-orm';

const createNotificationsWorker = async () => {
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

}


setInterval(createNotificationsWorker, 60000);
