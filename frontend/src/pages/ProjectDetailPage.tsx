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

interface Project {
  id: string;
  name: string;
  contractDate: string;
  expirationDate: string;
  type: string;
  status: string;
  customerId: string;
  managerId: string;
  customer: {
    id: string;
    name: string;
    type: string;
  };
  manager: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  constructions: Construction[];
  documents?: Document[];
}

type TabType = 'overview' | 'constructions' | 'documents' | 'team' | 'payments';

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
    const validTabs: TabType[] = ['overview', 'constructions', 'documents', 'team', 'payments'];
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('project_documentation');

  // Document replace state
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replacingDoc, setReplacingDoc] = useState(false);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [documentToReplace, setDocumentToReplace] = useState<Document | null>(null);

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
  const canManagePayments = user?.role === 'Admin' || user?.role === 'Manager';

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
    const validTabs: TabType[] = ['overview', 'constructions', 'documents', 'team', 'payments'];
    if (validTabs.includes(hash as TabType) && hash !== activeTab) {
      setActiveTab(hash as TabType);
    }
  }, [location.hash]);

  // Update URL hash when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    navigate(`#${tab}`, { replace: true });
  };

  // Fetch team members when team tab is active
  useEffect(() => {
    const fetchTeamData = async () => {
      if (activeTab === 'team' && id) {
        setLoadingTeam(true);
        try {
          const [teamResponse, availableResponse] = await Promise.all([
            api.get<TeamMember[]>(`/project/${id}/users`),
            canManageTeam ? api.get<AvailableUser[]>(`/project/${id}/available-users`) : Promise.resolve({ data: [] }),
          ]);
          setTeamMembers(teamResponse.data);
          setAvailableUsers(availableResponse.data);
        } catch (error) {
          toast.error('Failed to load team data');
        } finally {
          setLoadingTeam(false);
        }
      }
    };
    fetchTeamData();
  }, [activeTab, id, canManageTeam]);

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
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('projectId', id);
      formData.append('type', docType);

      await api.post('/document/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Document uploaded successfully');
      setShowUploadModal(false);
      setSelectedFile(null);
      setDocType('project_documentation');

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
    if (!id || !paymentForm.name || !paymentForm.amount || !paymentForm.expectedDate) return;

    setSavingPayment(true);
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
    { id: 'team', label: `Team (${teamMembers.length})` },
    { id: 'payments', label: `Payments (${payments.length})` },
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
                <dd className="text-gray-900">{project.customer.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Customer Type</dt>
                <dd className="text-gray-900">{project.customer.type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Manager</dt>
                <dd className="text-gray-900">{project.manager.firstName} {project.manager.lastName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Manager Email</dt>
                <dd className="text-gray-900">{project.manager.email}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'constructions' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Constructions</h2>
          {project.constructions && project.constructions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No constructions associated with this project.</p>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Documents</h2>
            {canUploadDocs && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn-primary"
              >
                Upload Document
              </button>
            )}
          </div>
          {project.documents && project.documents.length > 0 ? (
            <div className="overflow-x-auto">
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
                  {project.documents.map((doc) => (
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
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleUploadDocument}
                disabled={uploadingDoc || !selectedFile}
                className="btn-primary disabled:opacity-50"
              >
                {uploadingDoc ? 'Uploading...' : 'Upload'}
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

      {activeTab === 'team' && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Team Members</h2>
          </div>

          {/* Add Team Member Form */}
          {canManageTeam && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Add Team Member</h3>
              <div className="flex gap-3">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={addingUser || availableUsers.length === 0}
                >
                  <option value="">Select an employee to add...</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.role}) - {u.email}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddTeamMember}
                  disabled={!selectedUserId || addingUser}
                  className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingUser ? 'Adding...' : 'Add'}
                </button>
              </div>
              {availableUsers.length === 0 && !loadingTeam && (
                <p className="text-sm text-gray-500 mt-2">All employees have been assigned to this project.</p>
              )}
            </div>
          )}

          {/* Team Members List */}
          {loadingTeam ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : teamMembers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    {canManageTeam && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-medium text-sm mr-3">
                            {member.user.firstName[0]}{member.user.lastName[0]}
                          </div>
                          <span className="text-gray-900">{member.user.firstName} {member.user.lastName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-600">{member.user.email}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-600">{member.user.phone}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          member.user.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                          member.user.role === 'Manager' ? 'bg-blue-100 text-blue-800' :
                          member.user.role === 'Employee' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {member.user.role}
                        </span>
                      </td>
                      {canManageTeam && (
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleRemoveTeamMember(member.user.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No team members assigned to this project yet.</p>
          )}
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
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No payments scheduled for this project yet.</p>
          )}
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
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="10000"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
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
    </div>
  );
}
