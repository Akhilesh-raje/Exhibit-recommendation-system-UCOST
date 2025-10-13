import { LoggerService } from './logger';

export interface Exhibit {
  id: string;
  name: string;
  category: string;
  location: string;
  description: string;
  ageRange: string;
  type: string;
  environment: string;
  features: string;
  images: string;
  mapLocation: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tour {
  id: string;
  name: string;
  description: string;
  exhibits: string;
  duration: number;
  difficulty: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: string;
  preferences: string;
  createdAt: string;
  updatedAt: string;
}

export interface Analytics {
  id: string;
  userId: string;
  action: string;
  data: string;
  timestamp: string;
}

export class DatabaseService {
  private logger: LoggerService;
  private data: {
    users: Map<string, User>;
    exhibits: Map<string, Exhibit>;
    tours: Map<string, Tour>;
    analytics: Map<string, Analytics>;
    sessions: Map<string, { userId: string; expiresAt: string }>;
  };

  constructor() {
    this.logger = new LoggerService();
    this.data = {
      users: new Map(),
      exhibits: new Map(),
      tours: new Map(),
      analytics: new Map(),
      sessions: new Map()
    };
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info('In-memory database initialized');
    } catch (error) {
      this.logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  public async setupTables(): Promise<void> {
    try {
      // Insert default data
      await this.insertDefaultData();

      this.logger.info('In-memory database setup completed');
    } catch (error) {
      this.logger.error('Failed to setup database:', error);
      throw error;
    }
  }

  // In-memory database - no table creation needed

  private async insertDefaultData(): Promise<void> {
    try {
      // Insert default admin user
      if (!this.data.users.has('admin-001')) {
        const bcrypt = await import('bcryptjs');
        const passwordHash = await bcrypt.hash('ucost@2025', 10);
        
        const adminUser: User = {
          id: 'admin-001',
          username: 'admin',
          email: 'admin@ucost.gov.in',
          passwordHash,
          role: 'admin',
          preferences: JSON.stringify({ theme: 'dark', language: 'en' }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        this.data.users.set(adminUser.id, adminUser);
        this.logger.info('Default admin user created');
      }

      // Insert sample exhibits
      if (this.data.exhibits.size === 0) {
        const sampleExhibits: Exhibit[] = [
          {
            id: 'exhibit-001',
            name: 'Interactive Solar System',
            category: 'astronomy',
            location: 'Ground Floor - Hall A',
            description: 'Explore the solar system through interactive 3D models and real-time data from NASA.',
            ageRange: 'families',
            type: 'interactive',
            environment: 'indoor',
            features: JSON.stringify(['3D Models', 'Interactive Touch', 'Audio Guide']),
            images: JSON.stringify(['solar-system-1.jpg', 'solar-system-2.jpg']),
            mapLocation: JSON.stringify({ floor: 'ground', x: 100, y: 150 }),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'exhibit-002',
            name: 'Chemistry Lab Experience',
            category: 'chemistry',
            location: 'First Floor - Lab 1',
            description: 'Hands-on chemistry experiments with safe materials and guided instructions.',
            ageRange: 'students',
            type: 'hands-on',
            environment: 'indoor',
            features: JSON.stringify(['Live Demonstrations', 'Guided Tours', 'Safety Equipment']),
            images: JSON.stringify(['chemistry-lab-1.jpg']),
            mapLocation: JSON.stringify({ floor: 'first', x: 200, y: 100 }),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];

        sampleExhibits.forEach(exhibit => {
          this.data.exhibits.set(exhibit.id, exhibit);
        });

        this.logger.info('Sample exhibits created');
      }

      // Insert sample tours
      if (this.data.tours.size === 0) {
        const sampleTours: Tour[] = [
          {
            id: 'tour-001',
            name: 'Science Discovery Tour',
            description: 'A comprehensive tour covering physics, chemistry, and biology exhibits.',
            exhibits: JSON.stringify(['exhibit-001', 'exhibit-002']),
            duration: 45,
            difficulty: 'beginner',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];

        sampleTours.forEach(tour => {
          this.data.tours.set(tour.id, tour);
        });

        this.logger.info('Sample tours created');
      }

    } catch (error) {
      this.logger.error('Failed to insert default data:', error);
      throw error;
    }
  }

  public isConnected(): boolean {
    return true; // In-memory database is always connected
  }

  public async close(): Promise<void> {
    // Clear in-memory data
    this.data.users.clear();
    this.data.exhibits.clear();
    this.data.tours.clear();
    this.data.analytics.clear();
    this.data.sessions.clear();
    this.logger.info('In-memory database cleared');
  }

  // User operations
  public async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = `user-${Date.now()}`;
    const now = new Date().toISOString();
    
    const newUser: User = { ...user, id, createdAt: now, updatedAt: now };
    this.data.users.set(id, newUser);
    
    return newUser;
  }

  public async getUserByUsername(username: string): Promise<User | null> {
    for (const user of this.data.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  }

  public async getUserById(id: string): Promise<User | null> {
    return this.data.users.get(id) || null;
  }

  // Exhibit operations
  public async createExhibit(exhibit: Omit<Exhibit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Exhibit> {
    const id = `exhibit-${Date.now()}`;
    const now = new Date().toISOString();
    
    const newExhibit: Exhibit = { ...exhibit, id, createdAt: now, updatedAt: now };
    this.data.exhibits.set(id, newExhibit);
    
    return newExhibit;
  }

  public async getAllExhibits(): Promise<Exhibit[]> {
    const exhibits = Array.from(this.data.exhibits.values());
    
    return exhibits.map(exhibit => ({
      ...exhibit,
      features: JSON.parse(exhibit.features || '[]'),
      images: JSON.parse(exhibit.images || '[]'),
      mapLocation: JSON.parse(exhibit.mapLocation || '{}')
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getExhibitById(id: string): Promise<Exhibit | null> {
    const exhibit = this.data.exhibits.get(id);
    
    if (!exhibit) return null;
    
    return {
      ...exhibit,
      features: JSON.parse(exhibit.features || '[]'),
      images: JSON.parse(exhibit.images || '[]'),
      mapLocation: JSON.parse(exhibit.mapLocation || '{}')
    };
  }

  public async updateExhibit(id: string, updates: Partial<Exhibit>): Promise<Exhibit | null> {
    const exhibit = await this.getExhibitById(id);
    if (!exhibit) return null;

    const updatedExhibit = { ...exhibit, ...updates, updatedAt: new Date().toISOString() };
    
    // Update the stored exhibit
    this.data.exhibits.set(id, {
      ...updatedExhibit,
      features: typeof updatedExhibit.features === 'string' ? updatedExhibit.features : JSON.stringify(updatedExhibit.features),
      images: typeof updatedExhibit.images === 'string' ? updatedExhibit.images : JSON.stringify(updatedExhibit.images),
      mapLocation: typeof updatedExhibit.mapLocation === 'string' ? updatedExhibit.mapLocation : JSON.stringify(updatedExhibit.mapLocation)
    });
    
    return updatedExhibit;
  }

  public async deleteExhibit(id: string): Promise<boolean> {
    return this.data.exhibits.delete(id);
  }

  // Tour operations
  public async createTour(tour: Omit<Tour, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tour> {
    const id = `tour-${Date.now()}`;
    const now = new Date().toISOString();
    
    const newTour: Tour = { ...tour, id, createdAt: now, updatedAt: now };
    this.data.tours.set(id, newTour);
    
    return newTour;
  }

  public async getAllTours(): Promise<Tour[]> {
    const tours = Array.from(this.data.tours.values());
    
    return tours.map(tour => ({
      ...tour,
      exhibits: JSON.parse(tour.exhibits || '[]')
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getTourById(id: string): Promise<Tour | null> {
    const tour = this.data.tours.get(id);
    
    if (!tour) return null;
    
    return {
      ...tour,
      exhibits: JSON.parse(tour.exhibits || '[]')
    };
  }

  // Analytics operations
  public async logAnalytics(userId: string | null, action: string, data?: any): Promise<void> {
    const id = `analytics-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    const analytics: Analytics = {
      id,
      userId: userId || '',
      action,
      data: data ? JSON.stringify(data) : '',
      timestamp
    };
    
    this.data.analytics.set(id, analytics);
  }

  public async getAnalytics(userId?: string, limit: number = 100): Promise<Analytics[]> {
    let analytics = Array.from(this.data.analytics.values());
    
    if (userId) {
      analytics = analytics.filter(item => item.userId === userId);
    }
    
    return analytics
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
      .map(item => ({
        ...item,
        data: item.data ? JSON.parse(item.data) : null
      }));
  }

  // Session operations
  public async createSession(userId: string, token: string, expiresAt: Date): Promise<void> {
    const id = `session-${Date.now()}`;
    const createdAt = new Date().toISOString();
    
    this.data.sessions.set(token, {
      userId,
      expiresAt: expiresAt.toISOString()
    });
  }

  public async getSessionByToken(token: string): Promise<{ userId: string; expiresAt: string } | null> {
    const session = this.data.sessions.get(token);
    return session || null;
  }

  public async deleteSession(token: string): Promise<void> {
    this.data.sessions.delete(token);
  }

  public async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    
    for (const [token, session] of this.data.sessions.entries()) {
      if (new Date(session.expiresAt) < now) {
        this.data.sessions.delete(token);
      }
    }
  }
} 