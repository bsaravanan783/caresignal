import fastify from "fastify"
import { db } from "./src/index.ts"
import * as schema from './src/db/schema';
const app = fastify({
    logger: true
})
console.log(Bun.env.DATABASE_URL!);

app.get('/health', (req, res) => {

    res.status(200).send("Hi there !");
})

app.listen({ port: Number(Bun.env.PORT) || 3000 });
