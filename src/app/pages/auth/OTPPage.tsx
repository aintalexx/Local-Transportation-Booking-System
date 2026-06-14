import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../../components/ui/input-otp";
import { Navigation } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "../../context/UserContext";
import { registerUser, type UserData } from "../../utils/userDatabase";

export default function OTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useUser();
  const state = location.state as {
    phoneNumber?: string;
    mode?: "login" | "register";
    role?: "passenger" | "driver";
    userData?: any;
    generatedOtp?: string;
  };

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!state?.phoneNumber) {
      navigate("/login");
      return;
    }

    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state, navigate]);

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter a complete 6-digit OTP");
      return;
    }

    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify OTP matches the generated one
      if (state.generatedOtp && otp !== state.generatedOtp) {
        toast.error("Invalid OTP. Please try again.");
        setOtp("");
        setLoading(false);
        return;
      }

      toast.success("Phone number verified successfully!");

      // Create user object with registration data
      const userData = state.userData || {};
      const fullName = `${userData.firstName || ""} ${userData.middleName || ""} ${userData.surname || ""}`.trim();

      // Convert birthdate to string if it's a Date object
      let birthdateString = "";
      if (userData.birthdate) {
        if (userData.birthdate instanceof Date) {
          birthdateString = userData.birthdate.toISOString();
        } else {
          birthdateString = userData.birthdate;
        }
      }

      const user: UserData = {
        username: userData.username || "",
        password: userData.password || "",
        phoneNumber: state.phoneNumber || "",
        surname: userData.surname || "",
        firstName: userData.firstName || "",
        middleName: userData.middleName || "",
        suffix: userData.suffix || "",
        email: userData.email || "",
        birthdate: birthdateString,
        role: (state.role || "passenger") as "passenger" | "driver",
        guardianName: userData.guardianName || "",
        guardianPhone: userData.guardianPhone || "",
        rating: 5.0,
        totalTrips: 0,
        totalEarnings: 0,
        vehicleType: state.role === "driver" ? (userData.vehicleType || "tricycle") : "",
        plateNumber: state.role === "driver" ? (userData.plateNumber || "") : "",
        driverLicensePhoto: state.role === "driver" ? (userData.driverLicensePhoto || "") : "",
        vehicleColor: state.role === "driver" ? "" : "",
        memberSince: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      };

      if (state.mode === "register") {
        // Register new user in database
        const result = registerUser(user);

        if (!result.success) {
          toast.error(result.message);
          setLoading(false);
          return;
        }

        console.log("User registered in database:", { username: user.username, phoneNumber: user.phoneNumber, role: user.role });
      }

      // Set as current logged-in user
      setUser(user);

      // Navigate based on role
      if (user.role === "driver") {
        navigate("/driver");
      } else {
        navigate("/passenger");
      }
    } catch (error) {
      toast.error("Invalid OTP. Please try again.");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    try {
      // Generate new random 6-digit OTP
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Display new OTP at the top of the screen
      toast.success(`Your new OTP is: ${newOtp}`, { duration: 10000 });

      // Update the state with new OTP
      if (state) {
        state.generatedOtp = newOtp;
      }

      setResendTimer(60);
      setCanResend(false);

      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      toast.error("Failed to resend OTP. Please try again.");
    }
  };

  // Auto-verify when OTP is complete
  useEffect(() => {
    if (otp.length === 6) {
      handleVerifyOTP();
    }
  }, [otp]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[rgba(75,15,20,0.08)] to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Navigation className="h-12 w-12 text-[#4B0F14]" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Verify Your Number</h1>
          <p className="text-gray-600 mt-2">
            Enter the OTP sent to {state?.phoneNumber}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Enter OTP</CardTitle>
            <CardDescription>
              We've sent a 6-digit code to your phone number
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {loading && (
                <div className="text-center text-sm text-gray-600">
                  Verifying OTP...
                </div>
              )}

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">Didn't receive the code?</p>
                {canResend ? (
                  <Button
                    variant="link"
                    onClick={handleResendOTP}
                    className="text-[#4B0F14]"
                  >
                    Resend OTP
                  </Button>
                ) : (
                  <p className="text-sm text-gray-500">
                    Resend in {resendTimer} seconds
                  </p>
                )}
              </div>

              <div className="space-y-2 text-sm text-gray-600 bg-[rgba(75,15,20,0.05)] p-4 rounded-lg">
                <p className="font-semibold">Tips:</p>
                <ul className="space-y-1">
                  <li>• Check your messages for the OTP</li>
                  <li>• OTP expires in 5 minutes</li>
                  <li>• Make sure you have network signal</li>
                </ul>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(state?.mode === "register" ? "/register" : "/login")}
              >
                Change Phone Number
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
