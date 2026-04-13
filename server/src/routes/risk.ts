import { Router } from "express";
import { z } from "zod";

const router = Router();

const CalculateRiskBody = z.object({
  locationPermission: z.boolean(),
  mouseMovements: z.number(),
  clicks: z.number(),
  keyPresses: z.number(),
  isNewSession: z.boolean(),
});

router.post("/risk", (req, res): void => {
  const parsed = CalculateRiskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { locationPermission, mouseMovements, clicks, keyPresses, isNewSession } = parsed.data;
  const totalInteractions = mouseMovements + clicks + keyPresses;
  let score = 0;
  const reasons: string[] = [];
  const recommendations: string[] = [];

  if (!locationPermission) {
    score += 20;
    reasons.push("Location permission denied");
    recommendations.push("Enable location access for better security verification");
  }
  if (totalInteractions < 10) {
    score += 15;
    reasons.push("Low interaction activity detected");
    recommendations.push("Verify your identity with additional authentication");
  }
  if (isNewSession) {
    score += 25;
    reasons.push("New session detected");
    recommendations.push("Enable biometric login for faster and more secure access");
  }
  if (score === 0) {
    reasons.push("No suspicious activity detected");
    recommendations.push("Continue to maintain secure browsing habits");
  }
  if (score > 60 && !recommendations.includes("Enable biometric login for faster and more secure access")) {
    recommendations.push("Enable biometric login for faster and more secure access");
  }

  const level = score < 30 ? "low" : score <= 60 ? "medium" : "high";
  res.json({ score, level, reasons, recommendations });
});

export default router;
