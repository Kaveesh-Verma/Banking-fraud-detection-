import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Lock, Eye, EyeOff, Loader2, Fingerprint,
  CheckCircle2, ArrowLeft, Smartphone, RotateCcw
} from "lucide-react";
import { useStartSession, useGetLocation, useHealthCheck } from "@/api";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  isBiometricSupported, registerBiometric,
  authenticateBiometric, hasBiometricRegistered, BIOMETRIC_CRED_KEY
} from "@/lib/biometric";

type Step = "details" | "otp" | "biometric" | "success";

const detailsSchema = z.object({
  name: z.string().min(2).regex(/^[A-Za-z\s]+$/, "Only alphabets allowed"),
  mobile: z.string().length(10).regex(/^\d+$/, "Only digits"),
});

function parseUA(ua: string) {
  let os = "Unknown", browser = "Unknown", deviceType = "Desktop";
  if (/android/i.test(ua)) { os = "Android"; deviceType = "Mobile"; }
  else if (/iphone|ipad/i.test(ua)) { os = "iOS"; deviceType = "Mobile"; }
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/mac os/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/chrome|crios/i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua)) browser = "Safari";
  return { os, browser, deviceType, userAgent: ua };
}

async function reverseGeocode(lat: number, lon: number): Promise<{ city: string; country: string }> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    const d = await r.json() as { address?: { city?: string; town?: string; village?: string; state?: string; country_code?: string } };
    const city = d.address?.city ?? d.address?.town ?? d.address?.village ?? d.address?.state ?? "Unknown";
    const country = (d.address?.country_code ?? "").toUpperCase();
    return { city, country };
  } catch {
    return { city: "Unknown", country: "" };
  }
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("details");
  const [showMobile, setShowMobile] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [pendingData, setPendingData] = useState<z.infer<typeof detailsSchema> | null>(null);
  const [geoData, setGeoData] = useState<{
    lat: number | null; lon: number | null; city: string | null;
    country: string | null; ip: string | null; permission: boolean;
  }>({ lat: null, lon: null, city: null, country: null, ip: null, permission: false });

  const { data: locationData } = useGetLocation();
  const { data: health } = useHealthCheck();
  const startSession = useStartSession();

  const form = useForm<z.infer<typeof detailsSchema>>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name: "", mobile: "" },
  });

  async function onDetailsSubmit(values: z.infer<typeof detailsSchema>) {
    setIsLocating(true);
    let lat: number | null = null, lon: number | null = null,
      city: string | null = null, country: string | null = null, permission = false;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000, enableHighAccuracy: true })
      );
      lat = pos.coords.latitude; lon = pos.coords.longitude; permission = true;
      const geo = await reverseGeocode(lat, lon);
      city = geo.city; country = geo.country;
    } catch {
      city = locationData?.city ?? null;
      country = locationData?.country ?? null;
    }
    setIsLocating(false);
    setGeoData({ lat, lon, city, country, ip: locationData?.ip ?? null, permission });
    setPendingData(values);
    localStorage.setItem("finshield_last_name", values.name);

    const code = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtp(code);
    toast({ title: "OTP Sent (Demo Mode)", description: `Your OTP is: ${code}` });
    setStep("otp");
  }

  function handleOtpChange(idx: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp]; next[idx] = digit; setOtp(next); setOtpError("");
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (!digit && idx > 0) otpRefs.current[idx - 1]?.focus();
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      const next = [...otp]; next[idx - 1] = ""; setOtp(next); otpRefs.current[idx - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    const next = [...otp];
    digits.forEach((d, i) => { if (i < 6) next[i] = d; });
    setOtp(next);
    otpRefs.current[Math.min(digits.length, 5)]?.focus();
    e.preventDefault();
  }

  async function verifyOtp() {
    const entered = otp.join("");
    if (entered.length < 6) { setOtpError("Please enter all 6 digits"); return; }
    if (entered !== generatedOtp) {
      setOtpError("Incorrect OTP. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
      return;
    }
    if (isBiometricSupported() && !hasBiometricRegistered()) {
      setStep("biometric");
    } else {
      await createSession();
    }
  }

  async function setupBiometric() {
    setBiometricLoading(true);
    const ok = await registerBiometric(pendingData?.mobile ?? "user");
    setBiometricLoading(false);
    if (ok) {
      toast({ title: "Biometric registered!", description: "You can now login with biometrics next time." });
    } else {
      toast({ title: "Biometric setup failed", description: "Skipping biometric setup.", variant: "destructive" });
    }
    await createSession();
  }

  async function createSession() {
    if (!pendingData) return;
    startSession.mutate({
      data: {
        name: pendingData.name, mobile: pendingData.mobile,
        deviceInfo: parseUA(navigator.userAgent),
        locationPermission: geoData.permission,
        latitude: geoData.lat, longitude: geoData.lon,
        city: geoData.city, country: geoData.country, ip: geoData.ip,
      }
    }, {
      onSuccess: (data) => {
        localStorage.setItem("finshield_session", data.id);
        setStep("success");
        setTimeout(() => setLocation("/dashboard"), 900);
      },
      onError: () => toast({ title: "Login failed", description: "Please try again.", variant: "destructive" }),
    });
  }

  async function biometricLogin() {
    setBiometricLoading(true);
    const ok = await authenticateBiometric();
    setBiometricLoading(false);
    if (ok) {
      const stored = localStorage.getItem(BIOMETRIC_CRED_KEY);
      if (stored) {
        const { userId } = JSON.parse(stored) as { userId: string };
        const fakeName = localStorage.getItem("finshield_last_name") ?? "User";
        setIsLocating(true);
        let lat = null, lon = null, city = null, country = null, permission = false;
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
          );
          lat = pos.coords.latitude; lon = pos.coords.longitude; permission = true;
          const geo = await reverseGeocode(lat, lon); city = geo.city; country = geo.country;
        } catch { /* use ip location */ }
        setIsLocating(false);
        startSession.mutate({
          data: {
            name: fakeName, mobile: userId, deviceInfo: parseUA(navigator.userAgent),
            locationPermission: permission, latitude: lat, longitude: lon,
            city, country, ip: locationData?.ip ?? null,
          }
        }, {
          onSuccess: (data) => {
            localStorage.setItem("finshield_session", data.id);
            setStep("success");
            setTimeout(() => setLocation("/dashboard"), 900);
          },
        });
      }
    } else {
      toast({ title: "Biometric failed", description: "Try again or use OTP login.", variant: "destructive" });
    }
  }

  useEffect(() => {
    if (step === "otp") setTimeout(() => otpRefs.current[0]?.focus(), 200);
  }, [step]);

  const currentStep = step === "details" ? 1 : step === "otp" ? 2 : 3;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="fixed top-0 left-0 w-96 h-96 bg-blue-100 rounded-full opacity-40 blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-0 right-0 w-80 h-80 bg-indigo-100 rounded-full opacity-30 blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="w-full max-w-sm relative z-10">

        <div className="flex flex-col items-center mb-7">
          <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
            <ShieldCheck className="w-7 h-7 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">FinShield AI</h1>
          <p className="text-sm text-gray-400 mt-1">AI-powered fraud protection</p>
        </div>

        {step !== "success" && (
          <div className="flex items-center justify-center gap-2 mb-5">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <motion.div animate={{ scale: currentStep === s ? 1.15 : 1 }}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    currentStep > s ? "bg-blue-500" : currentStep === s ? "bg-blue-600" : "bg-gray-200"
                  }`} />
                {s < 3 && <div className={`w-6 h-px ${currentStep > s ? "bg-blue-300" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-7">
          <AnimatePresence mode="wait">

            {step === "details" && (
              <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                  className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl mb-5 ${
                    health?.status === "ok"
                      ? "bg-green-50 text-green-700 border border-green-100"
                      : "bg-amber-50 text-amber-700 border border-amber-100"
                  }`}>
                  {health?.status === "ok"
                    ? <><span className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot inline-block" /> Secure connection established</>
                    : <><Loader2 className="w-3 h-3 animate-spin" /> Connecting…</>}
                </motion.div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onDetailsSubmit)} className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Rohan Sharma"
                            className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
                            {...field} onChange={(e) => field.onChange(e.target.value.replace(/[^A-Za-z\s]/g, ""))} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="mobile" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mobile Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input placeholder="10-digit number" type={showMobile ? "text" : "password"}
                              inputMode="numeric" maxLength={10}
                              className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white pr-10"
                              {...field} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))} />
                            <button type="button" onClick={() => setShowMobile(!showMobile)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                              {showMobile ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )} />
                    <motion.button type="submit" disabled={isLocating} whileTap={{ scale: 0.97 }}
                      className="w-full h-12 rounded-xl btn-gradient text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 ripple mt-1">
                      {isLocating
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Getting location…</>
                        : <><Smartphone className="w-4 h-4" /> Get OTP</>}
                    </motion.button>
                  </form>
                </Form>

                {hasBiometricRegistered() && (
                  <>
                    <div className="flex items-center gap-2 my-4 text-gray-300">
                      <div className="flex-1 h-px bg-gray-100" /><span className="text-xs">or</span><div className="flex-1 h-px bg-gray-100" />
                    </div>
                    <motion.button onClick={biometricLogin} disabled={biometricLoading || isLocating} whileTap={{ scale: 0.97 }}
                      className="w-full h-11 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 flex items-center justify-center gap-2 text-sm text-blue-600 font-semibold transition-all">
                      {biometricLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
                      Login with Biometric
                    </motion.button>
                  </>
                )}
              </motion.div>
            )}

            {step === "otp" && (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button onClick={() => setStep("details")} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-5">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                    <Smartphone className="w-6 h-6 text-blue-500" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Enter OTP</h2>
                  <p className="text-sm text-gray-400 mt-1">Sent to +91 {pendingData?.mobile?.slice(0, 3)}XXXXXXX</p>
                </div>

                <div className="flex gap-2 justify-center mb-4" onPaste={handleOtpPaste}>
                  {otp.map((d, i) => (
                    <input key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text" inputMode="numeric" maxLength={2} value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className={`w-11 h-12 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all bg-gray-50 focus:bg-white
                        ${d ? "border-blue-400 bg-white text-blue-600" : "border-gray-200 text-gray-900"}
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-100`}
                    />
                  ))}
                </div>

                <AnimatePresence>
                  {otpError && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="text-xs text-red-500 text-center mb-3">{otpError}</motion.p>
                  )}
                </AnimatePresence>

                <motion.button onClick={verifyOtp} disabled={startSession.isPending} whileTap={{ scale: 0.97 }}
                  className="w-full h-12 rounded-xl btn-gradient text-white font-semibold text-sm flex items-center justify-center gap-2 ripple">
                  {startSession.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4" /> Verify OTP</>}
                </motion.button>

                <button onClick={() => {
                  const code = String(Math.floor(100000 + Math.random() * 900000));
                  setGeneratedOtp(code); setOtp(["", "", "", "", "", ""]); setOtpError("");
                  toast({ title: "New OTP sent (Demo)", description: `Your OTP is: ${code}` });
                }} className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 font-medium">
                  <RotateCcw className="w-3.5 h-3.5" /> Resend OTP
                </button>
              </motion.div>
            )}

            {step === "biometric" && (
              <motion.div key="biometric" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center mx-auto mb-5 border-2 border-blue-100">
                  <Fingerprint className="w-10 h-10 text-blue-500" />
                </motion.div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Enable Biometric Login</h2>
                <p className="text-sm text-gray-400 mb-6">Use fingerprint or face ID for faster and more secure login next time.</p>
                <motion.button onClick={setupBiometric} disabled={biometricLoading} whileTap={{ scale: 0.97 }}
                  className="w-full h-12 rounded-xl btn-gradient text-white font-semibold text-sm flex items-center justify-center gap-2 ripple mb-3">
                  {biometricLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Fingerprint className="w-4 h-4" /> Setup Biometric</>}
                </motion.button>
                <button onClick={createSession} className="w-full text-xs text-gray-400 hover:text-gray-600 py-2">
                  Skip for now
                </button>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-8 gap-3">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
                  <CheckCircle2 className="w-14 h-14 text-green-500" />
                </motion.div>
                <p className="font-semibold text-gray-900">Authenticated!</p>
                <p className="text-sm text-gray-400">Redirecting to dashboard…</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          Secured by AI-powered fraud detection
        </p>
      </motion.div>
    </div>
  );
}
