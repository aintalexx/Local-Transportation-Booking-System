import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { BookingData, getPassengerActiveBooking, getDriverActiveBooking, getPendingBookings } from "../utils/bookingDatabase";
import {
  getSupabaseDriverActiveBooking,
  getSupabasePassengerActiveBooking,
  getSupabasePendingBookings,
} from "../utils/supabaseBookings";

interface BookingContextType {
  activeBooking: BookingData | null;
  pendingBookings: BookingData[];
  refreshBooking: () => void;
  setActiveBooking: (booking: BookingData | null) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [activeBooking, setActiveBookingState] = useState<BookingData | null>(null);
  const [pendingBookings, setPendingBookings] = useState<BookingData[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshBooking = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const setActiveBooking = (booking: BookingData | null) => {
    setActiveBookingState(booking);
  };

  // Poll for booking updates every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshBooking();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Refresh booking data when trigger changes
  useEffect(() => {
    let cancelled = false;

    const refreshData = async () => {
      const currentUser = localStorage.getItem("current_user");
      const user = currentUser ? JSON.parse(currentUser) : null;

      if (activeBooking && user) {
        if (user.role === "passenger") {
          const supabaseBooking = await getSupabasePassengerActiveBooking(user);
          const updated = supabaseBooking || getPassengerActiveBooking(user.username);
          if (!cancelled) setActiveBookingState(updated);
        } else if (user.role === "driver") {
          const supabaseBooking = await getSupabaseDriverActiveBooking(user);
          const updated = supabaseBooking || getDriverActiveBooking(user.username);
          if (!cancelled) setActiveBookingState(updated);
        }
      }

      const supabasePending = await getSupabasePendingBookings();
      const localPending = getPendingBookings();
      if (!cancelled) setPendingBookings([...supabasePending, ...localPending]);
    };

    void refreshData();

    return () => {
      cancelled = true;
    };
  }, [refreshTrigger, activeBooking?.id]);

  return (
    <BookingContext.Provider value={{ activeBooking, pendingBookings, refreshBooking, setActiveBooking }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}
