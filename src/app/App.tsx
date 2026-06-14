import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "./components/ui/sonner";
import { UserProvider } from "./context/UserContext";
import { BookingProvider } from "./context/BookingContext";

export default function App() {
  return (
    <UserProvider>
      <BookingProvider>
        <RouterProvider router={router} />
        <Toaster />
      </BookingProvider>
    </UserProvider>
  );
}