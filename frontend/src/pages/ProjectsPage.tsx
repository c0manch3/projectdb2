import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { api } from '@/services/auth.service';
import toast from 'react-hot-toast';

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
  _count: {
    constructions: number;
    documents: number;
  };
}

interface Company {
  id: string;
  name: string;
  type: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface NewProjectForm {
  name: string;
  contractDate: string;
  expirationDate: string;
  status: string;
  customerId: string;
  managerId: string;
  type: string;
}

const ITEMS_PER_PAGE = 10;

export default function ProjectsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canEdit = user?.role === 'Admin' || user?.role === 'Manager';
  const isAdmin = user?.role === 'Admin';
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newProject, setNewProject] = useState<NewProjectForm>({
    name: '',
    contractDate: '',
    expirationDate: '',
    status: 'Active',
    customerId: '',
    managerId: '',
    type: 'main',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    status: 'Active',
    contractDate: '',
    expirationDate: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Get filter, page, and sort from URL params
  const statusFilter = searchParams.get('status') || 'All';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const [searchQuery, setSearchQuery] = useState('');

  // Track if we've done the initial restore to avoid overwriting sessionStorage
  const hasRestoredRef = useRef(false);
  const isInitialMountRef = useRef(true);

  // Restore filter state from sessionStorage on initial load if URL has no params
  useEffect(() => {
    const urlHasParams = searchParams.toString().length > 0;
    if (!urlHasParams && !hasRestoredRef.current) {
      const saved = sessionStorage.getItem('projectsFilterState');
      if (saved) {
        try {
          const filterState = JSON.parse(saved);
          const newParams = new URLSearchParams();
          if (filterState.status && filterState.status !== 'All') {
            newParams.set('status', filterState.status);
          }
          if (filterState.page && filterState.page !== '1') {
            newParams.set('page', filterState.page);
          }
          if (filterState.sortBy && filterState.sortBy !== 'createdAt') {
            newParams.set('sortBy', filterState.sortBy);
          }
          if (filterState.sortOrder && filterState.sortOrder !== 'desc') {
            newParams.set('sortOrder', filterState.sortOrder);
          }
          if (newParams.toString().length > 0) {
            setSearchParams(newParams, { replace: true });
          }
          if (filterState.searchQuery) {
            setSearchQuery(filterState.searchQuery);
          }
        } catch {
          // Ignore parsing errors
        }
      }
    }
    hasRestoredRef.current = true;
    // Mark initial mount as complete after a short delay
    setTimeout(() => {
      isInitialMountRef.current = false;
    }, 100);
  }, []); // Only run on initial mount

  // Save current filter state to sessionStorage for persistence when returning from detail pages
  // Skip saving on initial mount to avoid overwriting restored state
  useEffect(() => {
    if (isInitialMountRef.current) return;

    const filterState = {
      status: statusFilter,
      page: currentPage.toString(),
      sortBy,
      sortOrder,
      searchQuery,
    };
    sessionStorage.setItem('projectsFilterState', JSON.stringify(filterState));
  }, [statusFilter, currentPage, sortBy, sortOrder, searchQuery]);

  useEffect(() => {
    fetchProjects();
    fetchCompanies();
    fetchUsers();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await api.get<Company[]>('/company');
      setCompanies(response.data);
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get<User[]>('/auth');
      setUsers(response.data.filter((u: User) => u.role === 'Manager' || u.role === 'Admin'));
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get<Project[]>('/project');
      setProjects(response.data);
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort projects based on status, search query, and sort params
  const filteredProjects = useMemo(() => {
    let filtered = projects;

    // Filter by status
    if (statusFilter !== 'All') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(query) ||
        project.customer.name.toLowerCase().includes(query) ||
        `${project.manager.firstName} ${project.manager.lastName}`.toLowerCase().includes(query)
      );
    }

    // Sort projects
    filtered = [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'customer':
          aValue = a.customer.name.toLowerCase();
          bValue = b.customer.name.toLowerCase();
          break;
        case 'manager':
          aValue = `${a.manager.lastName} ${a.manager.firstName}`.toLowerCase();
          bValue = `${b.manager.lastName} ${b.manager.firstName}`.toLowerCase();
          break;
        case 'contractDate':
          aValue = new Date(a.contractDate).getTime();
          bValue = new Date(b.contractDate).getTime();
          break;
        case 'status':
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        default:
          aValue = new Date(a.contractDate).getTime();
          bValue = new Date(b.contractDate).getTime();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [projects, statusFilter, searchQuery, sortBy, sortOrder]);

  // Paginate filtered projects
  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProjects.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProjects, currentPage]);

  const handleFilterChange = (status: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (status === 'All') {
      newParams.delete('status');
    } else {
      newParams.set('status', status);
    }
    newParams.set('page', '1'); // Reset to page 1 when filter changes
    setSearchParams(newParams);
  };

  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page.toString());
    setSearchParams(newParams);
  };

  const handleSort = (column: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (sortBy === column) {
      // Toggle sort order if same column
      newParams.set('sortOrder', sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      newParams.set('sortBy', column);
      newParams.set('sortOrder', 'asc');
    }
    newParams.set('page', '1'); // Reset to page 1 when sort changes
    setSearchParams(newParams);
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortOrder === 'asc' ? (
      <svg className="w-4 h-4 text-primary-600 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-primary-600 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleEdit = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditingProject(project);
    setEditForm({
      name: project.name,
      status: project.status,
      contractDate: project.contractDate.split('T')[0],
      expirationDate: project.expirationDate.split('T')[0],
    });
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingProject(null);
  };

  const handleSaveEdit = async () => {
    if (!editingProject) return;

    setIsSubmitting(true);
    try {
      await api.patch(`/project/${editingProject.id}`, {
        name: editForm.name,
        status: editForm.status,
        contractDate: editForm.contractDate,
        expirationDate: editForm.expirationDate,
      });
      toast.success('Project updated successfully');
      fetchProjects();
      handleCloseModal();
    } catch (error) {
      toast.error('Failed to update project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setDeletingProject(project);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingProject(null);
  };

  const handleOpenAddModal = () => {
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setNewProject({
      name: '',
      contractDate: '',
      expirationDate: '',
      status: 'Active',
      customerId: '',
      managerId: '',
      type: 'main',
    });
    setFormErrors({});
  };

  const handleNewProjectChange = (field: keyof NewProjectForm, value: string) => {
    setNewProject(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!newProject.name.trim()) {
      errors.name = 'Project name is required';
    }
    if (!newProject.customerId) {
      errors.customerId = 'Please select a customer';
    }
    if (!newProject.managerId) {
      errors.managerId = 'Please select a manager';
    }
    if (!newProject.contractDate) {
      errors.contractDate = 'Contract date is required';
    }
    if (!newProject.expirationDate) {
      errors.expirationDate = 'Expiration date is required';
    }

    // Validate that expiration date is after contract date
    if (newProject.contractDate && newProject.expirationDate) {
      const contractDate = new Date(newProject.contractDate);
      const expirationDate = new Date(newProject.expirationDate);
      if (expirationDate <= contractDate) {
        errors.expirationDate = 'Expiration date must be after contract date';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateProject = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/project/create', {
        name: newProject.name,
        contractDate: newProject.contractDate,
        expirationDate: newProject.expirationDate,
        customerId: newProject.customerId,
        managerId: newProject.managerId,
        type: newProject.type,
      });
      toast.success('Project created successfully');
      fetchProjects();
      handleCloseAddModal();
    } catch (error) {
      toast.error('Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingProject || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.delete(`/project/${deletingProject.id}`);
      toast.success('Project deleted successfully');
      fetchProjects();
      handleCloseDeleteModal();
    } catch (error) {
      toast.error('Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Projects</h1>
        {canEdit && <button onClick={handleOpenAddModal} className="btn-primary">Add Project</button>}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            aria-label="Search projects"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <label className="text-sm font-medium text-gray-700">Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          aria-label="Filter by status"
        >
          <option value="All">All</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
        </select>
        {(statusFilter !== 'All' || searchQuery) && (
          <span className="text-sm text-gray-500">
            Showing {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : paginatedProjects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchQuery
                ? `No projects found matching "${searchQuery}"`
                : statusFilter !== 'All'
                  ? `No ${statusFilter.toLowerCase()} projects found`
                  : 'No projects found'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-primary-600 hover:text-primary-800 text-sm font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('name')}
                  >
                    <span className="flex items-center">Name{getSortIcon('name')}</span>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('customer')}
                  >
                    <span className="flex items-center">Customer{getSortIcon('customer')}</span>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('manager')}
                  >
                    <span className="flex items-center">Manager{getSortIcon('manager')}</span>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('contractDate')}
                  >
                    <span className="flex items-center">Contract Date{getSortIcon('contractDate')}</span>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('status')}
                  >
                    <span className="flex items-center">Status{getSortIcon('status')}</span>
                  </th>
                  {canEdit && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedProjects.map((project) => (
                  <tr
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{project.name}</div>
                      <div className="text-sm text-gray-500">{project._count.constructions} constructions</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-600">{project.customer.name}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                      {project.manager.firstName} {project.manager.lastName}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-600">{formatDate(project.contractDate)}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        project.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-4 whitespace-nowrap space-x-3">
                        <button
                          onClick={(e) => handleEdit(e, project)}
                          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        {isAdmin && (
                          <button
                            onClick={(e) => handleDelete(e, project)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 text-sm border rounded ${
                    page === currentPage
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Edit Project</h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contract Date</label>
                <input
                  type="date"
                  value={editForm.contractDate}
                  onChange={(e) => setEditForm({ ...editForm, contractDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                <input
                  type="date"
                  value={editForm.expirationDate}
                  onChange={(e) => setEditForm({ ...editForm, expirationDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button onClick={handleCloseModal} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-red-600">Delete Project</h2>
              <button onClick={handleCloseDeleteModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <p className="text-gray-700">
                Are you sure you want to delete the project <strong>{deletingProject.name}</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This action cannot be undone. All constructions and documents associated with this project will be permanently deleted.
              </p>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={handleCloseDeleteModal}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Add New Project</h2>
              <button onClick={handleCloseAddModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  placeholder="Enter project name"
                  value={newProject.name}
                  onChange={(e) => handleNewProjectChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${formErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                />
                {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                <select
                  value={newProject.customerId}
                  onChange={(e) => handleNewProjectChange('customerId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${formErrors.customerId ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select a customer</option>
                  {companies.filter(c => c.type === 'Customer').map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
                {formErrors.customerId && <p className="text-red-500 text-sm mt-1">{formErrors.customerId}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manager *</label>
                <select
                  value={newProject.managerId}
                  onChange={(e) => handleNewProjectChange('managerId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${formErrors.managerId ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select a manager</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
                  ))}
                </select>
                {formErrors.managerId && <p className="text-red-500 text-sm mt-1">{formErrors.managerId}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Type</label>
                <select
                  value={newProject.type}
                  onChange={(e) => handleNewProjectChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="main">Main Project</option>
                  <option value="additional">Additional (Supplementary)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contract Date *</label>
                <input
                  type="date"
                  value={newProject.contractDate}
                  onChange={(e) => handleNewProjectChange('contractDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${formErrors.contractDate ? 'border-red-500' : 'border-gray-300'}`}
                />
                {formErrors.contractDate && <p className="text-red-500 text-sm mt-1">{formErrors.contractDate}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date *</label>
                <input
                  type="date"
                  value={newProject.expirationDate}
                  onChange={(e) => handleNewProjectChange('expirationDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${formErrors.expirationDate ? 'border-red-500' : 'border-gray-300'}`}
                />
                {formErrors.expirationDate && <p className="text-red-500 text-sm mt-1">{formErrors.expirationDate}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button onClick={handleCloseAddModal} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
