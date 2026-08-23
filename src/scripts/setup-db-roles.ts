import { sql } from "drizzle-orm"
import { db_postgres_user as db } from "../db/client"


async function createRoles() {
    const createRole = sql.raw(`
DO $$
BEGIN
    IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname = 'caresignal_app') THEN
        CREATE ROLE caresignal_app LOGIN PASSWORD '${String(Bun.env.APP_ROLE_PASSWORD)}';
    END IF;
    IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname = 'caresignal_worker') THEN
        CREATE ROLE caresignal_worker LOGIN PASSWORD '${String(Bun.env.WORKER_ROLE_PASSWORD)}';
    END IF;
END $$;
ALTER ROLE caresignal_worker BYPASSRLS;
`)
    return await db.execute(createRole);

}

async function assignPermissionsToRoles() {
    const assignAppPermissionsQuery = sql.raw(`
            GRANT SELECT ON TABLE api_key TO caresignal_app;
            GRANT SELECT,INSERT ON TABLE idempotency TO caresignal_app;
            GRANT SELECT,INSERT ON TABLE patient TO caresignal_app;
            GRANT SELECT,INSERT,UPDATE ON TABLE notification_request TO caresignal_app;
            GRANT INSERT ON TABLE notification_offset TO caresignal_app;
            GRANT SELECT,UPDATE ON TABLE notification TO caresignal_app;
        `);

    const assignWorkerPermissionsQuery = sql.raw(`
        GRANT SELECT,UPDATE ON TABLE notification_request TO caresignal_worker;
        GRANT SELECT ON TABLE notification_offset TO caresignal_worker;
        GRANT SELECT,INSERT,UPDATE ON TABLE notification TO caresignal_worker;
        GRANT SELECT,INSERT ON TABLE notification_log TO caresignal_worker;
        GRANT SELECT ON TABLE patient TO caresignal_worker;
        `);

    await db.execute(assignAppPermissionsQuery);
    return await db.execute(assignWorkerPermissionsQuery);

}

async function main() {
    try {
        await createRoles();
        await assignPermissionsToRoles();
        console.log("successfully created roles and assigned permissions for app and worker");
        return;
    } catch (err) {
        console.error("Failed to create roles and permissions " + err);
        process.exit(1);
    }
}


main();

