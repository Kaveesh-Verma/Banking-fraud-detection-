import { useQuery, useMutation } from "@tanstack/react-query";

const BASE = "/api";

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SessionResponse {
  id: string; name: string; mobile: string; loginTime: string;
  deviceInfo: { os: string; browser: string; deviceType: string; userAgent: string };
  locationPermission: boolean;
  latitude: number | null; longitude: number | null;
  city: string | null; country: string | null; ip: string | null;
  mouseMovements: number; clicks: number; keyPresses: number;
  createdAt: string;
}

export interface AdminSession extends SessionResponse {
  riskScore: number; riskLevel: string; riskReasons: string[];
}

export interface AdminStats {
  totalSessions: number; highRiskCount: number; mediumRiskCount: number;
  lowRiskCount: number; avgRiskScore: number; locationDeniedCount: number;
  lowInteractionCount: number;
}

export interface RiskResponse {
  score: number; level: string; reasons: string[]; recommendations: string[];
}

export interface LocationResponse {
  ip: string; city: string; country: string;
  latitude: number | null; longitude: number | null;
}

// ── Query hooks ────────────────────────────────────────────────────────────────

export function useHealthCheck() {
  return useQuery({ queryKey: ["health"], queryFn: () => req<{ status: string }>("GET", "/healthz") });
}

export function useGetLocation() {
  return useQuery({ queryKey: ["location"], queryFn: () => req<LocationResponse>("GET", "/location") });
}

export function useGetSession(sessionId: string, opts?: { query?: { enabled?: boolean } }) {
  return useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => req<SessionResponse>("GET", `/session/${sessionId}`),
    enabled: opts?.query?.enabled ?? true,
  });
}

export function useListAdminSessions(opts?: { query?: { refetchInterval?: number } }) {
  return useQuery({
    queryKey: ["admin", "sessions"],
    queryFn: () => req<AdminSession[]>("GET", "/admin/sessions"),
    refetchInterval: opts?.query?.refetchInterval,
  });
}

export function useGetAdminStats(opts?: { query?: { refetchInterval?: number } }) {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => req<AdminStats>("GET", "/admin/stats"),
    refetchInterval: opts?.query?.refetchInterval,
  });
}

// ── Mutation hooks ─────────────────────────────────────────────────────────────

export function useStartSession() {
  return useMutation({
    mutationFn: ({ data }: { data: {
      name: string; mobile: string;
      deviceInfo: { os: string; browser: string; deviceType: string; userAgent: string };
      locationPermission: boolean;
      latitude?: number | null; longitude?: number | null;
      city?: string | null; country?: string | null; ip?: string | null;
    }}) => req<SessionResponse>("POST", "/session/start", data),
  });
}

export function useUpdateInteractions() {
  return useMutation({
    mutationFn: ({ sessionId, data }: {
      sessionId: string;
      data: { mouseMovements: number; clicks: number; keyPresses: number };
    }) => req<SessionResponse>("PATCH", `/session/${sessionId}/interactions`, data),
  });
}

export function useCalculateRisk() {
  return useMutation({
    mutationFn: ({ data }: { data: {
      sessionId?: string; locationPermission: boolean;
      mouseMovements: number; clicks: number; keyPresses: number; isNewSession: boolean;
    }}) => req<RiskResponse>("POST", "/risk", data),
  });
}
