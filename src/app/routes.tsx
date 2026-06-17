import { createBrowserRouter } from "react-router";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import OTPPage from "./pages/auth/OTPPage";
import PendingApproval from "./pages/auth/PendingApproval";
import AuthCallbackPage from "./pages/auth/AuthCallbackPage";
import GooglePhonePage from "./pages/auth/GooglePhonePage";

// Passenger pages
import PassengerLayout from "./pages/passenger/PassengerLayout";
import PassengerDashboard from "./pages/passenger/Dashboard";
import BookingPage from "./pages/passenger/BookingPage";
import OngoingBooking from "./pages/passenger/OngoingBooking";
import LiveTracking from "./pages/passenger/LiveTracking";
import PassengerChat from "./pages/passenger/Chat";
import PassengerProfile from "./pages/passenger/Profile";
import EditProfile from "./pages/passenger/EditProfile";
import RideHistory from "./pages/passenger/RideHistory";
import Notifications from "./pages/passenger/Notifications";

// Driver pages
import DriverLayout from "./pages/driver/DriverLayout";
import DriverDashboard from "./pages/driver/Dashboard";
import ActiveRide from "./pages/driver/ActiveRide";
import DriverChat from "./pages/driver/Chat";
import DriverProfile from "./pages/driver/Profile";
import DriverEditProfile from "./pages/driver/EditProfile";

// Admin pages
import AdminPanelApp from "./adminPanel/App";

// Shared pages
import RatingPage from "./pages/shared/RatingPage";
import SupportPage from "./pages/shared/SupportPage";
import TermsAndConditions from "./pages/shared/TermsAndConditions";
import PrivacyPolicy from "./pages/shared/PrivacyPolicy";
import NotFound from "./pages/NotFound";

function ProtectedPassengerLayout() {
  return (
    <ProtectedRoute allowedRoles={["passenger"]}>
      <PassengerLayout />
    </ProtectedRoute>
  );
}

function ProtectedDriverLayout() {
  return (
    <ProtectedRoute allowedRoles={["driver"]}>
      <DriverLayout />
    </ProtectedRoute>
  );
}

function ProtectedAdminPanelApp() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminPanelApp />
    </ProtectedRoute>
  );
}

function ProtectedRatingPage() {
  return (
    <ProtectedRoute>
      <RatingPage />
    </ProtectedRoute>
  );
}

function ProtectedSupportPage() {
  return (
    <ProtectedRoute>
      <SupportPage />
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/register",
    Component: RegisterPage,
  },
  {
    path: "/otp",
    Component: OTPPage,
  },
  {
    path: "/pending-approval",
    Component: PendingApproval,
  },
  {
    path: "/auth/callback",
    Component: AuthCallbackPage,
  },
  {
    path: "/auth/phone",
    Component: GooglePhonePage,
  },
  {
    path: "/passenger",
    Component: ProtectedPassengerLayout,
    children: [
      { index: true, Component: PassengerDashboard },
      { path: "book", Component: BookingPage },
      { path: "ongoing-booking", Component: OngoingBooking },
      { path: "tracking/:rideId", Component: LiveTracking },
      { path: "chat/:rideId", Component: PassengerChat },
      { path: "profile", Component: PassengerProfile },
      { path: "edit-profile", Component: EditProfile },
      { path: "history", Component: RideHistory },
      { path: "notifications", Component: Notifications },
    ],
  },
  {
    path: "/driver",
    Component: ProtectedDriverLayout,
    children: [
      { index: true, Component: DriverDashboard },
      { path: "active-ride", Component: ActiveRide },
      { path: "ride/:rideId", Component: ActiveRide },
      { path: "chat/:rideId", Component: DriverChat },
      { path: "profile", Component: DriverProfile },
      { path: "edit-profile", Component: DriverEditProfile },
    ],
  },
  {
    path: "/admin/*",
    Component: ProtectedAdminPanelApp,
  },
  {
    path: "/rating/:rideId",
    Component: ProtectedRatingPage,
  },
  {
    path: "/support",
    Component: ProtectedSupportPage,
  },
  {
    path: "/terms",
    Component: TermsAndConditions,
  },
  {
    path: "/privacy",
    Component: PrivacyPolicy,
  },
  {
    path: "*",
    Component: NotFound,
  },
]);
