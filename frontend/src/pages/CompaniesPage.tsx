import { useEffect, useState, useMemo } from 'react';
import { useAppSelector } from '@/store';
import { api } from '@/services/auth.service';
import toast from 'react-hot-toast';

interface Company {
  id: string;
  name: string;
  type: 'Customer' | 'Contractor';
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  postalCode?: string;
  createdAt: string;
}

interface NewCompanyForm {
  name: string;
  type: 'Customer' | 'Contractor';
  address: string;
  phone: string;
  email: string;
  contactPerson: string;
  postalCode: string;
}

export default function CompaniesPage() {
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === 'Admin';
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCompany, setNewCompany] = useState<NewCompanyForm>({
    name: '',
    type: 'Customer',
    address: '',
    phone: '',
    email: '',
    contactPerson: '',
    postalCode: '',
  });
  const [editCompany, setEditCompany] = useState<NewCompanyForm>({
    name: '',
    type: 'Customer',
    address: '',
    phone: '',
    email: '',
    contactPerson: '',
    postalCode: '',
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Filter companies based on search query
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const query = searchQuery.toLowerCase();
    return companies.filter(
      (company) =>
        company.name.toLowerCase().includes(query) ||
        company.email?.toLowerCase().includes(query) ||
        company.contactPerson?.toLowerCase().includes(query)
    );
  }, [companies, searchQuery]);

  const fetchCompanies = async () => {
    try {
      const response = await api.get<Company[]>('/company');
      setCompanies(response.data);
    } catch (error) {
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (company: Company) => {
    setSelectedCompany(company);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedCompany(null);
  };

  const handleOpenAddModal = () => {
    setNewCompany({
      name: '',
      type: 'Customer',
      address: '',
      phone: '',
      email: '',
      contactPerson: '',
      postalCode: '',
    });
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setNewCompany({
      name: '',
      type: 'Customer',
      address: '',
      phone: '',
      email: '',
      contactPerson: '',
      postalCode: '',
    });
  };

  const handleCreateCompany = async () => {
    if (!newCompany.name.trim()) {
      toast.error('Company name is required');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/company/create', {
        name: newCompany.name,
        type: newCompany.type,
        address: newCompany.address || undefined,
        phone: newCompany.phone || undefined,
        email: newCompany.email || undefined,
        // Note: contactPerson field is displayed in UI but not stored in database
      });
      toast.success('Company created successfully');
      fetchCompanies();
      handleCloseAddModal();
    } catch (error) {
      toast.error('Failed to create company');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = () => {
    if (selectedCompany) {
      setEditCompany({
        name: selectedCompany.name,
        type: selectedCompany.type,
        address: selectedCompany.address || '',
        phone: selectedCompany.phone || '',
        email: selectedCompany.email || '',
        contactPerson: selectedCompany.contactPerson || '',
        postalCode: selectedCompany.postalCode || '',
      });
      setShowDetailModal(false);
      setShowEditModal(true);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditCompany({
      name: '',
      type: 'Customer',
      address: '',
      phone: '',
      email: '',
      contactPerson: '',
      postalCode: '',
    });
  };

  const handleUpdateCompany = async () => {
    if (!selectedCompany) return;
    if (!editCompany.name.trim()) {
      toast.error('Company name is required');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.patch(`/company/${selectedCompany.id}`, {
        name: editCompany.name,
        type: editCompany.type,
        address: editCompany.address || undefined,
        phone: editCompany.phone || undefined,
        email: editCompany.email || undefined,
        postalCode: editCompany.postalCode || undefined,
      });
      toast.success('Company updated successfully');
      fetchCompanies();
      handleCloseEditModal();
      setSelectedCompany(null);
    } catch (error) {
      toast.error('Failed to update company');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteModal = () => {
    setShowDetailModal(false);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompany) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/company/${selectedCompany.id}`);
      toast.success('Company deleted successfully');
      fetchCompanies();
      handleCloseDeleteModal();
      setSelectedCompany(null);
    } catch (error) {
      toast.error('Failed to delete company');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Companies</h1>
        {isAdmin && <button className="btn-primary" onClick={handleOpenAddModal}>Add Company</button>}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search companies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div className="card">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <p className="text-gray-500 text-center py-12">
            {searchQuery ? 'No companies match your search' : 'No companies found'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Person</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCompanies.map((company) => (
                  <tr
                    key={company.id}
                    onClick={() => handleRowClick(company)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-4 whitespace-nowrap font-medium text-gray-900">{company.name}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        company.type === 'Customer' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {company.type}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-600">{company.contactPerson || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-600">{company.email || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-600">{company.phone || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Company Detail Modal */}
      {showDetailModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Company Details</h2>
              <button onClick={handleCloseDetailModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedCompany.name}</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  selectedCompany.type === 'Customer' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {selectedCompany.type}
                </span>
              </div>
              <dl className="space-y-3">
                {selectedCompany.contactPerson && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Contact Person</dt>
                    <dd className="text-gray-900">{selectedCompany.contactPerson}</dd>
                  </div>
                )}
                {selectedCompany.email && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Email</dt>
                    <dd className="text-gray-900">{selectedCompany.email}</dd>
                  </div>
                )}
                {selectedCompany.phone && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Phone</dt>
                    <dd className="text-gray-900">{selectedCompany.phone}</dd>
                  </div>
                )}
                {selectedCompany.address && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Address</dt>
                    <dd className="text-gray-900">{selectedCompany.address}</dd>
                  </div>
                )}
                {selectedCompany.postalCode && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Postal Code</dt>
                    <dd className="text-gray-900">{selectedCompany.postalCode}</dd>
                  </div>
                )}
              </dl>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              {isAdmin && (
                <>
                  <button onClick={handleOpenDeleteModal} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg">
                    Delete
                  </button>
                  <button onClick={handleOpenEditModal} className="btn-primary">
                    Edit
                  </button>
                </>
              )}
              <button onClick={handleCloseDetailModal} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Add New Company</h2>
              <button onClick={handleCloseAddModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  placeholder="Enter company name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  value={newCompany.type}
                  onChange={(e) => setNewCompany({ ...newCompany, type: e.target.value as 'Customer' | 'Contractor' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="Customer">Customer</option>
                  <option value="Contractor">Contractor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={newCompany.contactPerson}
                  onChange={(e) => setNewCompany({ ...newCompany, contactPerson: e.target.value })}
                  placeholder="Enter contact person name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newCompany.email}
                  onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                  placeholder="Enter email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={newCompany.phone}
                  onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={newCompany.address}
                  onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                  placeholder="Enter address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={handleCloseAddModal} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleCreateCompany}
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? 'Creating...' : 'Create Company'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {showEditModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Edit Company</h2>
              <button onClick={handleCloseEditModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={editCompany.name}
                  onChange={(e) => setEditCompany({ ...editCompany, name: e.target.value })}
                  placeholder="Enter company name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  value={editCompany.type}
                  onChange={(e) => setEditCompany({ ...editCompany, type: e.target.value as 'Customer' | 'Contractor' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="Customer">Customer</option>
                  <option value="Contractor">Contractor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editCompany.email}
                  onChange={(e) => setEditCompany({ ...editCompany, email: e.target.value })}
                  placeholder="Enter email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={editCompany.phone}
                  onChange={(e) => setEditCompany({ ...editCompany, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={editCompany.address}
                  onChange={(e) => setEditCompany({ ...editCompany, address: e.target.value })}
                  placeholder="Enter address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={editCompany.postalCode}
                  onChange={(e) => setEditCompany({ ...editCompany, postalCode: e.target.value })}
                  placeholder="Enter postal code"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={handleCloseEditModal} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleUpdateCompany}
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-red-600">Delete Company</h2>
              <button onClick={handleCloseDeleteModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <p className="text-gray-700">
                Are you sure you want to delete the company <strong>{selectedCompany.name}</strong>?
              </p>
              <p className="text-gray-500 text-sm mt-2">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={handleCloseDeleteModal} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleDeleteCompany}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Company'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
