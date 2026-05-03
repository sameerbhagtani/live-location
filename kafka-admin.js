import { kafkaClient } from "./kafka-client.js";

async function setup() {
    const admin = kafkaClient.admin();

    await admin.connect();
    console.log(`✅ Kafka Admin Connected`);

    await admin.createTopics({
        topics: [{ topic: "location-updates", numPartitions: 2 }],
    });

    console.log(`✅ Topics Created`);

    await admin.disconnect();
    console.log(`✅ Kafka Admin Disconnected`);
}

setup();
