import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Navigation, Phone } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "../../context/UserContext";
import { createDemoOtp } from "../../utils/demoOtp";
import { phoneExists } from "../../utils/userDatabase";
import { formatPHPhoneInput, validatePHPhone } from "../../utils/validators";
import { getRoleHomePath } from "../../utils/roleRouting";

export default function GooglePhonePage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    const existingPhone = formatPHPhoneInput(user.phoneNumber || "");
    if (validatePHPhone(existingPhone).valid) {
      navigate(getRoleHomePath(user), { replace: true });
    }
  }, [navigate, user]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const formattedPhone = formatPHPhoneInput(phoneNumber);
    const phoneCheck = validatePHPhone(formattedPhone);
    if (!phoneCheck.valid) {
      toast.error(phoneCheck.message);
      return;
    }

    if (phoneExists(formattedPhone, user.username)) {
      toast.error("Phone number already registered. Please use a different number.");
      return;
    }

    setLoading(true);
    const generatedOtp = createDemoOtp();
    toast.success(`Demo OTP generated: ${generatedOtp}`, { duration: 10000 });
    navigate("/otp", {
      state: {
        mode: "google-phone",
        role: user.role,
        phoneNumber: formattedPhone,
        userData: {
          ...user,
          phoneNumber: formattedPhone,
        },
        generatedOtp,
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#FFF8E7] to-white p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Navigation className="h-12 w-12 text-[#4B0F14]" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Add Phone Number</h1>
          <p className="mt-2 text-gray-600">Verify a Philippine mobile number to finish your Google sign-up.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Phone Verification</CardTitle>
            <CardDescription>
              Demo OTP mode will show a test code on the next screen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="googlePhone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="googlePhone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(formatPHPhoneInput(event.target.value))}
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="09XXXXXXXXX"
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">Use PH mobile format: 09XXXXXXXXX</p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Preparing OTP..." : "Verify Phone Number"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/login")} className="w-full">
                Back to Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
