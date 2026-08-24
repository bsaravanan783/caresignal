import { db } from "../db/client";
import * as schema from "../db/schema";

interface data {
    action: typeof schema.auditLogTable.$inferInsert.action,
    apiKeyId: number,
    clinicId: number,
    entityId: number,
    entityState: typeof schema.auditLogTable.$inferInsert.entityState,
    entityType: typeof schema.auditLogTable.$inferInsert.entityType
}
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const AuditLog = async (tx: Tx, data: data) => {
    return await tx.insert(schema.auditLogTable).values({
        action: data.action,
        apiKeyId: data.apiKeyId,
        clinicId: data.clinicId,
        entityId: data.entityId,
        entityState: data.entityState,
        entityType: data.entityType
    });
} 
