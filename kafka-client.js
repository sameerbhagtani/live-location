import { Kafka } from "kafkajs";

export const kafkaClient = new Kafka({
    clientId: "live-location-app",
    brokers: ["localhost:9092"],
});
