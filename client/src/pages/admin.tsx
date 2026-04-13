import { useListAdminSessions, useGetAdminStats } from "@/api";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  MapPin, Monitor, MousePointer2, AlertTriangle, ShieldCheck, ShieldAlert,
  Navigation, TrendingUp, Users, WifiOff, Brain, RefreshCw, Activity,
  Keyboard, Mouse
} from "lucide-react";
import LiveMap from "@/components/LiveMap";

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" } }),
};

function RiskPill({ level }: { level: string }) {
  const cfg = {
    high: "bg-red-50 text-red-600 border-red-200",
    medium: "bg-amber-50 text-amber-600 border-amber-200",
    low: "bg-green-50 text-green-600 border-green-200",
  }[level] ?? "bg-gray-50 text-gray-500 border-gray-200";
  return <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg}`}>{level} risk</span>;
}

function RiskBar({ score }: { score: number }) {
  const color = score >= 60 ? "bg-red-500" : score >= 30 ? "bg-amber-400" : "bg-green-500";
  return (
    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
      <motion.div className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }} animate={{ width: `${Math.min(score, 100)}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }} />
    </div>
  );
}

export default function Admin() {
  const { data: sessions = [], isLoading } = useListAdminSessions({ query: { refetchInterval: 10000 } });
  const { data: stats } = useGetAdminStats({ query: { refetchInterval: 10000 } });
  const total = stats?.totalSessions ?? 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="fixed top-0 right-0 w-96 h-96 bg-blue-50 rounded-full opacity-60 blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/4" />

      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow shadow-blue-200">
              <Navigation className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="font-bold text-gray-900 text-sm">FinShield Command Center</h1>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">ADMIN</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" /> Auto-refresh 10s
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-7 space-y-7 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Sessions", value: total,
              sub: `${stats?.lowRiskCount ?? 0}L · ${stats?.mediumRiskCount ?? 0}M · ${stats?.highRiskCount ?? 0}H`,
              icon: <Users className="w-4 h-4" />, bg: "bg-blue-50", iconColor: "text-blue-500", color: "text-gray-900" },
            { label: "Avg Risk Score", value: Math.round(stats?.avgRiskScore ?? 0), sub: "out of 100",
              icon: <TrendingUp className="w-4 h-4" />, bg: "bg-amber-50", iconColor: "text-amber-500",
              color: (stats?.avgRiskScore ?? 0) >= 60 ? "text-red-600" : (stats?.avgRiskScore ?? 0) >= 30 ? "text-amber-500" : "text-green-600" },
            { label: "High Risk", value: stats?.highRiskCount ?? 0,
              sub: total > 0 ? `${Math.round(((stats?.highRiskCount ?? 0) / total) * 100)}% of sessions` : "0% of sessions",
              icon: <ShieldAlert className="w-4 h-4" />, bg: "bg-red-50", iconColor: "text-red-500", color: "text-red-600" },
            { label: "Location Denied", value: stats?.locationDeniedCount ?? 0,
              sub: `${stats?.lowInteractionCount ?? 0} low interaction`,
              icon: <WifiOff className="w-4 h-4" />, bg: "bg-purple-50", iconColor: "text-purple-500", color: "text-purple-600" },
          ].map(({ label, value, sub, icon, bg, iconColor, color }, i) => (
            <motion.div key={label} variants={cardVariants} initial="hidden" animate="visible" custom={i}
              whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.07)" }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
                <div className={`p-1.5 rounded-lg ${bg} ${iconColor}`}>{icon}</div>
              </div>
              <div className={`text-3xl font-black ${color} tracking-tight`}>{value}</div>
              <div className="text-xs text-gray-400 mt-1">{sub}</div>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Live Threat Monitoring</h2>
            <p className="text-xs text-gray-400 mt-0.5">{sessions.length} active session{sessions.length !== 1 ? "s" : ""} tracked in real-time</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-500 live-dot" /> Live
          </div>
        </div>

        {!isLoading && sessions.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-7 h-7 text-blue-400" />
            </div>
            <p className="text-gray-500 font-medium">No sessions yet</p>
            <p className="text-sm text-gray-400 mt-1">Users will appear here once they sign in.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {sessions.map((session, idx) => {
            const isHigh = session.riskLevel === "high";
            const isMed = session.riskLevel === "medium";
            const scoreColor = isHigh ? "text-red-600" : isMed ? "text-amber-500" : "text-green-600";
            const topBar = isHigh ? "bg-red-500" : isMed ? "bg-amber-400" : "bg-green-500";

            return (
              <motion.div key={session.id} variants={cardVariants} initial="hidden" animate="visible" custom={idx + 4}
                whileHover={{ y: -3, boxShadow: "0 16px 48px rgba(0,0,0,0.09)" }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col transition-shadow">
                <div className={`h-1 w-full ${topBar}`} />
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-gray-900 text-base">{session.name}</div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">
                        {format(new Date(session.loginTime), "dd MMM yyyy, HH:mm:ss")}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <RiskPill level={session.riskLevel} />
                      <span className={`text-2xl font-black tracking-tight ${scoreColor}`}>{session.riskScore}</span>
                    </div>
                  </div>
                  <RiskBar score={session.riskScore} />

                  <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      <MapPin className="w-3 h-3 text-blue-400" /> Location & IP
                    </div>
                    <div className="text-sm font-semibold text-gray-800">
                      {session.city && session.country ? `${session.city}, ${session.country}` : "Unknown"}
                    </div>
                    {session.latitude && session.longitude && (
                      <div className="text-xs font-mono text-blue-500">
                        {session.latitude.toFixed(5)}°N, {session.longitude.toFixed(5)}°E
                      </div>
                    )}
                    <div className="text-xs font-mono text-gray-400">IP: {session.ip ?? "Hidden"}</div>
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      session.locationPermission ? "bg-green-50 text-green-600 border-green-200" : "bg-amber-50 text-amber-600 border-amber-200"
                    }`}>
                      {session.locationPermission ? "GPS Verified" : "IP Location"}
                    </span>
                  </div>

                  {session.latitude && session.longitude ? (
                    <LiveMap lat={session.latitude} lon={session.longitude} height="140px" zoom={12} />
                  ) : (
                    <div className="h-28 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <MapPin className="w-5 h-5 mx-auto mb-1 opacity-40" />
                        <p className="text-[11px]">No GPS data</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="p-1.5 bg-blue-50 rounded-lg"><Monitor className="w-3.5 h-3.5 text-blue-500" /></div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">
                        {session.deviceInfo.os} · {session.deviceInfo.browser}
                      </div>
                      <div className="text-xs text-gray-400">{session.deviceInfo.deviceType}</div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                      <Activity className="w-3 h-3 text-blue-400" /> Interactions
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { icon: <Mouse className="w-3.5 h-3.5" />, label: "Moves", value: session.mouseMovements },
                        { icon: <MousePointer2 className="w-3.5 h-3.5" />, label: "Clicks", value: session.clicks },
                        { icon: <Keyboard className="w-3.5 h-3.5" />, label: "Keys", value: session.keyPresses },
                      ].map(({ icon, label, value }) => (
                        <div key={label} className="bg-gray-50 rounded-xl p-2.5 text-center border border-gray-100">
                          <div className="flex justify-center text-blue-400 mb-1">{icon}</div>
                          <div className="text-base font-bold text-gray-800">{value}</div>
                          <div className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`rounded-xl border p-3.5 ${
                    isHigh ? "bg-red-50 border-red-100" : isMed ? "bg-amber-50 border-amber-100" : "bg-green-50 border-green-100"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className={`w-3.5 h-3.5 ${isHigh ? "text-red-500" : isMed ? "text-amber-500" : "text-green-600"}`} />
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${isHigh ? "text-red-600" : isMed ? "text-amber-600" : "text-green-700"}`}>
                        AI Security Insight
                      </span>
                    </div>
                    <div className="space-y-1 mb-2">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Risk Factors</div>
                      {session.riskReasons.map((r, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <AlertTriangle className={`w-3 h-3 mt-0.5 shrink-0 ${isHigh ? "text-red-400" : isMed ? "text-amber-400" : "text-green-500"}`} />
                          <span className="text-xs text-gray-600">{r}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-white/60 pt-2 space-y-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recommendations</div>
                      {(isHigh
                        ? ["Enable biometric login", "Verify device identity", "Request location access"]
                        : isMed ? ["Enable biometric login", "Verify device"]
                        : ["Session appears normal", "Maintain secure browsing"]
                      ).map((r, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <ShieldCheck className="w-3 h-3 mt-0.5 shrink-0 text-blue-500" />
                          <span className="text-xs text-gray-600">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
