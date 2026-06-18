import { useEffect, useState } from "react";
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
import { Navigation, Phone, User, Bike, UserCircle, CalendarIcon, Eye, EyeOff, X, Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "../../components/ui/utils";
import { emailExists, usernameExists, phoneExists, registerUser, getAllUsers, updateUser, type UserData } from "../../utils/userDatabase";
import {
  calculateAge,
  firstInvalid,
  formatPHPhoneInput,
  normalizeSpaces,
  ok,
  validateAuthEmail,
  validateBirthdate,
  validateName,
  validatePassword,
  validatePHPhone,
  validateUsername,
  formatPHLicenseNumber,
} from "../../utils/validators";
import { normalizeOptionalSuffix } from "../../utils/nameFormatting";
import { createDemoOtp } from "../../utils/demoOtp";
import { signInWithGoogle, signUpWithEmailPassword } from "../../utils/supabaseAuth";
import { registerSupabaseDriver } from "../../utils/supabaseDrivers";
import { profileContactExists } from "../../utils/supabaseProfiles";
import { useUser } from "../../context/UserContext";

const MAX_DRIVER_UPLOAD_SIZE = 400; // Reduced from 900 to prevent localStorage quota exceeded
const DRIVER_UPLOAD_QUALITY = 0.5; // Reduced from 0.72
const EMAIL_ALREADY_REGISTERED_MESSAGE = "This email is already registered. Please sign in or use Forgot password.";
const EMAIL_CANNOT_BE_USED_MESSAGE = "This email cannot be used for registration. Please use a valid email address that you own.";

function isSupabaseDuplicateEmailError(message: string): boolean {
  return message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("email_taken") ||
    message.includes("user already registered");
}

function isSupabaseInvalidEmailError(message: string): boolean {
  return message.includes("invalid email") ||
    message.includes("email address is invalid") ||
    message.includes("invalid login credentials");
}

function validatePassengerName(value: string, required = true) {
  const normalized = normalizeSpaces(value);

  if (!normalized) {
    return required ? { valid: false, message: "Names must contain letters only." } : ok;
  }

  if (!/^[\p{L}]+(?:\s+[\p{L}]+)*$/u.test(normalized)) {
    return { valid: false, message: "Names must contain letters only." };
  }

  return ok;
}

function formatDateInputValue(date: Date | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function compressImageFile(file: File): Promise<string> {
  const originalDataUrl = await readFileAsDataUrl(file);

  try {
    const image = await loadImage(originalDataUrl);
    const scale = Math.min(1, MAX_DRIVER_UPLOAD_SIZE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return originalDataUrl;

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", DRIVER_UPLOAD_QUALITY);
  } catch {
    return originalDataUrl;
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const [step, setStep] = useState<"role" | "details" | "driverPhone" | "driverOtp" | "driverInfo" | "driverDocs" | "passengerPhone" | "passengerOtp" | "passengerInfo">("role");
  const [role, setRole] = useState<"passenger" | "driver">("passenger");
  const [demoOtp, setDemoOtp] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpResendTimer, setOtpResendTimer] = useState(60);
  const [otpCanResend, setOtpCanResend] = useState(false);
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
    licenseNumber: "",
    validIdPhoto: null as string | null,
    orCrPhoto: null as string | null,
    clearancePhoto: null as string | null,
    profilePhoto: null as string | null,
    vehiclePhoto: null as string | null,
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
  const [zoomModal, setZoomModal] = useState<{ url: string; title: string } | null>(null);

  const isMinor = formData.birthdate ? calculateAge(formData.birthdate) < 18 : false;
  const passengerAge = formData.birthdate && !Number.isNaN(formData.birthdate.getTime())
    ? calculateAge(formData.birthdate)
    : null;

  useEffect(() => {
    if (step !== "driverOtp" && step !== "passengerOtp") return;
    if (otpCanResend) return;

    const timer = window.setInterval(() => {
      setOtpResendTimer((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setOtpCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [step, otpCanResend]);

  const handleBirthdateInputChange = (rawValue: string) => {
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
    if (role === "driver") {
      setStep("driverPhone");
    } else {
      setStep("passengerPhone");
    }
  };

  const handlePassengerGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle("passenger");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google sign-up failed. Please try again.";
      toast.error(message);
      setGoogleLoading(false);
    }
  };

  const handlePassengerPhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPhone = formatPHPhoneInput(formData.phoneNumber);
    const phoneCheck = validatePHPhone(normalizedPhone);
    if (!phoneCheck.valid) {
      toast.error(phoneCheck.message);
      return;
    }

    if (phoneExists(normalizedPhone)) {
      toast.error("Phone number already registered. Please login or use a different number.");
      return;
    }

    const generatedOtp = createDemoOtp();
    setDemoOtp(generatedOtp);
    setOtpResendTimer(60);
    setOtpCanResend(false);
    toast.success(`Demo OTP: ${generatedOtp}`, { duration: 10000 });
    setStep("passengerOtp");
  };

  const handlePassengerOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredOtp.length !== 6) {
      toast.error("Please enter a complete 6-digit OTP");
      return;
    }
    if (enteredOtp !== demoOtp) {
      toast.error("Invalid OTP. Please try again.");
      setEnteredOtp("");
      return;
    }
    toast.success("Phone verified successfully!");
    setStep("passengerInfo");
  };

  const handlePassengerRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidationErrors(true);

    const firstNameCheck = validatePassengerName(formData.firstName);
    const middleNameCheck = validatePassengerName(formData.middleName, false);
    const lastNameCheck = validatePassengerName(formData.surname);
    const nameCheck = firstInvalid([firstNameCheck, middleNameCheck, lastNameCheck]);
    if (!nameCheck.valid) {
      toast.error("Names must contain letters only.");
      return;
    }

    const birthdateCheck = validateBirthdate(formData.birthdate, "Date of birth");
    if (!birthdateCheck.valid) {
      toast.error(birthdateCheck.message);
      return;
    }

    if (!formData.birthdate) return;
    const age = calculateAge(formData.birthdate);
    if (age < 18) {
      toast.error("You must be at least 18 years old to create an account.");
      return;
    }

    const normalizedPhone = formatPHPhoneInput(formData.phoneNumber);
    const phoneCheck = validatePHPhone(normalizedPhone);
    if (!phoneCheck.valid) {
      toast.error(phoneCheck.message);
      return;
    }

    if (phoneExists(normalizedPhone)) {
      toast.error("Phone number already registered. Please login or use a different number.");
      return;
    }

    const normalizedEmail = formData.email.trim().toLowerCase();
    const emailCheck = validateAuthEmail(normalizedEmail);
    if (!emailCheck.valid) {
      toast.error(emailCheck.message);
      return;
    }

    if (emailExists(normalizedEmail)) {
      toast.error(EMAIL_ALREADY_REGISTERED_MESSAGE);
      return;
    }

    const existingSupabaseContact = await profileContactExists(normalizedEmail, normalizedPhone);
    if (existingSupabaseContact.phoneExists) {
      toast.error("Phone number already registered. Please login or use a different number.");
      return;
    }
    if (existingSupabaseContact.emailExists) {
      toast.error(EMAIL_ALREADY_REGISTERED_MESSAGE);
      return;
    }

    const passwordCheck = validatePassword(formData.password);
    if (!passwordCheck.valid) {
      toast.error(passwordCheck.message);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!agreedToTerms) {
      toast.error("You must accept the Terms and Privacy Policy to continue");
      return;
    }

    setLoading(true);

    try {
      const normalizedPhoneDigits = normalizedPhone.replace(/\D/g, "");
      const finalUsername = `passenger_${normalizedPhoneDigits}`;
      const birthdateString = formData.birthdate.toISOString();
      const registrationDate = new Date().toISOString();

      const userData: UserData = {
        username: finalUsername,
        password: formData.password,
        phoneNumber: normalizedPhone,
        surname: normalizeSpaces(formData.surname),
        firstName: normalizeSpaces(formData.firstName),
        middleName: normalizeSpaces(formData.middleName),
        suffix: normalizeOptionalSuffix(formData.suffix),
        email: normalizedEmail,
        emailConfirmed: true, // Auto confirmed
        birthdate: birthdateString,
        role: "passenger",
        guardianName: "",
        guardianPhone: "",
        rating: 5.0,
        totalTrips: 0,
        totalEarnings: 0,
        vehicleType: "",
        plateNumber: "",
        driverLicensePhoto: "",
        licenseNumber: "",
        validIdPhoto: "",
        orCrPhoto: "",
        clearancePhoto: "",
        profilePhoto: "",
        vehiclePhoto: "",
        vehicleColor: "",
        memberSince: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        approvalStatus: "approved",
        registrationDate,
        accountStatus: "Active",
      };

      // Attempt Supabase registration if online
      let supabaseUser = null;
      if (signUpWithEmailPassword) {
        try {
          supabaseUser = await signUpWithEmailPassword(userData);
          if (supabaseUser) {
            userData.supabaseId = supabaseUser.supabaseId;
            userData.emailConfirmed = true;
          }
        } catch (supabaseError) {
          const errMsg = supabaseError instanceof Error ? supabaseError.message.toLowerCase() : "";
          if (isSupabaseDuplicateEmailError(errMsg)) {
            toast.error("This email cannot be used for a new account. If this is your email, please sign in or use Forgot password.");
            setLoading(false);
            return;
          }
          if (isSupabaseInvalidEmailError(errMsg)) {
            toast.error(EMAIL_CANNOT_BE_USED_MESSAGE);
            setLoading(false);
            return;
          }
          console.warn("Supabase registration failed, continuing with local registration:", supabaseError);
        }
      }

      const existingLocalUser = getAllUsers().find(
        user =>
          user.username === userData.username ||
          Boolean(userData.supabaseId && user.supabaseId === userData.supabaseId)
      );

      if (existingLocalUser) {
        const updated = updateUser(existingLocalUser.username, userData);
        if (!updated) {
          toast.error("Account was created, but local profile sync failed. Please try logging in.");
          setLoading(false);
          return;
        }
      } else {
        const localResult = registerUser(userData);
        if (!localResult.success) {
          toast.error(localResult.message);
          setLoading(false);
          return;
        }
      }

      setUser(userData);
      toast.success("Registration successful!");
      navigate("/passenger", { replace: true });
    } catch (error) {
      console.error("Passenger registration exception:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDriverPhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPhone = formatPHPhoneInput(formData.phoneNumber);
    const phoneCheck = validatePHPhone(normalizedPhone);
    if (!phoneCheck.valid) {
      toast.error(phoneCheck.message);
      return;
    }

    const generatedOtp = createDemoOtp();
    setDemoOtp(generatedOtp);
    setOtpResendTimer(60);
    setOtpCanResend(false);
    toast.success(`Demo OTP: ${generatedOtp}`, { duration: 10000 });
    setStep("driverOtp");
  };

  const handleDriverOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredOtp.length !== 6) {
      toast.error("Please enter a complete 6-digit OTP");
      return;
    }
    if (enteredOtp !== demoOtp) {
      toast.error("Invalid OTP. Please try again.");
      setEnteredOtp("");
      return;
    }
    toast.success("Phone verified successfully!");
    setStep("driverInfo");
  };

  const handleDriverInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const contactCheck = firstInvalid([
      validateName(formData.surname, "Surname"),
      validateName(formData.firstName, "First name"),
      formData.noMiddleName ? { valid: true, message: "" } : validateName(formData.middleName, "Middle name"),
      validateBirthdate(formData.birthdate),
      validatePassword(formData.password),
    ]);

    if (!contactCheck.valid) {
      toast.error(contactCheck.message);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.birthdate && calculateAge(formData.birthdate) < 18) {
      toast.error("You must be at least 18 years old to register as a driver");
      return;
    }

    setStep("driverDocs");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidationErrors(true);

    const normalizedPhone = formatPHPhoneInput(formData.phoneNumber);
    const normalizedEmail = role === "passenger" ? formData.email.trim() : "";
    const normalizedPlate = formData.plateNumber.trim().toUpperCase();
    const normalizedPhoneDigits = normalizedPhone.replace(/\D/g, "");
    const finalUsername = role === "passenger" 
      ? formData.username.trim() 
      : `driver_${normalizedPhoneDigits}`;

    // Validate Basic Details
    const basicCheck = firstInvalid([
      validateName(formData.surname, "Surname"),
      validateName(formData.firstName, "First name"),
      formData.noMiddleName ? { valid: true, message: "" } : validateName(formData.middleName, "Middle name"),
      validateBirthdate(formData.birthdate),
      validatePHPhone(normalizedPhone),
      role === "passenger" ? validateUsername(formData.username.trim()) : ok,
      role === "passenger" ? validateAuthEmail(normalizedEmail) : ok,
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

    if (role === "driver" && age < 18) {
      toast.error("You must be at least 18 years old to register as a driver");
      return;
    }

    if (role === "passenger" && age < 18) {
      const normalizedGuardianPhone = formatPHPhoneInput(formData.guardianPhone);
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

    if (role === "passenger" && usernameExists(finalUsername)) {
      toast.error("Username already taken. Please choose a different username.");
      return;
    }

    // For passengers: block duplicate phone/email. For drivers: allow re-submission
    // (their existing record will be updated with new document photos)
    if (role === "passenger" && phoneExists(normalizedPhone)) {
      toast.error("Phone number already registered. Please login or use a different number.");
      return;
    }

    if (role === "passenger" && emailExists(normalizedEmail)) {
      toast.error(EMAIL_ALREADY_REGISTERED_MESSAGE);
      return;
    }

    if (!agreedToTerms) {
      toast.error("You must accept the Terms and Privacy Policy to continue");
      return;
    }

    setLoading(true);

    try {
      const birthdateString = formData.birthdate ? formData.birthdate.toISOString() : "";

      const userData: UserData = {
        username: finalUsername,
        password: formData.password,
        phoneNumber: normalizedPhone,
        surname: normalizeSpaces(formData.surname),
        firstName: normalizeSpaces(formData.firstName),
        middleName: formData.noMiddleName ? "" : normalizeSpaces(formData.middleName),
        suffix: normalizeOptionalSuffix(formData.suffix),
        email: normalizedEmail,
        emailConfirmed: role === "driver",
        birthdate: birthdateString,
        role,
        guardianName: role === "passenger" ? normalizeSpaces(formData.guardianName) : "",
        guardianPhone: role === "passenger" ? formatPHPhoneInput(formData.guardianPhone) : "",
        rating: 5.0,
        totalTrips: 0,
        totalEarnings: 0,
        vehicleType: role === "driver" ? "Tricycle" : "",
        plateNumber: role === "driver" ? normalizedPlate : "",
        driverLicensePhoto: role === "driver" ? (formData.validIdPhoto || "") : "",
        licenseNumber: role === "driver" ? formData.licenseNumber.trim().toUpperCase() : "",
        validIdPhoto: role === "driver" ? (formData.validIdPhoto || "") : "",
        orCrPhoto: role === "driver" ? (formData.orCrPhoto || "") : "",
        clearancePhoto: role === "driver" ? (formData.clearancePhoto || "") : "",
        profilePhoto: role === "driver" ? (formData.profilePhoto || "") : "",
        vehiclePhoto: role === "driver" ? (formData.vehiclePhoto || "") : "",
        vehicleColor: "",
        memberSince: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        approvalStatus: role === "driver" ? "pending" : "approved",
      };

      if (role === "driver") {
        // Save in Supabase public.drivers table
        let supabaseId = undefined;
        try {
          const dbDriver = await registerSupabaseDriver(userData);
          if (dbDriver) {
            supabaseId = dbDriver.id;
            userData.supabaseId = supabaseId;
          }
        } catch (error) {
          console.error("Supabase driver table sync failed:", error);
        }

        // Check if driver already has a local account
        const existingLocalDriver = getAllUsers().find(
          u => u.role === "driver" && (
            u.username === finalUsername ||
            formatPHPhoneInput(u.phoneNumber).replace(/\D/g, "") === normalizedPhoneDigits
          )
        );

        if (existingLocalDriver) {
          updateUser(existingLocalDriver.username, {
            ...userData,
            username: existingLocalDriver.username,
            supabaseId: existingLocalDriver.supabaseId || supabaseId,
            approvalStatus: "pending",
            memberSince: existingLocalDriver.memberSince,
          });
        } else {
          const result = registerUser({
            ...userData,
            supabaseId,
          });
          if (!result.success) {
            toast.error(result.message);
            return;
          }
        }

        // Set local context to the newly registered driver
        const completeUserData = {
          ...userData,
          supabaseId,
          approvalStatus: "pending" as const,
        };
        setUser(completeUserData);

        toast.success("Driver application submitted for admin approval.");
        navigate("/pending-approval", { replace: true });
        return;
      }

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
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Registration error:", error);
      toast.error(msg || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (key: "validIdPhoto" | "orCrPhoto" | "clearancePhoto" | "profilePhoto" | "vehiclePhoto") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Invalid file. Please upload an image only.");
        e.target.value = "";
        return;
      }
      try {
        const compressedImage = await compressImageFile(file);
        setFormData(prev => ({ ...prev, [key]: compressedImage }));
      } catch {
        toast.error("Unable to read this image. Please try another photo.");
        e.target.value = "";
      }
    }
  };

  const renderUploadCard = (
    label: string, 
    key: "validIdPhoto" | "orCrPhoto" | "clearancePhoto" | "profilePhoto" | "vehiclePhoto",
    icon: React.ReactNode
  ) => {
    const photo = formData[key];
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{label}</span>
          <span className="text-[9px] font-semibold text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Required</span>
        </div>
        {!photo ? (
          <div className={`border-2 border-dashed ${showValidationErrors ? "border-red-400 bg-red-50/30" : "border-gray-200 hover:border-gray-300 bg-gray-50/30"} rounded-xl p-4 text-center flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50/60 transition-all relative h-32`}>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload(key)}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center mb-1.5">
              {icon}
            </div>
            <p className="text-xs font-semibold text-gray-600">Upload Image</p>
            <p className="text-[10px] text-gray-400">Tap to capture or upload</p>
          </div>
        ) : (
          <div className="border border-green-200 rounded-xl p-1 bg-white relative overflow-hidden flex flex-col items-center justify-center shadow-inner h-32">
            <img
              src={photo}
              alt={label}
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center gap-2 transition-all rounded-lg">
              <button
                type="button"
                onClick={() => setZoomModal({ url: photo, title: label })}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/95 text-gray-800 hover:bg-green-100 shadow transition-colors"
                title="View"
              >
                <Eye className="w-4 h-4" />
              </button>
              <label className="flex items-center justify-center w-8 h-8 rounded-full bg-white/95 text-gray-800 hover:bg-green-100 shadow cursor-pointer transition-colors relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload(key)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Camera className="w-4 h-4" />
              </label>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 1. Role Selection Step
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

  // 2. Driver Step 1: Phone Number Input
  if (step === "driverPhone") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8E7] to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Navigation className="h-12 w-12 text-[#4B0F14]" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Driver Sign-Up</h1>
            <p className="text-gray-600 mt-2">Enter your phone number to begin</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Phone Number</CardTitle>
              <CardDescription>Enter your mobile number for verification</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDriverPhoneSubmit} className="space-y-4">
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

                <Button type="submit" className="w-full mt-6">
                  Send Demo OTP
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
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 2.5. Driver Step 1.5: Demo OTP Verification
  if (step === "driverOtp") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8E7] to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Navigation className="h-12 w-12 text-[#4B0F14]" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Verify Number</h1>
            <p className="text-gray-600 mt-2">Enter the demo OTP sent to your phone</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Demo OTP Verification</CardTitle>
              <CardDescription>No SMS is sent. Use the demo code below for testing.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDriverOtpVerify} className="space-y-6">
                <div className="rounded-xl border border-[#4B0F14]/20 bg-[#4B0F14]/5 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Demo OTP Code</p>
                  <p className="mt-1 text-3xl font-black tracking-[0.2em] text-[#4B0F14]">{demoOtp}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otp">Enter 6-Digit OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter code"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    className="text-center font-mono text-2xl tracking-[0.1em] h-12"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={enteredOtp.length !== 6}>
                  Verify OTP
                </Button>

                <div className="text-center">
                  {otpCanResend ? (
                    <button
                      type="button"
                      onClick={() => {
                        const nextOtp = createDemoOtp();
                        setDemoOtp(nextOtp);
                        setOtpResendTimer(60);
                        setOtpCanResend(false);
                        toast.success(`New demo OTP: ${nextOtp}`, { duration: 10000 });
                      }}
                      className="text-sm font-semibold text-[#4B0F14] hover:underline"
                    >
                      Resend Demo OTP
                    </button>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Resend in {otpResendTimer} seconds
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("driverPhone")}
                  className="w-full"
                >
                  Change Phone Number
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 2.7. Driver Step 1.7: Driver Information Form
  if (step === "driverInfo") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8E7] to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Navigation className="h-12 w-12 text-[#4B0F14]" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Driver Profile</h1>
            <p className="text-gray-600 mt-2">Please enter your basic information</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
              <CardDescription>All fields are required unless marked optional</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDriverInfoSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="surname">Surname</Label>
                  <Input
                    id="surname"
                    type="text"
                    placeholder="Doe"
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
                    placeholder="John"
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
                    placeholder="Middle"
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
                    <label htmlFor="noMiddleName" className="text-sm text-gray-600 cursor-pointer select-none">
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
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
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
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full mt-6">
                  Next: Vehicle &amp; Documents
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("driverPhone")}
                  className="w-full"
                >
                  Back
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 3. Driver Step 2: Vehicle & License Details (Guideline-based)
  if (step === "driverDocs") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8E7] to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <Navigation className="h-10 w-10 text-[#4B0F14]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Driver Sign-Up</h1>
            <p className="text-gray-600 mt-1 text-sm">Step 2 of 2 — Document Submission</p>
            <p className="text-xs text-gray-400 mt-1">After submission, your application goes to the admin for review</p>
          </div>

          <Card className="border-t-4 border-t-red-500 shadow-xl">
            <CardHeader className="pb-3">
              {/* Photo Instructions Title */}
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-extrabold text-gray-800">Photo Instructions</span>
                <button
                  type="button"
                  onClick={() => toast.info("Guide: Upload a clear, flat photo of your ID. No shadows or glares.")}
                  className="text-xs font-bold text-red-500 hover:underline"
                >
                  View Details &gt;
                </button>
              </div>

              {/* Styled Guideline Cards (Expired, Blurry, Glare, Dark) */}
              <div className="grid grid-cols-4 gap-2">
                {/* 1. Expired */}
                <div className="border border-red-200 rounded-lg p-1.5 bg-red-50/20 flex flex-col items-center relative overflow-hidden">
                  <div className="w-full h-10 bg-white rounded border border-gray-100 flex items-center justify-center relative overflow-hidden">
                    <span className="absolute text-[6px] font-black text-red-600 border border-red-600 px-0.5 py-0.2 rounded rotate-12 bg-white/95 uppercase tracking-tighter">Expired</span>
                    <div className="w-6 h-1.5 bg-gray-200 rounded-full mb-0.5" />
                    <div className="w-8 h-1 bg-gray-100 rounded-full" />
                  </div>
                  <span className="mt-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-extrabold">✕</span>
                  <span className="text-[9px] text-gray-500 font-semibold mt-0.5">Expired</span>
                </div>

                {/* 2. Blurry */}
                <div className="border border-red-200 rounded-lg p-1.5 bg-red-50/20 flex flex-col items-center">
                  <div className="w-full h-10 bg-white rounded border border-gray-100 flex flex-col items-center justify-center blur-[1px]">
                    <div className="w-6 h-1.5 bg-gray-200 rounded-full mb-0.5" />
                    <div className="w-8 h-1 bg-gray-100 rounded-full" />
                  </div>
                  <span className="mt-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-extrabold">✕</span>
                  <span className="text-[9px] text-gray-500 font-semibold mt-0.5">Blurry</span>
                </div>

                {/* 3. Glare */}
                <div className="border border-red-200 rounded-lg p-1.5 bg-red-50/20 flex flex-col items-center relative overflow-hidden">
                  <div className="w-full h-10 bg-white rounded border border-gray-100 flex flex-col items-center justify-center relative">
                    <div className="absolute top-1 left-2 w-4 h-4 bg-white rounded-full blur-[2px] opacity-80" />
                    <div className="w-6 h-1.5 bg-gray-200 rounded-full mb-0.5" />
                    <div className="w-8 h-1 bg-gray-100 rounded-full" />
                  </div>
                  <span className="mt-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-extrabold">✕</span>
                  <span className="text-[9px] text-gray-500 font-semibold mt-0.5">With Glare</span>
                </div>

                {/* 4. Dark */}
                <div className="border border-red-200 rounded-lg p-1.5 bg-red-50/20 flex flex-col items-center">
                  <div className="w-full h-10 bg-gray-700 rounded border border-gray-800 flex flex-col items-center justify-center brightness-50">
                    <div className="w-6 h-1.5 bg-gray-500 rounded-full mb-0.5" />
                    <div className="w-8 h-1 bg-gray-600 rounded-full" />
                  </div>
                  <span className="mt-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-extrabold">✕</span>
                  <span className="text-[9px] text-gray-500 font-semibold mt-0.5">Dark</span>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleRegister} noValidate className="space-y-5">
                {/* Info banner: documents are optional */}
                <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-xs text-blue-700">
                  <span className="mt-0.5 shrink-0 text-base leading-none">ℹ️</span>
                  <p className="leading-relaxed">
                    <span className="font-bold">Document photos are optional.</span> You can submit now and upload them later. The admin will review and verify your documents before approving your account.
                  </p>
                </div>

                {/* 5 Documents Grid */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {renderUploadCard("Driver Profile Photo", "profilePhoto", <UserCircle className="h-5 w-5 text-gray-400" />)}
                  {renderUploadCard("Valid ID / License", "validIdPhoto", <Camera className="h-5 w-5 text-gray-400" />)}
                  {renderUploadCard("OR/CR Document", "orCrPhoto", <Navigation className="h-5 w-5 text-gray-400" />)}
                  {renderUploadCard("Barangay/NBI Clearance", "clearancePhoto", <User className="h-5 w-5 text-gray-400" />)}
                  <div className="col-span-2">
                    {renderUploadCard("Vehicle/Tricycle Photo", "vehiclePhoto", <Bike className="h-5 w-5 text-gray-400" />)}
                  </div>
                </div>

                {/* Zoom Photo Modal */}
                <Dialog open={!!zoomModal} onOpenChange={(open) => { if (!open) setZoomModal(null); }}>
                  <DialogContent className="max-w-md p-2 bg-black/95 border-none">
                    <DialogHeader className="p-2 flex justify-between items-center text-white">
                      <DialogTitle className="text-sm font-bold text-white">{zoomModal?.title || "Photo Preview"}</DialogTitle>
                    </DialogHeader>
                    {zoomModal?.url && (
                      <img
                        src={zoomModal.url}
                        alt="Zoomed Preview"
                        className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                      />
                    )}
                  </DialogContent>
                </Dialog>

                {/* ID / License Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="licenseNumber" className="text-xs font-bold text-gray-500 uppercase">Driver's License Number</Label>
                  <Input
                    id="licenseNumber"
                    type="text"
                    placeholder="L03-YY-XXXXXX"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: formatPHLicenseNumber(e.target.value) })}
                    maxLength={13}
                    className="border-gray-200 focus:border-red-300 rounded-xl"
                  />
                  <p className="text-[10px] text-gray-400">Optional for now. Admin can verify or request corrections during approval.</p>
                </div>

                {/* Tricycle Plate Number */}
                <div className="space-y-2 pt-2">
                  <Label htmlFor="plateNumber" className="text-xs font-bold text-gray-500 uppercase">Tricycle Plate Number</Label>
                  
                  {/* Real-time Dynamic Philippine Tricycle Plate Preview Component */}
                  <div className="flex justify-center py-2">
                    <div className="w-[180px] h-[100px] border-4 border-gray-900 rounded-2xl bg-white flex flex-col overflow-hidden shadow-lg relative">
                      {/* Top banner (Green with QR code gap) */}
                      <div className="h-[26px] flex w-full border-b border-gray-300">
                        <div className="flex-1 bg-[#007a5e]" />
                        <div className="w-[42px] bg-white flex items-center justify-center shrink-0 border-l border-r border-gray-200 relative p-0.5">
                          {/* QR Code grid block */}
                          <div className="w-full h-full bg-gray-100 flex flex-wrap p-0.5 items-center justify-center gap-0.5 opacity-80">
                            <div className="w-1.5 h-1.5 bg-black" />
                            <div className="w-1.5 h-1.5 bg-black" />
                            <div className="w-1.5 h-1.5 bg-black" />
                            <div className="w-1.5 h-1.5 bg-black" />
                            <div className="w-1.5 h-1.5 bg-black" />
                            <div className="w-1.5 h-1.5 bg-black" />
                            <div className="w-1.5 h-1.5 bg-black" />
                            <div className="w-1.5 h-1.5 bg-black" />
                          </div>
                        </div>
                        <div className="flex-1 bg-[#007a5e]" />
                      </div>
                      
                      {/* Plate Code Number */}
                      <div className="flex-1 flex items-center justify-center p-1 bg-white select-none">
                        <span className="font-mono text-3xl font-black tracking-wider text-gray-950">
                          {formData.plateNumber.trim() ? formData.plateNumber.trim().toUpperCase() : "123ABC"}
                        </span>
                      </div>
                      
                      {/* Mounting Slots at top */}
                      <div className="absolute top-[8px] left-[22px] w-3 h-1.5 bg-gray-400 rounded-full" />
                      <div className="absolute top-[8px] right-[22px] w-3 h-1.5 bg-gray-400 rounded-full" />
                    </div>
                  </div>

                  <Input
                    id="plateNumber"
                    type="text"
                    placeholder="123ABC"
                    value={formData.plateNumber}
                    onChange={(e) => {
                      const plateNumber = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
                      setFormData({ ...formData, plateNumber });
                    }}
                    maxLength={6}
                    className="border-gray-200 focus:border-red-300 rounded-xl"
                  />
                  <p className="text-xs text-gray-400">Optional for now. Admin can confirm the plate during approval.</p>
                </div>

                {/* Terms Acceptance */}
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

                {/* Action Buttons: Confirm is styled red/orange like sample */}
                <Button
                  type="submit"
                  className="w-full bg-[#e14e34] hover:bg-[#c93e27] text-white font-extrabold h-12 rounded-xl transition-all"
                  disabled={loading}
                >
                  {loading ? "Submitting..." : "Submit for Admin Approval"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("driverInfo")}
                  className="w-full rounded-xl"
                >
                  Back to Personal Details
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 3.1. Passenger Step 1: Phone Number Input
  if (step === "passengerPhone") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8E7] to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Navigation className="h-12 w-12 text-[#4B0F14]" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Passenger Sign-Up</h1>
            <p className="text-gray-600 mt-2">Enter your phone number to begin</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Phone Number</CardTitle>
              <CardDescription>Enter your mobile number for verification</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePassengerPhoneSubmit} className="space-y-4">
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

                <Button type="submit" className="w-full mt-6">
                  Send Demo OTP
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
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 3.2. Passenger Step 2: Demo OTP Verification
  if (step === "passengerOtp") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8E7] to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Navigation className="h-12 w-12 text-[#4B0F14]" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Verify Number</h1>
            <p className="text-gray-600 mt-2">Enter the demo OTP sent to your phone</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Demo OTP Verification</CardTitle>
              <CardDescription>No SMS is sent. Use the demo code below for testing.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePassengerOtpVerify} className="space-y-6">
                <div className="rounded-xl border border-[#4B0F14]/20 bg-[#4B0F14]/5 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Demo OTP Code</p>
                  <p className="mt-1 text-3xl font-black tracking-[0.2em] text-[#4B0F14]">{demoOtp}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otp">Enter 6-Digit OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter code"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    className="text-center font-mono text-2xl tracking-[0.1em] h-12"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={enteredOtp.length !== 6}>
                  Verify OTP
                </Button>

                <div className="text-center">
                  {otpCanResend ? (
                    <button
                      type="button"
                      onClick={() => {
                        const nextOtp = createDemoOtp();
                        setDemoOtp(nextOtp);
                        setOtpResendTimer(60);
                        setOtpCanResend(false);
                        toast.success(`New demo OTP: ${nextOtp}`, { duration: 10000 });
                      }}
                      className="text-sm font-semibold text-[#4B0F14] hover:underline"
                    >
                      Resend Demo OTP
                    </button>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Resend in {otpResendTimer} seconds
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("passengerPhone")}
                  className="w-full"
                >
                  Change Phone Number
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 3.3. Passenger Step 3: Passenger Information Form
  if (step === "passengerInfo") {
    const firstNameInvalid = showValidationErrors && !validatePassengerName(formData.firstName).valid;
    const middleNameInvalid = showValidationErrors && !validatePassengerName(formData.middleName, false).valid;
    const lastNameInvalid = showValidationErrors && !validatePassengerName(formData.surname).valid;
    const birthdateInvalid = showValidationErrors && (!formData.birthdate || passengerAge === null || passengerAge < 18);

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8E7] to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Navigation className="h-12 w-12 text-[#4B0F14]" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
            <p className="text-gray-600 mt-2">Complete your passenger information to continue</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Passenger Information</CardTitle>
              <CardDescription>Use the same phone number verified by Demo OTP</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePassengerRegisterSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="passengerFirstName">First Name</Label>
                  <Input
                    id="passengerFirstName"
                    type="text"
                    placeholder="Enter first name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={firstNameInvalid ? "border-red-400" : ""}
                    required
                  />
                  {firstNameInvalid && <p className="text-xs text-red-600">Names must contain letters only.</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passengerMiddleName">Middle Name <span className="text-gray-400">(Optional)</span></Label>
                  <Input
                    id="passengerMiddleName"
                    type="text"
                    placeholder="Enter middle name"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    className={middleNameInvalid ? "border-red-400" : ""}
                  />
                  {middleNameInvalid && <p className="text-xs text-red-600">Names must contain letters only.</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passengerLastName">Last Name</Label>
                  <Input
                    id="passengerLastName"
                    type="text"
                    placeholder="Enter last name"
                    value={formData.surname}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                    className={lastNameInvalid ? "border-red-400" : ""}
                    required
                  />
                  {lastNameInvalid && <p className="text-xs text-red-600">Names must contain letters only.</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passengerSuffix">Suffix <span className="text-gray-400">(Optional)</span></Label>
                  <Input
                    id="passengerSuffix"
                    type="text"
                    placeholder="Jr., Sr., III"
                    value={formData.suffix}
                    onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-[1fr_96px] gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="passengerBirthdate">Date of Birth</Label>
                    <Input
                      id="passengerBirthdate"
                      type="date"
                      value={formatDateInputValue(formData.birthdate)}
                      onChange={(e) => {
                        const value = e.target.value;
                        const date = value ? new Date(`${value}T00:00:00`) : undefined;
                        setFormData({ ...formData, birthdate: date });
                      }}
                      className={birthdateInvalid ? "border-red-400" : ""}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passengerAge">Age</Label>
                    <Input
                      id="passengerAge"
                      value={passengerAge ?? ""}
                      readOnly
                      placeholder="Auto"
                      className="bg-gray-50 text-center font-semibold"
                    />
                  </div>
                </div>
                {birthdateInvalid && (
                  <p className="text-xs text-red-600">
                    {passengerAge !== null && passengerAge < 18
                      ? "You must be at least 18 years old to create an account."
                      : "Date of birth is required."}
                  </p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="verifiedPhone">Verified Phone Number</Label>
                  <Input
                    id="verifiedPhone"
                    value={formatPHPhoneInput(formData.phoneNumber)}
                    readOnly
                    className="bg-gray-50 font-semibold"
                  />
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
                    Minimum 8 characters. Any letters, numbers, or special characters are allowed.
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
                  disabled={loading}
                >
                  {loading ? "Completing Registration..." : "Complete Registration"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("passengerOtp")}
                  className="w-full"
                >
                  Back
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 4. Passenger Details Form (Step details)
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
                  <label htmlFor="noMiddleName" className="text-sm text-gray-600 cursor-pointer">
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
                {formData.birthdate && isMinor && (
                  <p className="text-sm text-orange-600">
                    You are under 18. Guardian information is required.
                  </p>
                )}
              </div>

              {/* Guardian Information for Minors (Passengers only) */}
              {isMinor && (
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
                  8-30 characters. Letters only are allowed; numbers, dots, underscores, and hyphens are optional.
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
                  Minimum 8 characters. Any letters, numbers, or special characters are allowed.
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
                disabled={loading || googleLoading}
              >
                {loading ? "Preparing OTP..." : "Manual Registration"}
              </Button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-gray-500">or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handlePassengerGoogleSignUp}
                disabled={loading || googleLoading}
                className="w-full"
              >
                <span className="mr-2 flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-semibold text-[#4285F4]">
                  G
                </span>
                {googleLoading ? "Opening Google..." : "Continue with Google"}
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
