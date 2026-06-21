import { formatPHPhoneInput, validateEmail, validatePHPhone, validatePassword, validateUsername } from "./validators";
import { normalizeDisplayName, normalizeOptionalSuffix } from "./nameFormatting";
import { applyLocalRestore, applyLocalSoftDelete, isSoftDeletedRecord, type SoftDeleteFields } from "./softDelete";

// User Database using localStorage
// This stores multiple users and handles registration/login

export interface UserData extends SoftDeleteFields {
  supabaseId?: string;
  displayName?: string;
  username: string;
  password?: string; // Optional - only used during authentication
  phoneNumber: string;
  surname: string;
  firstName: string;
  middleName: string;
  suffix: string;
  email: string;
  emailConfirmed?: boolean;
  birthdate: string;
  role: "passenger" | "driver" | "admin";
  guardianName?: string;
  guardianPhone?: string;
  rating?: number;
  totalTrips?: number;
  totalEarnings?: number;
  vehicleType?: string;
  plateNumber?: string;
  driverLicensePhoto?: string;
  licenseNumber?: string;
  orCrPhoto?: string;
  validIdPhoto?: string;
  clearancePhoto?: string;
  vehiclePhoto?: string;
  vehicleColor?: string;
  memberSince?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  profilePhoto?: string;
  registrationDate?: string;
  accountStatus?: "Active" | "Blocked" | "Archived" | "Suspended";
}

const USERS_KEY = "ridestamesa_users";
const PASSWORD_HISTORY_KEY = "ridestamesa_password_history";
const PASSWORD_HISTORY_LIMIT = 5;

function sanitizeSessionUser(user: UserData): UserData {
  return {
    ...user,
    password: "",
  };
}

// Get all users from database
export function getAllUsers(): UserData[] {
  try {
    const usersJson = localStorage.getItem(USERS_KEY);
    if (!usersJson) return [];
    return (JSON.parse(usersJson) as UserData[]).filter(user => !isSoftDeletedRecord(user));
  } catch (error) {
    console.error("Error reading users database:", error);
    return [];
  }
}

export function getAllUsersIncludingDeleted(): UserData[] {
  try {
    const usersJson = localStorage.getItem(USERS_KEY);
    if (!usersJson) return [];
    return JSON.parse(usersJson);
  } catch (error) {
    console.error("Error reading users database:", error);
    return [];
  }
}

// Save all users to database
function saveAllUsers(users: UserData[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    console.log(`Saved ${users.length} users to database`);
  } catch (error) {
    console.error("Error saving users database:", error);
  }
}

type PasswordHistoryMap = Record<string, string[]>;

