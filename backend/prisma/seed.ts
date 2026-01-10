import { PrismaClient, UserRole, CompanyType, DocumentType, ChatRole, ChatRequestType, ProjectType, ProjectStatus } from '@prisma/client';
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
      role: UserRole.Admin,
      dateBirth: new Date('1990-01-01'),
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
      role: UserRole.Manager,
      dateBirth: new Date('1985-06-15'),
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
      role: UserRole.Employee,
      dateBirth: new Date('1995-03-20'),
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
      role: UserRole.Trial,
      dateBirth: new Date('2000-12-01'),
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
      type: CompanyType.Customer,
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
      type: CompanyType.Contractor,
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
      type: ProjectType.main,
      status: ProjectStatus.Active,
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

  // Create a test document for the project
  const document = await prisma.document.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      type: DocumentType.contract,
      version: 1,
      path: 'test-contract.pdf',
      mimeType: 'application/pdf',
      hashName: 'test-contract-hash',
      originalName: 'Project_Contract.pdf',
      projectId: project.id,
      uploadedById: manager.id,
      uploadedAt: new Date(),
    },
  });
  console.log('Created Document:', document.originalName);

  // Create chat logs for LenConnect feature
  const chatLog1 = await prisma.lenconnectChatLog.upsert({
    where: { id: '00000000-0000-0000-0000-000000000101' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000101',
      userId: employee.id,
      role: ChatRole.User,
      content: 'I need a report on my workload for this week.',
      requestType: ChatRequestType.Report,
    },
  });
  console.log('Created Chat Log 1');

  const chatLog2 = await prisma.lenconnectChatLog.upsert({
    where: { id: '00000000-0000-0000-0000-000000000102' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000102',
      userId: employee.id,
      role: ChatRole.Assistant,
      content: 'Here is your workload report for this week:\n\n- Monday: Project Alpha - 8 hours\n- Tuesday: Project Alpha - 6 hours, Project Beta - 2 hours\n- Wednesday: Project Beta - 8 hours\n\nTotal hours: 24 hours across 2 projects.',
      requestType: ChatRequestType.Report,
    },
  });
  console.log('Created Chat Log 2');

  const chatLog3 = await prisma.lenconnectChatLog.upsert({
    where: { id: '00000000-0000-0000-0000-000000000103' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000103',
      userId: manager.id,
      role: ChatRole.User,
      content: 'I have a proposal for improving our project tracking workflow.',
      requestType: ChatRequestType.Proposal,
    },
  });
  console.log('Created Chat Log 3');

  const chatLog4 = await prisma.lenconnectChatLog.upsert({
    where: { id: '00000000-0000-0000-0000-000000000104' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000104',
      userId: manager.id,
      role: ChatRole.Assistant,
      content: 'Thank you for your proposal! I have noted the following improvements:\n\n1. Automated weekly status reports\n2. Integration with calendar for deadline reminders\n3. Enhanced workload visualization\n\nThese suggestions have been forwarded to the development team.',
      requestType: ChatRequestType.Proposal,
    },
  });
  console.log('Created Chat Log 4');

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
