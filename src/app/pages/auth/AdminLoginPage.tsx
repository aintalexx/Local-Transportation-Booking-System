import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { AlertCircle, Car, Eye, EyeOff, LogIn, MapPin, Shield } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "../../context/UserContext";
import { authenticateUser, getAllUsers, updateUser, type UserData } from "../../utils/userDatabase";
import { formatPHPhoneInput } from "../../utils/validators";
import { signInWithEmailPassword, signUpWithEmailPassword } from "../../utils/supabaseAuth";
import { supabase } from "../../lib/supabase";

const MAROON = "#3E0710";
const MAROON_MID = "#6B0E1A";
const MAROON_LIGHT = "#8B1A2A";
const GOLD = "#C49A1A";
const GOLD_LIGHT = "#E8C547";

const DEFAULT_ADMIN_EMAIL = "admin@arangkada.ph";
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "Admin@2025";

function getDefaultAdminUser(): UserData {
  return {
    username: DEFAULT_ADMIN_USERNAME,
    password: DEFAULT_ADMIN_PASSWORD,
    phoneNumber: "09999999999",
    surname: "Administrator",
    firstName: "System",
    middleName: "",
    suffix: "",
    email: DEFAULT_ADMIN_EMAIL,
    emailConfirmed: true,
    birthdate: "2000-01-01",
    role: "admin",
    guardianName: "",
    guardianPhone: "",
    rating: 5,
    totalTrips: 0,
    totalEarnings: 0,
    memberSince: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    approvalStatus: "approved",
    accountStatus: "Active",
    registrationDate: new Date().toISOString(),
    profilePhoto: "",
  };
}

