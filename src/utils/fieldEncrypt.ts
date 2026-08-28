import { createCipheriv, createDecipheriv, randomBytes, } from "node:crypto";
import { db_postgres_user as db } from "../db/client";
export const generateDataEncrytionKey = () => {
    const key = randomBytes(32).toString('base64');
    return key;
}


export const encryptDataWithKey = async (encryptionKey: string, data: string) => {
    const keyForEncryption = Buffer.from(encryptionKey, 'base64');
    const ivBuffer = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', keyForEncryption, ivBuffer);

    const encrypted = cipher.update(data).toString('base64');
    cipher.final();
    const authTag = cipher.getAuthTag().toString('base64');

    const returnString = "v2:" + ivBuffer.toString('base64') + ":" + authTag + ":" + encrypted;

    return returnString;
}
export const encryptHelper = async (text: string, clinicId: number) => {
    const unWrappedClinicDek = await getDekwithClinicId(clinicId);
    const result = await encryptDataWithKey(unWrappedClinicDek, text);

    return result;
}

export const decryptDatawithKey = async (encryptionKey: string, ivBuffer: string, authTag: string, encrypted: string) => {
    const keyForEncryption = Buffer.from(encryptionKey, 'base64');
    const ivBufferToUse = Buffer.from(ivBuffer, 'base64');
    const authTagToUse = Buffer.from(authTag, "base64");
    const encryptedToUse = Buffer.from(encrypted, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', keyForEncryption, ivBufferToUse);
    decipher.setAuthTag(authTagToUse);
    const decrypted = decipher.update(encryptedToUse);
    decipher.final();

    return decrypted.toString('utf-8');
}
export const unWrapDekHelper = async (wrappedDeK: string) => {
    const kek = Bun.env.KEY_ENCRYPTION_KEY!;
    const [version, ivBuffer, authTag, encrypted] = wrappedDeK.split(":");
    const result = await decryptDatawithKey(kek, ivBuffer!, authTag!, encrypted!);
    return result;
}
export const decryptHelper = async (cipherText: string, clinicId: number) => {
    const [version, ivBuffer, authTag, encrypted] = cipherText.split(":");

    if (version == "v1") {
        const result = await decryptDatawithKey(Bun.env.LEGACY_ENCRYPTION_KEY!, ivBuffer!, authTag!, encrypted!);
        return result;
    } else if (version == "v2") {
        const unWrappedClinicDek = await getDekwithClinicId(clinicId);
        const result = await decryptDatawithKey(unWrappedClinicDek, ivBuffer!, authTag!, encrypted!);
        return result;
    } else {
        throw new Error("unknown version of the key ");
    }
}
const cacheClinicDek = new Map<number, string>()

export const getDekwithClinicId = async (clinicId: number) => {
    const clinicDekFromCache = cacheClinicDek.get(clinicId);
    if (clinicDekFromCache) {
        return clinicDekFromCache;
    }
    const clinic = await db.query.clinicTable.findFirst({
        where: {
            id: clinicId
        }
    });
    if (!clinic) {
        throw new Error("Clinic does not exists with Id" + clinicId);
    }
    const wrappedClinicDek = clinic.wrappedDek;
    if (!wrappedClinicDek) {
        throw new Error("Cannot get dek for clinic with ID " + clinicId);
    }
    const unWrappedClinicDek = await unWrapDekHelper(wrappedClinicDek);
    cacheClinicDek.set(clinicId, unWrappedClinicDek);
    return unWrappedClinicDek;
}
