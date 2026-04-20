import { Outlet } from "react-router";
import { AuthProvider } from "../context/AuthContext";
import { BookingProvider } from "../context/BookingContext";

export function MainLayout() {
  return (
    <AuthProvider>
      <BookingProvider>
        <div className="min-h-screen bg-white">
          <Outlet />
        </div>
      </BookingProvider>
    </AuthProvider>
  );
}