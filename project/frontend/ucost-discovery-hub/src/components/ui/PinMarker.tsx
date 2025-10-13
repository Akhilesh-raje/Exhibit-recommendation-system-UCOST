import React from "react";
import { Brain, Leaf, Telescope, FlaskConical, Mountain, Star } from "lucide-react";

export type PinMarkerProps = {
  category?: string | null;
  label?: string;
  onClick?: () => void;
  className?: string;
  sizePx?: number; // base circle size in px
  showLabel?: boolean;
};

const colorForCategory = (category?: string | null) => {
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
    case 'geology':
    case 'mountain':
      return { text: 'text-orange-500', glow: 'bg-orange-400' };
    default:
      return { text: 'text-rose-500', glow: 'bg-rose-400' };
  }
};

const iconForCategory = (category?: string | null) => {
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
    case 'geology':
    case 'mountain':
      return Mountain;
    default:
      return Star;
  }
};

export const PinMarker: React.FC<PinMarkerProps> = ({ category, label, onClick, className = '', sizePx = 36, showLabel = true }) => {
  const colors = colorForCategory(category);
  const CatIcon = iconForCategory(category);

  const circleSize = `${sizePx}px`;
  const iconSize = Math.max(16, Math.floor(sizePx * 0.55));

  return (
    <div className={`flex flex-col items-center ${className}`} onClick={onClick}>
      <div className="relative flex flex-col items-center cursor-pointer group">
        <div
          className="relative rounded-full border border-white/50 bg-white/30 backdrop-blur-md shadow-md transition-transform duration-200 group-hover:scale-110"
          style={{ width: circleSize, height: circleSize }}
        >
          <span className={`absolute inset-0 rounded-full ${colors.glow} opacity-30`}></span>
          <CatIcon className={`absolute inset-0 m-auto ${colors.text}`} style={{ width: iconSize, height: iconSize }} />
        </div>
        <div className={`w-2 h-2 rotate-45 -mt-1 ${colors.glow} opacity-60`}></div>
      </div>
      {showLabel && label && (
        <div className="mt-1 px-2 py-1 rounded bg-white/70 backdrop-blur-sm text-gray-900 text-xs font-medium border border-white/60 group-hover:shadow">
          <div className="flex items-center gap-1">
            <CatIcon className={`w-3.5 h-3.5 ${colors.text}`} />
            <span>{label}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PinMarker;

