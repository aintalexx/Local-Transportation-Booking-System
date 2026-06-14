// User Database using localStorage
// This stores multiple users and handles registration/login

export interface UserData {
  username: string;
  password: string;
  phoneNumber: string;
  surname: string;
  firstName: string;
  middleName: string;
  suffix: string;
  email: string;
  birthdate: string;
  role: "passenger" | "driver";
  guardianName?: string;
  guardianPhone?: string;
  rating?: number;
  totalTrips?: number;
  totalEarnings?: number;
  vehicleType?: string;
  plateNumber?: string;
  driverLicensePhoto?: string;
  vehicleColor?: string;
  memberSince?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
}

const USERS_KEY = "ridestamesa_users";

// Get all users from database
export function getAllUsers(): UserData[] {
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

// Check if username already exists
export function usernameExists(username: string): boolean {
  const users = getAllUsers();
  return users.some(user => user.username.toLowerCase() === username.toLowerCase());
}

// Check if phone number already exists
export function phoneExists(phoneNumber: string): boolean {
  const users = getAllUsers();
  return users.some(user => user.phoneNumber === phoneNumber);
}

// Register a new user
export function registerUser(userData: UserData): { success: boolean; message: string } {
  try {
    const users = getAllUsers();

    // Check if username already exists
    if (usernameExists(userData.username)) {
      return { success: false, message: "Username already exists" };
    }

    // Check if phone number already exists
    if (phoneExists(userData.phoneNumber)) {
      return { success: false, message: "Phone number already registered" };
    }

    // Add new user to database
    users.push(userData);
    saveAllUsers(users);

    console.log("User registered successfully:", {
      username: userData.username,
      phoneNumber: userData.phoneNumber,
      role: userData.role
    });

    return { success: true, message: "Registration successful" };
  } catch (error) {
    console.error("Error registering user:", error);
    return { success: false, message: "Registration failed" };
  }
}

// Find user by username or phone number
export function findUser(usernameOrPhone: string): UserData | null {
  const users = getAllUsers();
  const user = users.find(
    u => u.username.toLowerCase() === usernameOrPhone.toLowerCase() ||
         u.phoneNumber === usernameOrPhone
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
export function updateUser(username: string, updatedData: Partial<UserData>): boolean {
  try {
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1) {
      // User not in DB (e.g. session from old flow) — insert them
      users.push(updatedData as UserData);
    } else {
      users[userIndex] = { ...users[userIndex], ...updatedData };
    }

    saveAllUsers(users);
    // Also sync current_user in localStorage
    localStorage.setItem("current_user", JSON.stringify(
      userIndex === -1 ? updatedData : { ...users[userIndex === -1 ? users.length - 1 : userIndex] }
    ));

    return true;
  } catch (error) {
    console.error("Error updating user:", error);
    return false;
  }
}

// Delete user
export function deleteUser(username: string): boolean {
  try {
    const users = getAllUsers();
    const filteredUsers = users.filter(u => u.username !== username);

    if (filteredUsers.length === users.length) {
      console.error("User not found for deletion:", username);
      return false;
    }

    saveAllUsers(filteredUsers);
    console.log("User deleted successfully:", username);
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
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
