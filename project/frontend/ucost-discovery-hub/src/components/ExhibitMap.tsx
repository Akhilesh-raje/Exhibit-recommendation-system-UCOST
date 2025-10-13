import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { PinMarker } from "@/components/ui/PinMarker";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ArrowLeft, Rocket, Brain, Leaf, Mountain, FlaskConical, Telescope, MapPin, Star } from "lucide-react";

// Import the actual map images
import outsideMap from './maps/outside.png';
import groundMap from './maps/ground.png';
import firstFloorMap from './maps/1st-floor.png';

interface ExhibitMapProps {
  userProfile: { group: string; interests: string[] } | null;
  onExhibitSelect: (exhibitId: string) => void;
  onBack: () => void;
}

export function ExhibitMap({ userProfile, onExhibitSelect, onBack }: ExhibitMapProps) {
  const [selectedFloor, setSelectedFloor] = useState<'outside' | 'ground' | 'first'>('ground');
  const [active, setActive] = useState<any | null>(null);
  const [recommendedExhibits, setRecommendedExhibits] = useState<any[]>([]);
  const [recoLoading, setRecoLoading] = useState(false);
  const [recoError, setRecoError] = useState<string | null>(null);

  // Zoom/Pan state
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchStartRef = useRef<{ distance: number; midpoint: { x: number; y: number }; scale: number } | null>(null);

  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
  const SERVER_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

  const pinColorsForCategory = (category?: string) => {
    switch ((category || '').toLowerCase()) {
      case 'physics':
        return { text: 'text-sky-500', glow: 'bg-sky-400' };
      case 'ai-and-robotics':
      case 'technology':
        return { text: 'text-fuchsia-500', glow: 'bg-fuchsia-400' };
      case 'environment':
      case 'earth-science':
        return { text: 'text-emerald-500', glow: 'bg-emerald-400' };
      case 'stars-and-planets':
      case 'space-and-astronomy':
        return { text: 'text-amber-500', glow: 'bg-amber-400' };
      default:
        return { text: 'text-rose-500', glow: 'bg-rose-400' };
    }
  };

  const categoryIconFor = (category?: string) => {
    switch ((category || '').toLowerCase()) {
      case 'physics':
        return FlaskConical;
      case 'ai-and-robotics':
      case 'technology':
        return Brain;
      case 'environment':
      case 'earth-science':
        return Leaf;
      case 'stars-and-planets':
      case 'space-and-astronomy':
        return Telescope;
      case 'mountain':
      case 'geology':
        return Mountain;
      default:
        return Star;
    }
  };

  // Removed loading all exhibits - we only use recommended exhibits

  const floorOptions = [
    { value: 'outside', label: 'Outside Area', map: outsideMap },
    { value: 'ground', label: 'Ground Floor', map: groundMap },
    { value: 'first', label: '1st Floor', map: firstFloorMap },
  ];

  const currentMap = floorOptions.find(f => f.value === selectedFloor)?.map || groundMap;

  // Removed floorExhibits - we only use recommendedExhibits

  // Load recommended exhibits directly from backend recommend endpoint (global, all floors)
  useEffect(() => {
    let mounted = true;
    
    const loadRecommendedExhibits = async () => {
      try {
        setRecoLoading(true);
        setRecoError(null);
        const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/tours/recommend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selectedFloor: 'all',
            globalTimeBudget: true,
            userProfile: {
              groupType: userProfile?.group || '',
              interests: Array.isArray(userProfile?.interests) ? userProfile?.interests : [],
            }
          })
        });
        const data = await res.json();
        
        if (!mounted) return;
        
        if (res.ok && data?.success && Array.isArray(data.exhibits)) {
          setRecommendedExhibits(data.exhibits);
        } else {
          setRecommendedExhibits([]);
          setRecoError(data?.message || 'Unable to load recommendations');
        }
      } catch (error) {
        if (mounted) {
          setRecommendedExhibits([]);
          setRecoError('Network error while loading recommendations');
        }
      } finally {
        if (mounted) setRecoLoading(false);
      }
    };
    
    loadRecommendedExhibits();
    
    return () => { mounted = false; };
  }, [API_BASE_URL, userProfile?.group, JSON.stringify(userProfile?.interests)]);

  const retryLoad = () => {
    // trigger useEffect by changing a noop state or directly call loader
    // Direct call keeps logic in one place
    (async () => {
      setRecoLoading(true);
      setRecoError(null);
      try {
        const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/tours/recommend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selectedFloor: 'all',
            globalTimeBudget: true,
            userProfile: {
              groupType: userProfile?.group || '',
              interests: Array.isArray(userProfile?.interests) ? userProfile?.interests : [],
            }
          })
        });
        const data = await res.json();
        if (res.ok && data?.success && Array.isArray(data.exhibits)) {
          setRecommendedExhibits(data.exhibits);
        } else {
          setRecommendedExhibits([]);
          setRecoError(data?.message || 'Unable to load recommendations');
        }
      } catch {
        setRecommendedExhibits([]);
        setRecoError('Network error while loading recommendations');
      } finally {
        setRecoLoading(false);
      }
    })();
  };

  // Handle floor changes - no need to fetch again, just filter existing recommended exhibits
  useEffect(() => {
  }, [selectedFloor]);

  // Reset zoom when floor changes
  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    lastOffsetRef.current = { x: 0, y: 0 };
  }, [selectedFloor]);

  const clampScale = (s: number) => Math.min(4, Math.max(1, s));

  const getRelativePoint = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    // Prevent page scroll when zooming over the map
    e.preventDefault();
    const zoomIntensity = 0.1;
    const dir = e.deltaY > 0 ? -1 : 1;
    const newScale = clampScale(scale + dir * zoomIntensity);
    if (newScale === scale) return;

    const point = getRelativePoint(e.clientX, e.clientY);
    // Adjust offset so that the zoom focuses around the pointer
    const scaleRatio = newScale / scale;
    const newOffsetX = point.x - (point.x - offset.x) * scaleRatio;
    const newOffsetY = point.y - (point.y - offset.y) * scaleRatio;
    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
    lastOffsetRef.current = { x: newOffsetX, y: newOffsetY };
  };

  const onMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    setDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!dragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const newOffset = { x: lastOffsetRef.current.x + dx, y: lastOffsetRef.current.y + dy };
    setOffset(newOffset);
  };

  const onMouseUp: React.MouseEventHandler<HTMLDivElement> = () => {
    if (!dragging) return;
    setDragging(false);
    lastOffsetRef.current = offset;
    dragStartRef.current = null;
  };

  // Basic touch support (drag + pinch)
  const getDistance = (a: any, b: any) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const getMidpoint = (a: any, b: any) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });

  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (e.touches.length === 1) {
      setDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      pinchStartRef.current = { distance: getDistance(t1, t2), midpoint: getMidpoint(t1, t2), scale };
    }
  };

  const onTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (e.touches.length === 1 && dragging && dragStartRef.current) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      const newOffset = { x: lastOffsetRef.current.x + dx, y: lastOffsetRef.current.y + dy };
      setOffset(newOffset);
    } else if (e.touches.length === 2 && pinchStartRef.current) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const newDistance = getDistance(t1, t2);
      const midpoint = getMidpoint(t1, t2);
      const baseScale = pinchStartRef.current.scale;
      const newScale = clampScale(baseScale * (newDistance / pinchStartRef.current.distance));
      const point = getRelativePoint(midpoint.x, midpoint.y);
      const scaleRatio = newScale / scale;
      const newOffsetX = point.x - (point.x - offset.x) * scaleRatio;
      const newOffsetY = point.y - (point.y - offset.y) * scaleRatio;
      setScale(newScale);
      setOffset({ x: newOffsetX, y: newOffsetY });
    }
  };

  const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = () => {
    setDragging(false);
    lastOffsetRef.current = offset;
    dragStartRef.current = null;
    pinchStartRef.current = null;
  };

  const handleZoomIn = () => onWheel({ preventDefault: () => {}, deltaY: -100, clientX: (containerRef.current?.getBoundingClientRect().left || 0) + (containerRef.current?.clientWidth || 0) / 2, clientY: (containerRef.current?.getBoundingClientRect().top || 0) + (containerRef.current?.clientHeight || 0) / 2 } as unknown as React.WheelEvent<HTMLDivElement>);
  const handleZoomOut = () => onWheel({ preventDefault: () => {}, deltaY: 100, clientX: (containerRef.current?.getBoundingClientRect().left || 0) + (containerRef.current?.clientWidth || 0) / 2, clientY: (containerRef.current?.getBoundingClientRect().top || 0) + (containerRef.current?.clientHeight || 0) / 2 } as unknown as React.WheelEvent<HTMLDivElement>);
  const handleReset = () => { setScale(1); setOffset({ x: 0, y: 0 }); lastOffsetRef.current = { x: 0, y: 0 }; };

  return (
    <div className="min-h-screen bg-gradient-space relative overflow-hidden">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={async () => {
          // Clean up temp file when exiting map
          try {
            await fetch(`${API_BASE_URL.replace(/\/$/, '')}/tours/recommendations/file`, {
              method: 'DELETE'
            });
          } catch (error) {
          }
          onBack();
        }}
        className="absolute top-4 left-4 z-20 text-white hover:bg-white/10"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Planets in background */}
        <div className="absolute top-32 left-8 w-24 h-24 bg-orange-400 rounded-full animate-float opacity-30"></div>
        <div className="absolute top-16 right-16 w-32 h-32 bg-blue-400 rounded-full animate-float-delayed opacity-25"></div>
        <div className="absolute bottom-24 left-24 w-20 h-20 bg-purple-400 rounded-full animate-float opacity-35"></div>
        <div className="absolute bottom-32 right-32 w-28 h-28 bg-green-400 rounded-full animate-float-delayed opacity-30"></div>
        
        {/* Stars */}
        <div className="absolute top-20 left-1/3 w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>
        <div className="absolute top-48 right-1/4 w-2 h-2 bg-blue-300 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-48 left-1/2 w-2 h-2 bg-purple-300 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="container mx-auto px-8 py-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            TAP AN EXHIBIT TO EXPLORE
          </h1>
          <p className="text-xl text-blue-200">
            {userProfile ? `Perfect for ${userProfile.group}! Choose your next adventure` : 'Choose your next adventure'}
          </p>
        </div>

        {/* Floor Selector */}
        <div className="flex justify-center mb-6">
          <div className="flex space-x-2 bg-white/10 backdrop-blur-sm rounded-lg p-2">
            {floorOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedFloor === option.value ? "default" : "ghost"}
                onClick={() => setSelectedFloor(option.value as any)}
                className="text-white hover:bg-white/20"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Interactive Map with zoom/pan */}
        <div className="relative mx-auto max-w-[900px] w-full">
          <AspectRatio ratio={selectedFloor === 'outside' ? 8/5 : 1}>
            <div
              ref={containerRef}
              className="relative w-full h-full rounded-3xl overflow-hidden touch-pan-y"
              onWheel={onWheel}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseLeave={onMouseUp}
              onMouseUp={onMouseUp}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{ userSelect: dragging ? 'none' : 'auto', cursor: dragging ? 'grabbing' : (scale > 1 ? 'grab' : 'default') }}
            >
              {/* Controls */}
              <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
                <button onClick={handleZoomIn} className="bg-white/80 hover:bg-white text-gray-900 rounded px-2 py-1 shadow">+</button>
                <button onClick={handleZoomOut} className="bg-white/80 hover:bg-white text-gray-900 rounded px-2 py-1 shadow">−</button>
                <button onClick={handleReset} className="bg-white/80 hover:bg-white text-gray-900 rounded px-2 py-1 shadow text-xs">Reset</button>
              </div>

              {/* Transform layer contains the map image and pins */}
              <div
                className="absolute inset-0"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                  transformOrigin: 'center center'
                }}
              >
                {/* Map Background */}
                <img
                  src={currentMap}
                  alt={`${selectedFloor} floor map`}
                  className="w-full h-full object-contain"
                />

                {/* Exhibit Locations */}
                {recoLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Card className="bg-white/90 backdrop-blur-sm border-2 border-white/50 p-6">Loading exhibits...</Card>
                  </div>
                ) : recoError ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Card className="bg-white/95 backdrop-blur-sm border-2 border-red-200 p-6 max-w-md text-center">
                      <h3 className="text-lg font-bold text-red-700 mb-2">Recommendations unavailable</h3>
                      <p className="text-sm text-gray-700 mb-4">{recoError}</p>
                      <div className="flex items-center justify-center gap-2">
                        <Button onClick={retryLoad}>Retry</Button>
                      </div>
                    </Card>
                  </div>
                ) : (recommendedExhibits.length === 0) ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Card className="bg-white/90 backdrop-blur-sm border-2 border-white/50 p-8">
                      <div className="text-center">
                        <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-800 mb-2">No Recommendations</h3>
                        <p className="text-gray-600">Change floor or update preferences to see recommended exhibits.</p>
                      </div>
                    </Card>
                  </div>
                ) : (
                  (() => {
                    const floorExhibits = recommendedExhibits.filter((ex: any) => ex.mapLocation && ex.mapLocation.floor === selectedFloor);
                    return floorExhibits.map((ex: any) => {
                      const x = Math.max(0, Math.min(100, Number(ex.mapLocation?.x ?? 0)));
                      const y = Math.max(0, Math.min(100, Number(ex.mapLocation?.y ?? 0)));
                      const inverseScale = scale === 0 ? 1 : (1 / scale);
                      return (
                        <div
                          key={ex.id}
                          className="absolute cursor-pointer group"
                          style={{
                            left: `${x}%`,
                            top: `${y}%`,
                            transform: `translate(-50%, -50%) scale(${inverseScale})`,
                            transformOrigin: 'center center'
                          }}
                          onClick={() => setActive(ex)}
                        >
                          <PinMarker category={ex.category} label={ex.name} />
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </div>
          </AspectRatio>
        </div>

        {/* Instructions */}
        <div className="text-center mt-12">
          <Card className="inline-block bg-white/10 backdrop-blur-sm border border-white/20 px-8 py-4">
            <p className="text-white text-lg font-medium">
              👆 Tap any exhibit icon to learn more and add it to your tour!
            </p>
          </Card>
        </div>
      </div>
      {/* Exhibit Popup */}
      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[80vh] overflow-auto">
          {active && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Title + description */}
              <div className="order-2 md:order-1">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-extrabold">{active.name}</DialogTitle>
                  <DialogDescription className="sr-only">Exhibit details</DialogDescription>
                </DialogHeader>
                <div className="mt-2 space-y-3">
                  {active.description && (
                    <p className="text-sm md:text-base text-muted-foreground whitespace-pre-wrap">{active.description}</p>
                  )}
                  <div className="flex items-center gap-3">
                    {active.mapLocation?.floor && <Badge variant="secondary">{active.mapLocation.floor}</Badge>}
                    {active.averageTime && (
                      <div className="text-sm inline-flex items-center gap-1"><MapPin className="w-4 h-4" /> ~{active.averageTime}m</div>
                    )}
                  </div>
                  {/* Recommendation details intentionally omitted on map view */}
                </div>
                <div className="flex justify-end md:justify-start gap-2 pt-4">
                  <Button variant="outline" onClick={() => setActive(null)}>Close</Button>
                </div>
              </div>

              {/* Right: Big image */}
              <div className="order-1 md:order-2">
                <AspectRatio ratio={16/10}>
                  {active.images?.[0] ? (
                    <img src={`${SERVER_BASE_URL}/uploads/${active.images[0]}`} alt={active.name} className="w-full h-full object-cover rounded" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center rounded">
                      <MapPin className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </AspectRatio>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}