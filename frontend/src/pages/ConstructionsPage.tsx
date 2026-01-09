import { useEffect, useState } from 'react';
import { useAppSelector } from '@/store';
import { api } from '@/services/auth.service';
import toast from 'react-hot-toast';

interface Construction {
  id: string;
  name: string;
  projectId: string;
  project: {
    id: string;
    name: string;
  };
  _count: {
    documents: number;
  };
}

interface Project {
  id: string;
  name: string;
}

export default function ConstructionsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const canEdit = user?.role === 'Admin' || user?.role === 'Manager';
  const [constructions, setConstructions] = useState<Construction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConstruction, setSelectedConstruction] = useState<Construction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [newConstructionName, setNewConstructionName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchConstructions();
  }, []);

  const fetchConstructions = async () => {
    try {
      const response = await api.get<Construction[]>('/construction');
      setConstructions(response.data);
    } catch (error) {
      toast.error('Failed to load constructions');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (e: React.MouseEvent, construction: Construction) => {
    e.stopPropagation();
    setSelectedConstruction(construction);
    setEditName(construction.name);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedConstruction(null);
    setEditName('');
  };

  const handleSave = async () => {
    if (!selectedConstruction) return;

    setSaving(true);
    try {
      await api.patch(`/construction/${selectedConstruction.id}`, { name: editName });
      toast.success('Construction updated successfully');
      handleCloseEditModal();
      fetchConstructions();
    } catch (error) {
      toast.error('Failed to update construction');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this construction?')) return;

    try {
      await api.delete(`/construction/${id}`);
      toast.success('Construction deleted successfully');
      fetchConstructions();
    } catch (error) {
      toast.error('Failed to delete construction');
    }
  };

  const handleOpenAddModal = async () => {
    try {
      const response = await api.get<Project[]>('/project');
      setProjects(response.data);
      setNewConstructionName('');
      setSelectedProjectId('');
      setShowAddModal(true);
    } catch (error) {
      toast.error('Failed to load projects');
    }
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setNewConstructionName('');
    setSelectedProjectId('');
  };

  const handleCreateConstruction = async () => {
    if (!newConstructionName.trim()) {
      toast.error('Construction name is required');
      return;
    }
    if (!selectedProjectId) {
      toast.error('Please select a project');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/construction/create', {
        name: newConstructionName,
        projectId: selectedProjectId,
      });
      toast.success('Construction created successfully');
      fetchConstructions();
      handleCloseAddModal();
    } catch (error) {
      toast.error('Failed to create construction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Constructions</h1>
        {canEdit && <button className="btn-primary" onClick={handleOpenAddModal}>Add Construction</button>}
      </div>

      <div className="card">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : constructions.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No constructions found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents</th>
                  {canEdit && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {constructions.map((construction) => (
                  <tr key={construction.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{construction.name}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-600">{construction.project.name}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {construction._count.documents} docs
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-4 whitespace-nowrap space-x-2">
                        <button
                          onClick={(e) => handleEdit(e, construction)}
                          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, construction.id)}
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
        )}
      </div>

      {/* Edit Construction Modal */}
      {showEditModal && selectedConstruction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Edit Construction</h2>
              <button onClick={handleCloseEditModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Construction Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter construction name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                <p className="text-gray-900">{selectedConstruction.project.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Construction ID</label>
                <p className="text-gray-500 text-sm font-mono">{selectedConstruction.id}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={handleCloseEditModal}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editName.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Construction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Add New Construction</h2>
              <button onClick={handleCloseAddModal} className="text-gray-400 hover:text-gray-600">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={handleCloseAddModal} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleCreateConstruction}
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? 'Creating...' : 'Create Construction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
