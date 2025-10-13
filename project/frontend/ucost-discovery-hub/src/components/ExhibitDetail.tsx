import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Play, Lightbulb, Plus, Check, Telescope, Sparkles } from "lucide-react";

interface ExhibitDetailProps {
  exhibitId: string;
  onBack: () => void;
  onAddToTour: (exhibitId: string) => void;
}

export function ExhibitDetail({ exhibitId, onBack, onAddToTour }: ExhibitDetailProps) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exhibit, setExhibit] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!exhibitId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/exhibits/${exhibitId}`);
        if (!res.ok) throw new Error(`Failed to load exhibit (${res.status})`);
        const data = await res.json();
        if (!isMounted) return;
        setExhibit(data?.exhibit || null);
      } catch (e: any) {
        if (isMounted) setError(e.message || 'Failed to load exhibit');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [API_BASE_URL, exhibitId]);

  const uiExhibit = exhibit || {
    name: "EXHIBIT NOT FOUND",
    funFact: "This exhibit doesn't exist yet!",
    description: "Please upload exhibits from the admin panel to see them here.",
    features: ["Upload from admin panel"],
    backgroundGradient: "from-gray-900 via-gray-800 to-gray-900"
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${exhibit.backgroundGradient} relative overflow-hidden`}>
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={onBack}
        className="absolute top-4 left-4 z-20 text-white hover:bg-white/10"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Planets */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-orange-400 rounded-full animate-float opacity-20"></div>
        <div className="absolute top-32 right-24 w-24 h-24 bg-blue-400 rounded-full animate-float-delayed opacity-25"></div>
        <div className="absolute bottom-32 left-32 w-20 h-20 bg-purple-400 rounded-full animate-float opacity-30"></div>
        
        {/* Observatory/Building */}
        <div className="absolute bottom-20 right-20 w-40 h-32">
          <div className="w-full h-24 bg-blue-800 rounded-t-3xl opacity-60"></div>
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-16 bg-blue-700 rounded-full opacity-80"></div>
          <Telescope className="absolute top-2 left-1/2 transform -translate-x-1/2 w-6 h-6 text-white opacity-60" />
        </div>
        
        {/* Stars */}
        <Sparkles className="absolute top-24 left-1/3 w-6 h-6 text-yellow-300 animate-pulse" />
        <Sparkles className="absolute top-48 right-1/3 w-4 h-4 text-blue-300 animate-pulse" style={{animationDelay: '1s'}} />
        <Sparkles className="absolute bottom-48 left-1/4 w-5 h-5 text-purple-300 animate-pulse" style={{animationDelay: '2s'}} />
      </div>

      <div className="container mx-auto px-8 py-12 relative z-10 flex items-center justify-center min-h-screen">
        <div className="max-w-4xl w-full">
          {/* Main Content Card */}
          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 p-8 rounded-3xl shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-6xl font-bold text-white mb-6">
                {uiExhibit.name}
              </h1>
              
              {/* Fun Fact Banner */}
              <Card className="inline-block bg-white/90 backdrop-blur-sm border-0 px-6 py-4 rounded-2xl mb-8">
                <div className="flex items-center gap-3">
                  <Lightbulb className="w-6 h-6 text-yellow-500" />
                  <span className="text-gray-800 font-medium text-lg">
                    Did You Know? {uiExhibit.funFact || 'Learn something new at every exhibit!'}
                  </span>
                </div>
              </Card>
            </div>

            {/* Description */}
            <div className="mb-8">
              <p className="text-white/90 text-xl leading-relaxed text-center max-w-3xl mx-auto">
                {uiExhibit.description}
              </p>
            </div>

            {/* Features */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-4 text-center">What You'll Experience:</h3>
              <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                {(uiExhibit.features || []).map((feature: string, index: number) => (
                  <div key={index} className="flex items-center gap-3 text-white/80">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-lg">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-6 justify-center">
              <Button
                size="xl"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Lightbulb className="mr-3 h-6 w-6" />
                FUN FACTS
              </Button>
              
              <Button
                size="xl"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Play className="mr-3 h-6 w-6" />
                WATCH VIDEO
              </Button>
            </div>

            {/* Add to Tour */}
            <div className="text-center mt-8">
              <Button
                onClick={() => onAddToTour(exhibitId)}
                variant="outline"
                size="xl"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 px-8 py-4 text-xl font-bold rounded-2xl"
              >
                <Plus className="mr-3 h-6 w-6" />
                Add to My Tour
              </Button>
            </div>
          </Card>
          {loading && (
            <div className="text-center text-white/80 mt-4">Loading exhibit...</div>
          )}
          {error && (
            <div className="text-center text-red-300 mt-2">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}