import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";

// Lazy load routes for optimal code splitting
const Index = lazy(() => import("./pages/Index"));
const MobileAdminPanel = lazy(() => import("./pages/MobileAdminPanel").then(m => ({ default: m.MobileAdminPanel })));
const MobileExhibitManagement = lazy(() => import("./pages/MobileExhibitManagement").then(m => ({ default: m.MobileExhibitManagement })));
const AdminP2P = lazy(() => import("./pages/AdminP2P"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<MobileAdminPanel />} />
            <Route path="/admin/exhibits" element={<MobileExhibitManagement />} />
            <Route path="/admin/p2p" element={<AdminP2P />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
