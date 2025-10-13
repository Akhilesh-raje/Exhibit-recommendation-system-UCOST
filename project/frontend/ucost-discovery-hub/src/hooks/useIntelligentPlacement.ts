import { useMemo } from "react";

type FloorKey = 'outside' | 'ground' | 'first';

interface Coordinates {
  x: number;
  y: number;
}

interface ExhibitLike {
  id: string;
  name: string;
  category?: string | null;
  averageTime?: number | null;
  rating?: number | null;
  mapLocation?: { floor: FloorKey; x: number; y: number } | null;
}

interface PlacementOptions {
  enabled: boolean;
  floor: FloorKey;
}

interface PlacedExhibit extends ExhibitLike {
  __placed: true;
  placed: { x: number; y: number };
  score: number;
  reasoning: string[];
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function distance(a: Coordinates, b: Coordinates): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getCategoryZone(category?: string | null, floor?: FloorKey): { center: Coordinates; radius: number; label: string } {
  const c = (category || '').toLowerCase();
  const f = floor || 'ground';
  // Heuristic zones per floor; values are in percentage coordinates
  if (f === 'ground') {
    if (c.includes('physics')) return { center: { x: 30, y: 35 }, radius: 18, label: 'Physics Cluster' };
    if (c.includes('ai') || c.includes('tech')) return { center: { x: 70, y: 35 }, radius: 18, label: 'Technology Cluster' };
    if (c.includes('environment') || c.includes('earth')) return { center: { x: 30, y: 70 }, radius: 18, label: 'Environment Cluster' };
    if (c.includes('space') || c.includes('stars') || c.includes('astronomy')) return { center: { x: 70, y: 70 }, radius: 18, label: 'Space Cluster' };
    return { center: { x: 50, y: 50 }, radius: 22, label: 'General Cluster' };
  }
  if (f === 'first') {
    if (c.includes('physics')) return { center: { x: 25, y: 50 }, radius: 20, label: 'Physics' };
    if (c.includes('ai') || c.includes('tech')) return { center: { x: 55, y: 30 }, radius: 18, label: 'Technology' };
    if (c.includes('environment') || c.includes('earth')) return { center: { x: 55, y: 70 }, radius: 18, label: 'Environment' };
    if (c.includes('space') || c.includes('stars') || c.includes('astronomy')) return { center: { x: 80, y: 50 }, radius: 16, label: 'Space' };
    return { center: { x: 50, y: 50 }, radius: 22, label: 'General' };
  }
  // outside
  if (c.includes('environment') || c.includes('earth')) return { center: { x: 35, y: 55 }, radius: 22, label: 'Nature' };
  if (c.includes('physics')) return { center: { x: 60, y: 35 }, radius: 18, label: 'Physics' };
  if (c.includes('space') || c.includes('stars') || c.includes('astronomy')) return { center: { x: 70, y: 65 }, radius: 18, label: 'Space' };
  return { center: { x: 50, y: 50 }, radius: 25, label: 'General' };
}

function scorePlacement(base: Coordinates, exhibit: ExhibitLike, neighbors: Coordinates[]): { coords: Coordinates; score: number; reasoning: string[] } {
  const reasoning: string[] = [];

  // Start from base within zone
  let x = base.x;
  let y = base.y;

  // Avoid overlaps: push away from nearby neighbors within a minimum distance
  const minDistance = 6; // percent units
  let iterations = 0;
  while (iterations < 24) {
    let moved = false;
    for (const n of neighbors) {
      const d = distance({ x, y }, n);
      if (d < minDistance && d > 0.0001) {
        const push = (minDistance - d) / minDistance;
        const dx = (x - n.x) / d;
        const dy = (y - n.y) / d;
        x = clamp(x + dx * push * 3, 2, 98);
        y = clamp(y + dy * push * 3, 2, 98);
        moved = true;
      }
    }
    if (!moved) break;
    iterations++;
  }

  // Prioritize higher-rated / longer-time exhibits closer to center of their zone
  const weightProminence = clamp(((exhibit.rating || 0) * 0.6) + ((exhibit.averageTime || 0) * 0.4) / 10, 0, 10);
  const prominence = Math.min(10, weightProminence);
  const vectorToCenter = { x: (base.x - x) * 0.08 * prominence, y: (base.y - y) * 0.08 * prominence };
  x = clamp(x + vectorToCenter.x, 2, 98);
  y = clamp(y + vectorToCenter.y, 2, 98);
  if (prominence > 0) reasoning.push('Prominent exhibit placed nearer to zone center');

  // Slight random jitter to avoid grid-like patterns
  x = clamp(x + (Math.random() - 0.5) * 1.2, 2, 98);
  y = clamp(y + (Math.random() - 0.5) * 1.2, 2, 98);

  // Compute final score: distance from base, spacing, centrality
  const spacingPenalty = neighbors.reduce((acc, n) => acc + Math.max(0, (minDistance - distance({ x, y }, n))) , 0);
  const centrality = 100 - distance({ x, y }, base);
  const score = Math.max(0, centrality - spacingPenalty);

  reasoning.push(`Spacing penalty: ${spacingPenalty.toFixed(2)}`, `Centrality: ${centrality.toFixed(2)}`);

  return { coords: { x, y }, score, reasoning };
}

export function useIntelligentPlacement(exhibits: ExhibitLike[], options: PlacementOptions): PlacedExhibit[] {
  const { enabled, floor } = options;

  return useMemo(() => {
    const floorExhibits = (exhibits || []).filter((e) => e.mapLocation && e.mapLocation.floor === floor);
    if (!enabled) {
      return floorExhibits.map((e) => ({ ...e, __placed: true as const, placed: { x: clamp(e.mapLocation!.x, 0, 100), y: clamp(e.mapLocation!.y, 0, 100) }, score: 0, reasoning: ["Original coordinates"] }));
    }

    const placed: PlacedExhibit[] = [];

    for (const ex of floorExhibits) {
      const zone = getCategoryZone(ex.category || undefined, floor);

      // Sample candidate points within a disk around zone center
      const candidates: Coordinates[] = [];
      const samples = 18;
      for (let i = 0; i < samples; i++) {
        const angle = (i / samples) * Math.PI * 2;
        const r = Math.random() * zone.radius * 0.9;
        candidates.push({ x: clamp(zone.center.x + Math.cos(angle) * r, 2, 98), y: clamp(zone.center.y + Math.sin(angle) * r, 2, 98) });
      }
      // Include original coordinates as a candidate
      if (ex.mapLocation) {
        candidates.push({ x: clamp(ex.mapLocation.x, 0, 100), y: clamp(ex.mapLocation.y, 0, 100) });
      }

      const neighborPoints = placed.map((p) => p.placed);
      let best = { coords: { x: clamp(ex.mapLocation?.x ?? zone.center.x, 0, 100), y: clamp(ex.mapLocation?.y ?? zone.center.y, 0, 100) }, score: -Infinity, reasoning: ["Init"] };

      for (const c of candidates) {
        const result = scorePlacement(c, ex, neighborPoints);
        if (result.score > best.score) best = result;
      }

      placed.push({ ...ex, __placed: true, placed: best.coords, score: best.score, reasoning: [zone.label, ...best.reasoning] });
    }

    return placed;
  }, [exhibits, enabled, floor]);
}

export type { PlacedExhibit };

