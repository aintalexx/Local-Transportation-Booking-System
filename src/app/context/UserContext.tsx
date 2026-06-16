import { createContext, useCallback, useContext, useState, ReactNode } from "react";

interface UserData {
  supabaseId?: string;
  displayName?: string;
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
  profilePhoto?: string;
}

interface UserContextType {
  user: UserData | null;
  setUser: (user: UserData | null) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserData | null>(() => {
    // Load current logged-in user from localStorage on initial render
    const currentUser = localStorage.getItem("current_user");
    return currentUser ? JSON.parse(currentUser) : null;
  });

  const setUser = useCallback((userData: UserData | null) => {
    setUserState(userData);
    if (userData) {
      // Store current logged-in user
      localStorage.setItem("current_user", JSON.stringify(userData));
      console.log("Current user set:", userData.username);
    } else {
      localStorage.removeItem("current_user");
      console.log("User logged out");
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("current_user");
  }, [setUser]);

  return (
    <UserContext.Provider value={{ user, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
