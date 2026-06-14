import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { BookingData, getPassengerActiveBooking, getDriverActiveBooking, getPendingBookings } from "../utils/bookingDatabase";

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
    // This will be updated by individual pages based on user role
    // For now, just refresh the active booking if it exists
    if (activeBooking) {
      const currentUser = localStorage.getItem("current_user");
      if (currentUser) {
        const user = JSON.parse(currentUser);
        if (user.role === "passenger") {
          const updated = getPassengerActiveBooking(user.username);
          if (updated) {
            setActiveBookingState(updated);
          } else {
            setActiveBookingState(null);
          }
        } else if (user.role === "driver") {
          const updated = getDriverActiveBooking(user.username);
          if (updated) {
            setActiveBookingState(updated);
          } else {
            setActiveBookingState(null);
          }
        }
      }
    }

    // Refresh pending bookings
    setPendingBookings(getPendingBookings());
  }, [refreshTrigger]);

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
