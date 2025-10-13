import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Setting up UCOST Discovery Hub Mobile Backend...');

// Create necessary directories
const directories = [
  'uploads',
  'uploads/exhibits',
  'uploads/users',
  'logs',
  'database'
];

directories.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`📁 Directory exists: ${dir}`);
  }
});

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  const envContent = `# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=ucost-discovery-hub-mobile-secret-key-2025

# Logging
LOG_LEVEL=info

# File Upload Configuration
MAX_FILE_SIZE=10485760
MAX_FILES=5
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp

# Cache Configuration
CACHE_MAX_SIZE=1000
CACHE_TTL=3600000

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Security
CORS_ORIGINS=http://localhost:3000,http://localhost:8100,capacitor://localhost,ionic://localhost
`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env file');
} else {
  console.log('📄 .env file exists');
}

console.log('🎉 Setup completed successfully!');
console.log('💡 Run "npm start" to start the server'); 