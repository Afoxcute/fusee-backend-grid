#!/usr/bin/env node

/**
 * Environment Setup Helper
 * This script helps you set up the required environment variables
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const envTemplate = `# Environment Configuration
# Generated on ${new Date().toISOString()}

# Application Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/fusee_backend"

# Grid Configuration (Squads Grid)
GRID_ENVIRONMENT=sandbox
GRID_API_KEY=your_grid_api_key_here
GRID_BASE_URL=https://grid.squads.xyz

# Redis Configuration (Optional - for caching/sessions)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Security Configuration (Add when needed)
# JWT_SECRET=your_jwt_secret_here
# API_KEY=your_api_key_here
`;

async function setupEnvironment() {
  console.log('🚀 Fusee Backend Grid - Environment Setup');
  console.log('==========================================\n');

  // Check if .env already exists
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const answer = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('📝 Setting up environment variables...\n');

  // Get database configuration
  console.log('🗄️  Database Configuration:');
  const dbHost = await question('Database host (localhost): ') || 'localhost';
  const dbPort = await question('Database port (5432): ') || '5432';
  const dbName = await question('Database name (fusee_backend): ') || 'fusee_backend';
  const dbUser = await question('Database username: ');
  const dbPassword = await question('Database password: ');

  // Get Grid configuration
  console.log('\n🔗 Grid Configuration:');
  const gridEnv = await question('Grid environment (sandbox): ') || 'sandbox';
  const gridApiKey = await question('Grid API key: ');

  // Get Redis configuration (optional)
  console.log('\n📦 Redis Configuration (optional):');
  const useRedis = await question('Use Redis? (y/N): ');
  let redisUrl = '';
  if (useRedis.toLowerCase() === 'y' || useRedis.toLowerCase() === 'yes') {
    const redisHost = await question('Redis host (localhost): ') || 'localhost';
    const redisPort = await question('Redis port (6379): ') || '6379';
    const redisPassword = await question('Redis password (optional): ');
    redisUrl = `redis://${redisPassword ? `:${redisPassword}@` : ''}${redisHost}:${redisPort}`;
  }

  // Generate .env content
  const envContent = `# Environment Configuration
# Generated on ${new Date().toISOString()}

# Application Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DATABASE_URL="postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}"

# Grid Configuration (Squads Grid)
GRID_ENVIRONMENT=${gridEnv}
GRID_API_KEY=${gridApiKey}
GRID_BASE_URL=https://grid.squads.xyz

# Redis Configuration${useRedis.toLowerCase() === 'y' || useRedis.toLowerCase() === 'yes' ? '' : ' (disabled)'}
${redisUrl ? `REDIS_URL=${redisUrl}` : '# REDIS_URL=redis://localhost:6379'}
REDIS_HOST=${redisUrl ? redisUrl.split('@')[1]?.split(':')[0] || 'localhost' : 'localhost'}
REDIS_PORT=${redisUrl ? redisUrl.split(':').pop() || '6379' : '6379'}
REDIS_PASSWORD=${redisUrl && redisUrl.includes('@') ? redisUrl.split('@')[0].split(':')[2] || '' : ''}

# Security Configuration (Add when needed)
# JWT_SECRET=your_jwt_secret_here
# API_KEY=your_api_key_here
`;

  // Write .env file
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Environment setup complete!');
    console.log(`📄 .env file created at: ${envPath}`);
    console.log('\n🔧 Next steps:');
    console.log('1. Review and update the .env file if needed');
    console.log('2. Run: npm run db:generate');
    console.log('3. Run: npm run db:push');
    console.log('4. Run: npm run db:seed');
    console.log('5. Run: npm run dev');
  } catch (error) {
    console.error('❌ Error creating .env file:', error);
  }

  rl.close();
}

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

setupEnvironment().catch(console.error);


