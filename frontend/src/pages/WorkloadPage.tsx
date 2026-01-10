import { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '@/services/auth.service';
import { useAppSelector } from '@/store';
import toast from 'react-hot-toast';

// Custom hook for responsive breakpoints
function useResponsiveView() {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('month');

  useEffect(() => {
    const updateView = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setViewMode('day');
      } else if (width < 1024) {
        setViewMode('week');
      } else {
        setViewMode('month');
      }
    };

    updateView();
    window.addEventListener('resize', updateView);
    return () => window.removeEventListener('resize', updateView);
  }, []);

  return viewMode;
}

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

interface WorkloadActualEntry {
  id: string;
  date: string;
  hoursWorked: number;
  userText?: string;
  distributions?: {
    id: string;
    projectId: string;
    project: { id: string; name: string };
    hours: number;
    description?: string;
  }[];
}

interface CalendarData {
  [date: string]: WorkloadPlanEntry[];
}

interface ActualCalendarData {
  [date: string]: WorkloadActualEntry;
}

export default function WorkloadPage() {
  const { user } = useAppSelector((state) => state.auth);
  const isManager = user?.role === 'Admin' || user?.role === 'Manager';
  const isEmployee = user?.role === 'Employee';
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<CalendarData>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Responsive view mode with manual override
  const responsiveViewMode = useResponsiveView();
  const [manualViewMode, setManualViewMode] = useState<'day' | 'week' | 'month' | null>(null);
  const viewMode = manualViewMode || responsiveViewMode;
  const [currentDay, setCurrentDay] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    return weekStart;
  });

  // Tab state: 'plan' for managers, 'actual' for employees logging hours
  const [activeTab, setActiveTab] = useState<'plan' | 'actual'>(isEmployee ? 'actual' : 'plan');

  // Actual workload data
  const [actualCalendarData, setActualCalendarData] = useState<ActualCalendarData>({});

  // Add workload modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [newPlanEmployee, setNewPlanEmployee] = useState<string>('');
  const [newPlanProject, setNewPlanProject] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit workload modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WorkloadPlanEntry | null>(null);
  const [editingPlanDate, setEditingPlanDate] = useState<string>('');
  const [editPlanProject, setEditPlanProject] = useState<string>('');

  // Add actual hours modal state
  const [showAddActualModal, setShowAddActualModal] = useState(false);
  const [actualDate, setActualDate] = useState<string>('');
  const [actualHours, setActualHours] = useState<string>('8');
  const [actualNotes, setActualNotes] = useState<string>('');
  const [actualDistributions, setActualDistributions] = useState<{ projectId: string; hours: string; description: string }[]>([]);

  useEffect(() => {
    fetchProjects();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (activeTab === 'plan') {
      fetchCalendarData();
    } else {
      fetchActualCalendarData();
    }
  }, [currentMonth, selectedProject, selectedEmployee, activeTab]);

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

  const fetchActualCalendarData = async () => {
    try {
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await api.get(`/workload-actual/my?${params}`);
      // Convert array to date-keyed object
      const calendarObj: ActualCalendarData = {};
      response.data.forEach((entry: WorkloadActualEntry) => {
        const dateKey = new Date(entry.date).toISOString().split('T')[0];
        calendarObj[dateKey] = entry;
      });
      setActualCalendarData(calendarObj);
    } catch (error) {
      console.error('Failed to fetch actual calendar data:', error);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Day view navigation
  const handlePrevDay = () => {
    const newDay = new Date(currentDay);
    newDay.setDate(newDay.getDate() - 1);
    setCurrentDay(newDay);
  };

  const handleNextDay = () => {
    const newDay = new Date(currentDay);
    newDay.setDate(newDay.getDate() + 1);
    setCurrentDay(newDay);
  };

  // Week view navigation
  const handlePrevWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  const handleNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };

  // Go to today's date
  const goToToday = () => {
    const today = new Date();
    setCurrentDay(today);
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    setCurrentWeekStart(weekStart);
  };

  // Go to this week and switch to week view
  const goToThisWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    setCurrentWeekStart(weekStart);
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setCurrentDay(today);
    setManualViewMode('week');
  };

  // View mode setters
  const setViewDay = () => setManualViewMode('day');
  const setViewWeek = () => setManualViewMode('week');
  const setViewMonth = () => setManualViewMode('month');

  // Touch swipe handling for mobile navigation
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // Swipe left = go to next
      if (viewMode === 'day') handleNextDay();
      else if (viewMode === 'week') handleNextWeek();
      else handleNextMonth();
    } else if (isRightSwipe) {
      // Swipe right = go to previous
      if (viewMode === 'day') handlePrevDay();
      else if (viewMode === 'week') handlePrevWeek();
      else handlePrevMonth();
    }
  };

  // Get week days for week view
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(currentWeekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentWeekStart]);

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

  const handleOpenEditModal = (plan: WorkloadPlanEntry, dateKey: string) => {
    setEditingPlan(plan);
    setEditingPlanDate(dateKey);
    setEditPlanProject(plan.project.id);
    setShowEditModal(true);
  };

  const handleUpdateWorkloadPlan = async () => {
    if (!editingPlan || !editPlanProject) {
      toast.error('Please select a project');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.patch(`/workload-plan/${editingPlan.id}`, {
        projectId: editPlanProject,
      });
      toast.success('Workload plan updated');
      setShowEditModal(false);
      setEditingPlan(null);
      fetchCalendarData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update workload plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Actual hours handlers
  const handleOpenAddActualModal = (date: string) => {
    setActualDate(date);
    setActualHours('8');
    setActualNotes('');
    setActualDistributions([{ projectId: '', hours: '8', description: '' }]);
    setShowAddActualModal(true);
  };

  const handleAddDistribution = () => {
    setActualDistributions([...actualDistributions, { projectId: '', hours: '', description: '' }]);
  };

  const handleRemoveDistribution = (index: number) => {
    setActualDistributions(actualDistributions.filter((_, i) => i !== index));
  };

  const handleDistributionChange = (index: number, field: 'projectId' | 'hours' | 'description', value: string) => {
    const updated = [...actualDistributions];
    updated[index][field] = value;
    setActualDistributions(updated);
  };

  const handleCreateActualHours = async () => {
    if (!actualDate || !actualHours) {
      toast.error('Please enter hours worked');
      return;
    }

    const totalDistHours = actualDistributions.reduce((sum, d) => sum + (parseFloat(d.hours) || 0), 0);
    const totalHours = parseFloat(actualHours);

    if (totalHours <= 0) {
      toast.error('Hours must be a positive number');
      return;
    }

    if (totalHours > 24) {
      toast.error('Hours cannot exceed 24 per day');
      return;
    }

    if (totalDistHours > totalHours) {
      toast.error('Distribution hours exceed total hours worked');
      return;
    }

    setIsSubmitting(true);
    try {
      const distributions = actualDistributions
        .filter(d => d.projectId && d.hours)
        .map(d => ({
          projectId: d.projectId,
          hours: parseFloat(d.hours),
          description: d.description || undefined,
        }));

      await api.post('/workload-actual/create', {
        date: actualDate,
        hoursWorked: totalHours,
        userText: actualNotes || undefined,
        distributions: distributions.length > 0 ? distributions : undefined,
      });

      toast.success('Hours logged successfully');
      setShowAddActualModal(false);
      fetchActualCalendarData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to log hours');
    } finally {
      setIsSubmitting(false);
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

  // Export workload data to CSV
  const handleExportWorkload = () => {
    // Get all workload entries from calendarData
    const rows: string[] = ['Date,Employee,Project'];

    Object.entries(calendarData).forEach(([dateKey, entries]) => {
      entries.forEach((entry) => {
        const date = new Date(dateKey).toLocaleDateString();
        const employee = `${entry.user.firstName} ${entry.user.lastName}`;
        const project = entry.project.name;
        // Escape values that might contain commas
        rows.push(`"${date}","${employee}","${project}"`);
      });
    });

    // Create and download CSV
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `workload-${currentMonth.toISOString().slice(0, 7)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Workload data exported successfully');
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
        {isManager && activeTab === 'plan' && (
          <button
            onClick={handleExportWorkload}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </button>
        )}
      </div>

      {/* Tabs for Plan vs Actual */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('plan')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === 'plan'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Plan
        </button>
        <button
          onClick={() => setActiveTab('actual')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === 'actual'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          My Hours
        </button>
      </div>

      {/* Filters - only show for Plan tab */}
      {activeTab === 'plan' && (
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
      )}

      {/* Workload Calendar */}
      {activeTab === 'plan' && (
      <div
        className="card"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Calendar Header - adapts to view mode */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <button
              onClick={viewMode === 'day' ? handlePrevDay : viewMode === 'week' ? handlePrevWeek : handlePrevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg touch-target"
              aria-label={viewMode === 'day' ? 'Previous day' : viewMode === 'week' ? 'Previous week' : 'Previous month'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg touch-target"
              aria-label="Go to today"
            >
              Today
            </button>
            <button
              onClick={goToThisWeek}
              className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg touch-target"
              aria-label="Go to this week"
            >
              Week
            </button>
          </div>
          {/* View mode toggle */}
          <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={setViewDay}
              className={`px-2 py-1 text-xs font-medium rounded ${viewMode === 'day' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
              aria-label="Day view"
            >
              Day
            </button>
            <button
              onClick={setViewWeek}
              className={`px-2 py-1 text-xs font-medium rounded ${viewMode === 'week' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
              aria-label="Week view"
            >
              Week
            </button>
            <button
              onClick={setViewMonth}
              className={`px-2 py-1 text-xs font-medium rounded ${viewMode === 'month' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
              aria-label="Month view"
            >
              Month
            </button>
          </div>
          <h2 className="text-lg font-semibold text-center">
            {viewMode === 'day' ? (
              currentDay.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
            ) : viewMode === 'week' ? (
              `${weekDays[0].toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${weekDays[6].toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`
            ) : (
              currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })
            )}
          </h2>
          <button
            onClick={viewMode === 'day' ? handleNextDay : viewMode === 'week' ? handleNextWeek : handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg touch-target"
            aria-label={viewMode === 'day' ? 'Next day' : viewMode === 'week' ? 'Next week' : 'Next month'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* View mode indicator for mobile */}
        {viewMode === 'day' && (
          <div className="text-center text-xs text-gray-500 py-1 bg-gray-50 border-b">
            Swipe or tap arrows to navigate days
          </div>
        )}
        {viewMode === 'week' && (
          <div className="text-center text-xs text-gray-500 py-1 bg-gray-50 border-b">
            Week view
          </div>
        )}

        {/* Calendar Grid */}
        <div className="p-4">
          {/* Day View - Mobile */}
          {viewMode === 'day' && (
            <div className="min-h-64">
              {(() => {
                const dateKey = formatDateKey(currentDay);
                const dayPlans = calendarData[dateKey] || [];
                const dayIsToday = isToday(currentDay);

                return (
                  <div className={`p-4 border rounded-lg ${dayIsToday ? 'border-primary-500 border-2' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-xl font-semibold ${dayIsToday ? 'text-primary-600' : 'text-gray-900'}`}>
                        {currentDay.getDate()}
                      </span>
                      {isManager && (
                        <button
                          onClick={() => handleOpenAddModal(dateKey)}
                          className="btn-primary text-sm"
                          aria-label={`Add workload for ${dateKey}`}
                        >
                          + Add Plan
                        </button>
                      )}
                    </div>
                    {dayPlans.length === 0 ? (
                      <div className="text-gray-500 text-center py-8">No workload plans for this day</div>
                    ) : (
                      <div className="space-y-3">
                        {dayPlans.map((plan) => (
                          <div
                            key={plan.id}
                            className={`bg-primary-100 text-primary-800 p-4 rounded-lg group relative ${isManager ? 'cursor-pointer hover:bg-primary-200' : ''}`}
                            title={isManager ? 'Click to edit' : undefined}
                            onClick={() => isManager && handleOpenEditModal(plan, dateKey)}
                          >
                            <div className="font-medium text-lg">{plan.user.firstName} {plan.user.lastName}</div>
                            <div className="text-primary-600">{plan.project.name}</div>
                            {isManager && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteWorkloadPlan(plan.id);
                                }}
                                className="absolute right-2 top-2 text-red-600 hover:text-red-800 p-2"
                                aria-label="Delete"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Week View - Tablet */}
          {viewMode === 'week' && (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day, index) => {
                  const dateKey = formatDateKey(day);
                  const dayPlans = calendarData[dateKey] || [];
                  const dayIsToday = isToday(day);

                  return (
                    <div
                      key={index}
                      className={`min-h-32 p-2 border rounded-lg bg-white ${dayIsToday ? 'border-primary-500 border-2' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${dayIsToday ? 'text-primary-600' : 'text-gray-900'}`}>
                          {day.getDate()}
                        </span>
                        {isManager && (
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
                            className={`text-xs bg-primary-100 text-primary-800 p-1 rounded truncate group relative ${isManager ? 'cursor-pointer hover:bg-primary-200' : ''}`}
                            title={`${plan.user.firstName} ${plan.user.lastName} - ${plan.project.name}${isManager ? ' (Click to edit)' : ''}`}
                            onClick={() => isManager && handleOpenEditModal(plan, dateKey)}
                          >
                            <span className="font-medium">{plan.user.firstName}</span>
                            <span className="text-primary-600"> - {plan.project.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Month View - Desktop */}
          {viewMode === 'month' && (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
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
                            className={`text-xs bg-primary-100 text-primary-800 p-1 rounded truncate group relative ${isManager ? 'cursor-pointer hover:bg-primary-200' : ''}`}
                            title={`${plan.user.firstName} ${plan.user.lastName} - ${plan.project.name}${isManager ? ' (Click to edit)' : ''}`}
                            onClick={() => isManager && handleOpenEditModal(plan, dateKey)}
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
            </>
          )}
        </div>
      </div>
      )}

      {/* Actual Hours Calendar */}
      {activeTab === 'actual' && (
      <div
        className="card"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Calendar Header - adapts to view mode */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <button
              onClick={viewMode === 'day' ? handlePrevDay : viewMode === 'week' ? handlePrevWeek : handlePrevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg touch-target"
              aria-label={viewMode === 'day' ? 'Previous day' : viewMode === 'week' ? 'Previous week' : 'Previous month'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg touch-target"
              aria-label="Go to today"
            >
              Today
            </button>
            <button
              onClick={goToThisWeek}
              className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg touch-target"
              aria-label="Go to this week"
            >
              Week
            </button>
          </div>
          {/* View mode toggle */}
          <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={setViewDay}
              className={`px-2 py-1 text-xs font-medium rounded ${viewMode === 'day' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
              aria-label="Day view"
            >
              Day
            </button>
            <button
              onClick={setViewWeek}
              className={`px-2 py-1 text-xs font-medium rounded ${viewMode === 'week' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
              aria-label="Week view"
            >
              Week
            </button>
            <button
              onClick={setViewMonth}
              className={`px-2 py-1 text-xs font-medium rounded ${viewMode === 'month' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
              aria-label="Month view"
            >
              Month
            </button>
          </div>
          <h2 className="text-lg font-semibold text-center">
            {viewMode === 'day' ? (
              currentDay.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
            ) : viewMode === 'week' ? (
              `${weekDays[0].toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${weekDays[6].toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`
            ) : (
              currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })
            )}
          </h2>
          <button
            onClick={viewMode === 'day' ? handleNextDay : viewMode === 'week' ? handleNextWeek : handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg touch-target"
            aria-label={viewMode === 'day' ? 'Next day' : viewMode === 'week' ? 'Next week' : 'Next month'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* View mode indicator */}
        {viewMode === 'day' && (
          <div className="text-center text-xs text-gray-500 py-1 bg-gray-50 border-b">
            Swipe or tap arrows to navigate days
          </div>
        )}
        {viewMode === 'week' && (
          <div className="text-center text-xs text-gray-500 py-1 bg-gray-50 border-b">
            Week view
          </div>
        )}

        {/* Calendar Grid */}
        <div className="p-4">
          {/* Day View - Mobile */}
          {viewMode === 'day' && (
            <div className="min-h-64">
              {(() => {
                const dateKey = formatDateKey(currentDay);
                const dayActual = actualCalendarData[dateKey];
                const dayIsToday = isToday(currentDay);

                return (
                  <div className={`p-4 border rounded-lg ${dayIsToday ? 'border-primary-500 border-2' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-xl font-semibold ${dayIsToday ? 'text-primary-600' : 'text-gray-900'}`}>
                        {currentDay.getDate()}
                      </span>
                      {!dayActual && (
                        <button
                          onClick={() => handleOpenAddActualModal(dateKey)}
                          className="btn-primary text-sm"
                          aria-label={`Log hours for ${dateKey}`}
                        >
                          + Log Hours
                        </button>
                      )}
                    </div>
                    {dayActual ? (
                      <div className="bg-green-100 text-green-800 p-4 rounded-lg">
                        <div className="font-medium text-lg">{dayActual.hoursWorked}h worked</div>
                        {dayActual.userText && <div className="text-green-600 mt-2">{dayActual.userText}</div>}
                        {dayActual.distributions && dayActual.distributions.length > 0 && (
                          <div className="text-green-600 mt-2 space-y-1">
                            {dayActual.distributions.map((d, i) => (
                              <div key={i}>
                                {d.hours}h - {d.project.name}
                                {d.description && <span className="text-green-500 block text-sm">{d.description}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-center py-8">No hours logged for this day</div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Week View - Tablet */}
          {viewMode === 'week' && (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day, index) => {
                  const dateKey = formatDateKey(day);
                  const dayActual = actualCalendarData[dateKey];
                  const dayIsToday = isToday(day);

                  return (
                    <div
                      key={index}
                      className={`min-h-32 p-2 border rounded-lg bg-white ${dayIsToday ? 'border-primary-500 border-2' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${dayIsToday ? 'text-primary-600' : 'text-gray-900'}`}>
                          {day.getDate()}
                        </span>
                        {!dayActual && (
                          <button
                            onClick={() => handleOpenAddActualModal(dateKey)}
                            className="text-primary-600 hover:text-primary-800 p-1"
                            aria-label={`Add hours for ${dateKey}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {dayActual && (
                        <div className="text-xs bg-green-100 text-green-800 p-1 rounded">
                          <div className="font-medium">{dayActual.hoursWorked}h</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Month View - Desktop */}
          {viewMode === 'month' && (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const dateKey = formatDateKey(day.date);
                  const dayActual = actualCalendarData[dateKey];
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
                        {day.isCurrentMonth && !dayActual && (
                          <button
                            onClick={() => handleOpenAddActualModal(dateKey)}
                            className="text-primary-600 hover:text-primary-800 p-1"
                            aria-label={`Add hours for ${dateKey}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {dayActual && (
                        <div className="text-xs bg-green-100 text-green-800 p-1 rounded">
                          <div className="font-medium">{dayActual.hoursWorked}h worked</div>
                          {dayActual.distributions && dayActual.distributions.length > 0 && (
                            <div className="text-green-600 mt-1">
                              {dayActual.distributions.map((d, i) => (
                                <div key={i} className="truncate">
                                  {d.hours}h - {d.project.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      )}

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

      {/* Edit Workload Plan Modal */}
      {showEditModal && editingPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Edit Workload Plan</h2>
              <button
                onClick={() => setShowEditModal(false)}
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
                  value={editingPlanDate}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee
                </label>
                <input
                  type="text"
                  value={`${editingPlan.user.firstName} ${editingPlan.user.lastName}`}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project *
                </label>
                <select
                  value={editPlanProject}
                  onChange={(e) => setEditPlanProject(e.target.value)}
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
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateWorkloadPlan}
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Actual Hours Modal */}
      {showAddActualModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Log Hours</h2>
              <button
                onClick={() => setShowAddActualModal(false)}
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
                  value={actualDate}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Hours Worked *
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={actualHours}
                  onChange={(e) => setActualHours(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={actualNotes}
                  onChange={(e) => setActualNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="What did you work on today?"
                />
              </div>

              {/* Project Distributions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Distribute to Projects
                  </label>
                  <button
                    type="button"
                    onClick={handleAddDistribution}
                    className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                  >
                    + Add Project
                  </button>
                </div>
                <div className="space-y-3">
                  {actualDistributions.map((dist, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Project {index + 1}</span>
                        {actualDistributions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDistribution(index)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={dist.projectId}
                          onChange={(e) => handleDistributionChange(index, 'projectId', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">Select Project</option>
                          {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="Hours"
                          value={dist.hours}
                          onChange={(e) => handleDistributionChange(index, 'hours', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Description (optional)"
                        value={dist.description}
                        onChange={(e) => handleDistributionChange(index, 'description', e.target.value)}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowAddActualModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateActualHours}
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? 'Saving...' : 'Log Hours'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
