import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/services/auth.service';
import toast from 'react-hot-toast';
import { useAppSelector } from '@/store';

interface Document {
  id: string;
  originalName: string;
  type: string;
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

type TabType = 'overview' | 'constructions' | 'documents' | 'team';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAppSelector((state) => state.auth);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Team management state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  const canManageTeam = user?.role === 'Admin' || user?.role === 'Manager';

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
              onClick={() => setActiveTab(tab.id)}
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
          <h2 className="text-lg font-semibold mb-4">Documents</h2>
          {project.documents && project.documents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
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
                      <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                        {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-600">{formatDate(doc.uploadedAt)}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
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
    </div>
  );
}
