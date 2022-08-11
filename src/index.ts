import Batcher from "./batcher";
import { connect } from "./client";
import queries from "./queries";
import dbConnect from "./db";
import { sleep } from "./utils";

async function start() {
  await dbConnect();
  const client = await connect();
  let maxHeight = 0;
  const batchers = queries.map(
    ({ query, processor, label }) =>
      new Batcher(client, query, processor, label)
  );
  while (true) {
    const currMaxHeight = await client.queryClient?.getHeight();
    if (currMaxHeight === maxHeight || !currMaxHeight) {
      await sleep(30000);
    } else {
      console.log(`Processing new blocks...`);
      maxHeight = currMaxHeight;
      for (let i = 0; i < batchers.length; i++) {
        const batcher = batchers[i];
        await batcher.start(maxHeight ?? 0);
      }
    }
  }
}

start();
