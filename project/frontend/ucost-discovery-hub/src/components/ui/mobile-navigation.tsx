import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCapacitor } from '../../hooks/useCapacitor';
import { MobileButton } from './mobile-layout';
import { cn } from '../../lib/utils';
import { 
  Home, 
  Search, 
  Map, 
  User, 
  Settings,
  Menu,
  X
} from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const navigationItems: NavigationItem[] = [
  { id: 'home', label: 'Home', icon: <Home size={20} />, path: '/' },
  { id: 'admin', label: 'Admin', icon: <Settings size={20} />, path: '/admin' },
  { id: 'exhibits', label: 'Exhibits', icon: <Map size={20} />, path: '/admin/exhibits' },
  { id: 'search', label: 'Search', icon: <Search size={20} />, path: '/search' },
  { id: 'profile', label: 'Profile', icon: <User size={20} />, path: '/profile' },
];

export const MobileNavigation: React.FC = () => {
  const { isNative, triggerHaptic } = useCapacitor();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleNavigation = async (path: string) => {
    if (isNative) {
      await triggerHaptic('light');
    }
    navigate(path);
    setIsDrawerOpen(false);
  };

  const toggleDrawer = async () => {
    if (isNative) {
      await triggerHaptic('light');
    }
    setIsDrawerOpen(!isDrawerOpen);
  };

  // Bottom navigation for mobile
  if (isNative) {
    return (
      <>
        {/* Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
          <div className="flex justify-around items-center h-16 px-4">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                    isActive 
                      ? "text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.icon}
                  <span className="text-xs mt-1">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Top App Bar with Menu Button */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b pt-safe">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center space-x-2">
              <img 
                src="/logo.png" 
                alt="UCOST Logo" 
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  if (e.currentTarget.src !== '/logo.svg') {
                    e.currentTarget.src = '/logo.svg';
                  }
                }}
              />
              <span className="font-semibold">UCOST</span>
            </div>
            <MobileButton
              variant="ghost"
              size="icon"
              onClick={toggleDrawer}
              className="h-10 w-10"
            >
              <Menu size={20} />
            </MobileButton>
          </div>
        </header>

        {/* Mobile Drawer */}
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 bg-black/50" onClick={toggleDrawer}>
            <div 
              className="fixed right-0 top-0 h-full w-80 bg-background border-l shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Menu</h2>
                <MobileButton
                  variant="ghost"
                  size="icon"
                  onClick={toggleDrawer}
                  className="h-10 w-10"
                >
                  <X size={20} />
                </MobileButton>
              </div>
              <div className="p-4 space-y-2">
                {navigationItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.path)}
                      className={cn(
                        "flex items-center space-x-3 w-full p-3 rounded-lg transition-colors",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-accent"
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop navigation
  return (
    <nav className="hidden md:flex items-center space-x-6">
      {navigationItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.path)}
            className={cn(
              "flex items-center space-x-2 px-3 py-2 rounded-md transition-colors",
              isActive 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

// Mobile-specific breadcrumb component
export const MobileBreadcrumb: React.FC<{
  items: Array<{ label: string; path?: string }>;
}> = ({ items }) => {
  const { isNative } = useCapacitor();
  const navigate = useNavigate();

  if (isNative) {
    return (
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span>/</span>}
            {item.path ? (
              <button
                onClick={() => navigate(item.path!)}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <span className="text-foreground">{item.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>
    );
  }

  return null; // Hide breadcrumbs on mobile
}; 