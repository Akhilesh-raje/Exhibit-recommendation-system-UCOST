import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  MapPin,
  Clock,
  Star,
  Users,
  Rocket,
  Atom,
  Bot,
  Leaf,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

interface SmartRoadmapProps {
  onStartTour: (recommendedExhibits: any[]) => void;
  onCustomize: () => void;
  onBack: () => void;
  userProfile: {
    group: string;
    hasChildren: boolean;
    ageGroup: string;
    interests: string[];
    timeSlot: string;
  };
}

export function SmartRoadmap({ onStartTour, onCustomize, onBack, userProfile }: SmartRoadmapProps) {
  // Use centralized API config for desktop compatibility
  const API_BASE_URL = (() => {
    try {
      const { getApiUrl } = require('@/lib/desktop-config');
      return getApiUrl();
    } catch {
      return (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
    }
  })();
  const SERVER_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

  type ExhibitItem = {
    id: string;
    name: string;
    description?: string;
    category?: string;
    ageRange?: string;
    mapLocation?: { floor?: string } | null;
    averageTime?: number;
    images?: string[];
  };

  const [recommendedExhibits, setRecommendedExhibits] = useState<ExhibitItem[]>([]);
  const [backendTotalTime, setBackendTotalTime] = useState<number>(0);
  const [backendTimeBudget, setBackendTimeBudget] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<'file' | 'service' | 'heuristics' | 'unknown'>('unknown');
  const [aiServiceOk, setAiServiceOk] = useState<boolean>(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(userProfile.interests || []);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  async function fetchHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/analytics/health/embeddings`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data?.success) {
        setAiSource((data.source as any) || 'unknown');
        setAiServiceOk(!!data.serviceOk);
      } else {
        setAiSource('heuristics');
        setAiServiceOk(false);
      }
    } catch (err: any) {
      // On timeout or network error, default to heuristics (still works)
      setAiSource('heuristics');
      setAiServiceOk(false);
    }
  }

  async function fetchRecommendations(currentInterests: string[]) {
    setLoading(true);
    setError(null);
    try {
      const body = {
        userProfile: {
          ageBand: userProfile.ageGroup,
          groupType: userProfile.group,
          groupSize: userProfile.hasChildren ? 4 : 2,
          interests: currentInterests,
          timeBudget: userProfile.timeSlot,
          mobility: 'none',
          crowdTolerance: 'medium',
        }
      };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/tours/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, selectedFloor: 'all', globalTimeBudget: true }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      if (data?.success && Array.isArray(data.exhibits)) {
        setRecommendedExhibits(data.exhibits);
        if (typeof data.totalTime === 'number') setBackendTotalTime(data.totalTime);
        if (typeof data.timeBudget === 'number') setBackendTimeBudget(data.timeBudget);
      } else {
        setRecommendedExhibits([]);
        setBackendTotalTime(0);
        setBackendTimeBudget(0);
        if (!data?.success) {
          setError(data?.message || 'No exhibits found. Please check if exhibits are uploaded.');
        }
      }
    } catch (e: any) {
      if (e.name === 'TimeoutError' || e.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError(e.message || 'Failed to load recommendations. Using heuristics fallback.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    fetchHealth();
    fetchRecommendations(selectedInterests);
    return () => { mounted = false; };
  }, [API_BASE_URL, userProfile.ageGroup, userProfile.group, userProfile.hasChildren, userProfile.timeSlot, selectedInterests]);

  const pickIconForCategory = (category?: string) => {
    switch ((category || '').toLowerCase()) {
      case 'physics':
        return Atom;
      case 'ai-and-robotics':
      case 'technology':
        return Bot;
      case 'environment':
      case 'earth-science':
        return Leaf;
      case 'stars-and-planets':
      case 'space-and-astronomy':
        return Rocket;
      default:
        return Star;
    }
  };

  const colorForCategory = (category?: string) => {
    switch ((category || '').toLowerCase()) {
      case 'physics':
        return {
          border: 'border-blue-500',
          bg: 'bg-blue-500/15',
          dot: 'bg-blue-500',
          line: 'stroke-blue-400'
        };
      case 'ai-and-robotics':
      case 'technology':
        return {
          border: 'border-purple-500',
          bg: 'bg-purple-500/15',
          dot: 'bg-purple-500',
          line: 'stroke-purple-400'
        };
      case 'environment':
      case 'earth-science':
        return {
          border: 'border-green-500',
          bg: 'bg-green-500/15',
          dot: 'bg-green-500',
          line: 'stroke-green-400'
        };
      case 'stars-and-planets':
      case 'space-and-astronomy':
        return {
          border: 'border-yellow-500',
          bg: 'bg-yellow-500/15',
          dot: 'bg-yellow-500',
          line: 'stroke-yellow-400'
        };
      default:
        return {
          border: 'border-slate-500',
          bg: 'bg-slate-500/15',
          dot: 'bg-slate-500',
          line: 'stroke-slate-400'
        };
    }
  };

  const recommendations = useMemo(() => {
    if (!recommendedExhibits || recommendedExhibits.length === 0) return [] as any[];

    // Use the backend recommended exhibits directly
    const processed = recommendedExhibits.map((ex) => {
      const duration = Math.max(5, Number(ex.averageTime || 10));
      const Icon = pickIconForCategory(ex.category);
      const firstImage = (ex.images && ex.images[0]) ? `${SERVER_BASE_URL}/uploads/${ex.images[0]}` : undefined;
      const colors = colorForCategory(ex.category);
      return {
        id: ex.id,
        name: ex.name,
        description: ex.description || '',
        zone: (ex.mapLocation?.floor || 'ground') as string,
        duration: `${duration}`,
        durationMinutes: duration,
        priority: 'high', // All backend recommendations are high priority
        ageAppropriate: true, // Backend already filtered for age appropriateness
        icon: Icon,
        imageUrl: firstImage,
        colors
      };
    });

    // Sort by score if available, otherwise by name
    const sorted = processed.sort((a, b) => {
      const aScore = (recommendedExhibits.find(e => e.id === a.id) as any)?.score || 0;
      const bScore = (recommendedExhibits.find(e => e.id === b.id) as any)?.score || 0;
      return bScore - aScore;
    });

    return sorted;
  }, [recommendedExhibits]);

  const totalTime = recommendations.reduce((sum, exhibit) => sum + Number(exhibit.durationMinutes || 0), 0);

  const [active, setActive] = useState<any | null>(null);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-green-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  // Geometry for connectors and grid layout
  const GRID_COLUMNS = 4; // show four cards per row on large screens
  const CONNECT_STEP_Y = 200; // vertical distance between card centers (approx)
  const CONNECT_Y_OFFSET = 120; // center Y for card (image + small text)
  const SVG_VIEWBOX_WIDTH = 1000; // normalized width for connector math
  const MARGIN_X = 100;
  const COL_STEP = (SVG_VIEWBOX_WIDTH - 2 * MARGIN_X) / (GRID_COLUMNS - 1);
  const xForCol = (col: number) => MARGIN_X + col * COL_STEP;
  const svgHeight = Math.ceil(recommendations.length / GRID_COLUMNS) * CONNECT_STEP_Y;

  // Build a continuous path through all card centers
  const pathPoints = useMemo(() => {
    return recommendations.map((_, idx) => {
      const row = Math.floor(idx / GRID_COLUMNS);
      const col = idx % GRID_COLUMNS;
      return { x: xForCol(col), y: row * CONNECT_STEP_Y + CONNECT_Y_OFFSET };
    });
  }, [recommendations]);

  const tourPathD = useMemo(() => {
    if (!pathPoints.length) return '';
    let d = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    for (let i = 1; i < pathPoints.length; i++) {
      const prev = pathPoints[i - 1];
      const curr = pathPoints[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [pathPoints]);

  return (
    <>
      <div className="min-h-screen bg-gradient-space relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-16 left-16 w-20 h-20 bg-blue-400 rounded-full animate-float opacity-60"></div>
          <div className="absolute top-20 right-24 w-16 h-16 bg-orange-400 rounded-full animate-float-delayed opacity-70"></div>
          <div className="absolute bottom-32 left-32 w-12 h-12 bg-purple-400 rounded-full animate-float opacity-50"></div>
        </div>

        <div className="container mx-auto px-8 py-12 relative z-10">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold text-white mb-4">
                Your Perfect Science Adventure
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                AI-curated tour based on your preferences
              </p>
              {/* AI Status + Refine Interests */}
              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <Badge variant={aiSource === 'service' || aiSource === 'file' ? 'default' : 'secondary'}>
                    AI: {aiSource === 'service' ? 'Semantic (Service)' : aiSource === 'file' ? 'Semantic (File)' : aiSource === 'heuristics' ? 'Heuristics' : 'Unknown'}
                  </Badge>
                  {!aiServiceOk && aiSource !== 'file' && (
                    <span className="text-xs text-yellow-400" title="Using fallback heuristics - recommendations still work">
                      service offline
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['robotics', 'ai', 'technology', 'space', 'astronomy', 'geology', 'environment', 'physics'].map(tag => (
                    <button
                      key={tag}
                      className={`px-2 py-1 rounded border text-xs ${selectedInterests.includes(tag) ? 'bg-white text-black' : 'bg-transparent text-white border-white/40'}`}
                      onClick={() => {
                        const next = selectedInterests.includes(tag)
                          ? selectedInterests.filter(t => t !== tag)
                          : [...selectedInterests, tag];
                        setSelectedInterests(next);
                        fetchRecommendations(next);
                      }}
                    >
                      {selectedInterests.includes(tag) ? '✓ ' : ''}{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tour Summary */}
              <div className="flex justify-center gap-8 mb-8">
                <div className="flex items-center gap-2 text-white">
                  <Clock className="w-5 h-5" />
                  <span>{backendTotalTime} minutes total</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <MapPin className="w-5 h-5" />
                  <span>{recommendedExhibits.length} exhibits</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <Users className="w-5 h-5" />
                  <span>Optimized for {userProfile.group}</span>
                </div>
              </div>
            </div>

            {/* Recommended Tour Path */}
            <div className="mb-12">
              <Card className="bg-card/90 backdrop-blur-sm border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Star className="w-6 h-6 text-yellow-500" />
                    Recommended Tour Path
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading recommendations...</p>
                    </div>
                  ) : error ? (
                    <div className="text-center py-12">
                      <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-foreground mb-2">Error Loading Recommendations</h3>
                      <p className="text-muted-foreground mb-4">{error}</p>
                      <Button onClick={() => fetchRecommendations(selectedInterests)} variant="outline" size="sm">
                        Retry
                      </Button>
                    </div>
                  ) : recommendations.length === 0 ? (
                    <div className="text-center py-12">
                      <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-foreground mb-2">No Exhibits Available</h3>
                      <p className="text-muted-foreground">Please upload exhibits from the admin panel to generate tour recommendations.</p>
                    </div>
                  ) : (
                    <>
                      <div className="relative max-h-[65vh] overflow-auto pr-2">
                        <div className="relative">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {recommendations.map((exhibit, index) => {
                              const Icon = exhibit.icon;
                              const colors = exhibit.colors;
                              const isEven = index % 2 === 0;
                              const imageFailed = exhibit.imageUrl ? failedImages.has(exhibit.imageUrl) : false;
                              return (
                                <Card
                                  key={exhibit.id}
                                  className={`group cursor-pointer border ${colors.border} hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] hover:ring-2 hover:ring-white/40 hover:border-white/40 transition-all duration-200 ${colors.bg}`}
                                  onClick={() => setActive(exhibit)}
                                >
                                  <CardContent className="p-0">
                                    <div className="relative overflow-hidden rounded-lg">
                                      <AspectRatio ratio={1}>
                                        {exhibit.imageUrl && !imageFailed ? (
                                          <img
                                            src={exhibit.imageUrl}
                                            alt={exhibit.name}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            onError={() => {
                                              if (exhibit.imageUrl) {
                                                setFailedImages(prev => new Set(prev).add(exhibit.imageUrl!));
                                              }
                                            }}
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-muted">
                                            <Icon className="w-10 h-10 text-muted-foreground" />
                                          </div>
                                        )}
                                      </AspectRatio>
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                                      <div className="absolute bottom-0 left-0 right-0 p-2">
                                        <div className="flex items-center gap-2">
                                          <div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>
                                          <h3 className="font-semibold text-white text-xs md:text-sm line-clamp-1">{exhibit.name}</h3>
                                        </div>
                                      </div>
                                    </div>
                                    {/* Brief description and meta */}
                                    <div className="p-2">
                                      <p className="text-[11px] md:text-xs text-muted-foreground line-clamp-2">{exhibit.description}</p>
                                      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                                        <Badge variant="secondary" className="text-[10px]">{exhibit.zone}</Badge>
                                        <div className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {exhibit.duration}m</div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>

                          {/* SVG connectors overlay */}
                          <svg
                            className="pointer-events-none absolute top-0 left-0 w-full"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${svgHeight}`}
                            style={{ height: svgHeight }}
                          >
                            {/* Continuous tour path */}
                            <defs>
                              <linearGradient id="tourPathGradient" x1="0" x2="1" y1="0" y2="0">
                                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.5" />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.5" />
                              </linearGradient>
                            </defs>
                            <path d={tourPathD} fill="none" stroke="url(#tourPathGradient)" strokeWidth="2.5" strokeLinecap="round" />
                            {/* Dotted overlay for style */}
                            <path d={tourPathD} fill="none" className="stroke-white/30" strokeWidth="1" strokeDasharray="4 6" strokeLinecap="round" />
                          </svg>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-8 p-4 bg-muted/30 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Tour Progress</span>
                          <span className="text-sm text-muted-foreground">Ready to start</span>
                        </div>
                        <Progress value={0} className="h-2" />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Profile Summary */}
            <div className="mb-8">
              <Card className="bg-card/90 backdrop-blur-sm border-border">
                <CardHeader>
                  <CardTitle>Your Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Group: {userProfile.group}</Badge>
                    <Badge variant="outline">Age: {userProfile.ageGroup}</Badge>
                    <Badge variant="outline">Time: {userProfile.timeSlot}</Badge>
                    {userProfile.hasChildren && <Badge variant="outline">With children</Badge>}
                    {userProfile.interests.map(interest => (
                      <Badge key={interest} variant="secondary">{interest}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Navigation */}
            <div className="flex flex-col gap-3 justify-center">
              <Button variant="outline" onClick={onBack} size="lg">
                ← Modify Profile
              </Button>
              <Button variant="secondary" onClick={onCustomize} size="lg">
                Customize Tour
              </Button>
              <Button onClick={() => onStartTour(recommendedExhibits)} size="lg" variant="cosmic">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Start My Tour
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Exhibit Modal */}
      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{active?.name}</DialogTitle>
            <DialogDescription className="sr-only">Exhibit details</DialogDescription>
          </DialogHeader>
          {active && (
            <div className="space-y-4">
              <div className="w-full">
                <AspectRatio ratio={16 / 9}>
                  {active.imageUrl ? (
                    <img src={active.imageUrl} alt={active.name} className="w-full h-full object-cover rounded" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center rounded">
                      <active.icon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </AspectRatio>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{active.description}</p>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{active.zone}</Badge>
                <div className="text-sm inline-flex items-center gap-1"><Clock className="w-4 h-4" /> {active.duration} min</div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setActive(null)}>Close</Button>
                <Button onClick={() => { setActive(null); onStartTour(recommendedExhibits); }}>Start Tour</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}