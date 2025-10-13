import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCapacitor } from "@/hooks/useCapacitor";
import { 
  Rocket, 
  Atom, 
  Bot, 
  Leaf, 
  Dna, 
  Zap, 
  Globe, 
  Microscope,
  Mountain,
  Star
} from "lucide-react";

interface ProfileStep3Props {
  onAgeAndInterestsSelect: (ageGroup: string, interests: string[]) => void;
  onBack: () => void;
}

export function ProfileStep3({ onAgeAndInterestsSelect, onBack }: ProfileStep3Props) {
  const [selectedAge, setSelectedAge] = useState<string>("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const { isNative, triggerHaptic } = useCapacitor();

  const ageGroups = [
    { id: "under-10", label: "Under 10", color: "kids" },
    { id: "10-18", label: "10-18", color: "students" },
    { id: "20-40", label: "20-40", color: "primary" },
    { id: "25-40", label: "25-40", color: "families" },
    { id: "40-plus", label: "40+", color: "researchers" }
  ];

  const interests = [
    { id: "space", label: "Space & Astronomy", icon: Rocket, color: "blue" },
    { id: "physics", label: "Physics", icon: Atom, color: "purple" },
    { id: "robotics", label: "AI & Robotics", icon: Bot, color: "orange" },
    { id: "environment", label: "Environment", icon: Leaf, color: "green" },
    { id: "biology", label: "Biology", icon: Dna, color: "pink" },
    { id: "energy", label: "Energy", icon: Zap, color: "yellow" },
    { id: "earth", label: "Earth Sciences", icon: Globe, color: "cyan" },
    { id: "chemistry", label: "Chemistry", icon: Microscope, color: "red" },
    { id: "geology", label: "Geology", icon: Mountain, color: "brown" },
    { id: "astronomy", label: "Stars & Planets", icon: Star, color: "indigo" }
  ];

  const toggleInterest = async (interestId: string) => {
    if (isNative) {
      await triggerHaptic('light');
    }
    setSelectedInterests(prev => 
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleAgeSelect = async (ageId: string) => {
    if (isNative) {
      await triggerHaptic('light');
    }
    setSelectedAge(ageId);
  };

  const handleNext = async () => {
    if (isNative) {
      await triggerHaptic('medium');
    }
    if (selectedAge) {
      onAgeAndInterestsSelect(selectedAge, selectedInterests);
    }
  };

  const handleBack = async () => {
    if (isNative) {
      await triggerHaptic('light');
    }
    onBack();
  };

  return (
    <div className="min-h-screen bg-gradient-space relative overflow-hidden">
      {/* Animated Background Elements - Mobile optimized */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-16 left-16 w-12 h-12 md:w-20 md:h-20 bg-blue-400 rounded-full animate-float opacity-60"></div>
        <div className="absolute top-20 right-16 md:right-24 w-10 h-10 md:w-16 md:h-16 bg-orange-400 rounded-full animate-float-delayed opacity-70"></div>
        <div className="absolute bottom-32 left-16 md:left-32 w-8 h-8 md:w-12 md:h-12 bg-purple-400 rounded-full animate-float opacity-50"></div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-6 md:py-12 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Header - Mobile optimized */}
          <div className="text-center mb-6 md:mb-12">
            <h1 className="text-2xl md:text-5xl font-bold text-white mb-2 md:mb-4">
              Tell us more about your interests
            </h1>
            <p className="text-sm md:text-xl text-muted-foreground">
              Select your age group and areas of interest
            </p>
          </div>

          {/* Age Group Selection - Mobile optimized layout */}
          <div className="mb-6 md:mb-12">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6 text-center">Age Group</h2>
            <div className="space-y-3 md:space-y-4">
              {/* First row: Under 10, 10-18 */}
              <div className="flex gap-2 md:gap-3 justify-center">
                <Button
                  variant={selectedAge === "under-10" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleAgeSelect("under-10")}
                  className={`flex-1 md:flex-none ${selectedAge === "under-10" ? 'ring-2 ring-primary' : ''}`}
                >
                  Under 10
                </Button>
                <Button
                  variant={selectedAge === "10-18" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleAgeSelect("10-18")}
                  className={`flex-1 md:flex-none ${selectedAge === "10-18" ? 'ring-2 ring-primary' : ''}`}
                >
                  10-18
                </Button>
              </div>
              
              {/* Second row: 20-40, 25-40, 40+ */}
              <div className="flex gap-2 md:gap-3 justify-center">
                <Button
                  variant={selectedAge === "20-40" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleAgeSelect("20-40")}
                  className={`flex-1 md:flex-none ${selectedAge === "20-40" ? 'ring-2 ring-primary' : ''}`}
                >
                  20-40
                </Button>
                <Button
                  variant={selectedAge === "25-40" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleAgeSelect("25-40")}
                  className={`flex-1 md:flex-none ${selectedAge === "25-40" ? 'ring-2 ring-primary' : ''}`}
                >
                  25-40
                </Button>
                <Button
                  variant={selectedAge === "40-plus" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleAgeSelect("40-plus")}
                  className={`flex-1 md:flex-none ${selectedAge === "40-plus" ? 'ring-2 ring-primary' : ''}`}
                >
                  40+
                </Button>
              </div>
            </div>
          </div>

          {/* Interests Selection - Mobile optimized */}
          <div className="mb-6 md:mb-12">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6 text-center">
              Areas of Interest (optional)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              {interests.map((interest) => {
                const Icon = interest.icon;
                const isSelected = selectedInterests.includes(interest.id);
                return (
                  <Card
                    key={interest.id}
                    className={`cursor-pointer transition-all duration-300 hover-lift ${
                      isSelected 
                        ? 'bg-primary/20 border-primary ring-2 ring-primary' 
                        : 'bg-card/90 backdrop-blur-sm border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleInterest(interest.id)}
                  >
                    <CardContent className="p-3 md:p-4 text-center">
                      <div className="mb-2 md:mb-3 flex justify-center">
                        <Icon className={`w-6 h-6 md:w-8 md:h-8 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <p className={`text-xs md:text-sm font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {interest.label}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Selected Interests Display - Mobile optimized */}
          {selectedInterests.length > 0 && (
            <div className="mb-6 md:mb-8 text-center">
              <p className="text-white mb-3 md:mb-4 text-sm md:text-base">Selected interests:</p>
              <div className="flex justify-center gap-2 flex-wrap">
                {selectedInterests.map((interestId) => {
                  const interest = interests.find(i => i.id === interestId);
                  return (
                    <Badge key={interestId} variant="secondary" className="text-xs md:text-sm">
                      {interest?.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation - Mobile optimized */}
          <div className="flex flex-col md:flex-row justify-center gap-3 md:gap-4">
            <Button 
              variant="outline" 
              onClick={handleBack} 
              size="lg"
              className="w-full md:w-auto px-6 py-3 md:px-8 md:py-4"
            >
              ← Back
            </Button>
            <Button 
              onClick={handleNext} 
              size="lg"
              disabled={!selectedAge}
              variant="cosmic"
              className="w-full md:w-auto px-6 py-3 md:px-8 md:py-4"
            >
              Continue →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}