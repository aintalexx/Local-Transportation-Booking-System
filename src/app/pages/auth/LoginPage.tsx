import { useState } from "react";
import { useNavigate } from "react-router";
import { User, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "../../context/UserContext";
import { authenticateUser, findUser, getAllUsers } from "../../utils/userDatabase";
import { formatPHPhoneInput } from "../../utils/validators";
import { resolveAuthEmailForLogin, signInWithEmailPassword } from "../../utils/supabaseAuth";
import { getRoleHomePath } from "../../utils/roleRouting";
import { getSupabaseDriverByPhone } from "../../utils/supabaseDrivers";
import { createDemoOtp } from "../../utils/demoOtp";
import { Phone } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const [loginType, setLoginType] = useState<"passenger" | "driver">("passenger");
  const [usernameOrPhone, setUsernameOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);

    if (loginType === "driver") {
      const phoneInput = driverPhone.trim();
      if (!phoneInput) {
        toast.error("Please enter your phone number");
        return;
      }

      setLoading(true);
      try {
        const normalizedPhone = formatPHPhoneInput(phoneInput);
        
        let dbDriver = await getSupabaseDriverByPhone(normalizedPhone);
        
        if (!dbDriver) {
          const localUser = findUser(normalizedPhone);
          if (localUser && localUser.role === "driver") {
            dbDriver = {
              id: localUser.supabaseId || localUser.username,
              phone: localUser.phoneNumber,
              first_name: localUser.firstName,
              middle_name: localUser.middleName || null,
              surname: localUser.surname,
              suffix: localUser.suffix || null,
              birthdate: localUser.birthdate,
              password: localUser.password,
              profile_photo: localUser.profilePhoto || null,
              valid_id_photo: localUser.validIdPhoto || null,
              orCrPhoto: localUser.orCrPhoto || null,
              clearance_photo: localUser.clearancePhoto || null,
              vehicle_photo: localUser.vehiclePhoto || null,
              license_number: localUser.licenseNumber || null,
              plate_number: localUser.plateNumber || null,
              vehicle_type: localUser.vehicleType || "Tricycle",
              approval_status: (localUser.approvalStatus as any) || "pending",
              account_status: "Active",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }
        }

        if (!dbDriver) {
          toast.error("Driver account not found. Please register first.");
          return;
        }

        const otp = createDemoOtp();
        toast.success(`Demo OTP: ${otp}`, { duration: 10000 });

        navigate("/otp", {
          state: {
            mode: "login",
            role: "driver",
            phoneNumber: normalizedPhone,
            generatedOtp: otp,
            userData: {
              supabaseId: dbDriver.id,
              username: `driver_${dbDriver.phone.replace(/\D/g, "")}`,
              phoneNumber: dbDriver.phone,
              firstName: dbDriver.first_name,
              middleName: dbDriver.middle_name || "",
              surname: dbDriver.surname,
              suffix: dbDriver.suffix || "",
              birthdate: dbDriver.birthdate,
              password: dbDriver.password,
              role: "driver" as const,
              approvalStatus: dbDriver.approval_status,
              accountStatus: dbDriver.account_status,
              vehicleType: dbDriver.vehicle_type,
              plateNumber: dbDriver.plate_number || "",
              licenseNumber: dbDriver.license_number || "",
              profilePhoto: dbDriver.profile_photo || "",
              validIdPhoto: dbDriver.valid_id_photo || "",
              orCrPhoto: dbDriver.or_cr_photo || "",
              clearancePhoto: dbDriver.clearance_photo || "",
              vehiclePhoto: dbDriver.vehicle_photo || "",
            }
          }
        });
      } catch (err) {
        toast.error("An error occurred during login. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
      return;
    }

    const loginIdentifier = usernameOrPhone.trim();
    const cleanPassword = password.trim();
    if (!loginIdentifier) {
      toast.error("Please enter your email or phone number");
      return;
    }
    if (!cleanPassword) {
      toast.error("Please enter your password");
      return;
    }

    setLoading(true);
    try {
      const normalizedPhone = formatPHPhoneInput(loginIdentifier);
      let exists = false;
      let isPassenger = false;
      let localUser = getAllUsers().find(user => 
        (user.email && user.email.toLowerCase().trim() === loginIdentifier.toLowerCase()) ||
        (user.phoneNumber && formatPHPhoneInput(user.phoneNumber) === normalizedPhone)
      );

      let targetEmail = localUser?.email || null;
      if (localUser) {
        exists = true;
        isPassenger = localUser.role === "passenger";
      }

      // Query Supabase profiles if not found or if we want to resolve the email
      let authEmail = await resolveAuthEmailForLogin(loginIdentifier);
      if (authEmail) {
        exists = true;
        if (!targetEmail) targetEmail = authEmail;
        if (supabase) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("email", authEmail)
            .maybeSingle();
          if (profile && profile.role === "passenger") {
            isPassenger = true;
          }
        }
      }

      // If the account does not exist, show "No account found. Please register first."
      if (!exists || !isPassenger) {
        toast.error("No account found. Please register first.");
        setLoading(false);
        return;
      }

      // Authenticate with Supabase if online and targetEmail is available
      if (supabase && targetEmail) {
        try {
          const supabaseUser = await signInWithEmailPassword(targetEmail, cleanPassword);
          if (supabaseUser) {
            supabaseUser.emailConfirmed = true; // Bypassing confirmation check
            setUser(supabaseUser);
            toast.success("Login successful!");
            navigate("/passenger");
            return;
          }
        } catch (supabaseError) {
          const msg = supabaseError instanceof Error ? supabaseError.message.toLowerCase() : "";
          if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed")) {
            // Bypassing confirmation check since the password check has passed
            let userToUse = localUser;
            if (!userToUse) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("email", targetEmail)
                .maybeSingle();
              if (profile) {
                userToUse = {
                  supabaseId: profile.id,
                  displayName: profile.full_name || "",
                  username: profile.username || `passenger_${profile.phone?.replace(/\D/g, "")}`,
                  password: cleanPassword,
                  phoneNumber: profile.phone || "",
                  surname: profile.surname || "",
                  firstName: profile.first_name || "",
                  middleName: profile.middle_name || "",
                  suffix: profile.suffix || "",
                  email: profile.email || "",
                  emailConfirmed: true,
                  birthdate: profile.birthdate || "",
                  role: "passenger",
                  guardianName: "",
                  guardianPhone: "",
                  rating: 5,
                  totalTrips: 0,
                  totalEarnings: 0,
                  memberSince: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
                  approvalStatus: "approved",
                  profilePhoto: profile.profile_photo || "",
                };
              }
            }

            if (userToUse) {
              userToUse.emailConfirmed = true;
              setUser(userToUse);
              toast.success("Login successful!");
              navigate("/passenger");
              return;
            }
          } else {
            // Incorrect password / auth failed
            toast.error("Invalid email/phone number or password.");
            setLoading(false);
            return;
          }
        }
      }

      // Local fallback
      const localAuthed = authenticateUser(targetEmail || loginIdentifier, cleanPassword);
      if (localAuthed && localAuthed.role === "passenger") {
        localAuthed.emailConfirmed = true;
        setUser(localAuthed);
        toast.success("Login successful!");
        navigate("/passenger");
        return;
      } else {
        toast.error("Invalid email/phone number or password.");
        return;
      }
    } catch (err) {
      console.error("Login exception:", err);
      toast.error("Invalid email/phone number or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FFF8E7" }}>
      {/* Maroon header */}
      <div className="px-5 pt-12 pb-10" style={{ background: "linear-gradient(160deg, #4B0F14 0%, #6E171D 100%)" }}>
        <button onClick={() => navigate("/")} className="flex items-center gap-2 mb-6" style={{ color: "rgba(255,248,231,0.65)" }}>
          <ArrowLeft size={18} />
          <span style={{ fontSize: 14 }}>Back</span>
        </button>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(212,175,55,0.18)", border: "1.5px solid rgba(212,175,55,0.3)" }}>
            <span style={{ fontSize: 22 }}>🛺</span>
          </div>
          <div>
            <p style={{ color: "#FFF8E7", fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1 }}>Arangkada</p>
            <p style={{ color: "#D4AF37", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>Sta. Mesa</p>
          </div>
        </div>
        <h1 style={{ color: "#FFF8E7", fontSize: 26, fontWeight: 800, marginTop: 20, lineHeight: 1.1 }}>Welcome back!</h1>
        <p style={{ color: "rgba(255,248,231,0.6)", fontSize: 14, marginTop: 4 }}>Sign in to your account</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-5 pt-6 pb-10">
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Toggle tabs for Passenger vs Driver */}
          <div className="flex bg-[#F0E6D2] p-1 rounded-2xl mb-6" style={{ border: "1px solid rgba(75, 15, 20, 0.08)" }}>
            <button
              type="button"
              onClick={() => {
                setLoginType("passenger");
                setShowValidation(false);
              }}
              className="flex-1 py-3 text-sm font-extrabold rounded-xl transition-all duration-200"
              style={{
                background: loginType === "passenger" ? "#4B0F14" : "transparent",
                color: loginType === "passenger" ? "#D4AF37" : "#4B0F14",
                boxShadow: loginType === "passenger" ? "0 4px 12px rgba(75, 15, 20, 0.15)" : "none"
              }}
            >
              Passenger Login
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginType("driver");
                setShowValidation(false);
              }}
              className="flex-1 py-3 text-sm font-extrabold rounded-xl transition-all duration-200"
              style={{
                background: loginType === "driver" ? "#4B0F14" : "transparent",
                color: loginType === "driver" ? "#D4AF37" : "#4B0F14",
                boxShadow: loginType === "driver" ? "0 4px 12px rgba(75, 15, 20, 0.15)" : "none"
              }}
            >
              Driver Login
            </button>
          </div>

          {/* Conditional Fields */}
          {loginType === "driver" ? (
            <div>
              <label style={{ color: "#4B0F14", fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>Phone Number</label>
              <div className="relative">
                <Phone size={16} color="#9a8a7a" className="absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="Enter phone number (e.g. 09123456789)"
                  value={driverPhone}
                  onChange={e => {
                    setDriverPhone(formatPHPhoneInput(e.target.value));
                  }}
                  className="w-full pl-11 pr-4 rounded-2xl outline-none"
                  style={{ height: 52, background: "#ffffff", border: showValidation && !driverPhone ? "2px solid #C62828" : "2px solid rgba(75,15,20,0.12)", color: "#1E1E1E", fontSize: 15 }}
                />
              </div>
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => navigate("/driver-forgot-password")}
                  className="text-sm font-bold"
                  style={{ color: "#4B0F14" }}
                >
                  Forgot password?
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Username / Phone */}
              <div>
                <label style={{ color: "#4B0F14", fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>Email, Username, or Phone Number</label>
                <div className="relative">
                  <User size={16} color="#9a8a7a" className="absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Enter email, username, or phone number"
                    value={usernameOrPhone}
                    onChange={e => {
                      const value = e.target.value;
                      const phoneLike = /^[+\d\s()-]*$/.test(value);
                      setUsernameOrPhone(phoneLike ? formatPHPhoneInput(value) : value);
                    }}
                    className="w-full pl-11 pr-4 rounded-2xl outline-none"
                    style={{ height: 52, background: "#ffffff", border: showValidation && !usernameOrPhone ? "2px solid #C62828" : "2px solid rgba(75,15,20,0.12)", color: "#1E1E1E", fontSize: 15 }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ color: "#4B0F14", fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>Password</label>
                <div className="relative">
                  <Lock size={16} color="#9a8a7a" className="absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-11 pr-14 rounded-2xl outline-none"
                    style={{ height: 52, background: "#ffffff", border: showValidation && !password ? "2px solid #C62828" : "2px solid rgba(75,15,20,0.12)", color: "#1E1E1E", fontSize: 15 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-3 flex !h-full !min-h-0 !w-9 !min-w-0 items-center justify-center p-0"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    style={{ background: "transparent", border: "none" }}
                  >
                    {showPassword ? <EyeOff size={18} color="#9a8a7a" /> : <Eye size={18} color="#9a8a7a" />}
                  </button>
                </div>
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-sm font-bold"
                    style={{ color: "#4B0F14" }}
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Login button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl flex items-center justify-center"
            style={{ background: loading ? "rgba(75,15,20,0.5)" : "linear-gradient(135deg, #4B0F14, #6E171D)", boxShadow: "0 6px 20px rgba(75,15,20,0.3)" }}
          >
            <span style={{ color: "#D4AF37", fontSize: 16, fontWeight: 800 }}>{loading ? "Logging in..." : "Login to Account"}</span>
          </button>

          <p className="text-center" style={{ color: "#7a6a5a", fontSize: 12, lineHeight: 1.5 }}>
            By signing in, you agree to the{" "}
            <button type="button" onClick={() => navigate("/terms")} style={{ color: "#4B0F14", fontWeight: 700 }}>Terms</button>{" "}
            and{" "}
            <button type="button" onClick={() => navigate("/privacy")} style={{ color: "#4B0F14", fontWeight: 700 }}>Privacy Policy</button>.
          </p>
        </form>

        <p className="text-center mt-6" style={{ color: "#7a6a5a", fontSize: 14 }}>
          Don't have an account?{" "}
          <button onClick={() => navigate("/register")} style={{ color: "#4B0F14", fontWeight: 800 }}>Sign up here</button>
        </p>
      </div>
    </div>
  );
}
