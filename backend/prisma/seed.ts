import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Admin user
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@projectdb.com' },
    update: {},
    create: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@projectdb.com',
      phone: '+1234567890',
      passwordHash: adminPassword,
      role: 'Admin',
    },
  });
  console.log('Created Admin user:', admin.email);

  // Create Manager user
  const managerPassword = await bcrypt.hash('Manager123!', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@projectdb.com' },
    update: {},
    create: {
      firstName: 'Manager',
      lastName: 'User',
      email: 'manager@projectdb.com',
      phone: '+1234567891',
      passwordHash: managerPassword,
      role: 'Manager',
    },
  });
  console.log('Created Manager user:', manager.email);

  // Create Employee user
  const employeePassword = await bcrypt.hash('Employee123!', 10);
  const employee = await prisma.user.upsert({
    where: { email: 'employee@projectdb.com' },
    update: {},
    create: {
      firstName: 'Employee',
      lastName: 'User',
      email: 'employee@projectdb.com',
      phone: '+1234567892',
      passwordHash: employeePassword,
      role: 'Employee',
    },
  });
  console.log('Created Employee user:', employee.email);

  // Create Trial user
  const trialPassword = await bcrypt.hash('Trial123!', 10);
  const trial = await prisma.user.upsert({
    where: { email: 'trial@projectdb.com' },
    update: {},
    create: {
      firstName: 'Trial',
      lastName: 'User',
      email: 'trial@projectdb.com',
      phone: '+1234567893',
      passwordHash: trialPassword,
      role: 'Trial',
    },
  });
  console.log('Created Trial user:', trial.email);

  // Create a Customer company
  const customerCompany = await prisma.company.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Customer LLC',
      type: 'Customer',
      address: '123 Main St, Test City',
      phone: '+1-555-0100',
      email: 'info@testcustomer.com',
      inn: '1234567890',
    },
  });
  console.log('Created Customer company:', customerCompany.name);

  // Create a Contractor company
  const contractorCompany = await prisma.company.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Test Contractor Inc',
      type: 'Contractor',
      address: '456 Builder Ave, Construction Town',
      phone: '+1-555-0200',
      email: 'info@testcontractor.com',
      inn: '0987654321',
    },
  });
  console.log('Created Contractor company:', contractorCompany.name);

  // Create a test project
  const project = await prisma.project.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Project Alpha',
      contractDate: new Date('2025-01-01'),
      expirationDate: new Date('2025-12-31'),
      type: 'main',
      status: 'Active',
      customerId: customerCompany.id,
      managerId: manager.id,
    },
  });
  console.log('Created Project:', project.name);

  // Create a construction for the project
  const construction = await prisma.construction.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Building A Foundation',
      projectId: project.id,
    },
  });
  console.log('Created Construction:', construction.name);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
