import { drizzle } from "drizzle-orm/bun-sql/postgres";
import * as schema from './db/schema';

console.log(Bun.env.DATABASE_URL!)

export const db = drizzle(Bun.env.DATABASE_URL!);

async function main() {
    const allPatients = db.select().from(schema.patientTable);
    console.log("Response from db : ", allPatients);
}

main();
