import { db_postgres_user as db } from "../db/client";
import * as schema from "../db/schema";
import { generateApiKey } from "../utils/generateApiKey";

const { fullKey, hash, prefix } = generateApiKey();
async function main(): Promise<void> {
    await db.insert(schema.apiKeysTable).values({
        clinicId: 2,
        hash,
        prefix,
        label: "test label"
    })

    console.log("Full key after generation is:    " + fullKey);
    return;
}
main()
