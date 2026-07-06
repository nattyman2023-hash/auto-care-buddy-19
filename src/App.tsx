import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/AdminLayout";
import CustomerLayout from "@/components/CustomerLayout";
import PublicLayout from "@/components/PublicLayout";
import Auth from "@/pages/Auth";
import HomePage from "@/pages/HomePage";
import LocationPage from "@/pages/LocationPage";
import ServicePage from "@/pages/ServicePage";
import Dashboard from "@/pages/Dashboard";
import CalendarPage from "@/pages/CalendarPage";
import Jobs from "@/pages/Jobs";
import Customers from "@/pages/Customers";
import ClientDirectory from "@/pages/ClientDirectory";
import HairProfiles from "@/pages/HairProfiles";
import Messages from "@/pages/Messages";
import StaffPortal from "@/pages/StaffPortal";

import Employees from "@/pages/Employees";
import Payroll from "@/pages/Payroll";

import ServiceCatalog from "@/pages/ServiceCatalog";
import ServiceManager from "@/pages/ServiceManager";
import ChairsStations from "@/pages/ChairsStations";
import WaitlistPage from "@/pages/WaitlistPage";
import InventoryPage from "@/pages/InventoryPage";
import Cart from "@/pages/Cart";
import Shop from "@/pages/Shop";
import ProductDetail from "@/pages/ProductDetail";
import Checkout from "@/pages/Checkout";
import BuyerAccount from "@/pages/BuyerAccount";
import Booking from "@/pages/Booking";
import Contact from "@/pages/Contact";
import Reports from "@/pages/Reports";
import Expenses from "@/pages/Expenses";
import Settings from "@/pages/Settings";
import ResetPassword from "@/pages/ResetPassword";
import EmployeeProfile from "@/pages/EmployeeProfile";
import Leads from "@/pages/Leads";
import AdminProducts from "@/pages/AdminProducts";
import AdminOrders from "@/pages/AdminOrders";
import NotFound from "@/pages/NotFound";
import Install from "@/pages/Install";
import Unsubscribe from "@/pages/Unsubscribe";
import CacheDiagnostics from "@/pages/CacheDiagnostics";
import ScrollToTop from "@/components/ScrollToTop";
import PwaUpdatePrompt from "@/components/PwaUpdatePrompt";
import PortalDashboard from "@/pages/portal/PortalDashboard";
import PortalBookings from "@/pages/portal/PortalBookings";
import PortalStyleDiary from "@/pages/portal/PortalStyleDiary";
import PortalSettings from "@/pages/portal/PortalSettings";
import ServicesDirectory from "@/pages/ServicesDirectory";
import ServiceCategoryPage from "@/pages/ServiceCategoryPage";
import StaffLayout from "@/components/StaffLayout";
import StaffSchedule from "@/pages/staff/StaffSchedule";
import StaffClients from "@/pages/staff/StaffClients";

const queryClient = new QueryClient();

const AdminPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AdminLayout>{children}</AdminLayout>
  </ProtectedRoute>
);

