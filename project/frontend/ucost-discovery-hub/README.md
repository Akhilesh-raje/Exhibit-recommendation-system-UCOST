# UCOST Discovery Hub - Frontend Web Application

> Consolidated documentation is tracked in the root `README.md` (see **Subsystem Guides → Frontend Web**). Use this file for workspace-specific notes.

**React + TypeScript + Vite Frontend for UCOST Discovery Hub Museum Management System**

## ✅ **Status: 100% Complete & Working**

**All frontend features are operational, including admin panel, exhibit management, maps, tours, analytics, and chatbot integration.**

## How can I edit this code?

To work with this project locally using your preferred IDE, you need Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

### Core Framework
- **Vite** - Fast build tool and dev server
- **React 18** - UI library with hooks and concurrent features
- **TypeScript** - Type-safe JavaScript
- **React Router** - Client-side routing

### UI & Styling
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React component library
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **Tailwind Animate** - Animation utilities

### State Management & Data
- **TanStack Query (React Query)** - Server state management
- **React Hook Form** - Form state management
- **Zod** - Schema validation

### Mobile & Native
- **Capacitor 6** - Native mobile app framework
- **Capacitor Plugins**: App, Device, Haptics, Keyboard, Network, Status Bar

### Charts & Visualization
- **Recharts** - Charting library
- **QR Code React** - QR code generation

### Utilities
- **date-fns** - Date manipulation
- **clsx** - Conditional class names
- **Sonner** - Toast notifications

## How can I deploy this project?

### Build for Production

```sh
npm run build
```

This creates an optimized production build in the `dist/` folder.

### Deployment Options

1. **Static Hosting** (Vercel, Netlify, GitHub Pages)
   - Deploy the `dist/` folder directly
   - Configure environment variables for API endpoints
   - Set up redirects for client-side routing

2. **Docker Container**
   - Build Docker image with nginx serving static files
   - Configure reverse proxy for API endpoints

3. **Capacitor Mobile App**
   ```sh
   npm run build
   npm run cap:sync
   npm run cap:open:android  # or ios
   ```

4. **Electron Desktop** (via desktop app)
   - Frontend is bundled with Electron desktop application
   - See `desktop/README.md` for details

### Environment Configuration

Create a `.env` file for production:
```env
VITE_API_URL=http://localhost:5000/api
VITE_CHATBOT_URL=http://localhost:4321
VITE_EMBED_URL=http://localhost:8001
VITE_GEMMA_URL=http://localhost:8011
```

### Key Features

- **Admin Panel**: Complete exhibit and user management
- **Interactive Maps**: Floor-based exhibit visualization
- **Visitor Onboarding**: Multi-step profile creation
- **AI Recommendations**: Personalized exhibit suggestions
- **Tour Management**: Create and manage personalized tours
- **Analytics Dashboard**: Real-time visitor statistics
- **Chatbot Integration**: Embedded conversational AI
- **Data Export**: Excel/CSV export with backup management
- **Mobile Responsive**: Optimized for all screen sizes
- **PWA Ready**: Can be installed as Progressive Web App
