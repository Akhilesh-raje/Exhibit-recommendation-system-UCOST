import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCapacitor } from '../hooks/useCapacitor';
import { MobileLayout, MobileCard, MobileButton, MobileInput } from '../components/ui/mobile-layout';
import { MobileNavigation, MobileBreadcrumb } from '../components/ui/mobile-navigation';
import {
  Users,
  Settings,
  BarChart3,
  Shield,
  Database,
  Activity,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  LogOut,
  User,
  Lock,
  Bell,
  Globe,
  Wifi,
  Server
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalExhibits: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  lastBackup: string;
  storageUsed: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'moderator' | 'user';
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
}

const mockStats: AdminStats = {
  totalUsers: 1247,
  activeUsers: 892,
  totalExhibits: 156,
  systemHealth: 'excellent',
  lastBackup: '2 hours ago',
  storageUsed: '2.4 GB'
};

const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Admin',
    email: 'john@ucost.com',
    role: 'admin',
    status: 'active',
    lastLogin: '2 minutes ago'
  },
  {
    id: '2',
    name: 'Sarah Moderator',
    email: 'sarah@ucost.com',
    role: 'moderator',
    status: 'active',
    lastLogin: '15 minutes ago'
  },
  {
    id: '3',
    name: 'Mike User',
    email: 'mike@ucost.com',
    role: 'user',
    status: 'active',
    lastLogin: '1 hour ago'
  }
];

