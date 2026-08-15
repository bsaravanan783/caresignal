import { drizzle } from "drizzle-orm/bun-sql/postgres";


export const db = drizzle(Bun.env.DATABASE_URL!);

