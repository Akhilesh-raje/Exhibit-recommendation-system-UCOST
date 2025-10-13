import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Plus, Wifi, Smartphone, BarChart3, Settings, Users, Shield, Database, QrCode, Activity } from 'lucide-react';
import P2PSyncPanel from './P2PSyncPanel';
import ExhibitUpload from './ExhibitUpload';
import AdminExhibits from './AdminExhibits';
import MobileAppManagement from './MobileAppManagement';

export default function AdminPanel({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<'dashboard' | 'upload' | 'p2p-sync' | 'mobile-app' | 'exhibits'>('dashboard');

  if (view === 'upload') {
    return <ExhibitUpload onBack={() => setView('dashboard')} />;
  }

  if (view === 'p2p-sync') {
    return <P2PSyncPanel onBack={() => setView('dashboard')} />;
  }

  if (view === 'mobile-app') {
    return <MobileAppManagement onBack={() => setView('dashboard')} />;
  }

  if (view === 'exhibits') {
    return <AdminExhibits onBack={() => setView('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-300 mt-2">Manage exhibits, sync devices, and monitor system</p>
          </div>
          <Button variant="outline" onClick={onBack} className="text-white border-gray-600 hover:bg-gray-800">
            ← Back to Main
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gray-800 border-gray-700 text-white" onClick={() => setView('upload')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <Plus className="h-6 w-6 text-blue-400" />
                Upload New Exhibit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">Add a new exhibit with images, descriptions, and metadata.</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gray-800 border-gray-700 text-white" onClick={() => setView('exhibits')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <Database className="h-6 w-6 text-orange-400" />
                Manage Exhibits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">View all uploaded exhibits and see full details.</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gray-800 border-gray-700 text-white" onClick={() => setView('p2p-sync')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <Wifi className="h-6 w-6 text-green-400" />
                P2P Network Sync
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">Connect and sync across devices.</p>
              <Button variant="outline" className="mt-4 w-full text-white border-gray-600 hover:bg-gray-700" onClick={() => setView('p2p-sync')}>
                Manage P2P Sync
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gray-800 border-gray-700 text-white" onClick={() => setView('mobile-app')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <Smartphone className="h-6 w-6 text-blue-400" />
                Mobile App Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">Manage connected mobile devices.</p>
              <Button variant="outline" className="mt-4 w-full text-white border-gray-600 hover:bg-gray-700" onClick={() => setView('mobile-app')}>
                Manage Mobile Apps
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow bg-gray-800 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <BarChart3 className="h-6 w-6 text-purple-400" />
                Analytics Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">View visitor statistics and exhibit performance.</p>
              <Button variant="outline" className="mt-4 w-full text-white border-gray-600 hover:bg-gray-700" disabled>Coming Soon</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow bg-gray-800 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <Settings className="h-6 w-6 text-gray-400" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">Configure system preferences and options.</p>
              <Button variant="outline" className="mt-4 w-full text-white border-gray-600 hover:bg-gray-700" disabled>Coming Soon</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow bg-gray-800 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <Users className="h-6 w-6 text-indigo-400" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">Manage admin users and permissions.</p>
              <Button variant="outline" className="mt-4 w-full text-white border-gray-600 hover:bg-gray-700" disabled>Coming Soon</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow bg-gray-800 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <Shield className="h-6 w-6 text-red-400" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">Configure security and authentication.</p>
              <Button variant="outline" className="mt-4 w-full text-white border-gray-600 hover:bg-gray-700" disabled>Coming Soon</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow bg-gray-800 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <Database className="h-6 w-6 text-orange-400" />
                Backup & Restore
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">Backup and restore system data.</p>
              <Button variant="outline" className="mt-4 w-full text-white border-gray-600 hover:bg-gray-700" disabled>Coming Soon</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow bg-gray-800 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <QrCode className="h-6 w-6 text-teal-400" />
                QR Code Generator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">Generate QR codes for device pairing.</p>
              <Button variant="outline" className="mt-4 w-full text-white border-gray-600 hover:bg-gray-700" disabled>Coming Soon</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow bg-gray-800 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <Activity className="h-6 w-6 text-pink-400" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">Monitor system performance and health.</p>
              <Button variant="outline" className="mt-4 w-full text-white border-gray-600 hover:bg-gray-700" disabled>Coming Soon</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 