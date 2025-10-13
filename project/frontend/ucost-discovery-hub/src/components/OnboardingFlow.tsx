import { useState } from "react";
import { ProfileStep1 } from "./ProfileStep1";
import { ProfileStep2 } from "./ProfileStep2";
import { ProfileStep3 } from "./ProfileStep3";
import { ProfileStep4 } from "./ProfileStep4";
import { SmartRoadmap } from "./SmartRoadmap";

interface OnboardingFlowProps {
  onComplete: (profile: UserProfile, recommendedExhibits?: any[]) => void;
  onBack: () => void;
}

export interface UserProfile {
  group: string;
  hasChildren: boolean;
  ageGroup: string;
  interests: string[];
  timeSlot: string;
}

export function OnboardingFlow({ onComplete, onBack }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    interests: []
  });

  const handleGroupSelect = (group: string) => {
    setProfile(prev => ({ ...prev, group }));
    if (group === "kids") {
      setProfile(prev => ({ ...prev, hasChildren: true }));
      setCurrentStep(3); // Skip step 2 for kids
    } else {
      setCurrentStep(2);
    }
  };

  const handleChildrenSelect = (hasChildren: boolean) => {
    setProfile(prev => ({ ...prev, hasChildren }));
    setCurrentStep(3);
  };

  const handleAgeAndInterestsSelect = (ageGroup: string, interests: string[]) => {
    setProfile(prev => ({ ...prev, ageGroup, interests }));
    setCurrentStep(4);
  };

  const handleTimeSelect = (timeSlot: string) => {
    setProfile(prev => ({ ...prev, timeSlot }));
    setCurrentStep(5);
  };

  const handleStartTour = (recommendedExhibits?: any[]) => {
    onComplete(profile as UserProfile, recommendedExhibits);
  };

  const handleCustomize = () => {
    setCurrentStep(3); // Go back to interests selection
  };

  const handleBackStep = () => {
    if (currentStep === 1) {
      onBack();
    } else if (currentStep === 3 && profile.group === "kids") {
      setCurrentStep(1);
    } else {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <>
      {currentStep === 1 && (
        <ProfileStep1 
          onGroupSelect={handleGroupSelect}
          onBack={onBack}
        />
      )}
      
      {currentStep === 2 && (
        <ProfileStep2 
          onChildrenSelect={handleChildrenSelect}
          onBack={handleBackStep}
          selectedGroup={profile.group || ""}
        />
      )}
      
      {currentStep === 3 && (
        <ProfileStep3 
          onAgeAndInterestsSelect={handleAgeAndInterestsSelect}
          onBack={handleBackStep}
        />
      )}
      
      {currentStep === 4 && (
        <ProfileStep4 
          onTimeSelect={handleTimeSelect}
          onBack={handleBackStep}
        />
      )}
      
      {currentStep === 5 && (
        <SmartRoadmap
          onStartTour={handleStartTour}
          onCustomize={handleCustomize}
          onBack={handleBackStep}
          userProfile={profile as UserProfile}
        />
      )}
    </>
  );
}