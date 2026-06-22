import { useEffect } from "react";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import SettingsPage from "./pages/SettingsPage";

import TimeTrackingPage from "./pages/TimeTrackingPage";
import ProfitabilityPage from "./pages/ProfitabilityPage";
import UtilisationPage from "./pages/UtilisationPage";
import BillableWorkPage from "./pages/BillableWorkPage";
import DataPage from "./pages/DataPage";
import ScopingToolPage from "./pages/ScopingToolPage";
import ClientPortfolioPage from "./pages/ClientPortfolioPage";
import FeeCalculatorPage from "./pages/FeeCalculatorPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const LAST_ROUTE_KEY = "app:last-route";

const RoutePersistence = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Restore last route on hard refresh when app opens at root
  useEffect(() => {
    if (location.pathname === "/") {
      const lastRoute = sessionStorage.getItem(LAST_ROUTE_KEY);
      if (lastRoute && lastRoute !== "/") {
        navigate(lastRoute, { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  // Persist current route
  useEffect(() => {
    const fullPath = `${location.pathname}${location.search}${location.hash}`;
    sessionStorage.setItem(LAST_ROUTE_KEY, fullPath);
  }, [location.pathname, location.search, location.hash]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AnalyticsProvider>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<ProjectsPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/client-portfolio" element={<ClientPortfolioPage />} />
                
                <Route path="/time-tracking" element={<TimeTrackingPage />} />
                <Route path="/utilisation" element={<UtilisationPage />} />
                <Route path="/profitability" element={<ProfitabilityPage />} />
                <Route path="/scoping" element={<ScopingToolPage />} />
                <Route path="/billable-work" element={<BillableWorkPage />} />
                <Route path="/data" element={<DataPage />} />
                <Route path="/fee-calculator" element={<FeeCalculatorPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </AnalyticsProvider>
  </QueryClientProvider>
);

export default App;