function createAdminSession(user: UserData): UserData {
  return {
    ...user,
    password: "",
    role: "admin",
    approvalStatus: "approved",
    accountStatus: "Active",
    emailConfirmed: true,
  };
}

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useUser();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ identifier: false, password: false });
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (user?.role === "admin") {
      navigate("/admin", { replace: true });
    }
  }, [navigate, user]);

  const triggerShake = () => {
    setShake(true);
    window.setTimeout(() => setShake(false), 450);
  };

  const failLogin = (message: string, fields = { identifier: false, password: true }) => {
    setError(message);
    setFieldErrors(fields);
    triggerShake();
  };

  const completeAdminLogin = (adminUser: UserData) => {
    setUser(createAdminSession(adminUser), { rememberTrustedDevice: false });
    toast.success("Admin login successful!");
    const returnPath = (location.state as { from?: string } | null)?.from;
    navigate(returnPath?.startsWith("/admin") ? returnPath : "/admin", { replace: true });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();
    const identifierMissing = !cleanIdentifier;
    const passwordMissing = !cleanPassword;

    setFieldErrors({ identifier: identifierMissing, password: passwordMissing });

    if (identifierMissing || passwordMissing) {
      failLogin("Please enter your admin credentials.", {
        identifier: identifierMissing,
        password: passwordMissing,
      });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const normalizedIdentifier = cleanIdentifier.toLowerCase();
      const normalizedPhone = formatPHPhoneInput(cleanIdentifier);
      const localAccount = getAllUsers().find(account =>
        account.username.toLowerCase() === normalizedIdentifier ||
        (account.email && account.email.toLowerCase().trim() === normalizedIdentifier) ||
        (account.phoneNumber && formatPHPhoneInput(account.phoneNumber) === normalizedPhone)
      );
      const localAdmin = localAccount?.role === "admin" ? localAccount : null;
      const defaultAdminAttempt =
        normalizedIdentifier === DEFAULT_ADMIN_EMAIL ||
        normalizedIdentifier === DEFAULT_ADMIN_USERNAME;
      const targetEmail =
        localAdmin?.email ||
        (cleanIdentifier.includes("@") ? normalizedIdentifier : "") ||
        (defaultAdminAttempt ? DEFAULT_ADMIN_EMAIL : "");

      if (localAccount && localAccount.role !== "admin") {
        failLogin(
          localAccount.password === cleanPassword
            ? "This account does not have admin access."
            : "Invalid admin credentials."
        );
        return;
      }

      if (supabase && targetEmail) {
        try {
          const supabaseUser = await signInWithEmailPassword(targetEmail, cleanPassword);
          if (supabaseUser?.role === "admin") {
            completeAdminLogin(supabaseUser);
            return;
          }

          if (supabaseUser) {
            failLogin("This account does not have admin access.");
            return;
          }
        } catch (supabaseError) {
          const canUseDefaultFallback = defaultAdminAttempt && cleanPassword === DEFAULT_ADMIN_PASSWORD;
          if (!canUseDefaultFallback && !localAdmin) {
            failLogin("Invalid admin credentials.");
            return;
          }
        }
      }

      if (localAdmin) {
        const localAuthed = authenticateUser(localAdmin.email || localAdmin.username, cleanPassword);
        if (localAuthed?.role === "admin") {
          completeAdminLogin(localAuthed);
          return;
        }

        failLogin("Invalid admin credentials.");
        return;
      }

      if (defaultAdminAttempt && cleanPassword === DEFAULT_ADMIN_PASSWORD) {
        let adminUser = getDefaultAdminUser();

        if (supabase) {
          try {
            const createdAdmin = await signUpWithEmailPassword(adminUser);
            if (createdAdmin) {
              adminUser = {
                ...adminUser,
                ...createdAdmin,
                role: "admin",
                approvalStatus: "approved",
                accountStatus: "Active",
                emailConfirmed: true,
              };
            }
          } catch (signupError) {
            console.info("Default admin already exists in Supabase or could not be created from client.", signupError);
          }
        }

        updateUser(DEFAULT_ADMIN_USERNAME, adminUser);
        completeAdminLogin(adminUser);
        return;
      }

      failLogin("Invalid admin credentials.");
    } catch (loginError) {
      console.error("Admin login exception:", loginError);
      failLogin("Invalid admin credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen overflow-hidden bg-[#F5F0EB]">
      <section
        className="relative hidden w-[52%] overflow-hidden lg:flex"
        style={{ background: `linear-gradient(160deg, ${MAROON} 0%, ${MAROON_MID} 55%, ${MAROON_LIGHT} 100%)` }}
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-10"
          viewBox="0 0 600 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <line x1="150" y1="0" x2="150" y2="800" stroke="white" strokeWidth="18" strokeLinecap="round" />
          <line x1="400" y1="0" x2="400" y2="800" stroke="white" strokeWidth="14" strokeLinecap="round" />
          <line x1="0" y1="250" x2="600" y2="250" stroke="white" strokeWidth="16" strokeLinecap="round" />
          <line x1="0" y1="550" x2="600" y2="550" stroke="white" strokeWidth="12" strokeLinecap="round" />
          <line x1="0" y1="400" x2="400" y2="400" stroke="white" strokeWidth="10" strokeLinecap="round" />
          <line x1="150" y1="0" x2="150" y2="800" stroke={GOLD} strokeWidth="3" strokeDasharray="24 16" opacity="0.6" />
          <line x1="400" y1="0" x2="400" y2="800" stroke={GOLD} strokeWidth="3" strokeDasharray="24 16" opacity="0.6" />
          <line x1="0" y1="250" x2="600" y2="250" stroke={GOLD} strokeWidth="3" strokeDasharray="24 16" opacity="0.6" />
          <line x1="0" y1="550" x2="600" y2="550" stroke={GOLD} strokeWidth="3" strokeDasharray="24 16" opacity="0.6" />
          {[[150, 250], [150, 550], [400, 250], [400, 550]].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="22" fill="white" />
          ))}
          <path d="M 80 650 Q 150 400 280 250 Q 360 130 450 80" stroke={GOLD_LIGHT} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.5" />
          <circle cx="80" cy="650" r="10" fill={GOLD_LIGHT} opacity="0.7" />
          <circle cx="150" cy="400" r="8" fill={GOLD_LIGHT} opacity="0.7" />
          <circle cx="280" cy="250" r="8" fill={GOLD_LIGHT} opacity="0.7" />
          <circle cx="450" cy="80" r="10" fill={GOLD_LIGHT} opacity="0.7" />
        </svg>

        <div className="absolute inset-x-0 top-0 h-1" style={{ background: GOLD }} />

        <div className="relative z-10 flex min-h-screen flex-col px-12 py-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg" style={{ background: GOLD }}>
              <Car size={20} className="text-white" />
            </div>
            <div>
              <p className="font-serif text-xl font-bold leading-none text-[#FAF5EE]">Arangkada</p>
              <p className="text-[9px] font-bold tracking-[0.12em]" style={{ color: GOLD }}>
                TRANSPORTATION SYSTEM
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center">
            <div className="mb-8">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1.5" style={{ borderColor: "rgba(196,154,26,0.4)", background: "rgba(196,154,26,0.12)" }}>
                <Shield size={11} style={{ color: GOLD }} />
                <span className="text-[10px] font-bold tracking-[0.08em]" style={{ color: GOLD }}>
                  SECURE ADMIN PORTAL
                </span>
              </div>

              <h1 className="font-serif text-[42px] font-bold leading-[1.15] text-[#FAF5EE]">
                Manage your<br />transport network<br />
                <span style={{ color: GOLD }}>with confidence.</span>
              </h1>

              <p className="mt-5 max-w-[360px] text-[14.5px] leading-7 text-[#FAF5EE]/65">
                Real-time driver monitoring, booking management, and route analytics, all in one secure platform built for Sta. Mesa, Manila.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { icon: MapPin, text: "Live GPS tracking across Sta. Mesa service area" },
                { icon: Car, text: "Driver approval workflow and compliance monitoring" },
                { icon: Shield, text: "Role-based access with encrypted admin authentication" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(196,154,26,0.18)", border: "1px solid rgba(196,154,26,0.3)" }}>
                    <Icon size={13} style={{ color: GOLD }} />
                  </div>
                  <p className="text-[13px] text-[#FAF5EE]/70">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-[#FAF5EE]/35">2025 Arangkada - Polytechnic University of the Philippines</p>
            <p className="text-[11px] text-[#FAF5EE]/35">v1.0.0</p>
          </div>
        </div>
      </section>

      <section className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10">
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${GOLD} 0%, ${GOLD_LIGHT} 60%, transparent 100%)`, opacity: 0.55 }} />
        <svg className="pointer-events-none absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="admin-login-dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill={MAROON_MID} fillOpacity="0.1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#admin-login-dots)" />
        </svg>
        <div className="pointer-events-none absolute -bottom-[120px] -left-[100px] h-[340px] w-[340px] rounded-full border-[40px] opacity-5" style={{ borderColor: MAROON }} />
        <div className="pointer-events-none absolute -right-20 -top-20 h-[240px] w-[240px] rounded-full border-[28px] opacity-10" style={{ borderColor: GOLD }} />
        <div className="pointer-events-none absolute -right-5 -top-5 h-[130px] w-[130px] rounded-full border-[16px] opacity-10" style={{ borderColor: GOLD }} />

        <div className="relative z-10 mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: MAROON_MID }}>
            <Car size={17} className="text-white" />
          </div>
          <div>
            <p className="font-serif text-[17px] font-bold leading-none text-[#1A0A0D]">Arangkada</p>
            <p className="text-[9px] font-bold tracking-[0.1em]" style={{ color: MAROON_MID }}>TRANSPORTATION SYSTEM</p>
          </div>
        </div>

        <div
          className="relative z-10 w-full max-w-sm rounded-2xl border border-white/80 bg-white px-8 py-8 shadow-xl"
          style={{
            boxShadow: "0 8px 40px rgba(62,7,16,0.10), 0 1px 4px rgba(62,7,16,0.06)",
            animation: shake ? "admin-login-shake 0.45s ease" : "none",
          }}
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}40)` }} />
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ background: MAROON_MID }}>
              <Shield size={12} className="text-white" />
            </div>
            <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${GOLD}40, transparent)` }} />
          </div>

          <div className="mb-7 text-center">
            <h2 className="text-2xl font-bold text-[#1A0A0D]">Admin Portal</h2>
            <p className="mt-1.5 text-[13px] text-[#6f5c5f]">Sign in to access the management dashboard</p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
              <p className="text-xs font-semibold leading-relaxed text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#1A0A0D]" htmlFor="admin-identifier">
                Email Address
              </label>
              <input
                id="admin-identifier"
                type="text"
                value={identifier}
                onChange={(event) => {
                  setIdentifier(event.target.value);
                  setFieldErrors(current => ({ ...current, identifier: false }));
                  setError("");
                }}
                placeholder="admin@arangkada.ph"
                autoComplete="username"
                className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[#1A0A0D] outline-none transition-all placeholder:text-[#9f8e91] focus:ring-2 ${
                  fieldErrors.identifier
                    ? "border-red-300 focus:ring-red-400/30"
                    : "border-[#e2d2cf] hover:border-[#d2bfbc] focus:border-[#8B1A2A]/30 focus:ring-[#8B1A2A]/20"
                }`}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#1A0A0D]" htmlFor="admin-password">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFieldErrors(current => ({ ...current, password: false }));
                    setError("");
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={`w-full rounded-xl border bg-white px-4 py-2.5 pr-10 text-sm text-[#1A0A0D] outline-none transition-all placeholder:text-[#9f8e91] focus:ring-2 ${
                    fieldErrors.password
                      ? "border-red-300 focus:ring-red-400/30"
                      : "border-[#e2d2cf] hover:border-[#d2bfbc] focus:border-[#8B1A2A]/30 focus:ring-[#8B1A2A]/20"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(current => !current)}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#8d7f7f] transition-colors hover:text-[#1A0A0D]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2.5 rounded-xl py-2.5 text-sm font-bold text-white shadow-md transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              style={{ background: `linear-gradient(135deg, ${MAROON_MID} 0%, ${MAROON_LIGHT} 100%)` }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Signing in...
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

        <p className="relative z-10 mt-5 text-center text-xs leading-relaxed text-[#7d6b6b]">
          Authorized personnel only. All access is logged and monitored.<br />
          <span className="font-semibold" style={{ color: MAROON_MID }}>Arangkada</span> - Sta. Mesa, Manila - PUP Capstone 2025
        </p>
      </section>

      <style>{`
        @keyframes admin-login-shake {
          0%, 100% { transform: translateX(0); }
          18% { transform: translateX(-7px); }
          36% { transform: translateX(7px); }
          54% { transform: translateX(-5px); }
          72% { transform: translateX(5px); }
          90% { transform: translateX(-2px); }
        }
      `}</style>
    </div>
  );
}
