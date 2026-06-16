export interface ValidationResult {
  valid: boolean;
  message: string;
}

export const ok: ValidationResult = { valid: true, message: "" };

export function fail(message: string): ValidationResult {
  return { valid: false, message };
}

export function firstInvalid(results: ValidationResult[]): ValidationResult {
  return results.find((result) => !result.valid) || ok;
}

export function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function formatPHPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("63")) {
    return `0${digits.slice(2, 12)}`.slice(0, 11);
  }

  if (digits.startsWith("9")) {
    return `0${digits.slice(0, 10)}`.slice(0, 11);
  }

  return digits.slice(0, 11);
}

export function validateRequired(value: string, label: string): ValidationResult {
  return normalizeSpaces(value) ? ok : fail(`${label} is required.`);
}

export function validateName(value: string, label: string, required = true): ValidationResult {
  const normalized = normalizeSpaces(value);

  if (!normalized) {
    return required ? fail(`${label} is required.`) : ok;
  }

  if (normalized.length < 2 || normalized.length > 60) {
    return fail(`${label} must be between 2 and 60 characters.`);
  }

  if (!/^[\p{L}][\p{L} .'-]*$/u.test(normalized)) {
    return fail(`${label} can only contain letters, spaces, apostrophes, periods, and hyphens.`);
  }

  return ok;
}

export function validateUsername(username: string): ValidationResult {
  const normalized = username.trim();

  if (!normalized) {
    return fail("Username is required.");
  }

  if (normalized.length < 8 || normalized.length > 30) {
    return fail("Username must be between 8 and 30 characters.");
  }

  if (!/^[A-Za-z0-9._-]+$/.test(normalized)) {
    return fail("Username can only use letters, numbers, dots, underscores, and hyphens.");
  }

  return ok;
}

export function validatePHPhone(phoneNumber: string, label = "Phone number"): ValidationResult {
  const formatted = formatPHPhoneInput(phoneNumber);

  if (!formatted) {
    return fail(`${label} is required.`);
  }

  if (!/^09\d{9}$/.test(formatted)) {
    return fail(`${label} must be an 11-digit PH mobile number starting with 09.`);
  }

  return ok;
}

export function validateEmail(email: string, required = false): ValidationResult {
  const normalized = email.trim();

  if (!normalized) {
    return required ? fail("Email is required.") : ok;
  }

  if (normalized.length > 254) {
    return fail("Email must be 254 characters or fewer.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return fail("Please enter a valid email address.");
  }

  return ok;
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return fail("Password is required.");
  }

  if (password.length < 8 || password.length > 30) {
    return fail("Password must be between 8 and 30 characters.");
  }

  if (!/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/.test(password)) {
    return fail("Password must include uppercase, lowercase, number, and special character.");
  }

  return ok;
}

export function calculateAge(birthdate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }

  return age;
}

export function validateBirthdate(birthdate: Date | undefined, label = "Birthdate"): ValidationResult {
  if (!birthdate || Number.isNaN(birthdate.getTime())) {
    return fail(`${label} is required.`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selected = new Date(birthdate);
  selected.setHours(0, 0, 0, 0);

  if (selected > today) {
    return fail(`${label} cannot be in the future.`);
  }

  const age = calculateAge(selected);

  if (age < 0 || age > 120) {
    return fail("Please enter a realistic age between 0 and 120.");
  }

  return ok;
}

export function validateFutureOrTodayDate(date: Date | undefined, label = "Date"): ValidationResult {
  if (!date || Number.isNaN(date.getTime())) {
    return fail(`${label} is required.`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selected = new Date(date);
  selected.setHours(0, 0, 0, 0);

  return selected < today ? fail(`${label} cannot be in the past.`) : ok;
}

export function validatePositiveMoney(value: string | number, label = "Price"): ValidationResult {
  const amount = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(amount)) {
    return fail(`${label} must be a valid number.`);
  }

  if (amount <= 0) {
    return fail(`${label} must be greater than 0.`);
  }

  if (amount > 100000) {
    return fail(`${label} is unrealistically high.`);
  }

  return ok;
}

export function validatePercentage(value: string | number, label = "Percentage"): ValidationResult {
  const amount = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(amount)) {
    return fail(`${label} must be a valid number.`);
  }

  if (amount < 0 || amount > 100) {
    return fail(`${label} must be between 0 and 100.`);
  }

  return ok;
}

export function validatePlateNumber(plateNumber: string, required = true): ValidationResult {
  const normalized = plateNumber.trim().toUpperCase();

  if (!normalized) {
    return required ? fail("Plate number is required.") : ok;
  }

  if (!/^[A-Z0-9]{2,6}$/.test(normalized)) {
    return fail("Plate number must be 2 to 6 letters or numbers, with no spaces.");
  }

  return ok;
}

export function validatePHLicenseNumber(licenseNumber: string): ValidationResult {
  const normalized = licenseNumber.trim().toUpperCase();
  if (!normalized) {
    return fail("Driver's license number is required.");
  }
  if (!/^[A-Z]\d{2}-\d{2}-\d{6}$/.test(normalized)) {
    return fail("License number must follow the Philippine format (e.g., N01-24-123456).");
  }
  return ok;
}

export function formatPHLicenseNumber(value: string): string {
  const clean = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  
  if (clean.length === 0) return "";
  
  let firstChar = clean[0];
  if (!/[A-Z]/.test(firstChar)) {
    firstChar = ""; 
  }
  
  const rest = clean.slice(1).replace(/[^0-9]/g, ""); 
  const combined = (firstChar + rest).slice(0, 11); 
  
  if (combined.length > 5) {
    return `${combined.slice(0, 3)}-${combined.slice(3, 5)}-${combined.slice(5)}`;
  } else if (combined.length > 3) {
    return `${combined.slice(0, 3)}-${combined.slice(3)}`;
  }
  return combined;
}

