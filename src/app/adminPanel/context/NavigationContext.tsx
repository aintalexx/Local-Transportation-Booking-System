import { createContext, useContext, type ReactNode } from "react";

export type PageKey = "overview" | "drivers" | "bookings" | "map" | "analytics" | "settings" | "archives";

export type MapDriverTarget = {
  id: string;
  name: string;
  phone?: string;
};

interface NavigationContextValue {
  page: PageKey;
  mapDriverTarget: MapDriverTarget | null;
  clearMapDriverTarget: () => void;
  navigate: (page: PageKey, options?: { mapDriverTarget?: MapDriverTarget | null }) => void;
}

export const NavigationContext = createContext<NavigationContextValue>({
  page: "overview",
  mapDriverTarget: null,
  clearMapDriverTarget: () => {},
  navigate: () => {},
});

export function useNavigate() {
  return useContext(NavigationContext);
}
