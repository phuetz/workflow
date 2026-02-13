/**
 * Global Playwright Setup
 * Prepares test environment and database
 */

import { chromium } from '@playwright/test';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

async function globalSetup() {
  console.log('🚀 Starting global test setup...');
  
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/workflow_test';
  
  try {
    // Initialize test database
    console.log('📊 Setting up test database...');
    await setupTestDatabase();
    
    // Start services
    console.log('🔧 Starting test services...');
    await startTestServices();
    
    // Create admin user for tests
    console.log('👤 Creating test users...');
    await createTestUsers();
    
    // Warm up the application
    console.log('🔥 Warming up application...');
    await warmupApplication();
    
    console.log('✅ Global setup completed successfully');
  } catch (_error) {
    console.error('❌ Global setup failed:', _error);
    throw _error;
  }
}

async function setupTestDatabase() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    // Reset database
    execSync('npx prisma migrate reset --force --skip-seed', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
    
    // Run migrations
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
    
    // Generate Prisma client
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    console.log('✅ Test database setup completed');
  } finally {
    await prisma.$disconnect();
  }
}

async function startTestServices() {
  // Services should already be started by webServer config
  // Just verify they're running
  const services = [
    { name: 'Frontend', url: 'http://localhost:3000/health', timeout: 30000 },
    { name: 'Backend API', url: 'http://localhost:3001/health', timeout: 30000 }
  ];

  for (const service of services) {
    await waitForService(service.name, service.url, service.timeout);
  }
}

async function waitForService(name: string, url: string, timeout: number) {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✅ ${name} is ready`);
        return;
      }
    } catch {
      // Service not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`❌ ${name} failed to start within ${timeout}ms`);
}

async function createTestUsers() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    const bcrypt = await import('bcryptjs');
    
    // Admin user
    await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        email: 'admin@test.com',
        firstName: 'Test',
        lastName: 'Admin',
        passwordHash: await bcrypt.hash('admin123', 12),
        role: 'ADMIN',
        emailVerified: true
      }
    });

    // Regular user
    await prisma.user.upsert({
      where: { email: 'user@test.com' },
      update: {},
      create: {
        email: 'user@test.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: await bcrypt.hash('user123', 12),
        role: 'USER',
        emailVerified: true
      }
    });

    // Viewer user
    await prisma.user.upsert({
      where: { email: 'viewer@test.com' },
      update: {},
      create: {
        email: 'viewer@test.com',
        firstName: 'Test',
        lastName: 'Viewer',
        passwordHash: await bcrypt.hash('viewer123', 12),
        role: 'VIEWER',
        emailVerified: true
      }
    });

    console.log('✅ Test users created');
  } finally {
    await prisma.$disconnect();
  }
}

async function warmupApplication() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Visit main pages to warm up
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Check API health
    const response = await page.goto('http://localhost:3001/health');
    if (!response?.ok()) {
      throw new Error('API health check failed');
    }
    
    console.log('✅ Application warmed up');
  } finally {
    await browser.close();
  }
}

export default globalSetup;