import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, ShieldAlert, LogOut, Clock, Activity, Cpu,
  MapPin, Loader2, RefreshCw, Globe, MousePointer2, Keyboard,
  Mouse, Brain, CreditCard, X, BadgeCheck, Zap
} from "lucide-react";
import { useGetSession, useUpdateInteractions, useCalculateRisk } from "@/api";
import { useToast } from "@/hooks/use-toast";
import LiveMap from "@/components/LiveMap";

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4, ease: "easeOut" } }),
};

function Card({ title, icon, children, index, className = "" }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; index: number; className?: string;
}) {
  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={index}
      whileHover={{ y: -3, boxShadow: "0 12px 40px rgba(0,0,0,0.09)" }}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 transition-shadow ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-blue-50 text-blue-500">{icon}</div>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</span>
      </div>
      {children}
    </motion.div>
  );
}

const MERCHANTS = [
  { name: "Amazon India", type: "E-commerce", icon: "🛍" },
  { name: "Zomato", type: "Food delivery", icon: "🍕" },
  { name: "UPI Transfer", type: "Peer payment", icon: "📲" },
  { name: "BookMyShow", type: "Entertainment", icon: "🎬" },
  { name: "IRCTC Tickets", type: "Travel", icon: "🚆" },
  { name: "Jio Recharge", type: "Telecom", icon: "📱" },
  { name: "ATM Withdrawal", type: "Cash", icon: "🏧" },
  { name: "International Txn", type: "Foreign", icon: "✈" },
  { name: "Swiggy", type: "Food delivery", icon: "🥡" },
  { name: "Flipkart", type: "E-commerce", icon: "📦" },
];

type Transaction = {
  id: string;
  merchant: (typeof MERCHANTS)[number];
  amount: number;
  fraudScore: number;
  status: "allowed" | "flagged" | "blocked";
  time: Date;
  reason: string;
};

function makeTxn(locationPermission: boolean, riskScore: number): Transaction {
  const merchant = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)];
  const amount = Math.floor(Math.random() * 9800) + 50;
  let score = Math.floor(Math.random() * 30);
  const reasons: string[] = [];
  if (amount > 5000) { score += 20; reasons.push("High value transaction"); }
  if (merchant.type === "Foreign") { score += 25; reasons.push("International transaction"); }
  if (merchant.type === "Cash") { score += 15; reasons.push("Cash withdrawal"); }
  if (!locationPermission) { score += 15; reasons.push("Location unverified"); }
  if (riskScore > 40) { score += Math.floor(riskScore / 4); reasons.push("Elevated session risk"); }
  score = Math.min(score + Math.floor(Math.random() * 10), 100);
  const status: Transaction["status"] = score >= 70 ? "blocked" : score >= 45 ? "flagged" : "allowed";
  return {
    id: crypto.randomUUID().slice(0, 8), merchant, amount, fraudScore: score, status,
    time: new Date(), reason: reasons.length ? reasons[0] : "Normal behavior pattern",
  };
}

