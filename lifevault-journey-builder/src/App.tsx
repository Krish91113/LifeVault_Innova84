import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { WalletProvider } from "@/context/WalletContext";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Privacy from "./pages/Privacy";
import Legacy from "./pages/Legacy";
import NotFound from "./pages/NotFound";
import SharedMemory from './pages/SharedMemory';

// Quest / Campaign Pages
import QuestMap from "./pages/QuestMap";
import QuestDetail from "./pages/QuestDetail";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import QuestHistory from "./pages/QuestHistory";
import BusinessDashboard from "./pages/BusinessDashboard";
import BusinessLogin from "./pages/business/BusinessLogin";
import StoryView from "./pages/StoryView";
import Stories from "./pages/Stories";


const queryClient = new QueryClient();

const isBusinessUserType = (userType?: string) =>
  ['creator', 'brand', 'government', 'admin'].includes(userType || '');

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-black/10 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Business Protected Route Component
const BusinessProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-black/10 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/business/login" replace />;
  }

  const userType = (user as any).userType as string | undefined;
  if (!isBusinessUserType(userType)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Public Route
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-black/10 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/privacy" element={<ProtectedRoute><Privacy /></ProtectedRoute>} />
      <Route path="/legacy" element={<ProtectedRoute><Legacy /></ProtectedRoute>} />
      <Route path="/share/:shortCode" element={<SharedMemory />} />

      {/* Quest & Campaign Routes */}
      <Route path="/quests" element={<ProtectedRoute><QuestMap /></ProtectedRoute>} />
      <Route path="/quests/:id" element={<ProtectedRoute><QuestDetail /></ProtectedRoute>} />
      <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
      <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignDetail /></ProtectedRoute>} />
      <Route path="/quest-history" element={<ProtectedRoute><QuestHistory /></ProtectedRoute>} />ele,
      <Route path='/stories' element={<ProtectedRoute><Stories /></ProtectedRoute>} />
      <Route path="/stories/:id" element={<ProtectedRoute><StoryView /></ProtectedRoute>} />

      {/* Business Portal (separate routes, not shown in user navbar) */}
      <Route path="/business/login" element={<BusinessLogin />} />
      <Route
        path="/business/dashboard"
        element={
          <BusinessProtectedRoute>
            <BusinessDashboard />
          </BusinessProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <WalletProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </WalletProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;