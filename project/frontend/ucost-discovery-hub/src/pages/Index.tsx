import { useState, lazy, Suspense } from "react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { UserProfile } from "@/components/OnboardingFlow";
import { useToast } from "@/hooks/use-toast";

// Lazy load heavy components for optimal code splitting
const OnboardingFlow = lazy(() => import("@/components/OnboardingFlow").then(m => ({ default: m.OnboardingFlow })));
const ExhibitMap = lazy(() => import("@/components/ExhibitMap").then(m => ({ default: m.ExhibitMap })));
const ExhibitDetail = lazy(() => import("@/components/ExhibitDetail").then(m => ({ default: m.ExhibitDetail })));
const MyTour = lazy(() => import("@/components/MyTour").then(m => ({ default: m.MyTour })));
const AdminLogin = lazy(() => import("@/components/AdminLogin"));
const AdminPanel = lazy(() => import("@/components/AdminPanel"));

// Loading fallback for lazy components
const ComponentLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

type Screen = "welcome" | "onboarding" | "map" | "exhibit" | "tour" | "admin";

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>("welcome");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedExhibit, setSelectedExhibit] = useState<string>("");
  const [tourExhibits, setTourExhibits] = useState<string[]>([]);
  const [recommendedExhibits, setRecommendedExhibits] = useState<any[]>([]);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const { toast } = useToast();

  const handleStartOnboarding = () => {
    setCurrentScreen("onboarding");
  };

  const handleOnboardingComplete = (profile: UserProfile, recommendedExhibits?: any[]) => {
    setUserProfile(profile);
    if (recommendedExhibits) {
      setRecommendedExhibits(recommendedExhibits);
    }
    setCurrentScreen("map");
    toast({
      title: "Profile Complete!",
      description: `Welcome! Your personalized tour is ready.`,
    });
  };

  const handleExhibitSelect = (exhibitId: string) => {
    setSelectedExhibit(exhibitId);
    setCurrentScreen("exhibit");
  };

  const handleAddToTour = (exhibitId: string) => {
    if (!tourExhibits.includes(exhibitId)) {
      setTourExhibits([...tourExhibits, exhibitId]);
      toast({
        title: "Added to Tour!",
        description: "Exhibit added to your personalized tour.",
      });
    }
  };

  const handleRemoveFromTour = (exhibitId: string) => {
    setTourExhibits(tourExhibits.filter(id => id !== exhibitId));
    toast({
      title: "Removed from Tour",
      description: "Exhibit removed from your tour.",
    });
  };

  const handleStartTour = () => {
    toast({
      title: "Tour Started!",
      description: "Enjoy your personalized science adventure!",
    });
    // In a real app, this would navigate to a tour guide interface
  };

  const handleBack = () => {
    switch (currentScreen) {
      case "exhibit":
        setCurrentScreen("map");
        break;
      case "map":
        setCurrentScreen("welcome");
        break;
      case "tour":
        setCurrentScreen("map");
        break;
      case "onboarding":
        setCurrentScreen("welcome");
        break;
    }
  };

  const handleShowTour = () => {
    setCurrentScreen("tour");
  };

  const handleAdminAccess = () => {
    setShowAdminLogin(true);
  };

  const handleAdminLoginSuccess = () => {
    setCurrentScreen("admin");
    setShowAdminLogin(false);
  };

  const handleBackFromAdmin = () => {
    setCurrentScreen("welcome");
  };

  return (
    <div className="relative">
      {/* Floating Tour Button - Mobile optimized */}
      {currentScreen !== "welcome" && currentScreen !== "tour" && tourExhibits.length > 0 && (
        <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50">
          <button
            onClick={handleShowTour}
            className="bg-gradient-cosmic text-foreground px-4 py-3 md:px-6 md:py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 font-bold text-sm md:text-base"
          >
            My Tour ({tourExhibits.length})
          </button>
        </div>
      )}

      {/* Screen Rendering */}
      {currentScreen === "welcome" && (
        <WelcomeScreen 
          onStartJourney={handleStartOnboarding} 
          onAdminAccess={handleAdminAccess}
        />
      )}

      {currentScreen === "onboarding" && (
        <Suspense fallback={<ComponentLoader />}>
          <OnboardingFlow
            onComplete={handleOnboardingComplete}
            onBack={handleBack}
          />
        </Suspense>
      )}
      
      {currentScreen === "map" && (
        <Suspense fallback={<ComponentLoader />}>
          <ExhibitMap 
            userProfile={userProfile}
            onExhibitSelect={handleExhibitSelect}
            onBack={handleBack}
          />
        </Suspense>
      )}
      
      {currentScreen === "exhibit" && (
        <Suspense fallback={<ComponentLoader />}>
          <ExhibitDetail
            exhibitId={selectedExhibit}
            onBack={handleBack}
            onAddToTour={handleAddToTour}
          />
        </Suspense>
      )}
      
      {currentScreen === "tour" && (
        <Suspense fallback={<ComponentLoader />}>
          <MyTour
            selectedExhibits={tourExhibits}
            onStartTour={handleStartTour}
            onBack={handleBack}
            onRemoveExhibit={handleRemoveFromTour}
          />
        </Suspense>
      )}

      {currentScreen === "admin" && (
        <Suspense fallback={<ComponentLoader />}>
          <AdminPanel onBack={handleBackFromAdmin} />
        </Suspense>
      )}

      {showAdminLogin && (
        <Suspense fallback={<ComponentLoader />}>
          <AdminLogin
            isOpen={showAdminLogin}
            onClose={() => setShowAdminLogin(false)}
            onSuccess={handleAdminLoginSuccess}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Index;
