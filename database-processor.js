import { kafkaClient } from "./kafka-client.js";

async function init() {
    const kafkaConsumer = kafkaClient.consumer({
        groupId: `database-processor`,
    });
    await kafkaConsumer.connect();
    await kafkaConsumer.subscribe({
        topics: ["location-updates"],
        fromBeginning: true,
    });
    kafkaConsumer.run({
        eachMessage: async ({ topic, parition, message, heartbeat }) => {
            const data = message.value.toString();
            console.log("INSERT INTO DB LOCATION", data);

            await heartbeat();
        },
    });
}

init();
