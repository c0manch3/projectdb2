import { useEffect, useState } from 'react';
import { useAppSelector } from '@/store';
import { api } from '@/services/auth.service';
import toast from 'react-hot-toast';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ChatLog {
  id: string;
  userId: string;
  role: 'User' | 'Assistant';
  content: string;
  requestType: 'Report' | 'Proposal';
  createdAt: string;
  user: User;
}

export default function ChatLogsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<ChatLog | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [filterRequestType, setFilterRequestType] = useState<string>('');

  useEffect(() => {
    fetchLogs();
    fetchUsers();
  }, [filterUserId, filterRequestType]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let url = '/lenconnect-chat-logs';

      if (filterUserId && filterRequestType) {
        url = `/lenconnect-chat-logs/user/${filterUserId}/${filterRequestType}`;
      } else if (filterUserId) {
        url = `/lenconnect-chat-logs/user/${filterUserId}`;
      }

      const response = await api.get(url);
      let filteredLogs = response.data;

      // Apply request type filter client-side if only request type is selected (no user filter)
      if (filterRequestType && !filterUserId) {
        filteredLogs = filteredLogs.filter((log: ChatLog) => log.requestType === filterRequestType);
      }

      setLogs(filteredLogs);
    } catch (error) {
      console.error('Failed to fetch chat logs:', error);
      toast.error('Failed to load chat logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/auth');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getRoleBadgeColor = (role: string) => {
    return role === 'User'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-green-100 text-green-800';
  };

  const getRequestTypeBadgeColor = (type: string) => {
    return type === 'Report'
      ? 'bg-purple-100 text-purple-800'
      : 'bg-orange-100 text-orange-800';
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="p-4 md:p-6">
        <div className="card p-6 text-center">
          <p className="text-red-600">Access denied. Admin role required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Chat Logs</h1>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by User
            </label>
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Request Type
            </label>
            <select
              value={filterRequestType}
              onChange={(e) => setFilterRequestType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Types</option>
              <option value="Report">Report</option>
              <option value="Proposal">Proposal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="card">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No chat logs found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Content Preview
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {log.user.firstName} {log.user.lastName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(log.role)}`}>
                        {log.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRequestTypeBadgeColor(log.requestType)}`}>
                        {log.requestType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                      {log.content.substring(0, 100)}...
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-primary-600 hover:text-primary-800 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Chat Log Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="text-gray-900">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">User</label>
                  <p className="text-gray-900">
                    {selectedLog.user.firstName} {selectedLog.user.lastName} ({selectedLog.user.email})
                  </p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Role</label>
                    <p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(selectedLog.role)}`}>
                        {selectedLog.role}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Request Type</label>
                    <p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRequestTypeBadgeColor(selectedLog.requestType)}`}>
                        {selectedLog.requestType}
                      </span>
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Content</label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-gray-900">
                    {selectedLog.content}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
