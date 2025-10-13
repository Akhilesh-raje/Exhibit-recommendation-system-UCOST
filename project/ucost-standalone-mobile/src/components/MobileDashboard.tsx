import React, { useState } from 'react'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Device } from '@capacitor/device'
import { Network } from '@capacitor/network'
import StatsCard from './StatsCard'
import QuickActionCard from './QuickActionCard'
import ExhibitCard from './ExhibitCard'

interface Exhibit {
  id: string
  name: string
  category: string
  location: string
  imageUrl: string
  description: string
}

const MobileDashboard: React.FC = () => {
  const [deviceInfo, setDeviceInfo] = useState<any>(null)
  const [networkStatus, setNetworkStatus] = useState<any>(null)
  const [exhibits] = useState<Exhibit[]>([
    {
      id: '1',
      name: 'Ancient Artifacts',
      category: 'Archaeology',
      location: 'Gallery A',
      imageUrl: 'https://via.placeholder.com/300x200/1e40af/ffffff?text=Ancient+Artifacts',
      description: 'Collection of ancient archaeological findings'
    },
    {
      id: '2',
      name: 'Modern Technology',
      category: 'Science',
      location: 'Gallery B',
      imageUrl: 'https://via.placeholder.com/300x200/059669/ffffff?text=Modern+Technology',
      description: 'Latest technological innovations and discoveries'
    },
    {
      id: '3',
      name: 'Natural History',
      category: 'Biology',
      location: 'Gallery C',
      imageUrl: 'https://via.placeholder.com/300x200/dc2626/ffffff?text=Natural+History',
      description: 'Fossils and natural specimens'
    }
  ])

  const handleQuickAction = async (action: string) => {
    try {
      // Haptic feedback
      await Haptics.impact({ style: ImpactStyle.Medium })
      
      // Get device info on first action
      if (!deviceInfo) {
        const info = await Device.getInfo()
        setDeviceInfo(info)
      }
      
      // Get network status
      const status = await Network.getStatus()
      setNetworkStatus(status)
      
      console.log(`Action: ${action}`, { deviceInfo, networkStatus })
      
      // Here you would implement the actual action logic
      alert(`${action} action triggered!`)
    } catch (error) {
      console.error('Error handling action:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="mobile-card fade-in">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to UCOST Discovery Hub
        </h2>
        <p className="text-gray-600">
          Manage your museum exhibits with our mobile-first platform
        </p>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 gap-4">
        <StatsCard 
          title="Total Exhibits" 
          value={exhibits.length.toString()} 
          icon="🏛️"
        />
        <StatsCard 
          title="Categories" 
          value="3" 
          icon="📚"
        />
        <StatsCard 
          title="Locations" 
          value="3" 
          icon="📍"
        />
        <StatsCard 
          title="Status" 
          value="Active" 
          icon="✅"
        />
      </div>

      {/* Quick Actions */}
      <div className="mobile-card">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <QuickActionCard
            title="Add Exhibit"
            icon="➕"
            onClick={() => handleQuickAction('Add Exhibit')}
          />
          <QuickActionCard
            title="Scan QR"
            icon="📱"
            onClick={() => handleQuickAction('Scan QR')}
          />
          <QuickActionCard
            title="Sync Data"
            icon="🔄"
            onClick={() => handleQuickAction('Sync Data')}
          />
          <QuickActionCard
            title="Settings"
            icon="⚙️"
            onClick={() => handleQuickAction('Settings')}
          />
        </div>
      </div>

      {/* Recent Exhibits */}
      <div className="mobile-card">
        <h3 className="text-lg font-semibold mb-4">Recent Exhibits</h3>
        <div className="space-y-3">
          {exhibits.map((exhibit) => (
            <ExhibitCard key={exhibit.id} exhibit={exhibit} />
          ))}
        </div>
      </div>

      {/* Device Info (Debug) */}
      {deviceInfo && (
        <div className="mobile-card bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Device Info</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Platform: {deviceInfo.platform}</p>
            <p>Model: {deviceInfo.model}</p>
            <p>OS: {deviceInfo.operatingSystem}</p>
            <p>Version: {deviceInfo.osVersion}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileDashboard 