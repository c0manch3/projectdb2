import { useEffect, useState } from 'react';
import { useAppSelector } from '@/store';
import { api } from '@/services/auth.service';

interface ProjectWorkloadData {
  id: string;
  name: string;
  status: string;
  customerName: string;
  managerName: string;
  totalPlannedDays: number;
  totalActualHours: number;
  employeeCount: number;
  progress: number;
}

interface EmployeeWorkHoursData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  totalHoursWorked: number;
  expectedHours: number;
  deviation: number;
  deviationPercentage: number;
}

interface ProjectsWorkloadResponse {
  projects: ProjectWorkloadData[];
  summary: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalHoursWorked: number;
  };
}

interface EmployeeWorkHoursResponse {
  employees: EmployeeWorkHoursData[];
  period: {
    startDate: string;
    endDate: string;
    workingDays: number;
    expectedHoursPerEmployee: number;
  };
  summary: {
    totalEmployees: number;
    averageHoursWorked: number;
    employeesUnderworking: number;
    employeesOverworking: number;
  };
}

export default function AnalyticsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [projectsData, setProjectsData] = useState<ProjectsWorkloadResponse | null>(null);
  const [employeesData, setEmployeesData] = useState<EmployeeWorkHoursResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'employees'>('projects');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projectsRes, employeesRes] = await Promise.all([
          api.get<ProjectsWorkloadResponse>('/analytics/projects-workload'),
          api.get<EmployeeWorkHoursResponse>('/analytics/employee-work-hours'),
        ]);
        setProjectsData(projectsRes.data);
        setEmployeesData(employeesRes.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-title">Analytics</h1>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-500">Loading analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-title">Analytics</h1>
        </div>
        <div className="card p-6">
          <div className="text-center py-12 text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Analytics</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-sm text-gray-500 mb-1">Total Projects</div>
          <div className="text-2xl font-bold text-gray-900">
            {projectsData?.summary.totalProjects || 0}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500 mb-1">Active Projects</div>
          <div className="text-2xl font-bold text-green-600">
            {projectsData?.summary.activeProjects || 0}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500 mb-1">Total Employees</div>
          <div className="text-2xl font-bold text-blue-600">
            {employeesData?.summary.totalEmployees || 0}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500 mb-1">Total Hours Worked</div>
          <div className="text-2xl font-bold text-purple-600">
            {projectsData?.summary.totalHoursWorked || 0}h
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'projects'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('projects')}
        >
          Projects Workload
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'employees'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('employees')}
        >
          Employee Hours
        </button>
      </div>

      {/* Projects Workload Tab */}
      {activeTab === 'projects' && (
        <div className="card">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Projects Workload Overview</h2>
          </div>
          {projectsData && projectsData.projects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Project
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Manager
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Team
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Hours
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Progress
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {projectsData.projects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{project.name}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{project.customerName}</td>
                      <td className="px-4 py-3 text-gray-600">{project.managerName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            project.status === 'Active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {project.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{project.employeeCount} members</td>
                      <td className="px-4 py-3 text-gray-600">{project.totalActualHours}h</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${Math.min(project.progress, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{project.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">No project data available</div>
          )}
        </div>
      )}

      {/* Employee Hours Tab */}
      {activeTab === 'employees' && (
        <div className="card">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Employee Work Hours</h2>
            {employeesData && (
              <p className="text-sm text-gray-500 mt-1">
                Period: {new Date(employeesData.period.startDate).toLocaleDateString()} -{' '}
                {new Date(employeesData.period.endDate).toLocaleDateString()} ({employeesData.period.workingDays} working days)
              </p>
            )}
          </div>

          {/* Employee Summary */}
          {employeesData && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border-b border-gray-200">
              <div className="text-center">
                <div className="text-sm text-gray-500">Avg Hours Worked</div>
                <div className="text-lg font-semibold text-gray-900">
                  {employeesData.summary.averageHoursWorked}h
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Underworking</div>
                <div className="text-lg font-semibold text-red-600">
                  {employeesData.summary.employeesUnderworking}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Overworking</div>
                <div className="text-lg font-semibold text-orange-600">
                  {employeesData.summary.employeesOverworking}
                </div>
              </div>
            </div>
          )}

          {employeesData && employeesData.employees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Hours Worked
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Expected
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Deviation
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employeesData.employees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{employee.email}</td>
                      <td className="px-4 py-3 text-gray-600">{employee.totalHoursWorked}h</td>
                      <td className="px-4 py-3 text-gray-600">{employee.expectedHours}h</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            employee.deviation < -8
                              ? 'bg-red-100 text-red-800'
                              : employee.deviation > 8
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {employee.deviation > 0 ? '+' : ''}
                          {employee.deviation}h ({employee.deviationPercentage}%)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">No employee data available</div>
          )}
        </div>
      )}
    </div>
  );
}
