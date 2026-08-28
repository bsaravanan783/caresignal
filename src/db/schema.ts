import { sql } from "drizzle-orm";
import { boolean, snakeCase, integer, pgEnum, text, timestamp, unique, varchar, index, pgRole, pgPolicy } from "drizzle-orm/pg-core";

export const appRole = pgRole('caresignal_app').existing();

export const patientTable = snakeCase.table.withRLS("patient", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    email: text().notNull(),
    emailHash: text().unique(),
    createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull().$onUpdateFn(() => new Date()),
    phoneNumber: varchar({ length: 20 }),
    clinicId: integer().references(() => clinicTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull()
}, (table) => [
    index().on(table.clinicId),
    index().on(table.emailHash),
    pgPolicy('tenant_isolation', {
        as: 'permissive',
        for: 'all',
        to: appRole,
        using: sql`clinic_id = current_setting('app.clinic_id')::int`,
        withCheck: sql`clinic_id = current_setting('app.clinic_id')::int`,
    })
]);


export const clinicTable = snakeCase.table("clinic", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    wrappedDek: text(),
    createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull().$onUpdateFn(() => new Date()),
    isActive: boolean().default(true).notNull()
});

export const notificationStatusEnum = pgEnum("notification_status", ['QUEUED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED']);

export const notificationTable = snakeCase.table.withRLS("notification", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    status: notificationStatusEnum().default('QUEUED').notNull(),
    nextAttemptAt: timestamp({ mode: "date" }),
    createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull().$onUpdateFn(() => new Date()),
    notificationRequestId: integer().references(() => notificationRequestTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull(),
    notificationOffsetId: integer().references(() => notificationOffsetTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }).unique().notNull()
}, (table) => [unique().on(table.notificationOffsetId, table.notificationRequestId),
index().on(table.status, table.nextAttemptAt),
index().on(table.notificationRequestId),
pgPolicy('tenant_isolation', {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`EXISTS(
        SELECT 1 FROM notification_request nr
        WHERE nr.id = notification_request_id
        AND nr.clinic_id = current_setting('app.clinic_id')::int
    )`,
    withCheck: sql`EXISTS(
        SELECT 1 FROM notification_request nr
        WHERE nr.id = notification_request_id
        AND nr.clinic_id = current_setting('app.clinic_id')::int
    )`,
})
])

export const notificationRequestStatusEnum = pgEnum("notification_request_status", ['SUBMITTED', 'COMPLETED', 'PARTIAL_COMPLETED', 'FAILED', 'CANCELLED']);
export const notificationRequestTable = snakeCase.table.withRLS("notification_request", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    status: notificationRequestStatusEnum().default('SUBMITTED').notNull(),
    targetDate: timestamp({ mode: "date" }).notNull(),
    createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull().$onUpdateFn(() => new Date()),
    clinicId: integer().references(() => clinicTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull(),
    patientId: integer().references(() => patientTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull()

}, (table) => [index().on(table.status, table.targetDate),
index().on(table.clinicId),
pgPolicy('tenant_isolation', {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`clinic_id=current_setting('app.clinic_id')::int`,
    withCheck: sql`clinic_id=current_setting('app.clinic_id')::int`,
})
])

export const notificationLogTable = snakeCase.table.withRLS("notification_log", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    attemptNo: integer().notNull(),
    response: text().notNull(),
    messageProviderId: varchar({ length: 255 }),
    createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
    notificationId: integer().references(() => notificationTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull()

}, (table) => [
    pgPolicy('tenant_isolation', {
        as: 'permissive',
        for: 'all',
        to: appRole,
        using: sql`EXISTS(
        SELECT 1 FROM notification n
        JOIN notification_request nr ON notification_request_id=nr.id 
        WHERE n.id = notification_id 
        AND nr.clinic_id = current_setting('app.clinic_id')::int
        )`,
        withCheck: sql`EXISTS(
        SELECT 1 FROM notification n
        JOIN notification_request nr ON notification_request_id=nr.id
        WHERE n.id = notification_id
        AND nr.clinic_id = current_setting('app.clinic_id')::int
        )`,
    })
])

export const notificationOffsetTypeEnum = pgEnum("notification_offset_type", ['EMAIL']);

export const notificationOffsetTable = snakeCase.table.withRLS("notification_offset", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    offset: integer().notNull(),
    type: notificationOffsetTypeEnum().notNull(),
    isActive: boolean().default(true).notNull(),
    createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull().$onUpdateFn(() => new Date()),
    notificationRequestId: integer().references(() => notificationRequestTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull()
}, (table) => [unique().on(table.offset, table.notificationRequestId),
index().on(table.notificationRequestId),
pgPolicy('tenant_isolation', {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`EXISTS(
    SELECT 1 FROM notification_request nr
    WHERE nr.id=notification_request_id
    AND nr.clinic_id=current_setting('app.clinic_id')::int
    )`,
    withCheck: sql`EXISTS(
    SELECT 1 FROM notification_request nr
    WHERE nr.id=notification_request_id
    AND nr.clinic_id=current_setting('app.clinic_id')::int
    )`,
})
])

export const idempotencyTable = snakeCase.table.withRLS("idempotency", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    key: varchar({ length: 255 }).notNull(),
    body: text().notNull(),
    response: text().notNull(),
    clinicId: integer().references(() => clinicTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull(),
    createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
}, (table) => [unique().on(table.clinicId, table.key),
pgPolicy('tenant_isolation', {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`clinic_id=current_setting('app.clinic_id')::int`,
    withCheck: sql`clinic_id=current_setting('app.clinic_id')::int`,
})
])

export const apiKeysTable = snakeCase.table("api_key", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    clinicId: integer().references(() => clinicTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull(),
    hash: text().notNull().unique(),
    label: varchar({ length: 255 }),
    prefix: varchar({ length: 30 }).notNull(), //cs_live_ + 12 from apikey
    isActive: boolean().default(true).notNull(),
    createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),

})

export const userTable = snakeCase.table("user", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull(),
    clinicId: integer().references(() => clinicTable.id, { onDelete: 'cascade', onUpdate: 'cascade' }).notNull(),
    createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull().$onUpdateFn(() => new Date()),

})

export const entityTypeEnum = pgEnum("entity_type", ["NOTIFICATION_REQUEST"]);
export const entityStateEnum = pgEnum("entity_state", ["SUBMITTED", "COMPLETED", "PARTIAL_COMPLETED", "CANCELLED", "FAILED"]);
export const actionEnum = pgEnum("action", ["CREATE", "READ", "CANCEL"]);
export const auditLogTable = snakeCase.table.withRLS("audit_log", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    apiKeyId: integer().references(() => apiKeysTable.id, { onDelete: 'no action', onUpdate: 'no action' }).notNull(),
    entityId: integer().notNull(),
    entityType: entityTypeEnum().notNull(),
    entityState: entityStateEnum().notNull(),
    action: actionEnum().notNull(),
    clinicId: integer().references(() => clinicTable.id, { onDelete: 'no action', onUpdate: 'no action' }).notNull(),
    createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    index().on(table.clinicId),
    index().on(table.entityType, table.entityId),
    pgPolicy('tenant_isolation', {
        as: 'permissive',
        for: 'all',
        to: appRole,
        using: sql`clinic_id = current_setting('app.clinic_id')::int`,
        withCheck: sql`clinic_id = current_setting('app.clinic_id')::int`
    })
])