const PublicPage = ({ children }: { children: React.ReactNode }) => (
  <PublicLayout>{children}</PublicLayout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PwaUpdatePrompt />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <CartProvider>
            <Routes>
              {/* Public */}
              <Route path="/" element={<PublicPage><HomePage /></PublicPage>} />
              <Route path="/areas/:borough" element={<PublicPage><LocationPage /></PublicPage>} />
              <Route path="/mobile-mechanic/:borough" element={<Navigate to="/" replace />} />
              <Route path="/services" element={<PublicPage><ServicesDirectory /></PublicPage>} />
              <Route path="/services/:service" element={<PublicPage><ServicePage /></PublicPage>} />
              <Route path="/book" element={<PublicPage><Booking /></PublicPage>} />
              <Route path="/contact" element={<PublicPage><Contact /></PublicPage>} />
              <Route path="/cart" element={<PublicPage><Cart /></PublicPage>} />
              <Route path="/shop" element={<PublicPage><Shop /></PublicPage>} />
              <Route path="/shop/:id" element={<PublicPage><ProductDetail /></PublicPage>} />
              <Route path="/checkout" element={<PublicPage><Checkout /></PublicPage>} />
              <Route path="/barbershop" element={<PublicPage><ServiceCategoryPage /></PublicPage>} />
              <Route path="/braiding" element={<PublicPage><ServiceCategoryPage /></PublicPage>} />
              <Route path="/hair-studio" element={<PublicPage><ServiceCategoryPage /></PublicPage>} />
              <Route path="/kids" element={<PublicPage><ServiceCategoryPage /></PublicPage>} />
              <Route path="/install" element={<Install />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />

              {/* Auth */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Customer portals */}
              <Route path="/mechanic" element={<ProtectedRoute><StaffPortal /></ProtectedRoute>} />
              {/* Staff PWA */}
              <Route path="/staff" element={<ProtectedRoute><StaffLayout><StaffPortal /></StaffLayout></ProtectedRoute>} />
              <Route path="/staff/schedule" element={<ProtectedRoute><StaffLayout><StaffSchedule /></StaffLayout></ProtectedRoute>} />
              <Route path="/staff/waitlist" element={<ProtectedRoute><StaffLayout><WaitlistPage /></StaffLayout></ProtectedRoute>} />
              <Route path="/staff/clients" element={<ProtectedRoute><StaffLayout><StaffClients /></StaffLayout></ProtectedRoute>} />
              <Route path="/portal" element={<ProtectedRoute><CustomerLayout><PortalDashboard /></CustomerLayout></ProtectedRoute>} />
              <Route path="/portal/bookings" element={<ProtectedRoute><CustomerLayout><PortalBookings /></CustomerLayout></ProtectedRoute>} />
              <Route path="/portal/style-diary" element={<ProtectedRoute><CustomerLayout><PortalStyleDiary /></CustomerLayout></ProtectedRoute>} />
              <Route path="/portal/settings" element={<ProtectedRoute><CustomerLayout><PortalSettings /></CustomerLayout></ProtectedRoute>} />
              <Route path="/account" element={<ProtectedRoute><CustomerLayout><BuyerAccount /></CustomerLayout></ProtectedRoute>} />

              {/* Admin */}
              <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<AdminPage><Dashboard /></AdminPage>} />
              <Route path="/calendar" element={<AdminPage><CalendarPage /></AdminPage>} />
              <Route path="/jobs" element={<AdminPage><Jobs /></AdminPage>} />
              <Route path="/customers" element={<AdminPage><ClientDirectory /></AdminPage>} />
              <Route path="/customers-old" element={<AdminPage><Customers /></AdminPage>} />
              <Route path="/hair-profiles" element={<AdminPage><HairProfiles /></AdminPage>} />
              <Route path="/vehicles" element={<Navigate to="/hair-profiles" replace />} />
              <Route path="/messages" element={<AdminPage><Messages /></AdminPage>} />
              <Route path="/employees" element={<AdminPage><Employees /></AdminPage>} />
              <Route path="/employees/:id" element={<AdminPage><EmployeeProfile /></AdminPage>} />
              <Route path="/payroll" element={<AdminPage><Payroll /></AdminPage>} />
              <Route path="/service-catalog" element={<AdminPage><ServiceCatalog /></AdminPage>} />
              <Route path="/service-manager" element={<AdminPage><ServiceManager /></AdminPage>} />
              <Route path="/chairs" element={<AdminPage><ChairsStations /></AdminPage>} />
              <Route path="/waitlist" element={<AdminPage><WaitlistPage /></AdminPage>} />
              <Route path="/inventory" element={<AdminPage><InventoryPage /></AdminPage>} />
              <Route path="/reports" element={<AdminPage><Reports /></AdminPage>} />
              <Route path="/expenses" element={<AdminPage><Expenses /></AdminPage>} />
              <Route path="/settings" element={<AdminPage><Settings /></AdminPage>} />
              <Route path="/leads" element={<AdminPage><Leads /></AdminPage>} />
              <Route path="/products" element={<AdminPage><AdminProducts /></AdminPage>} />
              <Route path="/orders" element={<AdminPage><AdminOrders /></AdminPage>} />
              <Route path="/cache-diagnostics" element={<CacheDiagnostics />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
