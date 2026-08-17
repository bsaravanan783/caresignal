import { z } from "zod";


export const notificationRequestSchema = z.object({
    name: z.string(),
    email: z.email(),
    phoneNumber: z.string().min(10, { message: 'Must be a valid mobile number' }).max(20, { message: 'Must be a valid mobile number' }),
    targetDate: z.coerce.date(),
    isDefaultOffset: z.boolean(),
    offset: z.array(z.number().int().nonnegative()).optional(),
}).refine(
    (data) => {
        if (data.isDefaultOffset) {
            return !data.offset || data.offset.length == 0;
        }

        return data.offset && data.offset.length > 0;
    },
    {
        message: "Offset must be empty when using default offset, and must have values when not using default.",
        path: ["offset"]
    }
).refine((data) => {
    if (!data.offset) return true;
    return data.offset?.length === new Set(data.offset).size;
}, {
    message: "Offset must not have duplicates",
    path: ["offset"]
});

