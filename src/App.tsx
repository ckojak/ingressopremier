import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { HelmetProvider } from "react-helmet-async";
import LoadingScreen from "@/components/LoadingScreen";

// Eager load critical pages
import Index from "./pages/Index";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load non-critical pages for better performance
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentSuccessMercadoPago = lazy(() => import("./pages/PaymentSuccessMercadoPago"));
const PaymentSuccessStripe = lazy(() => import("./pages/PaymentSuccessStripe"));
const MyTickets = lazy(() => import("./pages/MyTickets"));
const Cart = lazy(() => import("./pages/Cart"));
const Profile = lazy(() => import("./pages/Profile"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Support = lazy(() => import("./pages/Support"));
const About = lazy(() => import("./pages/About"));
const HalfPrice = lazy(() => import("./pages/HalfPrice"));
const AcceptTransfer = lazy(() => import("./pages/AcceptTransfer"));

// Admin pages - lazy loaded
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const SuperAdminDashboard = lazy(() => import("./pages/admin/SuperAdminDashboard"));
const AdminEvents = lazy(() => import("./pages/admin/Events"));
const Tickets = lazy(() => import("./pages/admin/Tickets"));
const Sales = lazy(() => import("./pages/admin/Sales"));
const Users = lazy(() => import("./pages/admin/Users"));
const CheckIn = lazy(() => import("./pages/admin/CheckIn"));
const Coupons = lazy(() => import("./pages/admin/Coupons"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const StaffManagement = lazy(() => import("./pages/admin/StaffManagement"));
const Complimentary = lazy(() => import("./pages/admin/Complimentary"));

// Public staff check-in page
const StaffCheckin = lazy(() => import("./pages/StaffCheckin"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
  },
});

// Loading fallback for lazy components
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-pulse text-muted-foreground">Carregando...</div>
  </div>
);

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AnimatePresence mode="wait">
            {isLoading && <LoadingScreen onLoadingComplete={() => setIsLoading(false)} />}
          </AnimatePresence>
          {!isLoading && (
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/eventos" element={<Events />} />
                  <Route path="/evento/:id" element={<EventDetails />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/pagamento-sucesso" element={<PaymentSuccessMercadoPago />} />
                  <Route path="/pagamento-sucesso-stripe" element={<PaymentSuccessStripe />} />
                  <Route path="/meus-ingressos" element={<MyTickets />} />
                  <Route path="/carrinho" element={<Cart />} />
                  <Route path="/perfil" element={<Profile />} />
                  
                  {/* Institutional Pages */}
                  <Route path="/sobre" element={<About />} />
                  <Route path="/suporte" element={<Support />} />
                  <Route path="/termos" element={<TermsOfService />} />
                  <Route path="/privacidade" element={<Privacy />} />
                  <Route path="/meia-entrada" element={<HalfPrice />} />
                  
                  {/* Ticket Transfer */}
                  <Route path="/aceitar-transferencia" element={<AcceptTransfer />} />
                  
                  {/* Staff Check-in (public) */}
                  <Route path="/staff-checkin/:accessCode" element={<StaffCheckin />} />
                  
                  {/* Admin Routes */}
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="super" element={<SuperAdminDashboard />} />
                    <Route path="eventos" element={<AdminEvents />} />
                    <Route path="ingressos" element={<Tickets />} />
                    <Route path="vendas" element={<Sales />} />
                    <Route path="checkin" element={<CheckIn />} />
                    <Route path="cupons" element={<Coupons />} />
                    <Route path="relatorios" element={<Reports />} />
                    <Route path="usuarios" element={<Users />} />
                    <Route path="equipe" element={<StaffManagement />} />
                    <Route path="cortesias" element={<Complimentary />} />
                  </Route>
                  
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          )}
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
