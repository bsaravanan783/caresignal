import { inArray, } from "drizzle-orm";
import { db_postgres_user as db } from "../db/client";
import { patientTable } from "../db/schema";
import { decryptHelper } from "../utils/fieldEncrypt";

const dedupePatients = async () => {
    try {
        const isDryRun = Bun.argv.includes("--dry-run");
        const verb = isDryRun ? "WOULD DELETE" : "DELETED";
        const allEmails = await db.select().from(patientTable).orderBy(patientTable.id);
        const seenRecords = new Map<string, number[]>();
        let idsToDelete: number[] = [];
        const totalPatients = allEmails.length;
        let deletedCount = 0;

        const logMap = new Map<number, [string, number]>();

        for (const rec of allEmails) {
            const decryptedEmail = await decryptHelper(rec.email, rec.clinicId);
            logMap.set(rec.id, [decryptedEmail, rec.clinicId]);
            const groupKey = `${rec.clinicId}-${decryptedEmail.toLowerCase().trim()}`;

            if (!seenRecords.has(groupKey)) {
                seenRecords.set(groupKey, [rec.id]);
            } else {
                idsToDelete.push(rec.id);
                seenRecords.get(groupKey)!.push(rec.id);
            }
        }
        deletedCount += idsToDelete.length;
        if (!isDryRun && idsToDelete.length > 0) {
            await db.delete(patientTable).where(inArray(patientTable.id, idsToDelete))

        }

        console.log(`${verb} COUNT : `, deletedCount);
        console.log("TOTAL PATIENT RECORDS : ", totalPatients);
        for (const id of idsToDelete) {
            console.log(`${verb} PATIENT : ID:${id} EMAIL : ${logMap.get(id)![0]} CLINICID : ${logMap.get(id)![1]}`);

        }


    } catch (err) {
        console.error("SCRIPT FAILED :", err);
        process.exit(1);
    }
}

dedupePatients();
