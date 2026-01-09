import { useEffect, useState, useMemo } from 'react';
import { api } from '@/services/auth.service';
import { useAppSelector } from '@/store';
import toast from 'react-hot-toast';

interface Project {
  id: string;
  name: string;
  status: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface WorkloadPlanEntry {
  id: string;
  user: { id: string; firstName: string; lastName: string };
  project: { id: string; name: string };
}

interface CalendarData {
  [date: string]: WorkloadPlanEntry[];
}

export default function WorkloadPage() {
  const { user } = useAppSelector((state) => state.auth);
  const isManager = user?.role === 'Admin' || user?.role === 'Manager';
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<CalendarData>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Add workload modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [newPlanEmployee, setNewPlanEmployee] = useState<string>('');
  const [newPlanProject, setNewPlanProject] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchCalendarData();
  }, [currentMonth, selectedProject, selectedEmployee]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/project');
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      // Get all users and filter to employees and managers
      const response = await api.get('/auth');
      const allUsers = response.data;
      const employeesAndManagers = allUsers.filter((u: Employee) =>
        u.role === 'Employee' || u.role === 'Manager'
      );
      setEmployees(employeesAndManagers);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchCalendarData = async () => {
    try {
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      if (selectedProject) params.append('projectId', selectedProject);
      if (selectedEmployee) params.append('userId', selectedEmployee);

      const response = await api.get(`/workload-plan/calendar?${params}`);
      setCalendarData(response.data);
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleOpenAddModal = (date: string) => {
    setSelectedDate(date);
    setNewPlanEmployee('');
    setNewPlanProject('');
    setShowAddModal(true);
  };

  const handleCreateWorkloadPlan = async () => {
    if (!newPlanEmployee || !newPlanProject || !selectedDate) {
      toast.error('Please select employee and project');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/workload-plan/create', {
        userId: newPlanEmployee,
        projectId: newPlanProject,
        date: selectedDate,
      });
      toast.success('Workload plan created');
      setShowAddModal(false);
      fetchCalendarData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create workload plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWorkloadPlan = async (planId: string) => {
    try {
      await api.delete(`/workload-plan/${planId}`);
      toast.success('Workload plan deleted');
      fetchCalendarData();
    } catch (error) {
      toast.error('Failed to delete workload plan');
    }
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Add padding for days from previous month
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Add padding for days from next month
    const endPadding = 7 - (days.length % 7);
    if (endPadding < 7) {
      for (let i = 1; i <= endPadding; i++) {
        days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
      }
    }

    return days;
  }, [currentMonth]);

  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Workload</h1>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              aria-label="Select project"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              aria-label="Select employee"
            >
              <option value="">All Employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Workload Calendar */}
      <div className="card">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Previous month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Next month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const dateKey = formatDateKey(day.date);
              const dayPlans = calendarData[dateKey] || [];
              const dayIsToday = isToday(day.date);

              return (
                <div
                  key={index}
                  className={`min-h-24 p-2 border rounded-lg ${
                    day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                  } ${dayIsToday ? 'border-primary-500 border-2' : 'border-gray-200'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-sm font-medium ${
                        day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      } ${dayIsToday ? 'text-primary-600' : ''}`}
                    >
                      {day.date.getDate()}
                    </span>
                    {isManager && day.isCurrentMonth && (
                      <button
                        onClick={() => handleOpenAddModal(dateKey)}
                        className="text-primary-600 hover:text-primary-800 p-1"
                        aria-label={`Add workload for ${dateKey}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="text-xs bg-primary-100 text-primary-800 p-1 rounded truncate group relative"
                        title={`${plan.user.firstName} ${plan.user.lastName} - ${plan.project.name}`}
                      >
                        <span className="font-medium">{plan.user.firstName}</span>
                        <span className="text-primary-600"> - {plan.project.name}</span>
                        {isManager && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWorkloadPlan(plan.id);
                            }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:block text-red-600 hover:text-red-800"
                            aria-label="Delete"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Workload Plan Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Add Workload Plan</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="text"
                  value={selectedDate}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee *
                </label>
                <select
                  value={newPlanEmployee}
                  onChange={(e) => setNewPlanEmployee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select Employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project *
                </label>
                <select
                  value={newPlanProject}
                  onChange={(e) => setNewPlanProject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select Project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkloadPlan}
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
