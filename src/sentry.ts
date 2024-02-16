import * as Sentry from "@sentry/node";
import * as Tracing from "@sentry/tracing";
import nodeCluster from "node:cluster";
import { configDotenv } from "dotenv";
configDotenv();

Sentry.init({
  dsn: "https://0ef791f728444a9389464701e131b36d@o1364869.ingest.sentry.io/6659749",

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
  integrations: [new Tracing.Integrations.Mongo({ useMongoose: true })],
  serverName: nodeCluster.isPrimary ? "primary" : process.env.CHAIN_ID,
});
