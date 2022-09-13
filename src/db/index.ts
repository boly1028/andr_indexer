import mongoose from "mongoose";
import clc from "cli-color";
export * from "./ADO";
export * from "./CodeID";

// process.env.DB_URI || "mongodb://localhost:27017/andromeda-indexer";
const DB_URI =
  process.env.DB_URI ||
  "mongodb+srv://andromeda:ImEZ4m2FVON6gXYq@cluster0.j3g8rhl.mongodb.net/andromeda-indexer?retryWrites=true&w=majority";

async function connect() {
  console.info(clc.yellow(`Connecting to Database: ${DB_URI}`));
  await mongoose.connect(DB_URI);
  console.info(clc.green("Connected to database"));

  require("./ADO");
  require("./CodeID");
}

export default connect;
