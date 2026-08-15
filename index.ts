import fastify from "fastify"
import { db } from "./src/db/client.ts"
import * as schema from './src/db/schema';
import promClient from "prom-client";
import { Client } from "pg";
const app = fastify({
    logger: true
})
console.log(Bun.env.DATABASE_URL!);

promClient.collectDefaultMetrics();

app.get('/healthz', (req, res) => {

    res.status(200).send("Hi there !");
})

app.get('/metrics', async (req, res) => {
    const metrics = await promClient.register.metrics();

    res.status(200).header('content-type', promClient.register.contentType).send(metrics);

})
app.listen({ port: Number(Bun.env.PORT) || 3000, host: '0.0.0.0' });

process.on('SIGINT', () => app.close(() => process.exit(0)))
process.on('SIGTERM', () => app.close(() => process.exit(0)))
