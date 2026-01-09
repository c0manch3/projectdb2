// User types
export type UserRole = 'Admin' | 'Manager' | 'Employee' | 'Trial';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  telegramId?: string;
  salary?: number;
  dateBirth?: string;
  createdAt: string;
  updatedAt: string;
}

// Company types
export type CompanyType = 'Customer' | 'Contractor';

export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  address?: string;
  phone?: string;
  email?: string;
  account?: string;
  bank?: string;
  bik?: string;
  corrAccount?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  postalCode?: string;
  createdAt: string;
  updatedAt: string;
}

// Project types
export type ProjectType = 'main' | 'additional';
export type ProjectStatus = 'Active' | 'Completed';

export interface Project {
  id: string;
  name: string;
  contractDate: string;
  expirationDate: string;
  type: ProjectType;
  status: ProjectStatus;
  customerId: string;
  managerId: string;
  mainProjectId?: string;
  contractDocumentId?: string;
  customer?: Company;
  manager?: User;
  mainProject?: Project;
  createdAt: string;
  updatedAt: string;
}

// Construction types
export interface Construction {
  id: string;
  name: string;
  projectId: string;
  project?: Project;
  createdAt: string;
  updatedAt: string;
}

// Document types
export type DocumentType =
  | 'tz'
  | 'contract'
  | 'project_documentation'
  | 'working_documentation';

export interface Document {
  id: string;
  type: DocumentType;
  version: number;
  path: string;
  mimeType: string;
  hashName: string;
  originalName: string;
  uploadedAt: string;
  uploadedById: string;
  projectId: string;
  constructionId?: string;
  uploadedBy?: User;
}

// Workload types
export interface WorkloadPlan {
  id: string;
  userId: string;
  projectId: string;
  managerId: string;
  date: string;
  user?: User;
  project?: Project;
  manager?: User;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWorkloadDistribution {
  id: string;
  workloadActualId: string;
  projectId: string;
  hours: number;
  description?: string;
  project?: Project;
}

export interface WorkloadActual {
  id: string;
  userId: string;
  date: string;
  hoursWorked: number;
  userText?: string;
  user?: User;
  distributions?: ProjectWorkloadDistribution[];
  createdAt: string;
  updatedAt: string;
}

// Payment types
export type PaymentType = 'Advance' | 'MainPayment' | 'FinalPayment' | 'Other';

export interface PaymentSchedule {
  id: string;
  projectId: string;
  type: PaymentType;
  name: string;
  amount: number;
  percentage?: number;
  expectedDate: string;
  actualDate?: string;
  isPaid: boolean;
  description?: string;
  project?: Project;
  createdAt: string;
  updatedAt: string;
}

// Chat log types
export type ChatRole = 'User' | 'Assistant';
export type ChatRequestType = 'Report' | 'Proposal';

export interface LenconnectChatLog {
  id: string;
  userId: string;
  role: ChatRole;
  content: string;
  requestType: ChatRequestType;
  user?: User;
  createdAt: string;
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
