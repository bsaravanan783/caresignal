import { createCipheriv, createDecipheriv, randomBytes, } from "node:crypto";
export const generateDataEncrytionKey = () => {
    const key = randomBytes(32).toString('base64');
    return key;
}
export const encryptHelper = async (text: string) => {

    const keyForEncryption = Buffer.from(Bun.env.ENCRYPTION_KEY!, 'base64');
    const ivBuffer = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', keyForEncryption, ivBuffer);

    const encrypted = cipher.update(text).toString('base64');
    cipher.final();
    const authTag = cipher.getAuthTag().toString('base64');

    const returnString = "v1:" + ivBuffer.toString('base64') + ":" + authTag + ":" + encrypted;


    return returnString;
}


export const decryptHelper = async (cipherText: string) => {
    const keyForEncryption = Buffer.from(Bun.env.ENCRYPTION_KEY!, 'base64');
    const [version, ivBuffer, authTag, encrypted] = cipherText.split(":");
    const ivBufferToUse = Buffer.from(ivBuffer!, 'base64');
    const authTagToUse = Buffer.from(authTag!, "base64");
    const encryptedToUse = Buffer.from(encrypted!, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', keyForEncryption, ivBufferToUse);
    decipher.setAuthTag(authTagToUse);
    const decrypted = decipher.update(encryptedToUse);
    decipher.final();

    return decrypted.toString('utf-8');
}
