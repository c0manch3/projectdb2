import { useEffect, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '@/services/auth.service';
import toast from 'react-hot-toast';
import { useAppSelector } from '@/store';

interface Document {
  id: string;
  originalName: string;
  type: string;
  version: number;
  uploadedAt: string;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface Construction {
  id: string;
  name: string;
  status: string;
}

interface TeamMember {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: string;
  };
}

interface AvailableUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface PaymentSchedule {
  id: string;
  type: string;
  name: string;
  amount: number;
  percentage?: number;
  expectedDate: string;
  actualDate?: string;
  isPaid: boolean;
  description?: string;
  project: {
    id: string;
    name: string;
  };
}

interface WorkloadReport {
  id: string;
  date: string;
  hours: number;
  description: string;
  totalDayHours: number;
  userText: string | null;
}

interface EmployeeWorkload {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  totalHours: number;
  reports: WorkloadReport[];
}

interface ProjectWorkload {
  projectId: string;
  projectName: string;
  totalProjectHours: number;
  employeeCount: number;
  employeeWorkload: EmployeeWorkload[];
}

interface Project {
  id: string;
  name: string;
  contractDate: string;
  expirationDate: string;
  type: string;
  status: string;
  customerId: string;
  managerId: string;
  mainProjectId?: string;
  customer: {
    id: string;
    name: string;
    type: string;
  } | null;
  manager: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  mainProject?: {
    id: string;
    name: string;
  };
  additionalProjects?: {
    id: string;
    name: string;
    status: string;
  }[];
  constructions: Construction[];
  documents?: Document[];
}

type TabType = 'overview' | 'constructions' | 'documents' | 'payments' | 'workload';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Get initial tab from URL hash or default to 'overview'
  const getTabFromHash = (): TabType => {
    const hash = location.hash.replace('#', '');
    const validTabs: TabType[] = ['overview', 'constructions', 'documents', 'payments', 'workload'];
    return validTabs.includes(hash as TabType) ? (hash as TabType) : 'overview';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getTabFromHash());

  // Team management state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  const canManageTeam = user?.role === 'Admin' || user?.role === 'Manager';
  const canUploadDocs = user?.role === 'Admin' || user?.role === 'Manager';

  // Document upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('project_documentation');
  const [selectedConstructionId, setSelectedConstructionId] = useState<string>('');

  // Document replace state
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replacingDoc, setReplacingDoc] = useState(false);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [documentToReplace, setDocumentToReplace] = useState<Document | null>(null);

  // Document filter state
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');

  // Payment schedule state
  const [payments, setPayments] = useState<PaymentSchedule[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    type: 'Advance',
    name: '',
    amount: '',
    percentage: '',
    expectedDate: '',
    description: '',
  });
  const [paymentFormErrors, setPaymentFormErrors] = useState<Record<string, string>>({});
  const canManagePayments = user?.role === 'Admin' || user?.role === 'Manager';

  // Construction management state
  const [showAddConstructionModal, setShowAddConstructionModal] = useState(false);
  const [showEditConstructionModal, setShowEditConstructionModal] = useState(false);
  const [newConstructionName, setNewConstructionName] = useState('');
  const [editingConstruction, setEditingConstruction] = useState<Construction | null>(null);
  const [editConstructionName, setEditConstructionName] = useState('');
  const [savingConstruction, setSavingConstruction] = useState(false);
  const canManageConstructions = user?.role === 'Admin' || user?.role === 'Manager';

  // Workload tab state
  const [projectWorkload, setProjectWorkload] = useState<ProjectWorkload | null>(null);
  const [loadingWorkload, setLoadingWorkload] = useState(false);
  const [selectedEmployeeWorkload, setSelectedEmployeeWorkload] = useState<EmployeeWorkload | null>(null);
  const [showEmployeeReportsModal, setShowEmployeeReportsModal] = useState(false);
  const canViewWorkload = user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Trial';

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await api.get<Project>(`/project/${id}`);
        setProject(response.data);
      } catch (error) {
        toast.error('Failed to load project');
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchProject();
    }
  }, [id]);

  // Sync active tab with URL hash
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    const validTabs: TabType[] = ['overview', 'constructions', 'documents', 'payments', 'workload'];
    if (validTabs.includes(hash as TabType) && hash !== activeTab) {
      setActiveTab(hash as TabType);
    }
  }, [location.hash]);

  // Update URL hash when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    navigate(`#${tab}`, { replace: true });
  };

  // Fetch payments when payments tab is active
  useEffect(() => {
    const fetchPayments = async () => {
      if (activeTab === 'payments' && id) {
        setLoadingPayments(true);
        try {
          const response = await api.get<PaymentSchedule[]>(`/payment-schedule?projectId=${id}`);
          setPayments(response.data);
        } catch (error) {
          toast.error('Failed to load payments');
        } finally {
          setLoadingPayments(false);
        }
      }
    };
    fetchPayments();
  }, [activeTab, id]);

  // Fetch workload when workload tab is active
  useEffect(() => {
    const fetchWorkload = async () => {
      if (activeTab === 'workload' && id && canViewWorkload) {
        setLoadingWorkload(true);
        try {
          const response = await api.get<ProjectWorkload>(`/project/${id}/workload/employees`);
          setProjectWorkload(response.data);
        } catch (error) {
          toast.error('Failed to load workload data');
        } finally {
          setLoadingWorkload(false);
        }
      }
    };
    fetchWorkload();
  }, [activeTab, id, canViewWorkload]);

  const openEmployeeReportsModal = (employee: EmployeeWorkload) => {
    setSelectedEmployeeWorkload(employee);
    setShowEmployeeReportsModal(true);
  };

  const handleAddTeamMember = async () => {
    if (!selectedUserId || !id) return;

    setAddingUser(true);
    try {
      await api.post(`/project/${id}/users/${selectedUserId}`);
      toast.success('Team member added successfully');

      // Refresh team data
      const [teamResponse, availableResponse] = await Promise.all([
        api.get<TeamMember[]>(`/project/${id}/users`),
        api.get<AvailableUser[]>(`/project/${id}/available-users`),
      ]);
      setTeamMembers(teamResponse.data);
      setAvailableUsers(availableResponse.data);
      setSelectedUserId('');
    } catch (error) {
      toast.error('Failed to add team member');
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveTeamMember = async (userId: string) => {
    if (!id) return;

    try {
      await api.delete(`/project/${id}/users/${userId}`);
      toast.success('Team member removed');

      // Refresh team data
      const [teamResponse, availableResponse] = await Promise.all([
        api.get<TeamMember[]>(`/project/${id}/users`),
        api.get<AvailableUser[]>(`/project/${id}/available-users`),
      ]);
      setTeamMembers(teamResponse.data);
      setAvailableUsers(availableResponse.data);
    } catch (error) {
      toast.error('Failed to remove team member');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
  const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif', '.vbs', '.js', '.jar', '.sh'];
  const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.png', '.jpg', '.jpeg', '.gif', '.zip', '.rar', '.7z'];

  const validateFileType = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    const extension = '.' + fileName.split('.').pop();

    // Check if it's a blocked extension
    if (BLOCKED_EXTENSIONS.includes(extension)) {
      toast.error(`File type "${extension}" is not allowed for security reasons.`);
      return false;
    }

    // Check if it's an allowed extension
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      toast.error(`File type "${extension}" is not supported. Allowed types: PDF, Word, Excel, PowerPoint, images, and archives.`);
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Check file type first
      if (!validateFileType(file)) {
        e.target.value = ''; // Reset the file input
        setSelectedFile(null);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error('File is too large. Maximum size is 50MB.');
        e.target.value = ''; // Reset the file input
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedFile || !id) return;

    setUploadingDoc(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('projectId', id);
      formData.append('type', docType);
      if (selectedConstructionId) {
        formData.append('constructionId', selectedConstructionId);
      }

      await api.post('/document/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(percentCompleted);
        },
      });

      toast.success('Document uploaded successfully');
      setShowUploadModal(false);
      setSelectedFile(null);
      setDocType('project_documentation');
      setSelectedConstructionId('');

      // Refresh project to get updated documents
      const response = await api.get<Project>(`/project/${id}`);
      setProject(response.data);
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await api.delete(`/document/${docId}`);
      toast.success('Document deleted');

      // Refresh project to get updated documents
      const response = await api.get<Project>(`/project/${id}`);
      setProject(response.data);
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const handleReplaceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Check file type first
      if (!validateFileType(file)) {
        e.target.value = ''; // Reset the file input
        setReplaceFile(null);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error('File is too large. Maximum size is 50MB.');
        e.target.value = ''; // Reset the file input
        setReplaceFile(null);
        return;
      }
      setReplaceFile(file);
    }
  };

  const openReplaceModal = (doc: Document) => {
    setDocumentToReplace(doc);
    setReplaceFile(null);
    setShowReplaceModal(true);
  };

  const handleReplaceDocument = async () => {
    if (!replaceFile || !documentToReplace || !id) return;

    setReplacingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', replaceFile);

      await api.patch(`/document/${documentToReplace.id}/replace`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Document replaced successfully. Version incremented.');
      setShowReplaceModal(false);
      setReplaceFile(null);
      setDocumentToReplace(null);

      // Refresh project to get updated documents
      const response = await api.get<Project>(`/project/${id}`);
      setProject(response.data);
    } catch (error) {
      toast.error('Failed to replace document');
    } finally {
      setReplacingDoc(false);
    }
  };

  const handleAddPayment = async () => {
    const errors: Record<string, string> = {};

    if (!paymentForm.name.trim()) {
      errors.name = 'Payment name is required';
    }
    if (!paymentForm.amount) {
      errors.amount = 'Amount is required';
    } else if (parseFloat(paymentForm.amount) <= 0) {
      errors.amount = 'Amount must be a positive number';
    }
    if (!paymentForm.expectedDate) {
      errors.expectedDate = 'Expected date is required';
    }

    if (Object.keys(errors).length > 0) {
      setPaymentFormErrors(errors);
      toast.error('Please fix the form errors');
      return;
    }

    if (!id) return;

    setSavingPayment(true);
    setPaymentFormErrors({});
    try {
      await api.post('/payment-schedule/create', {
        projectId: id,
        type: paymentForm.type,
        name: paymentForm.name,
        amount: parseFloat(paymentForm.amount),
        percentage: paymentForm.percentage ? parseFloat(paymentForm.percentage) : undefined,
        expectedDate: paymentForm.expectedDate,
        description: paymentForm.description || undefined,
      });

      toast.success('Payment added successfully');
      setShowAddPaymentModal(false);
      setPaymentForm({
        type: 'Advance',
        name: '',
        amount: '',
        percentage: '',
        expectedDate: '',
        description: '',
      });

      // Refresh payments
      const response = await api.get<PaymentSchedule[]>(`/payment-schedule?projectId=${id}`);
      setPayments(response.data);
    } catch (error) {
      toast.error('Failed to add payment');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;

    try {
      await api.delete(`/payment-schedule/${paymentId}`);
      toast.success('Payment deleted');
      setPayments(payments.filter((p) => p.id !== paymentId));
    } catch (error) {
      toast.error('Failed to delete payment');
    }
  };

  const handleMarkPaid = async (paymentId: string) => {
    try {
      await api.patch(`/payment-schedule/${paymentId}/mark-paid`, {});
      toast.success('Payment marked as paid');
      // Refresh payments
      const response = await api.get<PaymentSchedule[]>(`/payment-schedule?projectId=${id}`);
      setPayments(response.data);
    } catch (error) {
      toast.error('Failed to mark payment as paid');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const isOverdue = (expectedDate: string, isPaid: boolean) => {
    if (isPaid) return false;
    return new Date(expectedDate) < new Date();
  };

  // Construction CRUD handlers
  const handleAddConstruction = async () => {
    if (!newConstructionName.trim() || !id) return;

    setSavingConstruction(true);
    try {
      await api.post('/construction/create', {
        name: newConstructionName,
        projectId: id,
      });
      toast.success('Construction created successfully');
      setShowAddConstructionModal(false);
      setNewConstructionName('');

      // Refresh project to get updated constructions
      const response = await api.get<Project>(`/project/${id}`);
      setProject(response.data);
    } catch (error) {
      toast.error('Failed to create construction');
    } finally {
      setSavingConstruction(false);
    }
  };

  const openEditConstructionModal = (construction: Construction) => {
    setEditingConstruction(construction);
    setEditConstructionName(construction.name);
    setShowEditConstructionModal(true);
  };

  const handleEditConstruction = async () => {
    if (!editConstructionName.trim() || !editingConstruction || !id) return;

    setSavingConstruction(true);
    try {
      await api.patch(`/construction/${editingConstruction.id}`, {
        name: editConstructionName,
      });
      toast.success('Construction updated successfully');
      setShowEditConstructionModal(false);
      setEditingConstruction(null);
      setEditConstructionName('');

      // Refresh project to get updated constructions
      const response = await api.get<Project>(`/project/${id}`);
      setProject(response.data);
    } catch (error) {
      toast.error('Failed to update construction');
    } finally {
      setSavingConstruction(false);
    }
  };

  const handleDeleteConstruction = async (constructionId: string) => {
    if (!confirm('Are you sure you want to delete this construction? This will also delete all associated documents.')) return;

    try {
      await api.delete(`/construction/${constructionId}`);
      toast.success('Construction deleted successfully');

      // Refresh project to get updated constructions
      const response = await api.get<Project>(`/project/${id}`);
      setProject(response.data);
    } catch (error) {
      toast.error('Failed to delete construction');
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="page-title mb-6">Project Not Found</h1>
        <p className="text-gray-500">The requested project could not be found.</p>
        <Link to="/projects" className="text-primary-600 hover:underline mt-4 inline-block">
          Back to Projects
        </Link>
      </div>
    );
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'constructions', label: `Constructions (${project.constructions?.length || 0})` },
    { id: 'documents', label: `Documents (${project.documents?.length || 0})` },
    { id: 'payments', label: `Payments (${payments.length})` },
    { id: 'workload', label: 'Workload' },
  ];

  return (
    <div className="p-4 md:p-6">
      {/* Breadcrumbs */}
      <nav className="flex mb-4" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link to="/" className="text-gray-500 hover:text-primary-600">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              Home
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <Link to="/projects" className="ml-1 text-gray-500 hover:text-primary-600 md:ml-2">
                Projects
              </Link>
            </div>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-1 text-gray-700 font-medium md:ml-2">{project.name}</span>
            </div>
          </li>
        </ol>
      </nav>

      <h1 className="page-title mb-6">{project.name}</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project Info */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Project Information</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    project.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Type</dt>
                <dd className="text-gray-900">{project.type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Contract Date</dt>
                <dd className="text-gray-900">{formatDate(project.contractDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Expiration Date</dt>
                <dd className="text-gray-900">{formatDate(project.expirationDate)}</dd>
              </div>
            </dl>
          </div>

          {/* Customer & Manager Info */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Customer & Manager</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-500">Customer</dt>
                <dd className="text-gray-900">{project.customer?.name || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Customer Type</dt>
                <dd className="text-gray-900">{project.customer?.type || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Manager</dt>
                <dd className="text-gray-900">{project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Manager Email</dt>
                <dd className="text-gray-900">{project.manager?.email || 'N/A'}</dd>
              </div>
            </dl>
          </div>

          {/* Main Project Reference (for additional projects) */}
          {project.mainProject && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4">Main Project</h2>
              <p className="text-gray-600 text-sm mb-3">This is an additional project linked to:</p>
              <Link
                to={`/projects/${project.mainProject.id}`}
                className="block p-4 bg-primary-50 rounded-lg border border-primary-200 hover:bg-primary-100 transition-colors"
              >
                <div className="font-medium text-primary-700">{project.mainProject.name}</div>
                <div className="text-sm text-primary-600 mt-1">Click to view main project →</div>
              </Link>
            </div>
          )}

          {/* Additional Projects Section (for main projects) */}
          {project.additionalProjects && project.additionalProjects.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4">Additional Projects</h2>
              <p className="text-gray-600 text-sm mb-3">Supplementary projects linked to this main project:</p>
              <div className="space-y-2">
                {project.additionalProjects.map((additionalProject) => (
                  <Link
                    key={additionalProject.id}
                    to={`/projects/${additionalProject.id}`}
                    className="block p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">{additionalProject.name}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        additionalProject.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {additionalProject.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'constructions' && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Constructions</h2>
            {canManageConstructions && (
              <button
                onClick={() => setShowAddConstructionModal(true)}
                className="btn-primary"
              >
                Add Construction
              </button>
            )}
          </div>
          {project.constructions && project.constructions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    {canManageConstructions && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {project.constructions.map((construction) => (
                    <tr key={construction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-gray-900">{construction.name}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          construction.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {construction.status}
                        </span>
                      </td>
                      {canManageConstructions && (
                        <td className="px-4 py-4 whitespace-nowrap space-x-2">
                          <button
                            onClick={() => openEditConstructionModal(construction)}
                            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteConstruction(construction.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No constructions associated with this project.</p>
              {canManageConstructions && (
                <button
                  onClick={() => setShowAddConstructionModal(true)}
                  className="btn-primary"
                >
                  Add First Construction
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Documents</h2>
            <div className="flex items-center gap-3">
              {project.documents && project.documents.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Filter by type:</label>
                  <select
                    value={documentTypeFilter}
                    onChange={(e) => setDocumentTypeFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    aria-label="Filter documents by type"
                  >
                    <option value="all">All Types</option>
                    <option value="contract">Contract</option>
                    <option value="tz">Technical Specification (TZ)</option>
                    <option value="project_documentation">Project Documentation</option>
                    <option value="working_documentation">Working Documentation</option>
                  </select>
                </div>
              )}
              {canUploadDocs && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="btn-primary"
                >
                  Upload Document
                </button>
              )}
            </div>
          </div>
          {project.documents && project.documents.length > 0 ? (
            <div className="overflow-x-auto">
              {(() => {
                const filteredDocs = documentTypeFilter === 'all'
                  ? project.documents
                  : project.documents.filter(doc => doc.type === documentTypeFilter);

                if (filteredDocs.length === 0) {
                  return (
                    <p className="text-gray-500 text-center py-4">
                      No documents match the selected filter.
                      <button
                        onClick={() => setDocumentTypeFilter('all')}
                        className="ml-2 text-primary-600 hover:text-primary-800"
                      >
                        Clear filter
                      </button>
                    </p>
                  );
                }

                return (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Upload Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-gray-900">{doc.originalName}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {doc.type}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          v{doc.version}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                        {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-600">{formatDate(doc.uploadedAt)}</td>
                      <td className="px-4 py-4 whitespace-nowrap space-x-2">
                        <a
                          href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/document/${doc.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-800 text-sm font-medium inline-flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </a>
                        {canUploadDocs && (
                          <>
                            <button
                              onClick={() => openReplaceModal(doc)}
                              className="text-amber-600 hover:text-amber-800 text-sm font-medium"
                            >
                              Replace
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                );
              })()}
            </div>
          ) : (
            <p className="text-gray-500">No documents associated with this project.</p>
          )}
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Upload Document</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                {selectedFile && (
                  <p className="text-sm text-gray-500 mt-1">Selected: {selectedFile.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="contract">Contract</option>
                  <option value="tz">Technical Specification (TZ)</option>
                  <option value="project_documentation">Project Documentation</option>
                  <option value="working_documentation">Working Documentation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Construction (Optional)</label>
                <select
                  value={selectedConstructionId}
                  onChange={(e) => setSelectedConstructionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">None (Project level)</option>
                  {project?.constructions?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">Optionally link this document to a specific construction</p>
              </div>
            </div>
            {uploadingDoc && (
              <div className="px-4 pb-2">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleUploadDocument}
                disabled={uploadingDoc || !selectedFile}
                className="btn-primary disabled:opacity-50"
              >
                {uploadingDoc ? `Uploading ${uploadProgress}%` : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replace Document Modal */}
      {showReplaceModal && documentToReplace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Replace Document</h2>
              <button onClick={() => setShowReplaceModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Replacing:</strong> {documentToReplace.originalName}
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Current version: <strong>v{documentToReplace.version}</strong> → New version: <strong>v{documentToReplace.version + 1}</strong>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New File *</label>
                <input
                  type="file"
                  onChange={handleReplaceFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                {replaceFile && (
                  <p className="text-sm text-gray-500 mt-1">Selected: {replaceFile.name}</p>
                )}
              </div>
              <p className="text-sm text-gray-500">
                The document type will remain as <strong>{documentToReplace.type}</strong>.
              </p>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowReplaceModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleReplaceDocument}
                disabled={replacingDoc || !replaceFile}
                className="btn-primary disabled:opacity-50"
              >
                {replacingDoc ? 'Replacing...' : 'Replace'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Payment Schedule</h2>
            {canManagePayments && (
              <button
                onClick={() => setShowAddPaymentModal(true)}
                className="btn-primary"
              >
                Add Payment
              </button>
            )}
          </div>

          {loadingPayments ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    {canManagePayments && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className={`hover:bg-gray-50 ${isOverdue(payment.expectedDate, payment.isPaid) ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-gray-900 font-medium">{payment.name}</div>
                          {payment.description && (
                            <div className="text-gray-500 text-sm">{payment.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          payment.type === 'Advance' ? 'bg-blue-100 text-blue-800' :
                          payment.type === 'MainPayment' ? 'bg-purple-100 text-purple-800' :
                          payment.type === 'FinalPayment' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payment.type}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-gray-900 font-medium">{formatCurrency(payment.amount)}</div>
                        {payment.percentage && (
                          <div className="text-gray-500 text-sm">{payment.percentage}%</div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className={`${isOverdue(payment.expectedDate, payment.isPaid) ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                          {formatDate(payment.expectedDate)}
                        </div>
                        {payment.actualDate && (
                          <div className="text-gray-500 text-sm">Paid: {formatDate(payment.actualDate)}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {payment.isPaid ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Paid
                          </span>
                        ) : isOverdue(payment.expectedDate, payment.isPaid) ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            Overdue
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                      </td>
                      {canManagePayments && (
                        <td className="px-4 py-4 whitespace-nowrap space-x-2">
                          {!payment.isPaid && (
                            <button
                              onClick={() => handleMarkPaid(payment.id)}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              Mark Paid
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePayment(payment.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Payment Summary */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-end gap-8">
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Total Amount</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Total Percentage</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {payments.reduce((sum, p) => sum + (p.percentage || 0), 0).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No payments scheduled for this project yet.</p>
          )}
        </div>
      )}

      {/* Workload Tab */}
      {activeTab === 'workload' && canViewWorkload && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Project Workload</h2>
            {projectWorkload && (
              <div className="text-right">
                <div className="text-sm text-gray-500">Total Project Hours</div>
                <div className="text-2xl font-bold text-primary-600">
                  {projectWorkload.totalProjectHours.toFixed(1)}h
                </div>
              </div>
            )}
          </div>

          {loadingWorkload ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : projectWorkload && projectWorkload.employeeWorkload.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reports Count</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {projectWorkload.employeeWorkload.map((employee) => (
                    <tr key={employee.user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-medium text-sm mr-3">
                            {employee.user.firstName[0]}{employee.user.lastName[0]}
                          </div>
                          <span className="text-gray-900 font-medium">
                            {employee.user.firstName} {employee.user.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-600">{employee.user.email}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                          {employee.totalHours.toFixed(1)}h
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                        {employee.reports.length} report{employee.reports.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          onClick={() => openEmployeeReportsModal(employee)}
                          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                        >
                          View Reports
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Workload Summary */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-end gap-8">
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Employees</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {projectWorkload.employeeCount}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Total Hours</div>
                    <div className="text-lg font-semibold text-primary-600">
                      {projectWorkload.totalProjectHours.toFixed(1)}h
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 mt-4">No workload reports have been submitted for this project yet.</p>
              <p className="text-gray-400 text-sm mt-1">Employees can log their hours on the Workload page.</p>
            </div>
          )}
        </div>
      )}

      {/* Employee Reports Modal */}
      {showEmployeeReportsModal && selectedEmployeeWorkload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                Reports by {selectedEmployeeWorkload.user.firstName} {selectedEmployeeWorkload.user.lastName}
              </h2>
              <button onClick={() => setShowEmployeeReportsModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {/* Summary Card */}
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-primary-600">Total hours on this project</div>
                    <div className="text-2xl font-bold text-primary-700">
                      {selectedEmployeeWorkload.totalHours.toFixed(1)} hours
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-primary-600">Report entries</div>
                    <div className="text-xl font-semibold text-primary-700">
                      {selectedEmployeeWorkload.reports.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reports List */}
              <div className="space-y-3">
                {selectedEmployeeWorkload.reports.map((report) => (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm text-gray-500">
                        {new Date(report.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                      <span className="px-2 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                        {report.hours.toFixed(1)}h
                      </span>
                    </div>
                    {report.description && (
                      <p className="text-gray-700">{report.description}</p>
                    )}
                    {report.userText && (
                      <p className="text-gray-500 text-sm mt-2 italic">
                        Day notes: {report.userText}
                      </p>
                    )}
                    <div className="text-xs text-gray-400 mt-2">
                      Total day hours: {report.totalDayHours.toFixed(1)}h
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowEmployeeReportsModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Add Payment</h2>
              <button onClick={() => setShowAddPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type *</label>
                <select
                  value={paymentForm.type}
                  onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="Advance">Advance</option>
                  <option value="MainPayment">Main Payment</option>
                  <option value="FinalPayment">Final Payment</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Name *</label>
                <input
                  type="text"
                  value={paymentForm.name}
                  onChange={(e) => setPaymentForm({ ...paymentForm, name: e.target.value })}
                  placeholder="e.g., First Milestone Payment"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($) *</label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => {
                      setPaymentForm({ ...paymentForm, amount: e.target.value });
                      if (paymentFormErrors.amount) {
                        setPaymentFormErrors({ ...paymentFormErrors, amount: '' });
                      }
                    }}
                    placeholder="10000"
                    min="0"
                    step="0.01"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${paymentFormErrors.amount ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {paymentFormErrors.amount && (
                    <p className="text-red-500 text-sm mt-1">{paymentFormErrors.amount}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Percentage (%)</label>
                  <input
                    type="number"
                    value={paymentForm.percentage}
                    onChange={(e) => setPaymentForm({ ...paymentForm, percentage: e.target.value })}
                    placeholder="25"
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Date *</label>
                <input
                  type="date"
                  value={paymentForm.expectedDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, expectedDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowAddPaymentModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleAddPayment}
                disabled={savingPayment || !paymentForm.name || !paymentForm.amount || !paymentForm.expectedDate}
                className="btn-primary disabled:opacity-50"
              >
                {savingPayment ? 'Saving...' : 'Add Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Construction Modal */}
      {showAddConstructionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Add Construction</h2>
              <button onClick={() => setShowAddConstructionModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Construction Name *</label>
                <input
                  type="text"
                  value={newConstructionName}
                  onChange={(e) => setNewConstructionName(e.target.value)}
                  placeholder="Enter construction name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                <p className="text-gray-900">{project.name}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowAddConstructionModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleAddConstruction}
                disabled={savingConstruction || !newConstructionName.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {savingConstruction ? 'Creating...' : 'Create Construction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Construction Modal */}
      {showEditConstructionModal && editingConstruction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Edit Construction</h2>
              <button onClick={() => setShowEditConstructionModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Construction Name *</label>
                <input
                  type="text"
                  value={editConstructionName}
                  onChange={(e) => setEditConstructionName(e.target.value)}
                  placeholder="Enter construction name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                <p className="text-gray-900">{project.name}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowEditConstructionModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleEditConstruction}
                disabled={savingConstruction || !editConstructionName.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {savingConstruction ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
