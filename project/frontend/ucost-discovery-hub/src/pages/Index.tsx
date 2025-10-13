import { useState } from "react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { OnboardingFlow, UserProfile } from "@/components/OnboardingFlow";
import { ExhibitMap } from "@/components/ExhibitMap";
import { ExhibitDetail } from "@/components/ExhibitDetail";
import { MyTour } from "@/components/MyTour";
import AdminLogin from "@/components/AdminLogin";
import AdminPanel from "@/components/AdminPanel";
import { useToast } from "@/hooks/use-toast";

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
        <OnboardingFlow
          onComplete={handleOnboardingComplete}
          onBack={handleBack}
        />
      )}
      
      {currentScreen === "map" && (
        <ExhibitMap 
          userProfile={userProfile}
          onExhibitSelect={handleExhibitSelect}
          onBack={handleBack}
        />
      )}
      
      {currentScreen === "exhibit" && (
        <ExhibitDetail
          exhibitId={selectedExhibit}
          onBack={handleBack}
          onAddToTour={handleAddToTour}
        />
      )}
      
      {currentScreen === "tour" && (
        <MyTour
          selectedExhibits={tourExhibits}
          onBack={handleBack}
          onStartTour={handleStartTour}
          onRemoveExhibit={handleRemoveFromTour}
        />
      )}

      {currentScreen === "admin" && (
        <AdminPanel onBack={handleBackFromAdmin} />
      )}

      <AdminLogin
        isOpen={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        onSuccess={handleAdminLoginSuccess}
      />
    </div>
  );
};

export default Index;
