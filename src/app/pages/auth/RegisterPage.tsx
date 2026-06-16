import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Calendar } from "../../components/ui/calendar";
import { Navigation, Phone, User, Bike, UserCircle, CalendarIcon, Eye, EyeOff, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "../../components/ui/utils";
import { emailExists, usernameExists, phoneExists } from "../../utils/userDatabase";
import {
  calculateAge,
  firstInvalid,
  formatPHPhoneInput,
  normalizeSpaces,
  validateBirthdate,
  validateEmail,
  validateName,
  validatePassword,
  validatePHPhone,
  validatePlateNumber,
  validateUsername,
} from "../../utils/validators";
import { signInWithGoogle } from "../../utils/supabaseAuth";
import { normalizeOptionalSuffix } from "../../utils/nameFormatting";
import { createDemoOtp } from "../../utils/demoOtp";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"role" | "details">("role");
  const [role, setRole] = useState<"passenger" | "driver">("passenger");
  const [formData, setFormData] = useState({
    surname: "",
    firstName: "",
    middleName: "",
    noMiddleName: false,
    suffix: "",
    phoneNumber: "",
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    birthdate: undefined as Date | undefined,
    guardianName: "",
    guardianPhone: "",
    // Driver-specific fields
    vehicleType: "tricycle" as "tricycle",
    plateNumber: "",
    driverLicensePhoto: null as string | null,
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isGuardianConfirmed, setIsGuardianConfirmed] = useState(false);
  const [liabilityAgreed, setLiabilityAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [birthdateInput, setBirthdateInput] = useState("");
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const [showPrivacyPopup, setShowPrivacyPopup] = useState(false);

  const isMinor = formData.birthdate ? calculateAge(formData.birthdate) < 18 : false;

  const handleBirthdateInputChange = (rawValue: string) => {
    // Work only with digits — strip everything else, then reformat.
    // This makes backspace always delete the rightmost digit, not a slash.
    const digits = rawValue.replace(/\D/g, "").slice(0, 8);

    let formatted = digits;
    if (digits.length > 4) {
      formatted = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
    } else if (digits.length > 2) {
      formatted = digits.slice(0, 2) + "/" + digits.slice(2);
    }

    setBirthdateInput(formatted);

    if (digits.length === 8) {
      const month = parseInt(digits.slice(0, 2)) - 1;
      const day   = parseInt(digits.slice(2, 4));
      const year  = parseInt(digits.slice(4, 8));

      if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        const date = new Date(year, month, day);
        if (date.getMonth() === month && date.getDate() === day && validateBirthdate(date).valid) {
          setFormData({ ...formData, birthdate: date });
          return;
        }
      }
    }
    setFormData({ ...formData, birthdate: undefined });
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date && !validateBirthdate(date).valid) {
      toast.error(validateBirthdate(date).message);
      return;
    }

    setFormData({ ...formData, birthdate: date });
    if (date) {
      setBirthdateInput(format(date, "MM/dd/yyyy"));
    } else {
      setBirthdateInput("");
    }
  };

  const handleMonthChange = (value: string) => {
    const currentDate = formData.birthdate || new Date();
    const newDate = new Date(currentDate.getFullYear(), parseInt(value), currentDate.getDate());
    setFormData({ ...formData, birthdate: newDate });
    setBirthdateInput(format(newDate, "MM/dd/yyyy"));
  };

  const handleYearChange = (value: string) => {
    const currentDate = formData.birthdate || new Date();
    const newDate = new Date(parseInt(value), currentDate.getMonth(), currentDate.getDate());
    setFormData({ ...formData, birthdate: newDate });
    setBirthdateInput(format(newDate, "MM/dd/yyyy"));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPHPhoneInput(e.target.value);
    setFormData({ ...formData, phoneNumber: formatted });
  };

  const handleContinueFromRole = () => {
    setStep("details");
  };

  const handleGoogleSignup = async () => {
    if (role === "driver") {
      toast.info("Driver applicants must complete the full form so admins can verify age, phone number, and license.");
      return;
    }

    setGoogleLoading(true);
    try {
      await signInWithGoogle("passenger");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google signup failed. Please try again.";
      toast.error(message);
      setGoogleLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidationErrors(true);

    const normalizedPhone = formatPHPhoneInput(formData.phoneNumber);
    const normalizedGuardianPhone = formatPHPhoneInput(formData.guardianPhone);
    const normalizedEmail = formData.email.trim();
    const normalizedUsername = formData.username.trim();
    const normalizedPlate = formData.plateNumber.trim().toUpperCase();

    const basicCheck = firstInvalid([
      validateName(formData.surname, "Surname"),
      validateName(formData.firstName, "First name"),
      formData.noMiddleName ? { valid: true, message: "" } : validateName(formData.middleName, "Middle name"),
      validateBirthdate(formData.birthdate),
      validatePHPhone(normalizedPhone),
      validateUsername(normalizedUsername),
      validateEmail(normalizedEmail),
      validatePassword(formData.password),
    ]);

    if (!basicCheck.valid) {
      toast.error(basicCheck.message);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!formData.birthdate) return;
    const age = calculateAge(formData.birthdate);

    // Drivers must be 18 or older
    if (role === "driver" && age < 18) {
      toast.error("You must be at least 18 years old to register as a driver");
      return;
    }

    // Passengers under 18 need guardian info
    if (role === "passenger" && age < 18) {
      const guardianCheck = firstInvalid([
        validateName(formData.guardianName, "Guardian's full name"),
        validatePHPhone(normalizedGuardianPhone, "Guardian phone number"),
      ]);

      if (!guardianCheck.valid) {
        toast.error(guardianCheck.message);
        return;
      }
      if (!isGuardianConfirmed) {
        toast.error("Please confirm that you are the legal guardian");
        return;
      }
      if (!liabilityAgreed) {
        toast.error("Please agree to the liability waiver for minors");
        return;
      }
    }

    // Check if username already exists
    if (usernameExists(normalizedUsername)) {
      toast.error("Username already taken. Please choose a different username.");
      return;
    }

    // Check if phone number already exists
    if (phoneExists(normalizedPhone)) {
      toast.error("Phone number already registered. Please login or use a different number.");
      return;
    }

    if (emailExists(normalizedEmail)) {
      toast.error("Email already registered. Please use a different email.");
      return;
    }

    // Validate driver-specific fields
    if (role === "driver") {
      const plateCheck = validatePlateNumber(normalizedPlate);
      if (!plateCheck.valid) {
        toast.error(plateCheck.message);
        return;
      }

      if (!formData.driverLicensePhoto) {
        toast.error("Please upload a photo of your driver's license");
        return;
      }
    }

    // Validate terms and privacy policy
    if (!agreedToTerms) {
      toast.error("You must accept the Terms and Privacy Policy to continue");
      return;
    }

    setLoading(true);

    try {
      const birthdateString = formData.birthdate ? formData.birthdate.toISOString() : "";

      const userData = {
        username: normalizedUsername,
        password: formData.password,
        phoneNumber: normalizedPhone,
        surname: normalizeSpaces(formData.surname),
        firstName: normalizeSpaces(formData.firstName),
        middleName: formData.noMiddleName ? "" : normalizeSpaces(formData.middleName),
        suffix: normalizeOptionalSuffix(formData.suffix),
        email: normalizedEmail,
        birthdate: birthdateString,
        role,
        guardianName: normalizeSpaces(formData.guardianName),
        guardianPhone: normalizedGuardianPhone,
        rating: 5.0,
        totalTrips: 0,
        totalEarnings: 0,
        vehicleType: role === "driver" ? "Tricycle" : "",
        plateNumber: role === "driver" ? normalizedPlate : "",
        driverLicensePhoto: role === "driver" ? (formData.driverLicensePhoto || "") : "",
        vehicleColor: "",
        memberSince: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        approvalStatus: role === "driver" ? "pending" : "approved",
      };

      const generatedOtp = createDemoOtp();
      toast.success(`Demo OTP generated: ${generatedOtp}`, { duration: 10000 });
      navigate("/otp", {
        state: {
          mode: "register",
          role,
          phoneNumber: normalizedPhone,
          userData,
          generatedOtp,
        },
      });
      return;

    } catch (error) {
      toast.error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "role") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8E7] to-white flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Navigation className="h-12 w-12 text-[#4B0F14]" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Join Arangkada</h1>
            <p className="text-gray-600 mt-2">Choose how you want to use our service</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Select Your Role</CardTitle>
              <CardDescription>Choose whether you want to book rides or drive</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={role} onValueChange={(value) => setRole(value as "passenger" | "driver")}>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className={`cursor-pointer transition-all ${role === "passenger" ? "border-[#4B0F14] ring-2 ring-[#4B0F14]" : ""}`}>
                    <CardHeader onClick={() => setRole("passenger")}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="passenger" id="passenger" />
                        <Label htmlFor="passenger" className="cursor-pointer flex-1">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-2">
                              <UserCircle className="h-6 w-6 text-[#4B0F14]" />
                              <span className="text-lg font-semibold">Passenger</span>
                            </div>
                            <p className="text-sm text-gray-600">
                              Book tricycles for your daily commute
                            </p>
                          </div>
                        </Label>
                      </div>
                    </CardHeader>
                    <CardContent onClick={() => setRole("passenger")}>
                      <ul className="space-y-1 text-sm text-gray-600">
                        <li>✓ Book rides instantly</li>
                        <li>✓ Track driver in real-time</li>
                        <li>✓ Save favorite locations</li>
                        <li>✓ Rate and review drivers</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className={`cursor-pointer transition-all ${role === "driver" ? "border-[#4B0F14] ring-2 ring-[#4B0F14]" : ""}`}>
                    <CardHeader onClick={() => setRole("driver")}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="driver" id="driver" />
                        <Label htmlFor="driver" className="cursor-pointer flex-1">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-2">
                              <Bike className="h-6 w-6 text-green-600" />
                              <span className="text-lg font-semibold">Driver</span>
                            </div>
                            <p className="text-sm text-gray-600">
                              Earn money by providing rides to passengers
                            </p>
                          </div>
                        </Label>
                      </div>
                    </CardHeader>
                    <CardContent onClick={() => setRole("driver")}>
                      <ul className="space-y-1 text-sm text-gray-600">
                        <li>✓ Accept ride requests</li>
                        <li>✓ Flexible schedule</li>
                        <li>✓ Track your earnings</li>
                        <li>✓ Grow your business</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </RadioGroup>

              <Button onClick={handleContinueFromRole} className="w-full mt-6">
                Continue
              </Button>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-medium text-gray-500">or</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignup}
                disabled={googleLoading}
                className="w-full gap-3"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-sm font-bold text-[#4B0F14]">
                  G
                </span>
                {googleLoading ? "Opening Google..." : "Continue with Google"}
              </Button>

              {role === "passenger" && (
                <p className="mt-2 text-center text-xs text-gray-500">
                  After Google sign-up, you will add your phone number and verify it with demo OTP.
                </p>
              )}

              {role === "driver" && (
                <p className="mt-2 text-center text-xs text-gray-500">
                  Driver applicants must use the full form for license and admin approval.
                </p>
              )}

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <button
                    onClick={() => navigate("/login")}
                    className="text-[#4B0F14] hover:underline font-medium"
                  >
                    Sign in here
                  </button>
                </p>
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8E7] to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Navigation className="h-12 w-12 text-[#4B0F14]" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">
            Register as a {role === "passenger" ? "Passenger" : "Driver"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>Fill in your information to continue</CardDescription>
          </CardHeader>
          <CardContent>
            {role === "driver" && isMinor && (
              <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-semibold">
                  ⚠️ You must be at least 18 years old to register as a driver. Please change your role to Passenger or verify your birthdate.
                </p>
              </div>
            )}
            <form onSubmit={handleRegister} className="space-y-5">
              {/* Name Fields */}
              <div className="space-y-2">
                <Label htmlFor="surname">Surname</Label>
                <Input
                  id="surname"
                  type="text"
                  placeholder="Dela Cruz"
                  value={formData.surname}
                  onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Juan"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input
                  id="middleName"
                  type="text"
                  placeholder="Santos"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  disabled={formData.noMiddleName}
                  required={!formData.noMiddleName}
                />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="noMiddleName"
                    checked={formData.noMiddleName}
                    onCheckedChange={(checked) => {
                      setFormData({ ...formData, noMiddleName: checked as boolean, middleName: "" });
                    }}
                  />
                  <label htmlFor="noMiddleName" className="text-sm text-gray-600">
                    No Middle Name
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="suffix">Suffix (Optional)</Label>
                <Select
                  value={formData.suffix || "none"}
                  onValueChange={(value) => setFormData({ ...formData, suffix: normalizeOptionalSuffix(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select suffix" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Jr.">Jr.</SelectItem>
                    <SelectItem value="Sr.">Sr.</SelectItem>
                    <SelectItem value="II">II</SelectItem>
                    <SelectItem value="III">III</SelectItem>
                    <SelectItem value="IV">IV</SelectItem>
                    <SelectItem value="V">V</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Birthdate */}
              <div className="space-y-2">
                <Label htmlFor="birthdate">Birthdate</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="MM/DD/YYYY"
                    value={birthdateInput || (formData.birthdate ? format(formData.birthdate, "MM/dd/yyyy") : "")}
                    onChange={(e) => handleBirthdateInputChange(e.target.value)}
                    inputMode="numeric"
                    className="flex-1"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex h-10 items-center justify-center rounded-md border border-input bg-background px-3 hover:bg-accent hover:text-accent-foreground"
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="p-3 space-y-2">
                        <div className="flex gap-2">
                          <Select
                            value={formData.birthdate ? formData.birthdate.getMonth().toString() : ""}
                            onValueChange={handleMonthChange}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">January</SelectItem>
                              <SelectItem value="1">February</SelectItem>
                              <SelectItem value="2">March</SelectItem>
                              <SelectItem value="3">April</SelectItem>
                              <SelectItem value="4">May</SelectItem>
                              <SelectItem value="5">June</SelectItem>
                              <SelectItem value="6">July</SelectItem>
                              <SelectItem value="7">August</SelectItem>
                              <SelectItem value="8">September</SelectItem>
                              <SelectItem value="9">October</SelectItem>
                              <SelectItem value="10">November</SelectItem>
                              <SelectItem value="11">December</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={formData.birthdate ? formData.birthdate.getFullYear().toString() : ""}
                            onValueChange={handleYearChange}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Calendar
                        mode="single"
                        selected={formData.birthdate}
                        onSelect={handleCalendarSelect}
                        disabled={(date) => !validateBirthdate(date).valid}
                        month={formData.birthdate}
                        onMonthChange={(date) => {
                          if (date) {
                            setFormData({ ...formData, birthdate: date });
                            setBirthdateInput(format(date, "MM/dd/yyyy"));
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {formData.birthdate && isMinor && role === "passenger" && (
                  <p className="text-sm text-orange-600">
                    You are under 18. Guardian information is required.
                  </p>
                )}
                {formData.birthdate && isMinor && role === "driver" && (
                  <p className="text-sm text-red-600 font-semibold">
                    You must be at least 18 years old to register as a driver.
                  </p>
                )}
              </div>

              {/* Guardian Information for Minors (Passengers only) */}
              {isMinor && role === "passenger" && (
                <div className="space-y-4 p-4 border-2 border-orange-200 rounded-lg bg-orange-50">
                  <h3 className="font-semibold text-orange-900">Guardian Information Required</h3>

                  <div className="space-y-2">
                    <Label htmlFor="guardianName">Guardian's Full Name</Label>
                    <Input
                      id="guardianName"
                      type="text"
                      placeholder="Guardian's full name"
                      value={formData.guardianName}
                      onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guardianPhone">Guardian's Phone Number</Label>
                    <Input
                      id="guardianPhone"
                      type="tel"
                      placeholder="09XXXXXXXXX"
                      value={formData.guardianPhone}
                      onChange={(e) => {
                        const formatted = formatPHPhoneInput(e.target.value);
                        setFormData({ ...formData, guardianPhone: formatted });
                      }}
                      inputMode="numeric"
                      maxLength={11}
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <div className={cn(
                      "flex items-start space-x-2 p-2 rounded",
                      showValidationErrors && !isGuardianConfirmed && "bg-red-50 border border-red-200"
                    )}>
                      <Checkbox
                        id="guardianConfirm"
                        checked={isGuardianConfirmed}
                        onCheckedChange={(checked) => setIsGuardianConfirmed(checked as boolean)}
                        required
                      />
                      <label htmlFor="guardianConfirm" className="text-sm leading-tight cursor-pointer">
                        <span className="text-red-500">*</span> I confirm that I am the legal guardian of the person registering this account
                      </label>
                    </div>

                    <div className={cn(
                      "flex items-start space-x-2 p-2 rounded",
                      showValidationErrors && !liabilityAgreed && "bg-red-50 border border-red-200"
                    )}>
                      <Checkbox
                        id="liabilityWaiver"
                        checked={liabilityAgreed}
                        onCheckedChange={(checked) => setLiabilityAgreed(checked as boolean)}
                        required
                      />
                      <label htmlFor="liabilityWaiver" className="text-sm leading-tight cursor-pointer">
                        <span className="text-red-500">*</span> I acknowledge that Arangkada is not liable for any incidents, accidents, or issues that may occur during the use of this service by the minor
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="09XXXXXXXXX"
                    value={formData.phoneNumber}
                    onChange={handlePhoneChange}
                    inputMode="numeric"
                    maxLength={11}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter username (8-30 characters)"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="pl-10"
                    required
                    minLength={8}
                    maxLength={30}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  8-30 characters. Use letters, numbers, dots, underscores, or hyphens.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter a strong password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pr-14"
                    required
                    minLength={8}
                    maxLength={30}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-2 flex !h-full !min-h-0 !w-9 !min-w-0 items-center justify-center p-0 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  8-30 characters with uppercase, lowercase, number, and special character.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pr-14"
                    required
                    minLength={8}
                    maxLength={30}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-2 flex !h-full !min-h-0 !w-9 !min-w-0 items-center justify-center p-0 text-gray-400 hover:text-gray-600"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value.trim() })}
                  required
                />
              </div>

              {/* Driver-specific fields */}
              {role === "driver" && (
                <div className="space-y-5 p-5 border-2 border-[rgba(75,15,20,0.2)] rounded-xl bg-[rgba(75,15,20,0.05)]">
                  <h3 className="font-semibold text-[#4B0F14]">Driver Information</h3>

                  <div className="space-y-2">
                    <Label htmlFor="plateNumber">Plate Number</Label>
                    <Input
                      id="plateNumber"
                      type="text"
                      placeholder="ABC123"
                      value={formData.plateNumber}
                      onChange={(e) => {
                        const plateNumber = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
                        setFormData({ ...formData, plateNumber });
                      }}
                      maxLength={6}
                      required
                    />
                    <p className="text-xs text-gray-500">2-6 letters or numbers, no spaces.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="driverLicense">Driver's License Photo</Label>
                    <Input
                      id="driverLicense"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData({ ...formData, driverLicensePhoto: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      required
                    />
                    {formData.driverLicensePhoto && (
                      <div className="mt-2">
                        <img
                          src={formData.driverLicensePhoto}
                          alt="Driver's License Preview"
                          className="max-w-full h-32 object-contain rounded border"
                        />
                      </div>
                    )}
                    <p className="text-xs text-gray-600">Upload a clear photo of your driver's license</p>
                  </div>
                </div>
              )}


              <div className={cn(
                "flex items-start gap-3 rounded-xl border p-3",
                showValidationErrors && !agreedToTerms
                  ? "border-red-200 bg-red-50"
                  : "border-[rgba(75,15,20,0.1)] bg-[rgba(75,15,20,0.03)]"
              )}>
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                  className="mt-1"
                  required
                />
                <div className="min-w-0 flex-1 text-sm font-medium leading-6 text-gray-800">
                  <label htmlFor="terms" className="cursor-pointer">
                    <span className="text-red-500">*</span> I agree to the{" "}
                  </label>
                  <button
                    type="button"
                    className="inline !h-auto !min-h-0 !min-w-0 p-0 align-baseline text-sm font-semibold leading-6 text-[#4B0F14] hover:underline"
                    onClick={(e) => { e.preventDefault(); setShowTermsPopup(true); }}
                  >
                    Terms &amp; Conditions
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    className="inline !h-auto !min-h-0 !min-w-0 p-0 align-baseline text-sm font-semibold leading-6 text-[#4B0F14] hover:underline"
                    onClick={(e) => { e.preventDefault(); setShowPrivacyPopup(true); }}
                  >
                    Privacy Policy
                  </button>
                </div>
              </div>

              {/* Terms Popup */}
              <Dialog open={showTermsPopup} onOpenChange={setShowTermsPopup}>
                <DialogContent className="max-w-sm max-h-[70vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Terms &amp; Conditions</DialogTitle>
                  </DialogHeader>
                  <div className="text-sm text-gray-600 space-y-3 leading-relaxed">
                    <p>By using Arangkada, you agree to use the platform lawfully, treat all users respectfully, and provide accurate information.</p>
                    <p>Passengers must pay agreed fares and must not damage driver vehicles. Drivers must hold valid licenses, comply with safety standards, and complete accepted rides.</p>
                    <p>Driver accounts require admin approval before accepting rides. Arangkada may suspend accounts that violate these Terms.</p>
                    <p>Arangkada is a technology intermediary and is not liable for the conduct of drivers or passengers.</p>
                    <button
                      type="button"
                      className="text-[#4B0F14] hover:underline text-sm font-medium"
                      onClick={() => { setShowTermsPopup(false); navigate("/terms"); }}
                    >
                      Read the full Terms &amp; Conditions →
                    </button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Privacy Policy Popup */}
              <Dialog open={showPrivacyPopup} onOpenChange={setShowPrivacyPopup}>
                <DialogContent className="max-w-sm max-h-[70vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Privacy Policy</DialogTitle>
                  </DialogHeader>
                  <div className="text-sm text-gray-600 space-y-3 leading-relaxed">
                    <p>Arangkada collects your name, phone number, location data, and ride history to provide our services.</p>
                    <p>Your location is shared with your matched driver or passenger only during an active ride. We do not sell your personal data.</p>
                    <p>Driver documents are used solely for identity verification and admin approval. You may access, correct, or delete your data through the app settings or by contacting us.</p>
                    <p>We retain ride records for at least 3 years for legal compliance.</p>
                    <button
                      type="button"
                      className="text-[#4B0F14] hover:underline text-sm font-medium"
                      onClick={() => { setShowPrivacyPopup(false); navigate("/privacy"); }}
                    >
                      Read the full Privacy Policy →
                    </button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || (role === "driver" && isMinor)}
              >
                {loading ? "Preparing OTP..." : (role === "driver" && isMinor) ? "Must be 18+ to Register as Driver" : "Sign in"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("role")}
                className="w-full"
              >
                Back
              </Button>
            </form>

            {role === "passenger" && (
              <div className="mt-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs font-medium text-gray-500">or</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignup}
                  disabled={googleLoading}
                  className="w-full gap-3"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-sm font-bold text-[#4B0F14]">
                    G
                  </span>
                  {googleLoading ? "Opening Google..." : "Continue with Google"}
                </Button>

                <p className="mt-2 text-center text-xs text-gray-500">
                  Google sign-up continues with phone number and demo OTP verification.
                </p>
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <button
                  onClick={() => navigate("/login")}
                  className="text-[#4B0F14] hover:underline font-medium"
                >
                  Sign in here
                </button>
              </p>
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
