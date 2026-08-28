import { eq } from "drizzle-orm";
import { db_postgres_user as db } from "../db/client";
import { patientTable } from "../db/schema";
import { generateHash } from "../utils/hashHelper";
import { decryptHelper } from "../utils/fieldEncrypt";

const backFillEmailHash = async () => {
    try {
        const patients = await db.query.patientTable.findMany();
        const totalRecords = patients.length;
        let updatedCount = 0;
        for (const rec of patients) {
            if (!rec.emailHash) {
                const emailToUse = await decryptHelper(rec.email, rec.clinicId);
                const emailHash = generateHash(emailToUse + String(rec.clinicId));
                await db.update(patientTable).set({ emailHash: emailHash }).where(
                    eq(patientTable.id, rec.id)
                );
                updatedCount += 1;
            }
        }
        console.log("TOTAL RECORDS : ", totalRecords);
        console.log("UPDATED RECORS : ", updatedCount);
        console.log("UNAFFECTED RECORDS : ", totalRecords - updatedCount);

    } catch (err) {
        console.error("Script Failed : ", err);
        process.exit(1);
    }

}

backFillEmailHash();
