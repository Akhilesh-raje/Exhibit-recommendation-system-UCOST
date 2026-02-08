import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, GraduationCap, Heart, FlaskConical, Rocket, Sparkles, Settings } from "lucide-react";
import { useCapacitor } from "@/hooks/useCapacitor";
import { ChatbotBubble } from "./ChatbotBubble";

interface WelcomeScreenProps {
  onStartJourney: () => void;
  onAdminAccess: () => void;
}

export function WelcomeScreen({
  onStartJourney,
  onAdminAccess
}: WelcomeScreenProps) {
  const { isNative, triggerHaptic } = useCapacitor();

  const handleStartJourney = async () => {
    if (isNative) {
      await triggerHaptic('medium');
    }
    onStartJourney();
  };

  const handleAdminAccess = async () => {
    if (isNative) {
      await triggerHaptic('light');
    }
    onAdminAccess();
  };

  return (
    <div className="min-h-screen bg-gradient-space relative overflow-hidden">
      {/* Admin Access Button */}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleAdminAccess} 
        className="absolute top-4 right-4 opacity-30 hover:opacity-100 transition-opacity z-20 md:top-6 md:right-6"
      >
        <Settings className="h-5 w-5 md:h-6 md:w-6" />
      </Button>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Planets - Mobile optimized positioning */}
        <div className="absolute top-16 left-16 w-16 h-16 md:w-20 md:h-20 bg-blue-400 rounded-full animate-float opacity-60"></div>
        <div className="absolute top-20 right-16 md:right-24 w-12 h-12 md:w-16 md:h-16 bg-orange-400 rounded-full animate-float-delayed opacity-70"></div>
        <div className="absolute bottom-32 left-16 md:left-32 w-8 h-8 md:w-12 md:h-12 bg-purple-400 rounded-full animate-float opacity-50"></div>
        <div className="absolute bottom-24 right-16 md:right-32 w-16 h-16 md:w-24 md:h-24 bg-green-400 rounded-full animate-float-delayed opacity-60"></div>
        
        {/* Stars - Mobile optimized */}
        <Sparkles className="absolute top-32 left-1/3 w-4 h-4 md:w-6 md:h-6 text-yellow-300 animate-pulse" />
        <Sparkles className="absolute top-48 right-1/3 w-3 h-3 md:w-4 md:h-4 text-blue-300 animate-pulse" style={{
          animationDelay: '1s'
        }} />
        <Sparkles className="absolute bottom-48 left-1/4 w-4 h-4 md:w-5 md:h-5 text-purple-300 animate-pulse" style={{
          animationDelay: '2s'
        }} />
        
        {/* Rocket - Mobile optimized */}
        <Rocket className="absolute top-60 right-16 w-6 h-6 md:w-8 md:h-8 text-orange-400 animate-bounce-gentle" />
      </div>

      <div className="container mx-auto px-4 md:px-8 py-8 md:py-12 relative z-10 flex items-center justify-center min-h-screen">
        <div className="max-w-6xl w-full">
          {/* Logo & Header - Mobile responsive */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-8 md:mb-16">
            {/* Official UCOST Logo */}
            <div className="relative">
              <img 
                src="/logo.png" 
                alt="UCOST Logo" 
                className="w-32 h-32 md:w-40 md:h-40 object-contain animate-bounce-gentle"
                onError={(e) => {
                  // Fallback to SVG if PNG doesn't load
                  if (e.currentTarget.src !== '/logo.svg') {
                    e.currentTarget.src = '/logo.svg';
                  }
                }}
              />
            </div>
            
            {/* Title - Mobile responsive text */}
            <div className="text-center">
              <h1 className="text-3xl md:text-6xl font-bold text-white mb-2 md:mb-4">
                Welcome to Regional Science Centre (RSC) Dehradun
              </h1>
              
              <p className="text-lg md:text-2xl text-muted-foreground mb-4 md:mb-8">
                Your personalized science adventure awaits
              </p>
            </div>
          </div>

          {/* Main Action Button - Mobile optimized */}
          <div className="text-center mb-8 md:mb-16">
            <Button 
              onClick={handleStartJourney} 
              size="xl" 
              variant="cosmic" 
              className="text-lg md:text-2xl px-8 md:px-16 py-6 md:py-8 rounded-2xl md:rounded-3xl w-full md:w-auto max-w-sm md:max-w-none"
            >
              <Sparkles className="w-6 h-6 md:w-8 md:h-8 mr-2 md:mr-4" />
              Start Your Adventure
            </Button>
          </div>

          {/* Feature Cards - Mobile responsive grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            <Card className="bg-card/90 backdrop-blur-sm border-border">
              <div className="p-4 md:p-6 text-center">
                <Rocket className="w-8 h-8 md:w-12 md:h-12 text-primary mx-auto mb-3 md:mb-4" />
                <h3 className="text-base md:text-lg font-bold text-foreground mb-2">Personalized Tours</h3>
                <p className="text-sm md:text-base text-muted-foreground">AI-powered recommendations based on your interests</p>
              </div>
            </Card>
            
            <Card className="bg-card/90 backdrop-blur-sm border-border">
              <div className="p-4 md:p-6 text-center">
                <FlaskConical className="w-8 h-8 md:w-12 md:h-12 text-accent mx-auto mb-3 md:mb-4" />
                <h3 className="text-base md:text-lg font-bold text-foreground mb-2">Interactive Exhibits</h3>
                <p className="text-sm md:text-base text-muted-foreground">Hands-on science experiences for all ages</p>
              </div>
            </Card>
            
            <Card className="bg-card/90 backdrop-blur-sm border-border">
              <div className="p-4 md:p-6 text-center">
                <Heart className="w-8 h-8 md:w-12 md:h-12 text-kids mx-auto mb-3 md:mb-4" />
                <h3 className="text-base md:text-lg font-bold text-foreground mb-2">Family Friendly</h3>
                <p className="text-sm md:text-base text-muted-foreground">Fun for kids, students, families, and researchers</p>
              </div>
            </Card>
          </div>

          {/* Footer */}
          <div className="text-center mt-16">
            <p className="text-xl text-muted-foreground font-medium">
              🚀 Powered by AI • UCOST Dehradun
            </p>
          </div>
        </div>
      </div>

      {/* Chatbot Bubble */}
      <ChatbotBubble />
    </div>
  );
}