import mongoose from "mongoose";
import clc from "cli-color";
import { configDotenv } from "dotenv";
configDotenv();

export * from "./ADO";
export * from "./CodeID";
export * from "./Config";
export * from "./Status";
export * from "./AcceptOwnership";
export * from "./RevokeOwnershipOffer";
export * from "./UpdateOwnership";

const DB_URI =
  process.env.DB_URI || "mongodb://127.0.0.1:27017/andromeda-indexer";

async function connect() {
  console.info(clc.yellow(`Connecting to Database: ${DB_URI}`));
  await mongoose.connect(DB_URI);
  console.info(clc.green("Connected to database"));

  require("./ADO");
  require("./CodeID");
  require("./Config");
  require("./Status");
  require("./AcceptOwnership");
  require("./RevokeOwnershipOffer");
  require("./UpdateOwnership");
}

export default connect;
