const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname);
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');
const schemaPath = path.join(rootDir, 'prisma', 'schema.prisma');
const localSchemaPath = path.join(rootDir, 'prisma', 'schema.local.prisma');

async function setup() {
  console.log('🚀 Setting up local SQLite environment...');

  // 1. Handle .env
  let currentEnv = '';
  if (fs.existsSync(envPath)) {
    currentEnv = fs.readFileSync(envPath, 'utf8');
    // Backup if it looks like a remote DB
    if (currentEnv.includes('db.prisma.io') || currentEnv.includes('postgres:')) {
      console.log('📦 Backing up existing Railway .env to .env.railway');
      fs.writeFileSync(path.join(rootDir, '.env.railway'), currentEnv);
    }
  } else if (fs.existsSync(envExamplePath)) {
    currentEnv = fs.readFileSync(envExamplePath, 'utf8');
  }

  // Update specific variables while keeping others
  let localEnv = currentEnv;
  
  const updates = {
    'DATABASE_URL': '"file:./dev.db"',
    'PORT': '3000',
    'NODE_ENV': 'development'
  };

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (localEnv.match(regex)) {
      localEnv = localEnv.replace(regex, `${key}=${value}`);
    } else {
      localEnv += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envPath, localEnv);
  console.log('✅ .env configured for SQLite (preserved other variables)');

  // 2. Generate local Prisma schema
  if (fs.existsSync(schemaPath)) {
    let schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    // Swap provider to sqlite
    schemaContent = schemaContent.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
    
    // SQLite doesn't support @unique on BigInt in some cases or specific types, 
    // but Prisma usually handles BigInt -> Int transition for SQLite safely if possible.
    // However, BigInt is officially supported in SQLite provider since Prisma 4.x.
    
    fs.writeFileSync(localSchemaPath, schemaContent);
    console.log('✅ schema.local.prisma generated');
  } else {
    console.error('❌ schema.prisma not found!');
    process.exit(1);
  }

  console.log('✨ Local setup complete. You can now run: npx prisma db push --schema=prisma/schema.local.prisma');
}

setup().catch(err => {
  console.error('💥 Setup failed:', err);
  process.exit(1);
});
