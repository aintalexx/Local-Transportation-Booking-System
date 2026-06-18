import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { BookingData, getBooking, getPassengerActiveBooking, getDriverActiveBooking, getPendingBookings } from "../utils/bookingDatabase";
import { dedupePendingBookings } from "../utils/bookingDeduplication";
import {
  getSupabaseBooking,
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

  const refreshBooking = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const setActiveBooking = useCallback((booking: BookingData | null) => {
    setActiveBookingState(booking);
  }, []);

  // Poll for booking updates every 7 seconds (with some variance to avoid thundering herd)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshBooking();
    }, 5000 + Math.random() * 3000); // 5-8 second interval with random variance

    return () => clearInterval(interval);
  }, [refreshBooking]);

  // Refresh booking data when trigger changes
  useEffect(() => {
    let cancelled = false;

    const refreshData = async () => {
      const currentUser = localStorage.getItem("current_user");
      let user = null;
      try {
        user = currentUser ? JSON.parse(currentUser) : null;
      } catch {
        localStorage.removeItem("current_user");
      }

      if (activeBooking && user) {
        const exactSupabaseBooking = await getSupabaseBooking(activeBooking.id);
        if (exactSupabaseBooking) {
          if (!cancelled) setActiveBookingState(exactSupabaseBooking);
          return;
        }

        if (activeBooking.status === "ride_completed" || activeBooking.status === "completed" || activeBooking.status === "cancelled") {
          const updated = getBooking(activeBooking.id) || activeBooking;
          if (!cancelled) setActiveBookingState(updated);
          return;
        }

        if (user.role === "passenger") {
          const supabaseBooking = await getSupabasePassengerActiveBooking(user);
          const updated = supabaseBooking || getPassengerActiveBooking(user.username) || getBooking(activeBooking.id);
          if (!cancelled) setActiveBookingState(updated);
        } else if (user.role === "driver") {
          const supabaseBooking = await getSupabaseDriverActiveBooking(user);
          const updated = supabaseBooking || getDriverActiveBooking(user.username) || getBooking(activeBooking.id);
          if (!cancelled) setActiveBookingState(updated);
        }
      }

      const supabasePending = await getSupabasePendingBookings();
      const localPending = getPendingBookings();
      if (!cancelled) setPendingBookings(dedupePendingBookings([...supabasePending, ...localPending]));
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