function getPasswordHistoryMap(): PasswordHistoryMap {
  try {
    const raw = localStorage.getItem(PASSWORD_HISTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error("Error reading password history:", error);
    return {};
  }
}

function savePasswordHistoryMap(history: PasswordHistoryMap): void {
  try {
    localStorage.setItem(PASSWORD_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Error saving password history:", error);
  }
}

function getPasswordHistoryKeys(user: UserData): string[] {
  return Array.from(new Set([
    user.username?.trim().toLowerCase(),
    user.email?.trim().toLowerCase(),
    formatPHPhoneInput(user.phoneNumber),
  ].filter(Boolean)));
}

function getUserPasswordHistory(user: UserData): string[] {
  const history = getPasswordHistoryMap();
  const values = getPasswordHistoryKeys(user).flatMap((key) => history[key] || []);
  return Array.from(new Set(values)).slice(0, PASSWORD_HISTORY_LIMIT);
}

function saveUserPasswordHistory(user: UserData, passwords: string[]): void {
  const history = getPasswordHistoryMap();
  const nextHistory = Array.from(new Set(passwords.filter(Boolean))).slice(0, PASSWORD_HISTORY_LIMIT);
  getPasswordHistoryKeys(user).forEach((key) => {
    history[key] = nextHistory;
  });
  savePasswordHistoryMap(history);
}

function rememberUserPassword(user: UserData, password: string): void {
  if (!password) return;
  saveUserPasswordHistory(user, [password, ...getUserPasswordHistory(user)]);
}

export function isPasswordRecentlyUsed(identifier: string, nextPassword: string): boolean {
  const user = findUser(identifier);
  if (!user || !nextPassword) return false;
  return getUserPasswordHistory(user).includes(nextPassword);
}

// Check if username already exists
export function usernameExists(username: string): boolean {
  const users = getAllUsers();
  return users.some(user => user.username.toLowerCase() === username.toLowerCase());
}

// Check if phone number already exists
export function phoneExists(phoneNumber: string, exceptUsername?: string): boolean {
  const users = getAllUsers();
  const normalizedPhone = formatPHPhoneInput(phoneNumber);
  return users.some(user => user.username !== exceptUsername && formatPHPhoneInput(user.phoneNumber) === normalizedPhone);
}

// Check if email already exists
export function emailExists(email: string, exceptUsername?: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return false;
  const users = getAllUsers();
  return users.some(user => user.username !== exceptUsername && user.email?.trim().toLowerCase() === normalizedEmail);
}

// Register a new user
export function registerUser(userData: UserData): { success: boolean; message: string } {
  try {
    const users = getAllUsersIncludingDeleted();
    const normalizedUser = {
      ...userData,
      username: userData.username.trim(),
      phoneNumber: formatPHPhoneInput(userData.phoneNumber),
      email: (userData.email || "").trim(),
      displayName: normalizeDisplayName(userData.displayName),
      suffix: normalizeOptionalSuffix(userData.suffix),
    };

    const usernameCheck = validateUsername(normalizedUser.username);
    if (!usernameCheck.valid) {
      return { success: false, message: usernameCheck.message };
    }

    const phoneCheck = validatePHPhone(normalizedUser.phoneNumber);
    if (!phoneCheck.valid) {
      return { success: false, message: phoneCheck.message };
    }

    const passwordCheck = validatePassword(normalizedUser.password);
    if (!passwordCheck.valid) {
      return { success: false, message: passwordCheck.message };
    }

    // Check if username already exists
    if (usernameExists(normalizedUser.username)) {
      return { success: false, message: "Username already exists" };
    }

    // Check if phone number already exists
    if (phoneExists(normalizedUser.phoneNumber)) {
      return { success: false, message: "Phone number already registered" };
    }

    if (normalizedUser.role !== "driver") {
      const emailCheck = validateEmail(normalizedUser.email);
      if (!emailCheck.valid) {
        return { success: false, message: emailCheck.message };
      }
      if (emailExists(normalizedUser.email)) {
        return { success: false, message: "This email is already registered. Please sign in or use Forgot password." };
      }
    }

    // Add new user to database
    users.push(normalizedUser);
    saveAllUsers(users);
    rememberUserPassword(normalizedUser, normalizedUser.password || "");

    console.log("User registered successfully:", {
      username: normalizedUser.username,
      phoneNumber: normalizedUser.phoneNumber,
      role: normalizedUser.role
    });

    return { success: true, message: "Registration successful" };
  } catch (error) {
    console.error("Error registering user:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: msg || "Registration failed" };
  }
}

// Find user by username, phone number, or email
export function findUser(identifier: string): UserData | null {
  if (!identifier || !identifier.trim()) return null;
  const users = getAllUsers();
  const normalizedPhone = formatPHPhoneInput(identifier);
  const normalizedLower = identifier.trim().toLowerCase();
  const user = users.find(
    u => u.username.toLowerCase() === normalizedLower ||
         (u.email && u.email.trim().toLowerCase() === normalizedLower) ||
         (u.phoneNumber && formatPHPhoneInput(u.phoneNumber) === normalizedPhone)
  );
  return user || null;
}

// Authenticate user (check username/phone and password)
export function authenticateUser(usernameOrPhone: string, password: string): UserData | null {
  const user = findUser(usernameOrPhone);

  if (!user) {
    console.log("User not found:", usernameOrPhone);
    return null;
  }

  if (user.password !== password) {
    console.log("Invalid password for user:", usernameOrPhone);
    return null;
  }

  console.log("User authenticated successfully:", user.username);
  return user;
}

// Update user data (upsert — adds user if not found)
export function resetLocalUserPassword(identifier: string, nextPassword: string): { success: boolean; message: string } {
  try {
    const passwordCheck = validatePassword(nextPassword);
    if (!passwordCheck.valid) {
      return { success: false, message: passwordCheck.message };
    }

    const users = getAllUsersIncludingDeleted();
    const normalizedPhone = formatPHPhoneInput(identifier);
    const normalizedLower = identifier.trim().toLowerCase();
    const userIndex = users.findIndex(
      user =>
        user.username.toLowerCase() === normalizedLower ||
        user.email?.trim().toLowerCase() === normalizedLower ||
        formatPHPhoneInput(user.phoneNumber) === normalizedPhone
    );

    if (userIndex === -1) {
      return { success: false, message: "Account not found." };
    }

    if (getUserPasswordHistory(users[userIndex]).includes(nextPassword)) {
      return { success: false, message: "You cannot reuse any of your last 5 passwords." };
    }

    users[userIndex] = {
      ...users[userIndex],
      password: nextPassword,
    };
    saveAllUsers(users);
    rememberUserPassword(users[userIndex], nextPassword);

    const currentUserJson = localStorage.getItem("current_user");
    const currentUser = currentUserJson ? JSON.parse(currentUserJson) : null;
    if (currentUser && currentUser.username === users[userIndex].username) {
      localStorage.setItem("current_user", JSON.stringify(sanitizeSessionUser(users[userIndex])));
    }

    return { success: true, message: "Password reset successfully." };
  } catch (error) {
    console.error("Error resetting password:", error);
    return { success: false, message: "Password reset failed." };
  }
}

export function updateUser(identifier: string, updatedData: Partial<UserData>): boolean {
  try {
    const users = getAllUsersIncludingDeleted();
    const userIndex = users.findIndex(u => u.username === identifier || u.supabaseId === identifier);
    const actualUsername = userIndex !== -1 ? users[userIndex].username : (updatedData.username || identifier);

    const normalizedData = {
      ...updatedData,
      ...(updatedData.phoneNumber && { phoneNumber: formatPHPhoneInput(updatedData.phoneNumber) }),
      ...(updatedData.email !== undefined && { email: updatedData.email.trim() }),
      ...(updatedData.displayName !== undefined && { displayName: normalizeDisplayName(updatedData.displayName) }),
      ...(updatedData.suffix !== undefined && { suffix: normalizeOptionalSuffix(updatedData.suffix) }),
    };

    if (normalizedData.phoneNumber) {
      const phoneCheck = validatePHPhone(normalizedData.phoneNumber);
      if (!phoneCheck.valid || phoneExists(normalizedData.phoneNumber, actualUsername)) {
        console.error("Invalid or duplicate phone number:", normalizedData.phoneNumber);
        return false;
      }
    }

    if (normalizedData.email) {
      const emailCheck = validateEmail(normalizedData.email);
      if (!emailCheck.valid || emailExists(normalizedData.email, actualUsername)) {
        console.error("Invalid or duplicate email:", normalizedData.email);
        return false;
      }
    }

    if (userIndex === -1) {
      // User not in DB (e.g. session from old flow) — insert them
      users.push({ ...normalizedData, username: actualUsername } as UserData);
    } else {
      users[userIndex] = { ...users[userIndex], ...normalizedData };
    }

    saveAllUsers(users);

    if (normalizedData.password) {
      const savedUser = userIndex === -1 ? users[users.length - 1] : users[userIndex];
      rememberUserPassword(savedUser, normalizedData.password);
    }

    const currentUserJson = localStorage.getItem("current_user");
    const currentUser = currentUserJson ? JSON.parse(currentUserJson) : null;
    if (currentUser && (currentUser.username === actualUsername || currentUser.supabaseId === identifier)) {
      localStorage.setItem("current_user", JSON.stringify(
        sanitizeSessionUser(
          userIndex === -1
            ? { ...normalizedData, username: actualUsername } as UserData
            : { ...users[userIndex === -1 ? users.length - 1 : userIndex] }
        )
      ));
    }

    return true;
  } catch (error) {
    console.error("Error updating user:", error);
    return false;
  }
}

// Soft-delete user so Super Admin can restore it later.
export function deleteUser(username: string): boolean {
  try {
    const users = getAllUsersIncludingDeleted();
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1) {
      console.error("User not found for deletion:", username);
      return false;
    }

    users[userIndex] = {
      ...applyLocalSoftDelete(users[userIndex], "self"),
      accountStatus: "Archived",
    };
    saveAllUsers(users);
    console.log("User soft-deleted successfully:", username);
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    return false;
  }
}

export function restoreUser(username: string, restoredBy = "admin"): boolean {
  try {
    const users = getAllUsersIncludingDeleted();
    const userIndex = users.findIndex(u => u.username === username || u.supabaseId === username);

    if (userIndex === -1) {
      console.error("User not found for restore:", username);
      return false;
    }

    users[userIndex] = {
      ...applyLocalRestore(users[userIndex], restoredBy),
      accountStatus: "Active",
    };
    saveAllUsers(users);
    console.log("User restored successfully:", username);
    return true;
  } catch (error) {
    console.error("Error restoring user:", error);
    return false;
  }
}

// Get database statistics
export function getDatabaseStats() {
  const users = getAllUsers();
  const passengers = users.filter(u => u.role === "passenger").length;
  const drivers = users.filter(u => u.role === "driver").length;

  return {
    total: users.length,
    passengers,
    drivers
  };
}
