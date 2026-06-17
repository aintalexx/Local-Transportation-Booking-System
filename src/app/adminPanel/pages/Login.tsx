import { useState, useRef } from "react";
import { Eye, EyeOff, LogIn, AlertCircle, Car, MapPin, Shield } from "lucide-react";

const MAROON      = "#3E0710";
const MAROON_MID  = "#6B0E1A";
const GOLD        = "#C49A1A";
const GOLD_LIGHT  = "#E8C547";

// Demo credentials shown in UI for capstone presentation
const DEMO_EMAIL    = "admin@arangkada.ph";
const DEMO_PASSWORD = "Admin@2025";

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [shake,       setShake]       = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ email: false, password: false });
  const formRef = useRef<HTMLDivElement>(null);

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const emailErr    = !email.trim();
    const passwordErr = !password.trim();
    setFieldErrors({ email: emailErr, password: passwordErr });

    if (emailErr || passwordErr) {
      setError("Please fill in all fields.");
      triggerShake();
      return;
    }

    // Accept demo credentials or any well-formed email + password ≥ 6 chars
    // Legacy demo admin login now requires the exact displayed credentials.
    const validEmail = email.trim().toLowerCase() === DEMO_EMAIL.toLowerCase();
    const validPass  = password === DEMO_PASSWORD;

    if (!validEmail || !validPass) {
      setError("Invalid credentials. Use the demo account shown below.");
      setFieldErrors({ email: !validEmail, password: !validPass });
      triggerShake();
      return;
    }

    setError("");
    setLoading(true);
    // Simulate a short auth delay for realism
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 900);
  }

  function fillDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError("");
    setFieldErrors({ email: false, password: false });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Left branding panel ─────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col w-[52%] relative overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${MAROON} 0%, ${MAROON_MID} 55%, #8B1A2A 100%)` }}
      >
        {/* Background route illustration */}
        <svg
          className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
          viewBox="0 0 600 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Road grid lines */}
          <line x1="150" y1="0" x2="150" y2="800" stroke="white" strokeWidth="18" strokeLinecap="round" />
          <line x1="400" y1="0" x2="400" y2="800" stroke="white" strokeWidth="14" strokeLinecap="round" />
          <line x1="0"   y1="250" x2="600" y2="250" stroke="white" strokeWidth="16" strokeLinecap="round" />
          <line x1="0"   y1="550" x2="600" y2="550" stroke="white" strokeWidth="12" strokeLinecap="round" />
          <line x1="0"   y1="400" x2="400" y2="400" stroke="white" strokeWidth="10" strokeLinecap="round" />
          {/* Road dashes */}
          <line x1="150" y1="0"   x2="150" y2="800" stroke={GOLD} strokeWidth="3" strokeDasharray="24 16" opacity="0.6" />
          <line x1="400" y1="0"   x2="400" y2="800" stroke={GOLD} strokeWidth="3" strokeDasharray="24 16" opacity="0.6" />
          <line x1="0"   y1="250" x2="600" y2="250" stroke={GOLD} strokeWidth="3" strokeDasharray="24 16" opacity="0.6" />
          <line x1="0"   y1="550" x2="600" y2="550" stroke={GOLD} strokeWidth="3" strokeDasharray="24 16" opacity="0.6" />
          {/* Intersection dots */}
          {[[150,250],[150,550],[400,250],[400,550]].map(([cx,cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="22" fill="white" />
          ))}
          {/* Route arc */}
          <path d="M 80 650 Q 150 400 280 250 Q 360 130 450 80" stroke={GOLD_LIGHT} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.5" />
          {/* Location pin markers */}
          <circle cx="80"  cy="650" r="10" fill={GOLD_LIGHT} opacity="0.7" />
          <circle cx="150" cy="400" r="8"  fill={GOLD_LIGHT} opacity="0.7" />
          <circle cx="280" cy="250" r="8"  fill={GOLD_LIGHT} opacity="0.7" />
          <circle cx="450" cy="80"  r="10" fill={GOLD_LIGHT} opacity="0.7" />
        </svg>

        {/* Gold top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: GOLD }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          {/* Logo + wordmark */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: GOLD }}
            >
              <Car size={20} className="text-white" />
            </div>
            <div>
              <p style={{ fontFamily: "'Noto Serif Display', serif", color: "#FAF5EE", fontWeight: 700, fontSize: "20px", lineHeight: 1, letterSpacing: "-0.02em" }}>
                Arangkada
              </p>
              <p style={{ color: GOLD, fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em" }}>
                TRANSPORTATION SYSTEM
              </p>
            </div>
          </div>

          {/* Center hero copy */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-6" style={{ borderColor: "rgba(196,154,26,0.4)", background: "rgba(196,154,26,0.12)" }}>
                <Shield size={11} style={{ color: GOLD }} />
                <span style={{ color: GOLD, fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em" }}>SECURE ADMIN PORTAL</span>
              </div>

              <h1 style={{ fontFamily: "'Noto Serif Display', serif", color: "#FAF5EE", fontWeight: 700, fontSize: "42px", lineHeight: 1.15, letterSpacing: "-0.02em" }}>
                Manage your<br />transport network<br />
                <span style={{ color: GOLD }}>with confidence.</span>
              </h1>

              <p className="mt-5" style={{ color: "rgba(250,245,238,0.65)", fontSize: "14.5px", lineHeight: 1.7, maxWidth: "360px" }}>
                Real-time driver monitoring, booking management, and route analytics — all in one secure platform built for Sta. Mesa, Manila.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="space-y-3">
              {[
                { icon: MapPin, text: "Live GPS tracking across Sta. Mesa service area" },
                { icon: Car,    text: "Driver approval workflow and compliance monitoring" },
                { icon: Shield, text: "Role-based access with encrypted admin authentication" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(196,154,26,0.18)", border: "1px solid rgba(196,154,26,0.3)" }}>
                    <Icon size={13} style={{ color: GOLD }} />
                  </div>
                  <p style={{ color: "rgba(250,245,238,0.7)", fontSize: "13px" }}>{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <p style={{ color: "rgba(250,245,238,0.35)", fontSize: "11px" }}>
              © 2025 Arangkada · Polytechnic University of the Philippines
            </p>
            <p style={{ color: "rgba(250,245,238,0.35)", fontSize: "11px" }}>v1.0.0</p>
          </div>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-10 overflow-y-auto relative" style={{ background: "#F5F0EB" }}>

        {/* Gold top accent bar — mirrors left panel */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${GOLD} 0%, ${GOLD_LIGHT} 60%, transparent 100%)`, opacity: 0.55 }} />

        {/* Dot-grid texture */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill={MAROON_MID} fillOpacity="0.1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        {/* Decorative ring — bottom-left */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: "-120px", left: "-100px",
            width: 340, height: 340,
            borderRadius: "50%",
            border: `40px solid ${MAROON}`,
            opacity: 0.05,
          }}
        />

        {/* Decorative ring — top-right */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-80px", right: "-80px",
            width: 240, height: 240,
            borderRadius: "50%",
            border: `28px solid ${GOLD}`,
            opacity: 0.1,
          }}
        />

        {/* Decorative inner ring — top-right */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-20px", right: "-20px",
            width: 130, height: 130,
            borderRadius: "50%",
            border: `16px solid ${GOLD}`,
            opacity: 0.12,
          }}
        />

        {/* Mobile logo (hidden on desktop) */}
        <div className="relative z-10 flex lg:hidden items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: MAROON_MID }}>
            <Car size={17} className="text-white" />
          </div>
          <div>
            <p style={{ fontFamily: "'Noto Serif Display', serif", fontWeight: 700, fontSize: "17px", lineHeight: 1, color: "#1A0A0D", letterSpacing: "-0.02em" }}>Arangkada</p>
            <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: MAROON_MID }}>TRANSPORTATION SYSTEM</p>
          </div>
        </div>

        {/* Elevated form card */}
        <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-xl border border-white/80 px-8 py-8" style={{ boxShadow: "0 8px 40px rgba(62,7,16,0.10), 0 1px 4px rgba(62,7,16,0.06)" }}>

          {/* Gold divider accent above heading */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}40)` }} />
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: MAROON_MID }}>
              <Shield size={12} className="text-white" />
            </div>
            <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${GOLD}40, transparent)` }} />
          </div>

          {/* Heading */}
          <div className="mb-7 text-center">
            <h2 style={{ fontWeight: 700, fontSize: "24px", letterSpacing: "-0.02em", color: "#1A0A0D" }}>
              Admin Portal
            </h2>
            <p className="text-muted-foreground mt-1.5" style={{ fontSize: "13px" }}>
              Sign in to access the management dashboard
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-red-200 bg-red-50 mb-5">
              <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-red-700 text-xs font-semibold leading-relaxed">{error}</p>
            </div>
          )}

          {/* Form */}
          <div
            ref={formRef}
            style={{ animation: shake ? "shake 0.45s ease" : "none" }}
          >
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors(f => ({ ...f, email: false })); setError(""); }}
                  placeholder="admin@arangkada.ph"
                  autoComplete="email"
                  className={`w-full px-4 py-2.5 text-sm rounded-xl border transition-all focus:outline-none focus:ring-2 bg-white text-foreground placeholder:text-muted-foreground/50 ${
                    fieldErrors.email
                      ? "border-red-300 focus:ring-red-400/30"
                      : "border-border hover:border-border/80 focus:ring-amber-700/20 focus:border-amber-800/30"
                  }`}
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-foreground" htmlFor="password">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs font-semibold hover:underline transition-colors"
                    style={{ color: MAROON_MID }}
                    onClick={() => {
                      setError("");
                      alert("Password reset instructions will be sent to the registered admin email.");
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFieldErrors(f => ({ ...f, password: false })); setError(""); }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className={`w-full px-4 py-2.5 pr-10 text-sm rounded-xl border transition-all focus:outline-none focus:ring-2 bg-white text-foreground placeholder:text-muted-foreground/50 ${
                      fieldErrors.password
                        ? "border-red-300 focus:ring-red-400/30"
                        : "border-border hover:border-border/80 focus:ring-amber-700/20 focus:border-amber-800/30"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Login button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                style={{ background: `linear-gradient(135deg, ${MAROON_MID} 0%, #8B1A2A 100%)` }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>
                    <LogIn size={15} />
                    Sign In to Dashboard
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Demo credentials */}
          <div className="mt-6 rounded-xl p-4" style={{ background: "#FDF8F0", border: `1px solid ${GOLD}30` }}>
            <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: MAROON_MID }}>
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: `${GOLD}25`, color: GOLD, border: `1px solid ${GOLD}50` }}>★</span>
              Demo Credentials
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Email</span>
                <span className="text-xs font-mono font-semibold text-foreground">{DEMO_EMAIL}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Password</span>
                <span className="text-xs font-mono font-semibold text-foreground">{DEMO_PASSWORD}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={fillDemo}
              className="mt-3 w-full py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}40`, color: MAROON_MID }}
              onMouseEnter={e => (e.currentTarget.style.background = `${GOLD}28`)}
              onMouseLeave={e => (e.currentTarget.style.background = `${GOLD}15`)}
            >
              Fill demo credentials
            </button>
          </div>
        </div>

        {/* Footer — outside the card, sits in the panel */}
        <p className="relative z-10 text-center text-xs text-muted-foreground mt-5 leading-relaxed">
          Authorized personnel only. All access is logged and monitored.<br />
          <span className="font-semibold" style={{ color: MAROON_MID }}>Arangkada</span> · Sta. Mesa, Manila · PUP Capstone 2025
        </p>
      </div>

      {/* Shake keyframe injected inline */}
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          18%      { transform: translateX(-7px); }
          36%      { transform: translateX(7px); }
          54%      { transform: translateX(-5px); }
          72%      { transform: translateX(5px); }
          90%      { transform: translateX(-2px); }
        }
      `}</style>
    </div>
  );
}
