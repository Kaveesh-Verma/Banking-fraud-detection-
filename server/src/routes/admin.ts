import { Router } from "express";
import { db, sessionsTable } from "../db.js";

const router = Router();

function calcRisk(s: typeof sessionsTable.$inferSelect) {
  const total = s.mouseMovements + s.clicks + s.keyPresses;
  let score = 25; // new session
  const reasons = ["New session detected"];
  if (!s.locationPermission) { score += 20; reasons.push("Location permission denied"); }
  if (total < 10) { score += 15; reasons.push("Low interaction activity detected"); }
  return { score, level: score < 30 ? "low" : score <= 60 ? "medium" : "high", reasons };
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value * 1000);
  return new Date(String(value));
}

router.get("/admin/sessions", async (_req, res): Promise<void> => {
  const sessions = await db.select().from(sessionsTable).orderBy(sessionsTable.createdAt);
  res.json(sessions.map(s => {
    const { score, level, reasons } = calcRisk(s);
    return {
      id: s.id, name: s.name, mobile: s.mobile,
      loginTime: toDate(s.loginTime).toISOString(),
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
      riskScore: score,
      riskLevel: level,
      riskReasons: reasons,
      createdAt: toDate(s.createdAt).toISOString(),
    };
  }));
});

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const sessions = await db.select().from(sessionsTable);
  let highRisk = 0, medRisk = 0, lowRisk = 0, totalScore = 0, locDenied = 0, lowInteraction = 0;
  for (const s of sessions) {
    const { score, level } = calcRisk(s);
    totalScore += score;
    if (level === "high") highRisk++;
    else if (level === "medium") medRisk++;
    else lowRisk++;
    if (!s.locationPermission) locDenied++;
    if (s.mouseMovements + s.clicks + s.keyPresses < 10) lowInteraction++;
  }
  res.json({
    totalSessions: sessions.length,
    highRiskCount: highRisk,
    mediumRiskCount: medRisk,
    lowRiskCount: lowRisk,
    avgRiskScore: sessions.length > 0 ? Math.round((totalScore / sessions.length) * 10) / 10 : 0,
    locationDeniedCount: locDenied,
    lowInteractionCount: lowInteraction,
  });
});

export default router;
