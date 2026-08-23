import { drizzle } from "drizzle-orm/bun-sql/postgres";
import * as schema from "./schema"
import { defineRelations } from "drizzle-orm";
const relations = defineRelations(schema);
export const db = drizzle(Bun.env.DATABASE_URL!, { relations });
export const workerDb = drizzle(Bun.env.WORKER_DATABASE_URL!, { relations });
export const db_postgres_user = drizzle(Bun.env.DATABASE_URL_PG_USER!, { relations });

