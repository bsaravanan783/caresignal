import fastify from "fastify"
import { db } from "./src/index.ts"
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
    const metrics = await promClient.register.getMetricsAsJSON();

    res.status(200).send(metrics);

})
app.listen({ port: Number(Bun.env.PORT) || 3000 });
