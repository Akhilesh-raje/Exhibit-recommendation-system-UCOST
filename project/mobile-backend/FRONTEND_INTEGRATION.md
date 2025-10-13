# Frontend Integration Guide

This guide explains how to integrate the standalone mobile backend with your Capacitor frontend application.

## 🔗 **API Base URL Configuration**

### **Development Mode**
```typescript
// In your frontend config
const API_BASE_URL = 'http://localhost:3000';
```

### **Production Mode (Mobile App)**
```typescript
// In your frontend config
const API_BASE_URL = 'http://localhost:3000'; // Backend runs locally in mobile app
```

## 📱 **Mobile App Integration**

### **1. Include Backend in Mobile App**
```bash
# Copy the built backend to your mobile app
cp -r project/mobile-backend/dist mobile-app/assets/backend/
cp -r project/mobile-backend/package.json mobile-app/assets/backend/
```

### **2. Start Backend from Mobile App**
```typescript
// In your Capacitor app
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  // Start the local backend
  startLocalBackend();
}

async function startLocalBackend() {
  try {
    // This would start the Node.js backend process
    // Implementation depends on your mobile app architecture
    console.log('Starting local backend...');
  } catch (error) {
    console.error('Failed to start backend:', error);
  }
}
```

### **3. API Service Configuration**
```typescript
// services/api.ts
class ApiService {
  private baseUrl: string;

  constructor() {
    // Use local backend for mobile, external for web
    this.baseUrl = Capacitor.isNativePlatform() 
      ? 'http://localhost:3000' 
      : 'http://localhost:3000'; // Both use local for now
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  // Authentication methods
  async login(username: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async getExhibits(filters?: any) {
    const queryParams = filters ? `?${new URLSearchParams(filters)}` : '';
    return this.request(`/api/exhibits${queryParams}`);
  }

  async createExhibit(exhibitData: any, images: File[]) {
    const formData = new FormData();
    
    // Add exhibit data
    Object.keys(exhibitData).forEach(key => {
      if (typeof exhibitData[key] === 'object') {
        formData.append(key, JSON.stringify(exhibitData[key]));
      } else {
        formData.append(key, exhibitData[key]);
      }
    });

    // Add images
    images.forEach(image => {
      formData.append('images', image);
    });

    return this.request('/api/exhibits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
      body: formData,
    });
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }
}

export const apiService = new ApiService();
```

## 🔐 **Authentication Integration**

### **1. Login Component**
```typescript
// components/AdminLogin.tsx
import { apiService } from '../services/api';

const handleLogin = async (credentials: { username: string; password: string }) => {
  try {
    const response = await apiService.login(credentials.username, credentials.password);
    
    if (response.success) {
      // Store token
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Navigate to admin panel
      navigate('/admin');
    }
  } catch (error) {
    console.error('Login failed:', error);
    // Handle error
  }
};
```

### **2. Protected Routes**
```typescript
// components/ProtectedRoute.tsx
import { useEffect, useState } from 'react';

const ProtectedRoute = ({ children, requiredRole = 'user' }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Validate token with backend
      const response = await apiService.request('/api/auth/validate', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.success && response.user.role === requiredRole) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem('authToken');
      }
    } catch (error) {
      setIsAuthenticated(false);
      localStorage.removeItem('authToken');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};
```

## 🏛️ **Exhibit Management Integration**

### **1. Exhibit Upload Component**
```typescript
// components/ExhibitUpload.tsx
import { apiService } from '../services/api';

const handleSubmit = async () => {
  try {
    const response = await apiService.createExhibit(exhibitData, selectedImages);
    
    if (response.success) {
      toast({
        title: "Exhibit Created!",
        description: "Your exhibit has been successfully uploaded.",
      });
      onBack();
    }
  } catch (error) {
    console.error('Failed to create exhibit:', error);
    toast({
      title: "Error",
      description: "Failed to create exhibit. Please try again.",
      variant: "destructive",
    });
  }
};
```

### **2. Exhibit List Component**
```typescript
// components/ExhibitList.tsx
import { apiService } from '../services/api';

const [exhibits, setExhibits] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadExhibits();
}, []);

const loadExhibits = async () => {
  try {
    setLoading(true);
    const response = await apiService.getExhibits();
    
    if (response.success) {
      setExhibits(response.data);
    }
  } catch (error) {
    console.error('Failed to load exhibits:', error);
  } finally {
    setLoading(false);
  }
};
```

## 🗺️ **Tour Management Integration**

### **1. Tour Creation**
```typescript
// components/TourCreator.tsx
import { apiService } from '../services/api';

const createTour = async (tourData: any) => {
  try {
    const response = await apiService.request('/api/tours', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: JSON.stringify(tourData),
    });

    if (response.success) {
      // Handle success
    }
  } catch (error) {
    console.error('Failed to create tour:', error);
  }
};
```

## 📊 **Analytics Integration**

### **1. Track User Actions**
```typescript
// utils/analytics.ts
import { apiService } from '../services/api';

export const trackEvent = async (action: string, data?: any) => {
  try {
    await apiService.request('/api/analytics', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: JSON.stringify({
        action,
        data,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error('Failed to track analytics:', error);
  }
};

// Usage examples
trackEvent('exhibit_viewed', { exhibitId: '123', exhibitName: 'Solar System' });
trackEvent('tour_started', { tourId: '456', tourName: 'Science Discovery' });
trackEvent('user_login', { username: 'john_doe' });
```

## 🔍 **OCR Integration**

### **1. Image Analysis**
```typescript
// components/ImageAnalyzer.tsx
import { apiService } from '../services/api';

const analyzeImage = async (imageFile: File) => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await apiService.request('/api/ocr/analyze', {
      method: 'POST',
      body: formData,
    });

    if (response.success) {
      setOcrResult(response.data);
    }
  } catch (error) {
    console.error('OCR analysis failed:', error);
  }
};
```

## 🚀 **Deployment Checklist**

### **Frontend Changes**
- [ ] Update API base URL configuration
- [ ] Integrate authentication with backend
- [ ] Update exhibit management to use backend APIs
- [ ] Add error handling for API calls
- [ ] Implement loading states
- [ ] Add offline fallback handling

### **Backend Integration**
- [ ] Include backend in mobile app build
- [ ] Configure backend startup in mobile app
- [ ] Test all API endpoints
- [ ] Verify file upload functionality
- [ ] Test authentication flow
- [ ] Validate database operations

### **Testing**
- [ ] Test on physical device
- [ ] Verify offline functionality
- [ ] Test file uploads
- [ ] Validate user authentication
- [ ] Check admin panel functionality
- [ ] Test exhibit management

## 🔧 **Troubleshooting**

### **Common Issues**

1. **Backend Not Starting**
   - Check if port 3000 is available
   - Verify Node.js installation
   - Check backend logs

2. **API Connection Failed**
   - Verify backend is running
   - Check CORS configuration
   - Validate API endpoints

3. **File Upload Issues**
   - Check file size limits
   - Verify file type restrictions
   - Check upload directory permissions

4. **Authentication Problems**
   - Verify JWT token storage
   - Check token expiration
   - Validate user credentials

### **Debug Mode**
```typescript
// Enable debug logging
const DEBUG_MODE = true;

if (DEBUG_MODE) {
  console.log('API Request:', { endpoint, options });
  console.log('API Response:', response);
}
```

## 📚 **Additional Resources**

- [Backend API Documentation](./README.md)
- [Database Schema](./README.md#database-schema)
- [Security Features](./README.md#security-features)
- [Performance Features](./README.md#performance-features)

---

**Your mobile app is now fully integrated with a standalone backend! 🎉** 