import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCapacitor } from '../hooks/useCapacitor';
import { MobileLayout, MobileCard, MobileButton, MobileInput } from '../components/ui/mobile-layout';
import { MobileNavigation, MobileBreadcrumb } from '../components/ui/mobile-navigation';
import {
  Search,
  Map,
  Users,
  Settings,
  Bell,
  Star,
  TrendingUp,
  Activity
} from 'lucide-react';

import { getApiUrl } from '@/lib/desktop-config';

const API_BASE_URL = getApiUrl();

interface Exhibit {
  id: string;
  name: string;
  description: string;
  category: string;
  location: string;
  imageUrl?: string;
}

export const MobileHome: React.FC = () => {
  const navigate = useNavigate();
  const { isNative, triggerHaptic, platform } = useCapacitor();
  const [searchQuery, setSearchQuery] = useState('');
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadExhibits = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${API_BASE_URL}/exhibits`);
        const data = await res.json();
        if (data?.success && Array.isArray(data.exhibits)) {
          setExhibits(data.exhibits);
        } else {
          setExhibits([]);
        }
      } catch (e) {
        setExhibits([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadExhibits();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (isNative) {
      await triggerHaptic('light');
    }
    if (!query.trim()) return;
    setExhibits((prev) => prev.filter(exhibit =>
      exhibit.name?.toLowerCase().includes(query.toLowerCase()) ||
      exhibit.description?.toLowerCase().includes(query.toLowerCase()) ||
      exhibit.category?.toLowerCase().includes(query.toLowerCase())
    ));
  };

  const handleExhibitClick = async (exhibit: Exhibit) => {
    if (isNative) {
      await triggerHaptic('medium');
    }
    console.log('Navigate to exhibit:', exhibit.id);
  };

  const handleQuickAction = async (action: string) => {
    if (isNative) {
      await triggerHaptic('light');
    }
    console.log('Quick action:', action);
  };

  return (
    <MobileLayout>
      {/* Mobile Navigation */}
      <MobileNavigation />

      {/* Main Content with Safe Area Spacing */}
      <div className={cn(
        "pt-20 pb-20", // Account for top and bottom navigation
        isNative && "pt-24 pb-24" // Extra spacing for mobile
      )}>
        {/* Breadcrumb */}
        <MobileBreadcrumb
          items={[
            { label: 'Home', path: '/' }
          ]}
        />

        {/* Welcome Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Welcome to UCOST
          </h1>
          <p className="text-muted-foreground">
            Discover amazing exhibits and explore our museum
          </p>
          {isNative && (
            <p className="text-sm text-primary mt-2">
              📱 Running on {platform}
            </p>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
            <MobileInput
              placeholder="Search exhibits, categories, or locations..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-10"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <MobileCard
              onClick={() => navigate('/admin')}
              interactive
              className="text-center p-4"
            >
              <Settings className="mx-auto mb-2 text-primary" size={24} />
              <span className="text-sm font-medium">Admin Panel</span>
            </MobileCard>
            <MobileCard
              onClick={() => navigate('/admin/exhibits')}
              interactive
              className="text-center p-4"
            >
              <Map className="mx-auto mb-2 text-primary" size={24} />
              <span className="text-sm font-medium">Manage Exhibits</span>
            </MobileCard>
            <MobileCard
              onClick={() => handleQuickAction('notifications')}
              interactive
              className="text-center p-4"
            >
              <Bell className="mx-auto mb-2 text-primary" size={24} />
              <span className="text-sm font-medium">Notifications</span>
            </MobileCard>
            <MobileCard
              onClick={() => handleQuickAction('settings')}
              interactive
              className="text-center p-4"
            >
              <Settings className="mx-auto mb-2 text-primary" size={24} />
              <span className="text-sm font-medium">Settings</span>
            </MobileCard>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Today's Stats</h2>
          <div className="grid grid-cols-2 gap-3">
            <MobileCard className="text-center p-4">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="text-green-500" size={20} />
              </div>
              <div className="text-2xl font-bold">1,247</div>
              <div className="text-xs text-muted-foreground">Visitors</div>
            </MobileCard>
            <MobileCard className="text-center p-4">
              <div className="flex items-center justify-center mb-2">
                <Activity className="text-blue-500" size={20} />
              </div>
              <div className="text-2xl font-bold">89</div>
              <div className="text-xs text-muted-foreground">Active Tours</div>
            </MobileCard>
          </div>
        </div>

        {/* Featured Exhibits */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Featured Exhibits</h2>
            <MobileButton variant="ghost" size="sm">
              View All
            </MobileButton>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {exhibits.map((exhibit) => (
                <MobileCard
                  key={exhibit.id}
                  onClick={() => handleExhibitClick(exhibit)}
                  interactive
                  className="p-4"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                      <Star className="text-muted-foreground" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">
                        {exhibit.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {exhibit.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {exhibit.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {exhibit.location}
                        </span>
                      </div>
                    </div>
                  </div>
                </MobileCard>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
          <MobileCard className="p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">New exhibit "Modern Sculptures" added</span>
                <span className="text-xs text-muted-foreground ml-auto">2h ago</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Tour group "Renaissance Art" started</span>
                <span className="text-xs text-muted-foreground ml-auto">4h ago</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">Maintenance scheduled for Gallery A</span>
                <span className="text-xs text-muted-foreground ml-auto">1d ago</span>
              </div>
            </div>
          </MobileCard>
        </div>
      </div>
    </MobileLayout>
  );
};

// Helper function for conditional classes
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
} 