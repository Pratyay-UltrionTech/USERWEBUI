import { Navigate, createHashRouter } from "react-router";
import { HeroPage } from "./pages/HeroPage";
import { AuthPage } from "./pages/AuthPage";
import { ProfileSetup } from "./pages/ProfileSetup";
import { ServiceHistoryPage } from "./pages/ServiceHistoryPage";
import { HomePage } from "./pages/HomePage";
import { BranchSelection } from "./pages/BranchSelection";
import { AddOnsPage } from "./pages/AddOnsPage";
import { DateTimePage } from "./pages/DateTimePage";
import { BookingSummary } from "./pages/BookingSummary";
import { PaymentPage } from "./pages/PaymentPage";
import { SuccessPage } from "./pages/SuccessPage";
import { MainLayout } from "./components/MainLayout";

export const router = createHashRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, Component: HeroPage },
      { path: "login", Component: AuthPage },
      { path: "profile-setup", Component: ProfileSetup },
      { path: "service-history", Component: ServiceHistoryPage },
      { path: "home", Component: HomePage },
      { path: "branch/:branchId", Component: BranchSelection },
      { path: "add-ons", Component: AddOnsPage },
      { path: "addons", element: <Navigate to="/add-ons" replace /> },
      { path: "datetime", Component: DateTimePage },
      { path: "summary", Component: BookingSummary },
      { path: "payment", Component: PaymentPage },
      { path: "success", Component: SuccessPage },
    ],
  },
]);
