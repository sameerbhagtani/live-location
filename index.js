import http from "node:http";
import express from "express";
import path from "node:path";
import cookieParser from "cookie-parser";
import "dotenv/config";

import { Server } from "socket.io";

import { kafkaClient } from "./kafka-client.js";
import authRoutes from "./routes/auth.js";
import { authMiddleware, socketVerify } from "./middleware/auth.js";

async function main() {
    const PORT = process.env.PORT || 5000;
    const app = express();
    const server = http.createServer(app);

    app.use(cookieParser());
    app.use(express.json());

    app.use("/auth", authRoutes);

    const kafkaProducer = kafkaClient.producer();
    await kafkaProducer.connect();

    const kafkaConsumer = kafkaClient.consumer({
        groupId: `socket-server-${PORT}`,
    });
    await kafkaConsumer.connect();
    await kafkaConsumer.subscribe({
        topics: ["location-updates"],
    });

    const io = new Server();
    io.attach(server);

    kafkaConsumer.run({
        eachMessage: async ({ message, heartbeat }) => {
            const data = JSON.parse(message.value.toString());
            io.emit("server:location:update", {
                userId: data.userId,
                userName: data.userName,
                latitude: data.latitude,
                longitude: data.longitude,
            });
            await heartbeat();
        },
    });

    io.use((socket, next) => {
        const token = socket.handshake.headers.cookie
            ?.split("; ")
            .find((c) => c.startsWith("id_token="))
            ?.split("=")[1];

        if (!token) return next(new Error("Unauthorized"));
        socketVerify(token)
            .then((u) => {
                socket.user = u;
                next();
            })
            .catch(next);
    });

    io.on("connection", (socket) => {
        socket.on("client:location:update", async (data) => {
            const { latitude, longitude } = data;
            if (!socket.user) return;
            await kafkaProducer.send({
                topic: "location-updates",
                messages: [
                    {
                        key: socket.user.userId,
                        value: JSON.stringify({
                            userId: socket.user.userId,
                            userName: socket.user.userName,
                            latitude,
                            longitude,
                        }),
                    },
                ],
            });
        });

        socket.on("disconnect", () => {
            io.emit("user-left", { userId: socket.user.userId });
        });
    });

    app.use(express.static(path.resolve("./public")));

    app.get("/health", (req, res) =>
        res.status(200).json({ message: "Healthy" }),
    );

    server.listen(PORT, () =>
        console.log(`✅ Server started at PORT : ${PORT}`),
    );
}

main();
