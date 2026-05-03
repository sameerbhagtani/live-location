import { kafkaClient } from "./kafka-client.js";

async function init() {
    const kafkaConsumer = kafkaClient.consumer({
        groupId: `database-processor`,
    });
    await kafkaConsumer.connect();
    await kafkaConsumer.subscribe({
        topics: ["location-updates"],
    });
    kafkaConsumer.run({
        eachMessage: async ({ topic, parition, message, heartbeat }) => {
            const data = JSON.parse(message.value.toString());
            const timestamp = new Date().toISOString();
            console.log(
                `[${timestamp}] INSERT INTO DB - User: ${data.userName} (${data.userId}), Location: (${data.latitude}, ${data.longitude})`,
            );

            await heartbeat();
        },
    });
}

init();
