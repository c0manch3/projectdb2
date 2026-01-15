import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  manager: { id: string; firstName: string; lastName: string };
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

// For "All Employees" mode - actual workload data for all employees grouped by date
interface AllEmployeesActualData {
  [date: string]: WorkloadActualEntryWithUser[];
}

interface WorkloadActualEntryWithUser extends WorkloadActualEntry {
  user: { id: string; firstName: string; lastName: string };
}

export default function WorkloadPage() {
  const { t } = useTranslation();
  const { user } = useAppSelector((state) => state.auth);
  const isManager = user?.role === 'Admin' || user?.role === 'Manager';
  const isEmployee = user?.role === 'Employee';
  const isOnlyManager = user?.role === 'Manager'; // Only Manager, not Admin
  const [projects, setProjects] = useState<Project[]>([]);
  const [managedProjects, setManagedProjects] = useState<Project[]>([]); // Projects where current user is manager
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

  // All employees' actual workload data (for "All Employees" mode)
  const [allEmployeesActualData, setAllEmployeesActualData] = useState<AllEmployeesActualData>({});

  // Add workload modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [newPlanEmployee, setNewPlanEmployee] = useState<string>('');
  const [newPlanProject, setNewPlanProject] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal to show employees with work on a specific date (All Employees mode)
  const [showDateEmployeesModal, setShowDateEmployeesModal] = useState(false);
  const [dateEmployeesModalDate, setDateEmployeesModalDate] = useState<string>('');

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

  // Filter projects based on user role: Managers see only their managed projects, Admins see all
  const projectsForDropdown = isOnlyManager ? managedProjects : projects;

  useEffect(() => {
    fetchProjects();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (activeTab === 'plan') {
      fetchCalendarData();
      fetchActualCalendarData(); // Also fetch actual data to show green backgrounds
      fetchAllEmployeesActualData(); // Fetch all employees' actual data for "All Employees" mode
    } else {
      fetchActualCalendarData();
    }
  }, [currentMonth, selectedProject, selectedEmployee, activeTab]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/project');
      const allProjects = response.data;
      setProjects(allProjects);

      // Filter projects where current user is the manager
      if (user) {
        const userManagedProjects = allProjects.filter((p: any) => p.managerId === user.id);
        setManagedProjects(userManagedProjects);
      }
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

      // If a specific employee is selected and user is a manager, fetch that employee's actual data
      // Otherwise, fetch current user's actual data
      let endpoint = '/workload-actual/my';
      if (selectedEmployee && isManager) {
        endpoint = '/workload-actual';
        params.append('userId', selectedEmployee);
      }

      const response = await api.get(`${endpoint}?${params}`);
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

  // Fetch ALL employees' actual workload data (for managers in "All Employees" mode)
  const fetchAllEmployeesActualData = async () => {
    if (!isManager) return; // Only managers can fetch all employees' data

    try {
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await api.get(`/workload-actual?${params}`);
      // Group by date
      const groupedData: AllEmployeesActualData = {};
      response.data.forEach((entry: WorkloadActualEntryWithUser) => {
        const dateKey = new Date(entry.date).toISOString().split('T')[0];
        if (!groupedData[dateKey]) {
          groupedData[dateKey] = [];
        }
        groupedData[dateKey].push(entry);
      });
      setAllEmployeesActualData(groupedData);
    } catch (error) {
      console.error('Failed to fetch all employees actual data:', error);
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
    // Workload plan can only be added for current and future dates (not past)
    if (!isFutureDateString(date)) {
      toast.error(t('workload.futureDatesOnly'));
      return;
    }
    setSelectedDate(date);
    setNewPlanEmployee('');
    // If a specific project is selected in the filter, pre-select it in the modal
    setNewPlanProject(selectedProject || '');
    setShowAddModal(true);
  };

  const handleCreateWorkloadPlan = async () => {
    if (!newPlanEmployee || !newPlanProject || !selectedDate) {
      toast.error(t('workload.selectEmployeeAndProject'));
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/workload-plan/create', {
        userId: newPlanEmployee,
        projectId: newPlanProject,
        date: selectedDate,
      });
      toast.success(t('workload.workloadSaved'));
      setShowAddModal(false);
      fetchCalendarData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('workload.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWorkloadPlan = async (planId: string, dateKey: string, plan?: WorkloadPlanEntry) => {
    // Workload plan can only be deleted for current and future dates (not past)
    if (!isFutureDateString(dateKey)) {
      toast.error(t('workload.cannotDeletePast'));
      return;
    }

    // Only the manager who created the plan (or Admin) can delete it
    if (plan && user?.role === 'Manager' && plan.manager.id !== user.id) {
      toast.error(t('workload.onlyManagerCanDelete'));
      return;
    }

    try {
      await api.delete(`/workload-plan/${planId}`);
      toast.success(t('workload.workloadDeleted'));
      fetchCalendarData();
    } catch (error) {
      toast.error(t('workload.deleteFailed'));
    }
  };

  const handleOpenEditModal = (plan: WorkloadPlanEntry, dateKey: string) => {
    // Workload plan can only be edited for current and future dates (not past)
    if (!isFutureDateString(dateKey)) {
      toast.error(t('workload.cannotEditPast'));
      return;
    }

    // Only the manager who created the plan (or Admin) can edit it
    if (user?.role === 'Manager' && plan.manager.id !== user.id) {
      toast.error(t('workload.onlyManagerCanEdit'));
      return;
    }

    setEditingPlan(plan);
    setEditingPlanDate(dateKey);
    setEditPlanProject(plan.project.id);
    setShowEditModal(true);
  };

  const handleUpdateWorkloadPlan = async () => {
    if (!editingPlan || !editPlanProject) {
      toast.error(t('workload.selectProjectRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      await api.patch(`/workload-plan/${editingPlan.id}`, {
        projectId: editPlanProject,
      });
      toast.success(t('workload.workloadSaved'));
      setShowEditModal(false);
      setEditingPlan(null);
      fetchCalendarData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('workload.updateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if date is today or in the future (not past)
  const isFutureDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate >= today; // Changed from > to >= to include today
  };

  // Check if date string is in the future
  const isFutureDateString = (dateStr: string) => {
    return isFutureDate(new Date(dateStr));
  };

  // Actual hours handlers
  const handleOpenAddActualModal = (date: string) => {
    // Prevent adding hours for future dates
    if (isFutureDateString(date)) {
      toast.error(t('workload.cannotLogFutureHours'));
      return;
    }
    setActualDate(date);
    setActualHours('8');
    setActualNotes('');
    setActualDistributions([{ projectId: '', hours: '8', description: '' }]);
    setShowAddActualModal(true);
  };

  // View actual hours report modal state
  const [showViewActualModal, setShowViewActualModal] = useState(false);
  const [viewingActualEntry, setViewingActualEntry] = useState<WorkloadActualEntry | null>(null);

  // Handle viewing an existing actual hours entry
  const handleViewActualEntry = (entry: WorkloadActualEntry) => {
    setViewingActualEntry(entry);
    setShowViewActualModal(true);
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
      toast.error(t('workload.enterHoursRequired'));
      return;
    }

    const totalDistHours = actualDistributions.reduce((sum, d) => sum + (parseFloat(d.hours) || 0), 0);
    const totalHours = parseFloat(actualHours);

    if (totalHours <= 0) {
      toast.error(t('workload.hoursPositiveRequired'));
      return;
    }

    if (totalHours > 24) {
      toast.error(t('workload.hoursExceed24'));
      return;
    }

    if (totalDistHours > totalHours) {
      toast.error(t('workload.distributionExceedsTotal'));
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

      toast.success(t('workload.hoursLoggedSuccess'));
      setShowAddActualModal(false);
      fetchActualCalendarData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('workload.logHoursFailed'));
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

  // Check if date is in the past (before today)
  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  // Check if date string is in the past
  const isPastDateString = (dateStr: string) => {
    return isPastDate(new Date(dateStr));
  };

  // Open modal to show employees with work on a specific date (All Employees mode)
  const handleOpenDateEmployeesModal = (date: string) => {
    setDateEmployeesModalDate(date);
    setShowDateEmployeesModal(true);
  };

  // Get employees with work assigned for a specific date
  // In "All Employees" mode (no employee selected), return ACTUAL reports instead of plans
  // In "Single Employee" mode (both project and employee selected), return ACTUAL report for that employee
  const getEmployeesForDate = (dateKey: string) => {
    const isAllEmployeesMode = !selectedEmployee;
    const isSingleEmployeeMode = selectedEmployee && selectedProject;

    if (isAllEmployeesMode && isManager) {
      // Return actual workload data for all employees
      const actualReports = allEmployeesActualData[dateKey] || [];

      // If a specific project is selected, filter reports for that project
      if (selectedProject) {
        return actualReports.filter(report =>
          report.distributions?.some(dist => dist.projectId === selectedProject)
        );
      }

      return actualReports;
    }

    if (isSingleEmployeeMode && isManager) {
      // Return actual workload data for the selected employee
      const dayActual = actualCalendarData[dateKey];
      if (dayActual) {
        // Convert to WorkloadActualEntryWithUser format for modal display
        const selectedEmp = employees.find(e => e.id === selectedEmployee);
        return [{
          ...dayActual,
          user: selectedEmp ? {
            id: selectedEmp.id,
            firstName: selectedEmp.firstName,
            lastName: selectedEmp.lastName
          } : { id: '', firstName: '', lastName: '' }
        }];
      }
      return [];
    }

    // Otherwise, return plan data
    return calendarData[dateKey] || [];
  };

  // Get count of employees who submitted actual reports for a specific date
  // If a specific project is selected, only count reports for that project
  const getActualReportsCountForDate = (dateKey: string) => {
    const actualReports = allEmployeesActualData[dateKey] || [];

    // If no project is selected, return all reports
    if (!selectedProject) {
      return actualReports.length;
    }

    // Filter reports that have distributions for the selected project
    const reportsForProject = actualReports.filter(report =>
      report.distributions?.some(dist => dist.projectId === selectedProject)
    );

    return reportsForProject.length;
  };

  // Get employees who are busy on a specific date (have work assigned)
  const getBusyEmployeeIdsForDate = useCallback((dateKey: string) => {
    const plans = calendarData[dateKey] || [];
    return plans.map(plan => plan.user.id);
  }, [calendarData]);

  // Get available employees (not busy) for a specific date
  const getAvailableEmployeesForDate = useCallback((dateKey: string) => {
    const busyIds = getBusyEmployeeIdsForDate(dateKey);
    return employees.filter(emp => !busyIds.includes(emp.id));
  }, [employees, getBusyEmployeeIdsForDate]);

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

    toast.success(t('workload.exportSuccess'));
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-gray-500">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">{t('workload.title')}</h1>
        {isManager && activeTab === 'plan' && (
          <button
            onClick={handleExportWorkload}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t('common.export')}
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
          {t('workload.planned')}
        </button>
        <button
          onClick={() => setActiveTab('actual')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === 'actual'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          {t('workload.myHours')}
        </button>
      </div>

      {/* Filters - only show for Plan tab */}
      {activeTab === 'plan' && (
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('workload.project')}
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              aria-label={t('workload.selectProject')}
            >
              <option value="">{t('workload.allProjects')}</option>
              {projectsForDropdown.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('workload.employee')}
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              aria-label={t('workload.selectEmployee')}
            >
              <option value="">{t('workload.allEmployees')}</option>
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
              aria-label={viewMode === 'day' ? t('workload.previousDay') : viewMode === 'week' ? t('workload.previousWeek') : t('workload.previousMonth')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg touch-target"
              aria-label={t('workload.goToToday')}
            >
              {t('workload.today')}
            </button>
            <button
              onClick={goToThisWeek}
              className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg touch-target"
              aria-label={t('workload.goToThisWeek')}
            >
              {t('workload.thisWeek')}
            </button>
          </div>
          {/* View mode toggle */}
          <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={setViewDay}
              className={`px-2 py-1 text-xs font-medium rounded ${viewMode === 'day' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
              aria-label={t('workload.dayView')}
            >
              {t('workload.day')}
            </button>
            <button
              onClick={setViewWeek}
              className={`px-2 py-1 text-xs font-medium rounded ${viewMode === 'week' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
              aria-label={t('workload.weekView')}
            >
              {t('workload.week')}
            </button>
            <button
              onClick={setViewMonth}
              className={`px-2 py-1 text-xs font-medium rounded ${viewMode === 'month' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
              aria-label={t('workload.monthView')}
            >
              {t('workload.month')}
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
            aria-label={viewMode === 'day' ? t('workload.nextDay') : viewMode === 'week' ? t('workload.nextWeek') : t('workload.nextMonth')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* View mode indicator for mobile */}
        {viewMode === 'day' && (
          <div className="text-center text-xs text-gray-500 py-1 bg-gray-50 border-b">
            {t('workload.swipeToNavigateDays')}
          </div>
        )}
        {viewMode === 'week' && (
          <div className="text-center text-xs text-gray-500 py-1 bg-gray-50 border-b">
            {t('workload.weekView')}
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
                const dayIsFuture = isFutureDate(currentDay);
                const isAllEmployeesMode = !selectedEmployee;
                const hasWorkloadData = dayPlans.length > 0 || actualCalendarData[dateKey] !== undefined;

                return (
                  <div className={`p-4 border rounded-lg ${hasWorkloadData ? 'bg-green-50' : 'bg-white'} ${dayIsToday ? 'border-primary-500 border-2' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-xl font-semibold ${dayIsToday ? 'text-primary-600' : 'text-gray-900'}`}>
                        {currentDay.getDate()}
                      </span>
                      {isOnlyManager && dayIsFuture && (
                        <button
                          onClick={() => handleOpenAddModal(dateKey)}
                          className="btn-primary text-sm"
                          aria-label={t('workload.addWorkloadFor', { date: dateKey })}
                        >
                          + {t('workload.addPlanned')}
                        </button>
                      )}
                    </div>
                    {dayPlans.length === 0 ? (
                      <div className="text-gray-500 text-center py-8">{t('workload.noWorkload')}</div>
                    ) : (
                      <div className="space-y-3">
                        {dayPlans.map((plan) => (
                          <div
                            key={plan.id}
                            className={`bg-primary-100 text-primary-800 p-4 rounded-lg group relative ${isManager && !isAllEmployeesMode ? 'cursor-pointer hover:bg-primary-200' : ''}`}
                            title={isManager && !isAllEmployeesMode ? t('common.clickToEdit') : undefined}
                            onClick={() => {
                              if (isManager && !isAllEmployeesMode) {
                                handleOpenEditModal(plan, dateKey);
                              } else if (isAllEmployeesMode && dayPlans.length > 0) {
                                handleOpenDateEmployeesModal(dateKey);
                              }
                            }}
                          >
                            <div className="font-medium text-lg">{plan.user.firstName} {plan.user.lastName}</div>
                            <div className="text-primary-600">{plan.project.name}</div>
                            {isManager && !isAllEmployeesMode && dayIsFuture && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteWorkloadPlan(plan.id, dateKey, plan);
                                }}
                                className="absolute right-2 top-2 text-red-600 hover:text-red-800 p-2"
                                aria-label={t('common.delete')}
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
                    {isAllEmployeesMode && dayPlans.length > 0 && (
                      <button
                        onClick={() => handleOpenDateEmployeesModal(dateKey)}
                        className="mt-4 w-full text-center text-primary-600 hover:text-primary-800 text-sm font-medium py-2 border border-primary-200 rounded-lg hover:bg-primary-50"
                      >
                        {t('workload.viewAllEmployeesAssigned', { count: dayPlans.length })}
                      </button>
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
                {[t('workload.sun'), t('workload.mon'), t('workload.tue'), t('workload.wed'), t('workload.thu'), t('workload.fri'), t('workload.sat')].map((day) => (
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
                  const dayIsFuture = isFutureDate(day);
                  const isAllEmployeesMode = !selectedEmployee;
                  const hasWorkloadData = dayPlans.length > 0 || actualCalendarData[dateKey] !== undefined;

                  return (
                    <div
                      key={index}
                      className={`min-h-32 p-2 border rounded-lg ${hasWorkloadData ? 'bg-green-50' : 'bg-white'} ${dayIsToday ? 'border-primary-500 border-2' : 'border-gray-200'} ${
                        isAllEmployeesMode && dayPlans.length > 0 ? 'cursor-pointer hover:bg-gray-50' : ''
                      }`}
                      onClick={(e) => {
                        if (isAllEmployeesMode && dayPlans.length > 0 && e.target === e.currentTarget) {
                          handleOpenDateEmployeesModal(dateKey);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-sm font-medium ${dayIsToday ? 'text-primary-600' : 'text-gray-900'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isAllEmployeesMode && dayPlans.length > 0) {
                              handleOpenDateEmployeesModal(dateKey);
                            }
                          }}
                        >
                          {day.getDate()}
                        </span>
                        {isOnlyManager && dayIsFuture && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAddModal(dateKey);
                            }}
                            className="text-primary-600 hover:text-primary-800 p-1"
                            aria-label={t('workload.addWorkloadFor', { date: dateKey })}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div
                        className="space-y-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isAllEmployeesMode && dayPlans.length > 0) {
                            handleOpenDateEmployeesModal(dateKey);
                          }
                        }}
                      >
                        {dayPlans.map((plan) => (
                          <div
                            key={plan.id}
                            className={`text-xs bg-primary-100 text-primary-800 p-1 rounded truncate group relative ${isManager && !isAllEmployeesMode ? 'cursor-pointer hover:bg-primary-200' : ''}`}
                            title={`${plan.user.firstName} ${plan.user.lastName} - ${plan.project.name}${isManager && !isAllEmployeesMode ? ` (${t('common.clickToEdit')})` : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isManager && !isAllEmployeesMode) {
                                handleOpenEditModal(plan, dateKey);
                              } else if (isAllEmployeesMode && dayPlans.length > 0) {
                                handleOpenDateEmployeesModal(dateKey);
                              }
                            }}
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
                {[t('workload.sun'), t('workload.mon'), t('workload.tue'), t('workload.wed'), t('workload.thu'), t('workload.fri'), t('workload.sat')].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const dateKey = formatDateKey(day.date);
                  const dayPlans = calendarData[dateKey] || [];
                  const dayActual = actualCalendarData[dateKey];
                  const dayIsToday = isToday(day.date);
                  const dayIsFuture = isFutureDate(day.date);
                  const dayIsPastOrToday = !dayIsFuture;
                  const isAllEmployeesMode = !selectedEmployee;
                  const isSingleEmployeeMode = selectedEmployee && selectedProject; // Both project and employee selected

                  // In "All Employees" mode, get actual reports count for past/today dates
                  const actualReportsCount = isAllEmployeesMode ? getActualReportsCountForDate(dateKey) : 0;
                  const shouldShowActualCount = isAllEmployeesMode && dayIsPastOrToday && actualReportsCount > 0;

                  const hasWorkloadData = dayPlans.length > 0 || actualCalendarData[dateKey] !== undefined;

                  return (
                    <div
                      key={index}
                      className={`min-h-24 p-2 border rounded-lg ${
                        day.isCurrentMonth ? (hasWorkloadData ? 'bg-green-50' : 'bg-white') : 'bg-gray-50'
                      } ${dayIsToday ? 'border-primary-500 border-2' : 'border-gray-200'} ${
                        (isAllEmployeesMode || isSingleEmployeeMode) && (dayPlans.length > 0 || actualReportsCount > 0 || dayActual) && day.isCurrentMonth ? 'cursor-pointer hover:bg-gray-50' : ''
                      }`}
                      onClick={(e) => {
                        // Open modal if clicking on the cell in All Employees mode or Single Employee mode (with actual data)
                        if (isAllEmployeesMode && (dayPlans.length > 0 || actualReportsCount > 0) && day.isCurrentMonth && e.target === e.currentTarget) {
                          handleOpenDateEmployeesModal(dateKey);
                        } else if (isSingleEmployeeMode && dayActual && day.isCurrentMonth && e.target === e.currentTarget) {
                          // Open modal to show actual report details for single employee
                          handleOpenDateEmployeesModal(dateKey);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-sm font-medium ${
                            day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                          } ${dayIsToday ? 'text-primary-600' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Clicking on date number also opens modal in All Employees mode or Single Employee mode
                            if (isAllEmployeesMode && (dayPlans.length > 0 || actualReportsCount > 0) && day.isCurrentMonth) {
                              handleOpenDateEmployeesModal(dateKey);
                            } else if (isSingleEmployeeMode && dayActual && day.isCurrentMonth) {
                              handleOpenDateEmployeesModal(dateKey);
                            }
                          }}
                        >
                          {day.date.getDate()}
                        </span>
                        {isOnlyManager && day.isCurrentMonth && dayIsFuture && !isSingleEmployeeMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAddModal(dateKey);
                            }}
                            className="text-primary-600 hover:text-primary-800 p-1"
                            aria-label={t('workload.addWorkloadFor', { date: dateKey })}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        )}
                        {/* In single employee mode, show + button only if employee is NOT busy on that date */}
                        {isOnlyManager && day.isCurrentMonth && dayIsFuture && isSingleEmployeeMode && dayPlans.length === 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAddModal(dateKey);
                            }}
                            className="text-primary-600 hover:text-primary-800 p-1"
                            aria-label={t('workload.addWorkloadFor', { date: dateKey })}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div
                        className="space-y-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Clicking on content area also opens modal in All Employees mode or Single Employee mode
                          if (isAllEmployeesMode && (dayPlans.length > 0 || actualReportsCount > 0) && day.isCurrentMonth) {
                            handleOpenDateEmployeesModal(dateKey);
                          } else if (isSingleEmployeeMode && dayActual && day.isCurrentMonth) {
                            handleOpenDateEmployeesModal(dateKey);
                          }
                        }}
                      >
                        {/* In "All Employees" mode for past/today dates, show count of actual reports */}
                        {shouldShowActualCount ? (
                          <div className="text-center py-2">
                            <div className="text-2xl font-bold text-primary-600">{actualReportsCount}</div>
                            <div className="text-xs text-gray-600">
                              {actualReportsCount === 1 ? t('workload.employeeReport') : t('workload.employeeReports')}
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Show plan entries */}
                            {dayPlans.map((plan) => (
                          <div
                            key={plan.id}
                            className={`text-xs bg-primary-100 text-primary-800 p-1 rounded truncate group relative ${isManager && !isAllEmployeesMode && !isSingleEmployeeMode ? 'cursor-pointer hover:bg-primary-200' : ''}`}
                            title={`${plan.user.firstName} ${plan.user.lastName} - ${plan.project.name}${isManager && !isAllEmployeesMode && !isSingleEmployeeMode ? ` (${t('common.clickToEdit')})` : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isManager && !isAllEmployeesMode && !isSingleEmployeeMode) {
                                handleOpenEditModal(plan, dateKey);
                              } else if (isAllEmployeesMode && dayPlans.length > 0) {
                                handleOpenDateEmployeesModal(dateKey);
                              } else if (isSingleEmployeeMode && dayActual) {
                                handleOpenDateEmployeesModal(dateKey);
                              }
                            }}
                          >
                            <span className="font-medium">{plan.user.firstName}</span>
                            <span className="text-primary-600"> - {plan.project.name}</span>
                            {isManager && !isAllEmployeesMode && !isSingleEmployeeMode && dayIsFuture && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteWorkloadPlan(plan.id, dateKey, plan);
                                }}
                                className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:block text-red-600 hover:text-red-800"
                                aria-label={t('common.delete')}
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                            {/* In single employee mode, show actual report summary for past/today dates */}
                            {isSingleEmployeeMode && dayIsPastOrToday && dayActual && (
                              <div
                                className="text-xs bg-green-100 text-green-800 p-1 rounded cursor-pointer hover:bg-green-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDateEmployeesModal(dateKey);
                                }}
                              >
                                <div className="font-medium">{t('workload.actualHours')}: {dayActual.hoursWorked}h</div>
                                {dayActual.distributions && dayActual.distributions.length > 0 && (
                                  <div className="text-xs opacity-75">
                                    {dayActual.distributions.map(d => d.project.name).join(', ')}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
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
              aria-label={viewMode === 'day' ? t('workload.previousDay') : viewMode === 'week' ? t('workload.previousWeek') : t('workload.previousMonth')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg touch-target"
              aria-label={t('workload.goToToday')}
            >
              {t('workload.today')}
            </button>
            <button
              onClick={goToThisWeek}
              className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg touch-target"
              aria-label={t('workload.goToThisWeek')}
            >
              {t('workload.thisWeek')}
            </button>
          </div>
          {/* View mode toggle */}
          <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={setViewDay}
              className={`px-2 py-1 text-xs font-medium rounded ${viewMode === 'day' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
              aria-label={t('workload.dayView')}
            >
              {t('workload.day')}
            </button>
            <button
              onClick={setViewWeek}
              className={`px-2 py-1 text-xs font-medium rounded ${viewMode === 'week' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
              aria-label={t('workload.weekView')}
            >
              {t('workload.week')}
            </button>
            <button
              onClick={setViewMonth}
              className={`px-2 py-1 text-xs font-medium rounded ${viewMode === 'month' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
              aria-label={t('workload.monthView')}
            >
              {t('workload.month')}
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
            aria-label={viewMode === 'day' ? t('workload.nextDay') : viewMode === 'week' ? t('workload.nextWeek') : t('workload.nextMonth')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* View mode indicator */}
        {viewMode === 'day' && (
          <div className="text-center text-xs text-gray-500 py-1 bg-gray-50 border-b">
            {t('workload.swipeToNavigateDays')}
          </div>
        )}
        {viewMode === 'week' && (
          <div className="text-center text-xs text-gray-500 py-1 bg-gray-50 border-b">
            {t('workload.weekView')}
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
                const dayIsFuture = isFutureDate(currentDay);

                return (
                  <div className={`p-4 border rounded-lg ${dayIsToday ? 'border-primary-500 border-2' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-xl font-semibold ${dayIsToday ? 'text-primary-600' : 'text-gray-900'}`}>
                        {currentDay.getDate()}
                      </span>
                      {/* Only show Log Hours button if no existing entry and not future date */}
                      {!dayActual && !dayIsFuture && (
                        <button
                          onClick={() => handleOpenAddActualModal(dateKey)}
                          className="btn-primary text-sm"
                          aria-label={t('workload.logHoursFor', { date: dateKey })}
                        >
                          + {t('workload.logHours')}
                        </button>
                      )}
                      {dayIsFuture && !dayActual && (
                        <span className="text-sm text-gray-400">{t('workload.futureDate')}</span>
                      )}
                    </div>
                    {dayActual ? (
                      <div
                        className="bg-green-100 text-green-800 p-4 rounded-lg cursor-pointer hover:bg-green-200 transition-colors"
                        onClick={() => handleViewActualEntry(dayActual)}
                        title={t('common.clickToViewDetails')}
                      >
                        <div className="font-medium text-lg">{dayActual.hoursWorked}{t('workload.hoursWorked')}</div>
                        {dayActual.userText && <div className="text-green-600 mt-2">{dayActual.userText}</div>}
                        {dayActual.distributions && dayActual.distributions.length > 0 && (
                          <div className="text-green-600 mt-2 space-y-1">
                            {dayActual.distributions.map((d, i) => (
                              <div key={i}>
                                {d.hours}{t('workload.hours')} - {d.project.name}
                                {d.description && <span className="text-green-500 block text-sm">{d.description}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-center py-8">
                        {dayIsFuture ? t('workload.cannotLogFutureHours') : t('workload.noHoursLogged')}
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
                {[t('workload.sun'), t('workload.mon'), t('workload.tue'), t('workload.wed'), t('workload.thu'), t('workload.fri'), t('workload.sat')].map((day) => (
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
                  const dayIsFuture = isFutureDate(day);

                  return (
                    <div
                      key={index}
                      className={`min-h-32 p-2 border rounded-lg bg-white ${dayIsToday ? 'border-primary-500 border-2' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${dayIsToday ? 'text-primary-600' : 'text-gray-900'}`}>
                          {day.getDate()}
                        </span>
                        {/* Only show Add button if no existing entry and not future date */}
                        {!dayActual && !dayIsFuture && (
                          <button
                            onClick={() => handleOpenAddActualModal(dateKey)}
                            className="text-primary-600 hover:text-primary-800 p-1"
                            aria-label={t('workload.addHoursFor', { date: dateKey })}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {dayActual && (
                        <div
                          className="text-xs bg-green-100 text-green-800 p-1 rounded cursor-pointer hover:bg-green-200 transition-colors"
                          onClick={() => handleViewActualEntry(dayActual)}
                          title={t('common.clickToViewDetails')}
                        >
                          <div className="font-medium">{dayActual.hoursWorked}{t('workload.hours')}</div>
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
                {[t('workload.sun'), t('workload.mon'), t('workload.tue'), t('workload.wed'), t('workload.thu'), t('workload.fri'), t('workload.sat')].map((day) => (
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
                  const dayIsFuture = isFutureDate(day.date);

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
                        {/* Only show Add button for current month, no existing entry, and not future date */}
                        {day.isCurrentMonth && !dayActual && !dayIsFuture && (
                          <button
                            onClick={() => handleOpenAddActualModal(dateKey)}
                            className="text-primary-600 hover:text-primary-800 p-1"
                            aria-label={t('workload.addHoursFor', { date: dateKey })}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {dayActual && (
                        <div
                          className="text-xs bg-green-100 text-green-800 p-1 rounded cursor-pointer hover:bg-green-200 transition-colors"
                          onClick={() => handleViewActualEntry(dayActual)}
                          title={t('common.clickToViewDetails')}
                        >
                          <div className="font-medium">{dayActual.hoursWorked}{t('workload.hoursWorked')}</div>
                          {dayActual.distributions && dayActual.distributions.length > 0 && (
                            <div className="text-green-600 mt-1">
                              {dayActual.distributions.map((d, i) => (
                                <div key={i} className="truncate">
                                  {d.hours}{t('workload.hours')} - {d.project.name}
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
              <h2 className="text-lg font-semibold">{t('workload.addPlanned')}</h2>
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
                  {t('workload.date')}
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
                  {t('workload.employee')} *
                </label>
                <select
                  value={newPlanEmployee}
                  onChange={(e) => setNewPlanEmployee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">{t('workload.selectEmployee')}</option>
                  {getAvailableEmployeesForDate(selectedDate).map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </option>
                  ))}
                </select>
                {getAvailableEmployeesForDate(selectedDate).length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    {t('workload.allEmployeesAssigned')}
                  </p>
                )}
              </div>
              {/* Only show project selection if no project is pre-selected from filter */}
              {!selectedProject && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('workload.project')} *
                  </label>
                  <select
                    value={newPlanProject}
                    onChange={(e) => setNewPlanProject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">{t('workload.selectProject')}</option>
                    {managedProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  {managedProjects.length === 0 && (
                    <p className="text-sm text-amber-600 mt-1">
                      {t('workload.noManagedProjects')}
                    </p>
                  )}
                </div>
              )}
              {/* Show selected project name when project is pre-selected from filter */}
              {selectedProject && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('workload.project')}
                  </label>
                  <input
                    type="text"
                    value={managedProjects.find(p => p.id === selectedProject)?.name || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateWorkloadPlan}
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? t('common.creating') : t('common.create')}
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
              <h2 className="text-lg font-semibold">{t('workload.editPlanned')}</h2>
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
                  {t('workload.date')}
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
                  {t('workload.employee')}
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
                  {t('workload.project')} *
                </label>
                <select
                  value={editPlanProject}
                  onChange={(e) => setEditPlanProject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">{t('workload.selectProject')}</option>
                  {projectsForDropdown.map((project) => (
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
                {t('common.cancel')}
              </button>
              <button
                onClick={handleUpdateWorkloadPlan}
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? t('common.saving') : t('common.save')}
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
              <h2 className="text-lg font-semibold">{t('workload.logHours')}</h2>
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
                  {t('workload.date')}
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
                  {t('workload.totalHours')} *
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
                  {t('workload.notes')} ({t('common.optional')})
                </label>
                <textarea
                  value={actualNotes}
                  onChange={(e) => setActualNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder={t('workload.notesPlaceholder')}
                />
              </div>

              {/* Project Distributions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('workload.distributeToProjects')}
                  </label>
                  <button
                    type="button"
                    onClick={handleAddDistribution}
                    className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                  >
                    + {t('workload.addProject')}
                  </button>
                </div>
                <div className="space-y-3">
                  {actualDistributions.map((dist, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">{t('workload.project')} {index + 1}</span>
                        {actualDistributions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDistribution(index)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            {t('common.remove')}
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={dist.projectId}
                          onChange={(e) => handleDistributionChange(index, 'projectId', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">{t('workload.selectProject')}</option>
                          {projectsForDropdown.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder={t('workload.hours')}
                          value={dist.hours}
                          onChange={(e) => handleDistributionChange(index, 'hours', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder={t('workload.descriptionOptional')}
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
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateActualHours}
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? t('common.saving') : t('workload.logHours')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Employees Modal - shows all employees with work assigned on a specific date */}
      {showDateEmployeesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {t('workload.workAssignmentsFor', { date: new Date(dateEmployeesModalDate).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) })}
              </h2>
              <button
                onClick={() => setShowDateEmployeesModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              {(() => {
                const isAllEmployeesMode = !selectedEmployee;
                const data = getEmployeesForDate(dateEmployeesModalDate);

                if (data.length === 0) {
                  return (
                    <div className="text-gray-500 text-center py-8">
                      {t('workload.noEmployeesAssigned')}
                    </div>
                  );
                }

                // Check if data contains actual reports (has 'distributions' field) or plans (has 'project' field)
                const isActualData = data.length > 0 && 'distributions' in data[0];

                return (
                  <div className="space-y-3">
                    {isActualData ? (
                      // Display actual workload reports
                      data.map((actualEntry: WorkloadActualEntryWithUser) => {
                        // Get the plan for this user on this date if it exists
                        const planForUser = calendarData[dateEmployeesModalDate]?.find(
                          p => p.user.id === actualEntry.user.id
                        );

                        return (
                          <div
                            key={actualEntry.id}
                            className="bg-green-50 border border-green-200 rounded-lg p-4"
                          >
                            <div className="font-medium text-gray-900 mb-2">
                              {actualEntry.user.firstName} {actualEntry.user.lastName}
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">{t('workload.totalHours')}:</span>
                                <span className="font-semibold">{actualEntry.hoursWorked}h</span>
                              </div>

                              {planForUser && (
                                <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2">
                                  <span className="text-gray-600">{t('workload.plannedProject')}:</span>
                                  <span className="text-blue-700 font-medium ml-1">{planForUser.project.name}</span>
                                </div>
                              )}

                              {!planForUser && (
                                <div className="text-xs bg-gray-50 border border-gray-200 rounded p-2 text-gray-500">
                                  {t('workload.noPlanForThisDate')}
                                </div>
                              )}

                              {actualEntry.distributions && actualEntry.distributions.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-xs font-medium text-gray-700 mb-1">{t('workload.projectDistribution')}:</div>
                                  {actualEntry.distributions.map((dist) => (
                                    <div key={dist.id} className="text-xs bg-primary-50 border border-primary-200 rounded p-2 mb-1">
                                      <div className="flex justify-between">
                                        <span className="text-primary-700 font-medium">{dist.project.name}</span>
                                        <span className="text-primary-600 font-semibold">{dist.hours}h</span>
                                      </div>
                                      {dist.description && (
                                        <div className="text-gray-600 mt-1">{dist.description}</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {actualEntry.userText && (
                                <div className="mt-2">
                                  <div className="text-xs font-medium text-gray-700">{t('workload.notes')}:</div>
                                  <div className="text-xs text-gray-600 mt-1">{actualEntry.userText}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      // Display workload plans
                      data.map((plan: WorkloadPlanEntry) => (
                        <div
                          key={plan.id}
                          className="bg-primary-50 border border-primary-200 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">
                                {plan.user.firstName} {plan.user.lastName}
                              </div>
                              <div className="text-sm text-primary-600">
                                {plan.project.name}
                              </div>
                            </div>
                            {isManager && isFutureDateString(dateEmployeesModalDate) && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setShowDateEmployeesModal(false);
                                    handleOpenEditModal(plan, dateEmployeesModalDate);
                                  }}
                                  className="text-primary-600 hover:text-primary-800 p-2"
                                  title={t('common.edit')}
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteWorkloadPlan(plan.id, dateEmployeesModalDate, plan);
                                    setShowDateEmployeesModal(false);
                                  }}
                                  className="text-red-600 hover:text-red-800 p-2"
                                  title={t('common.delete')}
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="flex justify-between items-center p-4 border-t">
              <div className="text-sm text-gray-500">
                {t('workload.employeesAssignedCount', { count: getEmployeesForDate(dateEmployeesModalDate).length })}
              </div>
              <button
                onClick={() => setShowDateEmployeesModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Actual Hours Report Modal */}
      {showViewActualModal && viewingActualEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {t('workload.workReport')} - {new Date(viewingActualEntry.date).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h2>
              <button
                onClick={() => setShowViewActualModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              {/* Total Hours */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="text-sm text-green-600 mb-1">{t('workload.totalHoursWorked')}</div>
                <div className="text-3xl font-bold text-green-800">{viewingActualEntry.hoursWorked}{t('workload.hours')}</div>
              </div>

              {/* Notes */}
              {viewingActualEntry.userText && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">{t('workload.notes')}</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-600">
                    {viewingActualEntry.userText}
                  </div>
                </div>
              )}

              {/* Project Distributions */}
              {viewingActualEntry.distributions && viewingActualEntry.distributions.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">{t('workload.projectDistribution')}</div>
                  <div className="space-y-2">
                    {viewingActualEntry.distributions.map((dist, index) => (
                      <div
                        key={index}
                        className="bg-primary-50 border border-primary-200 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-900">{dist.project.name}</div>
                          <div className="text-primary-700 font-semibold">{dist.hours}{t('workload.hours')}</div>
                        </div>
                        {dist.description && (
                          <div className="text-sm text-gray-500 mt-1">{dist.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No distributions message */}
              {(!viewingActualEntry.distributions || viewingActualEntry.distributions.length === 0) && !viewingActualEntry.userText && (
                <div className="text-gray-500 text-center py-4">
                  {t('workload.noAdditionalDetails')}
                </div>
              )}
            </div>
            <div className="flex justify-end p-4 border-t">
              <button
                onClick={() => setShowViewActualModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
