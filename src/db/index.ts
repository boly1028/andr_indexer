import mongoose from "mongoose";
import clc from "cli-color";

const DB_URI =
  process.env.DB_URI || "mongodb://localhost:27017/andromeda-indexer";

async function connect() {
  console.info(clc.yellow(`Connecting to Database: ${DB_URI}`));
  await mongoose.connect(DB_URI);
  console.info(clc.green("Connected to database"));

  require("./ADO");
}

export default connect;