function TxnRow({ txn }: { txn: Transaction }) {
  const statusCfg = {
    allowed: { label: "Allowed", cls: "bg-green-50 text-green-600 border-green-200" },
    flagged: { label: "Flagged", cls: "bg-amber-50 text-amber-600 border-amber-200" },
    blocked: { label: "Blocked", cls: "bg-red-50 text-red-600 border-red-200" },
  }[txn.status];
  const barColor = txn.fraudScore >= 70 ? "bg-red-500" : txn.fraudScore >= 45 ? "bg-amber-400" : "bg-green-500";
  return (
    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-lg shrink-0">
        {txn.merchant.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-gray-800 truncate">{txn.merchant.name}</span>
          <span className="text-sm font-bold text-gray-900 shrink-0">₹{txn.amount.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${txn.fraudScore}%`, transition: "width 0.5s ease" }} />
          </div>
          <span className="text-[10px] text-gray-400 shrink-0">{txn.fraudScore}% fraud</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[10px] text-gray-400">{txn.reason}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${statusCfg.cls}`}>
            {statusCfg.label}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const sessionId = localStorage.getItem("finshield_session");
  const [now, setNow] = useState(new Date());
  const mouseRef = useRef(0), clickRef = useRef(0), keyRef = useRef(0);
  const [counts, setCounts] = useState({ mouse: 0, clicks: 0, keys: 0 });
  const [riskStatus, setRiskStatus] = useState<"analyzing" | "secure" | "suspicious">("analyzing");
  const [riskScore, setRiskScore] = useState(0);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => { if (!sessionId) setLocation("/"); }, [sessionId]);

  const { data: session, isLoading } = useGetSession(sessionId ?? "", { query: { enabled: !!sessionId } });
  const updateInteractions = useUpdateInteractions();
  const calculateRisk = useCalculateRisk();

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const onMove = () => mouseRef.current++;
    const onClick = () => clickRef.current++;
    const onKey = () => keyRef.current++;
    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!sessionId || !session) return;
    const iv = setInterval(() => {
      const mm = mouseRef.current, cl = clickRef.current, kp = keyRef.current;
      setCounts({ mouse: mm, clicks: cl, keys: kp });
      updateInteractions.mutate({ sessionId, data: { mouseMovements: mm, clicks: cl, keyPresses: kp } });
      calculateRisk.mutate({
        data: { locationPermission: session.locationPermission, mouseMovements: mm, clicks: cl, keyPresses: kp, isNewSession: false }
      }, {
        onSuccess: (d) => { setRiskScore(d.score); setRiskStatus(d.level === "low" ? "secure" : "suspicious"); },
      });
    }, 5000);
    return () => clearInterval(iv);
  }, [sessionId, session]);

  useEffect(() => {
    if (!session) return;
    const initial = Array.from({ length: 4 }, () => makeTxn(session.locationPermission, riskScore));
    setTransactions(initial);
    const iv = setInterval(() => {
      setTransactions(prev => [makeTxn(session.locationPermission, riskScore), ...prev].slice(0, 8));
    }, 7000);
    return () => clearInterval(iv);
  }, [session?.id]);

  if (isLoading || !session) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-200">
            <ShieldCheck className="w-5 h-5 text-white" />
          </motion.div>
          <span className="text-sm text-gray-400">Loading secure session…</span>
        </div>
      </div>
    );
  }

  const elapsed = Math.floor((now.getTime() - new Date(session.loginTime).getTime()) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const hh = Math.floor(elapsed / 3600), mm = Math.floor((elapsed % 3600) / 60), ss = elapsed % 60;

  const riskColor = riskScore < 30 ? "text-green-600" : riskScore < 60 ? "text-amber-500" : "text-red-600";
  const riskBg = riskScore < 30 ? "bg-green-500" : riskScore < 60 ? "bg-amber-500" : "bg-red-500";
  const riskLabel = riskScore < 30 ? "Low Risk" : riskScore < 60 ? "Medium Risk" : "High Risk";
  const trustScore = Math.max(0, 100 - riskScore);
  const trustLabel = trustScore >= 70 ? "High Confidence" : trustScore >= 40 ? "Moderate" : "Low Confidence";
  const trustColor = trustScore >= 70 ? "text-green-600" : trustScore >= 40 ? "text-amber-500" : "text-red-500";
  const trustBg = trustScore >= 70 ? "bg-green-500" : trustScore >= 40 ? "bg-amber-400" : "bg-red-500";
  const blockedTxns = transactions.filter(t => t.status === "blocked").length;
  const flaggedTxns = transactions.filter(t => t.status === "flagged").length;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="fixed top-0 right-0 w-96 h-96 bg-blue-50 rounded-full opacity-60 blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/4" />

      <AnimatePresence>
        {riskScore >= 60 && !alertDismissed && (
          <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white px-5 py-2.5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2.5 text-sm font-medium">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              High fraud risk detected. Please verify your identity immediately.
            </div>
            <button onClick={() => setAlertDismissed(true)} className="hover:opacity-80 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className={`bg-white border-b border-gray-100 sticky z-50 shadow-sm ${riskScore >= 60 && !alertDismissed ? "top-10" : "top-0"}`}>
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow shadow-blue-200">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">FinShield AI</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-gray-400 hidden sm:block">{format(now, "HH:mm:ss")}</span>
            <button onClick={() => { localStorage.removeItem("finshield_session"); setLocation("/"); }}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all">
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-7 relative z-10 space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-0.5">Welcome back</p>
            <h1 className="text-2xl font-bold text-gray-900">{session.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{format(new Date(session.loginTime), "EEEE, dd MMMM yyyy 'at' h:mm a")}</p>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={riskStatus} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-sm font-semibold ${
                riskStatus === "secure" ? "bg-green-50 border-green-200 text-green-700"
                : riskStatus === "suspicious" ? "bg-red-50 border-red-200 text-red-700"
                : "bg-blue-50 border-blue-200 text-blue-600"
              }`}>
              {riskStatus === "analyzing" ? <Loader2 className="w-4 h-4 animate-spin" />
               : riskStatus === "secure" ? <ShieldCheck className="w-4 h-4" />
               : <ShieldAlert className="w-4 h-4" />}
              {riskStatus === "analyzing" ? "Analyzing session…"
               : riskStatus === "secure" ? "Your session is secure"
               : "Suspicious activity detected"}
              {riskStatus === "secure" && <span className="w-2 h-2 rounded-full bg-green-500 live-dot" />}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card title="Session Timer" icon={<Clock className="w-3.5 h-3.5" />} index={0}>
            <div className="text-3xl font-mono font-bold text-gray-900 tracking-tight">{pad(hh)}:{pad(mm)}:{pad(ss)}</div>
            <p className="text-xs text-gray-400 mt-1">Active since login</p>
          </Card>
          <Card title="Current Time" icon={<Globe className="w-3.5 h-3.5" />} index={1}>
            <div className="text-3xl font-mono font-bold text-gray-900 tracking-tight">{format(now, "HH:mm:ss")}</div>
            <p className="text-xs text-gray-400 mt-1">{format(now, "EEE, dd MMM yyyy")}</p>
          </Card>
          <Card title="Device Info" icon={<Cpu className="w-3.5 h-3.5" />} index={2}>
            <div className="text-lg font-bold text-gray-800">{session.deviceInfo.os}</div>
            <div className="text-sm text-gray-400">{session.deviceInfo.browser}</div>
            <span className="inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wide bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
              {session.deviceInfo.deviceType}
            </span>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card title="AI Risk Score" icon={<Activity className="w-3.5 h-3.5" />} index={3}>
            <div className="flex items-end gap-2 mb-2">
              <span className={`text-5xl font-black tracking-tight ${riskColor}`}>{riskScore}</span>
              <span className="text-sm text-gray-400 mb-1.5">/ 100</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-2">
              <motion.div className={`h-full rounded-full ${riskBg}`}
                initial={{ width: 0 }} animate={{ width: `${Math.min(riskScore, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }} />
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
              riskScore < 30 ? "risk-low" : riskScore < 60 ? "risk-medium" : "risk-high"
            }`}>{riskLabel}</span>
          </Card>

          <Card title="Genuine User Score" icon={<BadgeCheck className="w-3.5 h-3.5" />} index={4}>
            <div className="flex items-end gap-2 mb-2">
              <span className={`text-5xl font-black tracking-tight ${trustColor}`}>{trustScore}</span>
              <span className="text-sm text-gray-400 mb-1.5">/ 100</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-2">
              <motion.div className={`h-full rounded-full ${trustBg}`}
                initial={{ width: 0 }} animate={{ width: `${trustScore}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }} />
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
              trustScore >= 70 ? "risk-low" : trustScore >= 40 ? "risk-medium" : "risk-high"
            }`}>{trustLabel}</span>
          </Card>

          <Card title="Session Activity" icon={<MousePointer2 className="w-3.5 h-3.5" />} index={5}>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {[
                { label: "Moves", value: counts.mouse, icon: <Mouse className="w-3 h-3" /> },
                { label: "Clicks", value: counts.clicks, icon: <MousePointer2 className="w-3 h-3" /> },
                { label: "Keys", value: counts.keys, icon: <Keyboard className="w-3 h-3" /> },
              ].map(({ label, value, icon }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-2.5 text-center border border-gray-100">
                  <div className="flex justify-center mb-0.5 text-blue-400">{icon}</div>
                  <div className="text-lg font-bold text-gray-800">{value}</div>
                  <div className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <RefreshCw className="w-3 h-3 text-blue-400" /> Syncing every 5s
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card title="Live Payment Fraud Detection" icon={<CreditCard className="w-3.5 h-3.5" />} index={6}>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: "Scanned", value: transactions.length, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Flagged", value: flaggedTxns, color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Blocked", value: blockedTxns, color: "text-red-600", bg: "bg-red-50" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`${bg} rounded-xl p-2 text-center`}>
                  <div className={`text-xl font-black ${color}`}>{value}</div>
                  <div className="text-[10px] text-gray-500 font-medium">{label}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot inline-block" />
              New transaction every ~7 seconds
            </div>
            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto pr-1">
              <AnimatePresence mode="popLayout">
                {transactions.map(txn => <TxnRow key={txn.id} txn={txn} />)}
              </AnimatePresence>
            </div>
          </Card>

          <Card title="Session Location" icon={<MapPin className="w-3.5 h-3.5" />} index={7}>
            <div className="space-y-2 mb-3">
              <div className="text-xl font-bold text-gray-800">{session.city || "Unknown City"}</div>
              <div className="text-sm text-gray-400">{session.country || "Unknown"}</div>
              {session.latitude && session.longitude && (
                <div className="text-xs font-mono text-blue-400 bg-blue-50 px-2 py-1 rounded-lg inline-block">
                  {session.latitude.toFixed(5)}°N, {session.longitude.toFixed(5)}°E
                </div>
              )}
              {session.ip && <div className="text-xs font-mono text-gray-400">IP: {session.ip}</div>}
              <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                session.locationPermission ? "bg-green-50 text-green-600 border-green-200" : "bg-amber-50 text-amber-600 border-amber-200"
              }`}>
                {session.locationPermission ? "GPS Verified" : "IP Location"}
              </span>
            </div>
            {session.latitude && session.longitude ? (
              <LiveMap lat={session.latitude} lon={session.longitude} height="140px" />
            ) : (
              <div className="h-28 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <MapPin className="w-6 h-6 mx-auto mb-1 opacity-40" />
                  <p className="text-xs">Location unavailable</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={8}
          className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-xl bg-white/10"><Brain className="w-5 h-5" /></div>
            <div className="flex-1">
              <div className="font-bold text-base mb-1">AI Security Insight</div>
              {riskStatus === "secure"
                ? <><p className="text-blue-100 text-sm">Login is safe — no suspicious activity detected.</p>
                    <p className="text-blue-200/70 text-xs mt-0.5">Your device, location, and behavior patterns all appear normal.</p></>
                : riskStatus === "suspicious"
                ? <><p className="text-blue-100 text-sm">Risk detected — unusual signals in this session.</p>
                    <p className="text-blue-200/70 text-xs mt-0.5">Payment transactions are being monitored more closely.</p></>
                : <p className="text-blue-100 text-sm">Analyzing session and payment patterns in real-time…</p>}
            </div>
            {blockedTxns > 0 && (
              <div className="bg-white/10 rounded-xl px-3 py-2 text-center shrink-0">
                <div className="text-xl font-black">{blockedTxns}</div>
                <div className="text-xs text-blue-200">Blocked</div>
              </div>
            )}
          </div>
          {riskStatus === "secure" && (
            <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5">
              <Zap className="w-4 h-4 text-yellow-300 shrink-0" />
              <p className="text-xs text-blue-100">
                <span className="font-semibold text-white">False alarm prevention active —</span> your interaction patterns confirm genuine user behavior. Legitimate payments are not interrupted.
              </p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
