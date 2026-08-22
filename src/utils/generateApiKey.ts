import { createHash, randomBytes } from "node:crypto";
interface responseGenerateApiKey {
    hash: string,
    prefix: string,
    fullKey: string
}
export const generateApiKey = (): responseGenerateApiKey => {

    const randomString = randomBytes(32).toString('base64url'); // for url friendliness
    const fullKey = Bun.env.API_KEY_PREFIX + randomString;
    const hash = createHash('sha256').update(fullKey).digest('hex');
    const prefix = fullKey.slice(0, Bun.env.API_KEY_PREFIX!.length + 12);
    return {
        hash,
        fullKey,
        prefix
    }
}
