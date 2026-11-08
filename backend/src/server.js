import http from "http";

import { ENV, validateEnv } from "./lib/env.js";
import { connectDB, disconnectDB } from "./lib/db.js";
import { initSocket, closeSocket } from "./lib/socket.js";
import { createApp } from "./app.js";

async function main() {
  const warnings = validateEnv();
  warnings.forEach((w) => console.warn("[config]", w));

  // connect first: don't accept traffic until the database is reachable
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  server.listen(ENV.PORT, () => {
    console.log(`Server running on port ${ENV.PORT} (${ENV.NODE_ENV})`);
  });

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down gracefully...`);

    const forceExit = setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    try {
      await closeSocket();
      await new Promise((resolve) => server.close(resolve));
      await disconnectDB();
      console.log("Shutdown complete");
      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1); // state is undefined after this: let the process manager restart us
});

main().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});

