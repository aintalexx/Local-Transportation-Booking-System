import { createContext, useContext, type ReactNode } from "react";

export type PageKey = "overview" | "drivers" | "bookings" | "map" | "analytics" | "settings" | "archives";

interface NavigationContextValue {
  page: PageKey;
  navigate: (page: PageKey) => void;
}

export const NavigationContext = createContext<NavigationContextValue>({
  page: "overview",
  navigate: () => {},
});

export function useNavigate() {
  return useContext(NavigationContext);
}
