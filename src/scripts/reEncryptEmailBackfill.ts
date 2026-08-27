import { eq } from "drizzle-orm";
import { db_postgres_user as db } from "../db/client";
import { patientTable } from "../db/schema";
import { encryptHelper } from "../utils/fieldEncrypt";

const reEncrypt = async () => {
    try {
        const patients = await db.query.patientTable.findMany();
        const totalRecords = patients.length;
        let updatedCount = 0;
        for (const rec of patients) {
            const email = rec.email;
            const version = email.split(":")[0];
            if (version !== "v1") {
                const encryptedEmail = await encryptHelper(email);
                await db.update(patientTable).set({
                    email: encryptedEmail
                }).where(eq(patientTable.id, rec.id));
                updatedCount += 1;
            }

        };
        console.log("TOTAL RECORDS : ", totalRecords);
        console.log("UPDATED RECORS : ", updatedCount);
        console.log("UNAFFECTED RECORDS : ", totalRecords - updatedCount);
    } catch (err) {
        console.error("Script Failed : ", err);
        process.exit(1);
    }

}

reEncrypt();
