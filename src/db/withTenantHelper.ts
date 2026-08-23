import { sql } from "drizzle-orm"
import { db } from "./client"

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const withTenant = async <T>(clinicId: number, callback: (tx: Tx) => Promise<T>): Promise<T> => {
    return await db.transaction(async (tx) => {

        await tx.execute(sql`SELECT set_config('app.clinic_id' , ${String(clinicId)},true)`)  //with true the value is discarded after the txn commits

        return await callback(tx);
    })
}
