# 🚀 UCOST Discovery Hub - Capacitor Mobile App

> Integrated monorepo guidance is in the root `README.md` (**Subsystem Guides → Capacitor Mobile App**). This document drills into the mobile workspace specifics.

A modern, mobile-first museum exhibit management system built with React, TypeScript, and Capacitor.

## ✨ Features

- 📱 **Mobile-First Design**: Optimized for touch devices
- 🎨 **Modern UI**: Built with Tailwind CSS and Shadcn/ui components
- 🔧 **Capacitor Integration**: Native mobile features (camera, GPS, notifications)
- 📊 **Dashboard**: Real-time statistics and exhibit management
- 🔄 **Offline Support**: Works without internet connectivity
- 🎯 **Touch Optimized**: 44px minimum touch targets

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Mobile**: Capacitor 6.x
- **Styling**: Tailwind CSS
- **UI Components**: Custom mobile-optimized components
- **Build Tool**: Vite with Capacitor integration

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Android Studio (for Android builds)
- Xcode (for iOS builds, macOS only)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Open in browser**
   Navigate to `http://localhost:3000`

## 📱 Mobile Development

### Initialize Capacitor

```bash
# Initialize Capacitor project
npx cap init "UCOST Mobile" "com.ucost.mobile"

# Add platforms
npx cap add android
npx cap add ios
```

### Build and Sync

```bash
# Build the web app
npm run build

# Sync with mobile platforms
npx cap sync

# Open in Android Studio
npx cap open android

# Open in Xcode (macOS only)
npx cap open ios
```

### Run on Device

```bash
# Run on Android device/emulator
npx cap run android

# Run on iOS device/simulator (macOS only)
npx cap run ios
```

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── MobileDashboard.tsx
│   ├── StatsCard.tsx
│   ├── QuickActionCard.tsx
│   └── ExhibitCard.tsx
├── App.tsx             # Main app component
├── main.tsx            # App entry point
├── index.css           # Global styles
└── App.css             # App-specific styles

capacitor.config.ts     # Capacitor configuration
vite.config.ts          # Vite build configuration
tsconfig.json           # TypeScript configuration
tailwind.config.js      # Tailwind CSS configuration
```

## 🎨 UI Components

### MobileDashboard
Main dashboard with statistics, quick actions, and recent exhibits.

### StatsCard
Displays key metrics with icons and values.

### QuickActionCard
Touch-friendly action buttons for common tasks.

### ExhibitCard
Shows exhibit information with images and details.

## 🔧 Configuration

### Capacitor Config
Located in `capacitor.config.ts`:
- App ID and name
- Platform-specific settings
- Plugin configurations
- Build options

### Vite Config
Located in `vite.config.ts`:
- React plugin
- Build output settings
- Development server configuration

### Tailwind Config
Located in `tailwind.config.js`:
- Custom color scheme
- Mobile-optimized breakpoints
- Animation plugins

## 📱 Native Features

### Implemented
- ✅ Status bar styling
- ✅ Splash screen
- ✅ Haptic feedback
- ✅ Device information
- ✅ Network status

### Planned
- 📷 Camera integration
- 📍 GPS location
- 🔔 Push notifications
- 🔐 Biometric auth
- 💾 Local storage

## 🚀 Build Commands

```bash
# Development
npm run dev              # Start dev server
npm run preview          # Preview production build

# Build
npm run build            # Build for production
npm run cap:build:android # Build for Android
npm run cap:build:ios    # Build for iOS

# Mobile
npm run cap:sync         # Sync with platforms
npm run cap:open:android # Open Android Studio
npm run cap:open:ios     # Open Xcode
```

## 🧪 Testing

### Web Testing
```bash
# Run in browser
npm run dev
# Navigate to http://localhost:3000
```

### Mobile Testing
```bash
# Build and sync
npm run build
npx cap sync

# Run on device
npx cap run android
npx cap run ios
```

## 📦 Distribution

### Android APK
```bash
# Build APK
npm run cap:build:android
# APK will be in android/app/build/outputs/apk/
```

### iOS IPA
```bash
# Build IPA
npm run cap:build:ios
# Use Xcode to archive and distribute
```

## 🔍 Troubleshooting

### Common Issues

1. **Capacitor not found**
   ```bash
   npm install @capacitor/cli
   ```

2. **Platform sync issues**
   ```bash
   npx cap sync
   npx cap update
   ```

3. **Build errors**
   ```bash
   rm -rf node_modules
   npm install
   npm run build
   ```

### Debug Mode
Enable debug logging in the browser console to see Capacitor initialization and device information.

## 📚 Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev/guide)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ by the UCOST Discovery Hub Team** 