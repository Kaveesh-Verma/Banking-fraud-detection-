import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { text, integer, real } from "drizzle-orm/sqlite-core";
import { sqliteTable } from "drizzle-orm/sqlite-core";

const sqlite = new Database("./finshield.db");

export const sessionsTable = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull(),
  loginTime: integer("login_time", { mode: "timestamp" }).notNull(),
  os: text("os").notNull().default("Unknown"),
  browser: text("browser").notNull().default("Unknown"),
  deviceType: text("device_type").notNull().default("Unknown"),
  userAgent: text("user_agent").notNull().default(""),
  locationPermission: integer("location_permission", { mode: "boolean" }).notNull().default(false),
  latitude: real("latitude"),
  longitude: real("longitude"),
  city: text("city"),
  country: text("country"),
  ip: text("ip"),
  mouseMovements: integer("mouse_movements").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  keyPresses: integer("key_presses").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const db = drizzle(sqlite, { schema: { sessionsTable } });

export async function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      login_time INTEGER NOT NULL,
      os TEXT NOT NULL DEFAULT 'Unknown',
      browser TEXT NOT NULL DEFAULT 'Unknown',
      device_type TEXT NOT NULL DEFAULT 'Unknown',
      user_agent TEXT NOT NULL DEFAULT '',
      location_permission INTEGER NOT NULL DEFAULT 0,
      latitude REAL,
      longitude REAL,
      city TEXT,
      country TEXT,
      ip TEXT,
      mouse_movements INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      key_presses INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
  console.log("Database ready");
}