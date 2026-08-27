import { createHmac } from "node:crypto";
export const generateHash = (data: string) => {
    const pepper = Bun.env.HASH_PEPPER!;
    const hash = createHmac('sha256', pepper).update(data.toLowerCase()).digest('hex');
    return hash;
}
