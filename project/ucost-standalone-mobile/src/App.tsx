import React, { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import MobileDashboard from './components/MobileDashboard'
import './App.css'

function App() {
  const [isNative, setIsNative] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    initializeApp()
  }, [])

  const initializeApp = async () => {
    try {
      // Check if running on native platform
      const platform = Capacitor.getPlatform()
      setIsNative(platform !== 'web')

      // Initialize native features
      if (platform !== 'web') {
        // Set status bar style
        await StatusBar.setStyle({ style: Style.Dark })
        
        // Hide splash screen
        await SplashScreen.hide()
        
        // Haptic feedback for app start
        await Haptics.impact({ style: ImpactStyle.Light })
      }

      // Simulate loading time
      setTimeout(() => setIsLoading(false), 1000)
    } catch (error) {
      console.error('Error initializing app:', error)
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary-600 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold">UCOST Discovery Hub</h1>
          <p className="text-primary-100">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 mobile-safe-area">
      <header className="bg-primary-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/logo.png" 
              alt="UCOST Logo" 
              className="h-10 w-10 object-contain"
              onError={(e) => {
                if (e.currentTarget.src !== '/logo.svg') {
                  e.currentTarget.src = '/logo.svg';
                }
              }}
            />
            <h1 className="text-xl font-bold">UCOST Discovery Hub</h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm bg-primary-500 px-2 py-1 rounded-full">
              {isNative ? 'Mobile' : 'Web'}
            </span>
          </div>
        </div>
      </header>
      
      <main className="p-4">
        <MobileDashboard />
      </main>
    </div>
  )
}

export default App 