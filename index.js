import http from "node:http";
import express from "express";
import path from "node:path";

import { Server } from "socket.io";

import { kafkaClient } from "./kafka-client.js";

async function main() {
    const PORT = process.env.PORT || 5000;

    const app = express();
    const server = http.createServer(app);

    const io = new Server();

    const kafkaProducer = kafkaClient.producer();
    await kafkaProducer.connect();

    const kafkaConsumer = kafkaClient.consumer({
        groupId: `socket-server-${PORT}`,
    });
    await kafkaConsumer.connect();
    await kafkaConsumer.subscribe({
        topics: ["location-updates"],
        fromBeginning: true,
    });
    kafkaConsumer.run({
        eachMessage: async ({ topic, parition, message, heartbeat }) => {
            const data = JSON.parse(message.value.toString());
            console.log(`Kafka Consumer Data received: `, data);

            io.emit("server:location:update", {
                id: data.id,
                latitude: data.latitude,
                longitude: data.longitude,
            });

            await heartbeat();
        },
    });

    io.attach(server);

    io.on("connection", (socket) => {
        console.log(`New socket connected: ${socket.id}`);

        socket.on("client:location:update", async (data) => {
            const { latitude, longitude } = data;
            console.log(latitude, longitude);

            await kafkaProducer.send({
                topic: "location-updates",
                messages: [
                    {
                        key: socket.id,
                        value: JSON.stringify({
                            id: socket.id,
                            latitude,
                            longitude,
                        }),
                    },
                ],
            });
        });
    });

    app.use(express.static(path.resolve("./public")));

    app.get("/health", (req, res) => {
        return res.status(200).json({ message: "Healthy" });
    });

    server.listen(PORT, () => {
        console.log(`✅ Server started at PORT : ${PORT}`);
    });
}

main();
