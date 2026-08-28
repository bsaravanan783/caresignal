import { eq } from "drizzle-orm";
import { db_postgres_user as db } from "../db/client"
import { clinicTable } from "../db/schema";
import { encryptDataWithKey, generateDataEncrytionKey } from "../utils/fieldEncrypt";

const backfillClinicDek = async () => {
    try {
        const clinics = await db.select().from(clinicTable);
        if (clinics.length == 0) {
            throw new Error("No clinic to backfill");
        }
        const totalClinics = clinics.length;
        let backFilled = 0;
        for (const rec of clinics) {
            if (!rec.wrappedDek) {
                const newDek = generateDataEncrytionKey();
                const encrypedDek = await encryptDataWithKey(Bun.env.KEY_ENCRYPTION_KEY!, newDek);
                await db.update(clinicTable).set({
                    wrappedDek: encrypedDek
                }).where(eq(clinicTable.id, rec.id));
                backFilled += 1;
            }
        }
        console.log("TOTAL CLINICS : ", totalClinics);
        console.log("BACKFILLED CLINCIS : ", backFilled);
        console.log("UNAFFECTED CLINICS : ", totalClinics - backFilled);
    } catch (err) {
        console.log("script execution failed : ", err);
        process.exit(1);
    }
}

backfillClinicDek();
