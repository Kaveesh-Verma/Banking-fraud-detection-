import "dotenv/config";
import app from "./app.js";
import { initDb } from "./db.js";

const port = Number(process.env.PORT ?? 8080);

async function start() {
  try {
    await initDb();
    app.listen(port, () => {
      console.log(`FinShield API running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
