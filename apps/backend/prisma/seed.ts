import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'password123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Admin User',
      password: hashedPassword,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log({ admin });

  // E2E test users (matching apps/automation/src/test-data/users.ts)
  const testUsers = [
    { email: 'admin@qadash.io', name: 'Admin User', password: 'Admin@123', role: UserRole.ADMIN },
    { email: 'qa@qadash.io', name: 'QA Engineer', password: 'QA@123', role: UserRole.QA },
    { email: 'automation@qadash.io', name: 'Automation Engineer', password: 'Auto@123', role: UserRole.AUTOMATION_ENGINEER },
    { email: 'developer@qadash.io', name: 'Developer', password: 'Dev@123', role: UserRole.DEVELOPER },
    { email: 'manager@qadash.io', name: 'Project Manager', password: 'Manager@123', role: UserRole.MANAGER },
    { email: 'viewer@qadash.io', name: 'Viewer', password: 'Viewer@123', role: UserRole.VIEWER },
  ];

  for (const u of testUsers) {
    const hashed = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        password: hashed,
        role: u.role,
        isActive: true,
      },
    });
  }

  console.log(`Seeded ${testUsers.length} E2E test users`);

  // Create some demo data if needed
  const demoProject = await prisma.project.upsert({
    where: { id: 'demo-project-id' },
    update: {},
    create: {
      id: 'demo-project-id',
      name: 'Demo Project',
      description: 'A demo project for testing',
      status: 'ACTIVE',
    },
  });

  console.log({ demoProject });

  // Seed demo reports
  const demoReport1 = await prisma.report.upsert({
    where: { id: 'demo-report-1' },
    update: {},
    create: {
      id: 'demo-report-1',
      projectId: demoProject.id,
      userId: admin.id,
      type: 'TEST_SUMMARY',
      name: 'Demo Execution Report - Smoke Tests',
      summary: { totalTests: 42, passed: 38, failed: 4, status: 'FAILED', completedAt: new Date().toISOString() },
    },
  });

  const demoReport2 = await prisma.report.upsert({
    where: { id: 'demo-report-2' },
    update: {},
    create: {
      id: 'demo-report-2',
      projectId: demoProject.id,
      userId: admin.id,
      type: 'TEST_SUMMARY',
      name: 'Demo Execution Report - Regression Tests',
      summary: { totalTests: 128, passed: 124, failed: 4, status: 'FAILED', completedAt: new Date(Date.now() - 86400000).toISOString() },
    },
  });

  console.log({ demoReport1, demoReport2 });

  // Seed demo bugs
  const demoBug1 = await prisma.bug.upsert({
    where: { id: 'demo-bug-1' },
    update: {},
    create: {
      id: 'demo-bug-1',
      title: 'Login button unresponsive on mobile viewport',
      description: 'The login button does not respond to clicks when viewport width is less than 480px.',
      projectId: demoProject.id,
      userId: admin.id,
      severity: 'HIGH',
      priority: 'P2',
      status: 'OPEN',
      tags: ['login', 'mobile', 'ui'],
    },
  });

  const demoBug2 = await prisma.bug.upsert({
    where: { id: 'demo-bug-2' },
    update: {},
    create: {
      id: 'demo-bug-2',
      title: 'API returns 500 on empty search query',
      description: 'Search endpoint crashes when query parameter is an empty string.',
      projectId: demoProject.id,
      userId: admin.id,
      severity: 'CRITICAL',
      priority: 'P1',
      status: 'IN_PROGRESS',
      tags: ['api', 'search', 'crash'],
      stackTrace: 'TypeError: Cannot read property "trim" of undefined\n    at SearchService.search (search.service.ts:42)',
    },
  });

  const demoBug3 = await prisma.bug.upsert({
    where: { id: 'demo-bug-3' },
    update: {},
    create: {
      id: 'demo-bug-3',
      title: 'Dashboard charts not rendering in Safari',
      description: 'Charts on the main dashboard show as blank in Safari browser (v15+).',
      projectId: demoProject.id,
      userId: admin.id,
      severity: 'MEDIUM',
      priority: 'P3',
      status: 'RESOLVED',
      tags: ['safari', 'dashboard', 'charts'],
    },
  });

  console.log({ demoBug1, demoBug2, demoBug3 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
