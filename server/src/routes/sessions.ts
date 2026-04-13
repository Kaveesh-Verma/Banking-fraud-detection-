import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, sessionsTable } from "../db.js";
import { randomUUID } from "crypto";

const router = Router();

const DeviceInfo = z.object({
  os: z.string(),
  browser: z.string(),
  deviceType: z.string(),
  userAgent: z.string(),
});

const StartSessionBody = z.object({
  name: z.string(),
  mobile: z.string(),
  deviceInfo: DeviceInfo,
  locationPermission: z.boolean(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  ip: z.string().nullable().optional(),
});

router.post("/session/start", async (req, res): Promise<void> => {
  const parsed = StartSessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { name, mobile, deviceInfo, locationPermission, latitude, longitude, city, country, ip } = parsed.data;
  const id = randomUUID();

  const [session] = await db.insert(sessionsTable).values({
    id, name, mobile,
    loginTime: Math.floor(Date.now() / 1000),
    os: deviceInfo.os,
    browser: deviceInfo.browser,
    deviceType: deviceInfo.deviceType,
    userAgent: deviceInfo.userAgent,
    locationPermission,
    latitude: latitude ?? undefined,
    longitude: longitude ?? undefined,
    city: city ?? undefined,
    country: country ?? undefined,
    ip: ip ?? undefined,
    mouseMovements: 0,
    clicks: 0,
    keyPresses: 0,
    createdAt: Math.floor(Date.now() / 1000),
  }).returning();

  res.status(201).json(toResponse(session));
});

router.get("/session/:sessionId", async (req, res): Promise<void> => {
  const { sessionId } = req.params;
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(toResponse(session));
});

router.patch("/session/:sessionId/interactions", async (req, res): Promise<void> => {
  const { sessionId } = req.params;
  const body = z.object({ mouseMovements: z.number(), clicks: z.number(), keyPresses: z.number() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const [session] = await db
    .update(sessionsTable)
    .set({ mouseMovements: body.data.mouseMovements, clicks: body.data.clicks, keyPresses: body.data.keyPresses })
    .where(eq(sessionsTable.id, sessionId))
    .returning();

  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(toResponse(session));
});

function toResponse(s: typeof sessionsTable.$inferSelect) {
  return {
    id: s.id, name: s.name, mobile: s.mobile,
    loginTime: s.loginTime.toISOString(),
    deviceInfo: { os: s.os, browser: s.browser, deviceType: s.deviceType, userAgent: s.userAgent },
    locationPermission: s.locationPermission,
    latitude: s.latitude ?? null,
    longitude: s.longitude ?? null,
    city: s.city ?? null,
    country: s.country ?? null,
    ip: s.ip ?? null,
    mouseMovements: s.mouseMovements,
    clicks: s.clicks,
    keyPresses: s.keyPresses,
    createdAt: s.createdAt.toISOString(),
  };
}

export default router;
