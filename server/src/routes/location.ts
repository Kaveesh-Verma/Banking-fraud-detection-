import { Router, type Request } from "express";

const router = Router();

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(",")[0].trim();
  }
  return req.socket.remoteAddress ?? "unknown";
}

router.get("/location", async (req, res): Promise<void> => {
  const ip = getClientIp(req);
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await response.json() as { city?: string; country_name?: string; latitude?: number; longitude?: number };
    res.json({
      ip,
      city: data.city ?? "Unknown",
      country: data.country_name ?? "Unknown",
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
    });
  } catch {
    res.json({ ip, city: "Unknown", country: "Unknown", latitude: null, longitude: null });
  }
});

export default router;
