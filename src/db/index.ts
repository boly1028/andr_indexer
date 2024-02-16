import mongoose from "mongoose";
import clc from "cli-color";
export * from "./ADO";
export * from "./CodeID";
import { configDotenv } from "dotenv";
configDotenv();

const DB_URI =
  process.env.DB_URI || "mongodb://localhost:27018/andromeda-indexer";

async function connect() {
  console.info(clc.yellow(`Connecting to Database: ${DB_URI}`));
  await mongoose.connect(DB_URI);
  console.info(clc.green("Connected to database"));

  require("./ADO");
  require("./CodeID");
}

export default connect;