export const MobileAdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { isNative, triggerHaptic, platform } = useCapacitor();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'system' | 'settings'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Simulate loading
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  const handleTabChange = async (tab: typeof activeTab) => {
    if (isNative) {
      await triggerHaptic('light');
    }
    setActiveTab(tab);
  };

  const handleUserAction = async (action: string, user: User) => {
    if (isNative) {
      await triggerHaptic('medium');
    }
    console.log(`${action} user:`, user.id);
    // Implement actual user actions here
  };

  const getSystemHealthColor = (health: AdminStats['systemHealth']) => {
    switch (health) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getSystemHealthIcon = (health: AdminStats['systemHealth']) => {
    switch (health) {
      case 'excellent': return <Activity className="text-green-500" size={20} />;
      case 'good': return <Activity className="text-blue-500" size={20} />;
      case 'warning': return <Activity className="text-yellow-500" size={20} />;
      case 'critical': return <Activity className="text-red-500" size={20} />;
      default: return <Activity className="text-gray-500" size={20} />;
    }
  };

  return (
    <MobileLayout>
      {/* Mobile Navigation */}
      <MobileNavigation />

      {/* Main Content with Safe Area Spacing */}
      <div className="pt-20 pb-20">
        {/* Breadcrumb */}
        <MobileBreadcrumb
          items={[
            { label: 'Admin', path: '/admin' },
            { label: 'Dashboard' }
          ]}
        />

        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
              <p className="text-muted-foreground">Manage your UCOST system</p>
            </div>
            <MobileButton
              variant="outline"
              size="icon"
              onClick={() => console.log('Notifications')}
              className="h-10 w-10"
            >
              <Bell size={20} />
            </MobileButton>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
            <MobileInput
              placeholder="Search users, exhibits, or settings..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-muted p-1 rounded-lg">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={18} /> },
              { id: 'users', label: 'Users', icon: <Users size={18} /> },
              { id: 'system', label: 'System', icon: <Server size={18} /> },
              { id: 'settings', label: 'Settings', icon: <Settings size={18} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as typeof activeTab)}
                className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <MobileCard className="text-center p-4">
                <Users className="mx-auto mb-2 text-blue-500" size={24} />
                <div className="text-2xl font-bold">{mockStats.totalUsers.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Users</div>
              </MobileCard>
              <MobileCard className="text-center p-4">
                <Database className="mx-auto mb-2 text-green-500" size={24} />
                <div className="text-2xl font-bold">{mockStats.totalExhibits}</div>
                <div className="text-xs text-muted-foreground">Exhibits</div>
              </MobileCard>
            </div>

            {/* System Health */}
            <MobileCard className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">System Health</h3>
                {getSystemHealthIcon(mockStats.systemHealth)}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`font-medium ${getSystemHealthColor(mockStats.systemHealth)}`}>
                    {mockStats.systemHealth.charAt(0).toUpperCase() + mockStats.systemHealth.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Backup:</span>
                  <span>{mockStats.lastBackup}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Storage Used:</span>
                  <span>{mockStats.storageUsed}</span>
                </div>
              </div>
            </MobileCard>

            {/* Quick Actions */}
            <div>
              <h3 className="font-semibold mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <MobileButton
                  variant="outline"
                  onClick={() => console.log('Add User')}
                  className="h-12"
                >
                  <Plus className="mr-2" size={18} />
                  Add User
                </MobileButton>
                <MobileButton
                  variant="outline"
                  onClick={() => console.log('Backup System')}
                  className="h-12"
                >
                  <Download className="mr-2" size={18} />
                  Backup
                </MobileButton>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* User Management Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">User Management</h3>
              <MobileButton
                onClick={() => console.log('Add New User')}
                className="h-10"
              >
                <Plus className="mr-2" size={18} />
                Add User
              </MobileButton>
            </div>

            {/* User List */}
            <div className="space-y-3">
              {mockUsers.map((user) => (
                <MobileCard
                  key={user.id}
                  className="p-4"
                  interactive
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="text-primary" size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">{user.name}</h4>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded-full ${user.role === 'admin' ? 'bg-red-100 text-red-700' :
                              user.role === 'moderator' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                              {user.role}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-700' :
                              user.status === 'inactive' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                              {user.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MobileButton
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUserAction('view', user);
                        }}
                        className="h-8 w-8"
                      >
                        <Eye size={16} />
                      </MobileButton>
                      <MobileButton
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUserAction('edit', user);
                        }}
                        className="h-8 w-8"
                      >
                        <Edit size={16} />
                      </MobileButton>
                      <MobileButton
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUserAction('delete', user);
                        }}
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </MobileButton>
                    </div>
                  </div>
                </MobileCard>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-4">
            <h3 className="font-semibold">System Monitoring</h3>

            {/* System Status */}
            <MobileCard className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database Status</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Online</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Server</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Running</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Network</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Connected</span>
                  </div>
                </div>
              </div>
            </MobileCard>

            {/* System Actions */}
            <div className="grid grid-cols-2 gap-3">
              <MobileButton
                variant="outline"
                onClick={() => console.log('Restart Services')}
                className="h-12"
              >
                <RefreshCw className="mr-2" size={18} />
                Restart
              </MobileButton>
              <MobileButton
                variant="outline"
                onClick={() => navigate('/admin/p2p')}
                className="h-12"
              >
                <Wifi className="mr-2" size={18} />
                P2P Sync
              </MobileButton>
              <MobileButton
                variant="outline"
                onClick={() => console.log('System Logs')}
                className="h-12"
              >
                <Activity className="mr-2" size={18} />
                Logs
              </MobileButton>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <h3 className="font-semibold">Admin Settings</h3>

            {/* Security Settings */}
            <MobileCard className="p-4">
              <h4 className="font-medium mb-3">Security</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Two-Factor Authentication</span>
                  <MobileButton variant="outline" size="sm">Enable</MobileButton>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Session Timeout</span>
                  <MobileButton variant="outline" size="sm">30 min</MobileButton>
                </div>
              </div>
            </MobileCard>

            {/* Notification Settings */}
            <MobileCard className="p-4">
              <h4 className="font-medium mb-3">Notifications</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Email Alerts</span>
                  <MobileButton variant="outline" size="sm">Configure</MobileButton>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Push Notifications</span>
                  <MobileButton variant="outline" size="sm">Configure</MobileButton>
                </div>
              </div>
            </MobileCard>

            {/* Logout */}
            <MobileButton
              variant="destructive"
              onClick={() => console.log('Logout')}
              className="w-full h-12"
            >
              <LogOut className="mr-2" size={18} />
              Logout
            </MobileButton>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">User Details</h3>
              <MobileButton
                variant="ghost"
                size="icon"
                onClick={() => setSelectedUser(null)}
                className="h-8 w-8"
              >
                ×
              </MobileButton>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Name:</span>
                <p className="font-medium">{selectedUser.name}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Email:</span>
                <p className="font-medium">{selectedUser.email}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Role:</span>
                <p className="font-medium capitalize">{selectedUser.role}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Status:</span>
                <p className="font-medium capitalize">{selectedUser.status}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Last Login:</span>
                <p className="font-medium">{selectedUser.lastLogin}</p>
              </div>
            </div>
            <div className="flex space-x-2 mt-6">
              <MobileButton
                variant="outline"
                onClick={() => {
                  handleUserAction('edit', selectedUser);
                  setSelectedUser(null);
                }}
                className="flex-1"
              >
                Edit User
              </MobileButton>
              <MobileButton
                variant="destructive"
                onClick={() => {
                  handleUserAction('delete', selectedUser);
                  setSelectedUser(null);
                }}
                className="flex-1"
              >
                Delete User
              </MobileButton>
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}; 