import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/store';
import { api } from '@/services/auth.service';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';

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
  contractDate?: string;
  expirationDate?: string;
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
  comparison?: ProjectWorkloadData[] | null;
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

interface EmployeeWorkloadReport {
  id: string;
  date: string;
  hoursWorked: number;
  userText?: string;
  distributions: {
    id: string;
    hours: number;
    description: string;
    project: {
      id: string;
      name: string;
    };
  }[];
}

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { user } = useAppSelector((state) => state.auth);
  const [projectsData, setProjectsData] = useState<ProjectsWorkloadResponse | null>(null);
  const [employeesData, setEmployeesData] = useState<EmployeeWorkHoursResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'employees'>('projects');

  // Employee reports modal state
  const [showEmployeeReportsModal, setShowEmployeeReportsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWorkHoursData | null>(null);
  const [employeeReports, setEmployeeReports] = useState<EmployeeWorkloadReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Date range state - actual values used for API calls
  const now = new Date();
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  // Restore from sessionStorage or use defaults
  const [startDate, setStartDate] = useState<string>(() =>
    sessionStorage.getItem('analytics_startDate') || defaultStartDate
  );
  const [endDate, setEndDate] = useState<string>(() =>
    sessionStorage.getItem('analytics_endDate') || defaultEndDate
  );
  const [compareDate, setCompareDate] = useState<string>(() =>
    sessionStorage.getItem('analytics_compareDate') || ''
  );
  const [showComparison, setShowComparison] = useState(() =>
    sessionStorage.getItem('analytics_showComparison') === 'true'
  );

  // Persist dates to sessionStorage when they change
  useEffect(() => {
    sessionStorage.setItem('analytics_startDate', startDate);
  }, [startDate]);

  useEffect(() => {
    sessionStorage.setItem('analytics_endDate', endDate);
  }, [endDate]);

  useEffect(() => {
    sessionStorage.setItem('analytics_compareDate', compareDate);
  }, [compareDate]);

  useEffect(() => {
    sessionStorage.setItem('analytics_showComparison', String(showComparison));
  }, [showComparison]);

  // Temporary state for date inputs (only applied when user clicks "Apply")
  const [tempStartDate, setTempStartDate] = useState<string>(() =>
    sessionStorage.getItem('analytics_startDate') || defaultStartDate
  );
  const [tempEndDate, setTempEndDate] = useState<string>(() =>
    sessionStorage.getItem('analytics_endDate') || defaultEndDate
  );
  const [tempCompareDate, setTempCompareDate] = useState<string>(() =>
    sessionStorage.getItem('analytics_compareDate') || ''
  );
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false);

  // Track if dates have changed from applied values
  useEffect(() => {
    const datesChanged = tempStartDate !== startDate ||
                         tempEndDate !== endDate ||
                         tempCompareDate !== compareDate;
    setHasUnappliedChanges(datesChanged);
  }, [tempStartDate, tempEndDate, tempCompareDate, startDate, endDate, compareDate]);

  // Apply date changes
  const applyDateChanges = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setCompareDate(tempCompareDate);
    setHasUnappliedChanges(false);
  };

  // Reset to current applied values
  const resetDateChanges = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setTempCompareDate(compareDate);
    setHasUnappliedChanges(false);
  };

  // Project status filter - default to Active projects
  const [projectStatusFilter, setProjectStatusFilter] = useState<'all' | 'Active' | 'Completed'>('Active');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (compareDate && showComparison) params.append('compareDate', compareDate);

      const projectParams = new URLSearchParams();
      if (compareDate && showComparison) projectParams.append('compareDate', compareDate);

      const [projectsRes, employeesRes] = await Promise.all([
        api.get<ProjectsWorkloadResponse>(`/analytics/projects-workload${projectParams.toString() ? '?' + projectParams.toString() : ''}`),
        api.get<EmployeeWorkHoursResponse>(`/analytics/employee-work-hours?${params.toString()}`),
      ]);
      setProjectsData(projectsRes.data);
      setEmployeesData(employeesRes.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(t('analytics.loadError'));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, compareDate, showComparison]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch employee workload reports for the selected period
  const fetchEmployeeReports = async (employee: EmployeeWorkHoursData) => {
    setSelectedEmployee(employee);
    setShowEmployeeReportsModal(true);
    setLoadingReports(true);
    setEmployeeReports([]);

    try {
      const response = await api.get<EmployeeWorkloadReport[]>(
        `/workload-actual?userId=${employee.id}&startDate=${startDate}&endDate=${endDate}`
      );
      setEmployeeReports(response.data);
    } catch (err) {
      console.error('Failed to fetch employee reports:', err);
      toast.error(t('analytics.loadReportsError'));
    } finally {
      setLoadingReports(false);
    }
  };

  const closeEmployeeReportsModal = () => {
    setShowEmployeeReportsModal(false);
    setSelectedEmployee(null);
    setEmployeeReports([]);
  };

  // Filter projects based on status
  const filteredProjects = projectsData?.projects.filter(project => {
    if (projectStatusFilter === 'all') return true;
    return project.status === projectStatusFilter;
  }) || [];

  // Export to PDF
  const exportToPDF = () => {
    if (!projectsData || !employeesData) {
      toast.error(t('analytics.noDataToExport'));
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(31, 41, 55);
    doc.text(t('analytics.pdfReportTitle'), pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Date range
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`${t('analytics.reportGenerated')}: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text(`${t('analytics.period')}: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text(t('analytics.summary'), 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.text(`${t('analytics.totalProjects')}: ${projectsData.summary.totalProjects}`, 14, yPos);
    yPos += 6;
    doc.text(`${t('analytics.activeProjects')}: ${projectsData.summary.activeProjects}`, 14, yPos);
    yPos += 6;
    doc.text(`${t('analytics.completedProjects')}: ${projectsData.summary.completedProjects}`, 14, yPos);
    yPos += 6;
    doc.text(`${t('analytics.totalEmployees')}: ${employeesData.summary.totalEmployees}`, 14, yPos);
    yPos += 6;
    doc.text(`${t('analytics.averageHoursPerEmployee')}: ${employeesData.summary.averageHoursWorked}h`, 14, yPos);
    yPos += 15;

    // Projects Section
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text(t('analytics.projectWorkload'), 14, yPos);
    yPos += 10;

    // Table header
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(t('analytics.project'), 14, yPos);
    doc.text(t('analytics.status'), 70, yPos);
    doc.text(t('analytics.team'), 95, yPos);
    doc.text(t('analytics.hours'), 115, yPos);
    doc.text(t('analytics.progress'), 135, yPos);
    yPos += 5;

    // Table rows
    doc.setTextColor(55, 65, 81);
    projectsData.projects.slice(0, 15).forEach((project) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      const name = project.name.length > 30 ? project.name.substring(0, 30) + '...' : project.name;
      doc.text(name, 14, yPos);
      doc.text(project.status, 70, yPos);
      doc.text(`${project.employeeCount}`, 95, yPos);
      doc.text(`${project.totalActualHours}h`, 115, yPos);
      doc.text(`${project.progress}%`, 135, yPos);
      yPos += 6;
    });

    // Add new page for employees
    doc.addPage();
    yPos = 20;

    // Employee Hours Section
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text(t('analytics.employeeHours'), 14, yPos);
    yPos += 10;

    // Table header
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(t('analytics.employee'), 14, yPos);
    doc.text(t('analytics.hoursWorked'), 80, yPos);
    doc.text(t('analytics.expected'), 115, yPos);
    doc.text(t('analytics.deviation'), 145, yPos);
    yPos += 5;

    // Table rows
    doc.setTextColor(55, 65, 81);
    employeesData.employees.forEach((employee) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      const name = `${employee.firstName} ${employee.lastName}`;
      doc.text(name.length > 35 ? name.substring(0, 35) + '...' : name, 14, yPos);
      doc.text(`${employee.totalHoursWorked}h`, 80, yPos);
      doc.text(`${employee.expectedHours}h`, 115, yPos);
      doc.text(`${employee.deviation > 0 ? '+' : ''}${employee.deviation}h (${employee.deviationPercentage}%)`, 145, yPos);
      yPos += 6;
    });

    // Save the PDF
    doc.save(`analytics-report-${startDate}-to-${endDate}.pdf`);
    toast.success(t('analytics.pdfExportSuccess'));
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-title">{t('analytics.title')}</h1>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-500">{t('common.loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-title">{t('analytics.title')}</h1>
        </div>
        <div className="card p-6">
          <div className="text-center py-12 text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="page-title">{t('analytics.title')}</h1>
        <button
          onClick={exportToPDF}
          className="btn-primary flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          {t('analytics.exportPdf')}
        </button>
      </div>

      {/* Date Range Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('analytics.startDate')}</label>
            <input
              type="date"
              value={tempStartDate}
              onChange={(e) => setTempStartDate(e.target.value)}
              className="input-field w-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('analytics.endDate')}</label>
            <input
              type="date"
              value={tempEndDate}
              onChange={(e) => setTempEndDate(e.target.value)}
              className="input-field w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showComparison"
              checked={showComparison}
              onChange={(e) => setShowComparison(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
            <label htmlFor="showComparison" className="text-sm text-gray-700">{t('analytics.compareWith')}</label>
          </div>
          {showComparison && (
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('analytics.compareDate')}</label>
              <input
                type="date"
                value={tempCompareDate}
                onChange={(e) => setTempCompareDate(e.target.value)}
                className="input-field w-full"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={applyDateChanges}
              disabled={!hasUnappliedChanges}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                hasUnappliedChanges
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {t('common.apply')}
            </button>
            {hasUnappliedChanges && (
              <button
                onClick={resetDateChanges}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {t('common.reset')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-sm text-gray-500 mb-1">{t('analytics.totalProjects')}</div>
          <div className="text-2xl font-bold text-gray-900">
            {projectsData?.summary.totalProjects || 0}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500 mb-1">{t('analytics.activeProjects')}</div>
          <div className="text-2xl font-bold text-green-600">
            {projectsData?.summary.activeProjects || 0}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500 mb-1">{t('analytics.totalEmployees')}</div>
          <div className="text-2xl font-bold text-blue-600">
            {employeesData?.summary.totalEmployees || 0}
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
          {t('analytics.projectWorkload')}
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'employees'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('employees')}
        >
          {t('analytics.employeeHours')}
        </button>
      </div>

      {/* Projects Workload Tab */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          {/* Comparison Data */}
          {showComparison && projectsData?.comparison && (
            <div className="card">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">{t('analytics.periodComparison')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('analytics.comparingWith', { date: compareDate })}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('analytics.project')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('analytics.currentHours')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('analytics.previousHours')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('analytics.change')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredProjects.map((project, idx) => {
                      const prev = projectsData.comparison?.[idx];
                      const change = prev ? project.totalActualHours - prev.totalActualHours : 0;
                      const changeRounded = Math.round(change * 10) / 10;
                      const changePercent = prev && prev.totalActualHours > 0
                        ? Math.round((change / prev.totalActualHours) * 100)
                        : 0;
                      return (
                        <tr key={project.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{project.name}</td>
                          <td className="px-4 py-3 text-gray-600">{project.totalActualHours}h</td>
                          <td className="px-4 py-3 text-gray-600">{prev?.totalActualHours || 0}h</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              changeRounded > 0 ? 'bg-green-100 text-green-800' :
                              changeRounded < 0 ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {changeRounded > 0 ? '+' : ''}{changeRounded}h ({changePercent}%)
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Projects Table */}
          <div className="card">
            <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">{t('analytics.projectWorkloadDetails')}</h2>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{t('analytics.filter')}:</span>
                <div className="flex rounded-lg overflow-hidden border border-gray-200">
                  <button
                    onClick={() => setProjectStatusFilter('all')}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      projectStatusFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t('common.all')}
                  </button>
                  <button
                    onClick={() => setProjectStatusFilter('Active')}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-200 ${
                      projectStatusFilter === 'Active'
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t('common.active')}
                  </button>
                  <button
                    onClick={() => setProjectStatusFilter('Completed')}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-200 ${
                      projectStatusFilter === 'Completed'
                        ? 'bg-gray-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t('common.completed')}
                  </button>
                </div>
              </div>
            </div>
          {filteredProjects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('analytics.project')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('analytics.customer')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('analytics.manager')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('analytics.status')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('analytics.members')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('analytics.hours')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProjects.map((project) => (
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
                          {project.status === 'Active' ? t('common.active') : t('common.completed')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-gray-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>{project.employeeCount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{project.totalActualHours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              {projectsData && projectsData.projects.length > 0
                ? t('analytics.noProjectsWithFilter', { status: projectStatusFilter.toLowerCase() })
                : t('analytics.noProjectData')
              }
            </div>
          )}
          </div>
        </div>
      )}

      {/* Employee Hours Tab */}
      {activeTab === 'employees' && (
        <div className="card">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">{t('analytics.employeeHours')}</h2>
            {employeesData && (
              <p className="text-sm text-gray-500 mt-1">
                {t('analytics.period')}: {new Date(employeesData.period.startDate).toLocaleDateString()} -{' '}
                {new Date(employeesData.period.endDate).toLocaleDateString()} ({employeesData.period.workingDays} {t('analytics.workingDays')})
              </p>
            )}
          </div>

          {/* Employee Summary */}
          {employeesData && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border-b border-gray-200">
              <div className="text-center">
                <div className="text-sm text-gray-500">{t('analytics.avgHoursWorked')}</div>
                <div className="text-lg font-semibold text-gray-900">
                  {employeesData.summary.averageHoursWorked}h
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">{t('analytics.underworking')}</div>
                <div className="text-lg font-semibold text-red-600">
                  {employeesData.summary.employeesUnderworking}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">{t('analytics.overworking')}</div>
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
                      {t('analytics.employee')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('analytics.email')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('analytics.hoursWorked')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('analytics.expected')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('analytics.deviation')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employeesData.employees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => fetchEmployeeReports(employee)}
                      title={t('analytics.clickToViewReports')}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {employee.firstName} {employee.lastName}
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
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
            <div className="p-6 text-center text-gray-500">{t('analytics.noEmployeeData')}</div>
          )}
        </div>
      )}

      {/* Employee Reports Modal */}
      {showEmployeeReportsModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {t('analytics.reportsBy', { name: `${selectedEmployee.firstName} ${selectedEmployee.lastName}` })}
              </h2>
              <button onClick={closeEmployeeReportsModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1">
              {/* Summary Card */}
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-primary-600">{t('analytics.totalHours')}</div>
                    <div className="text-2xl font-bold text-primary-700">
                      {selectedEmployee.totalHoursWorked} {t('workload.hours')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-primary-600">{t('analytics.reportsCount')}</div>
                    <div className="text-xl font-semibold text-primary-700">
                      {employeeReports.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reports List */}
              {loadingReports ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <span className="ml-3 text-gray-500">{t('common.loading')}</span>
                </div>
              ) : employeeReports.length === 0 ? (
                <div className="text-center py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500">{t('analytics.noReportsForPeriod')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {employeeReports.map((report) => (
                    <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm text-gray-500">
                          {new Date(report.date).toLocaleDateString('ru-RU', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                        <span className="px-2 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                          {report.hoursWorked}h
                        </span>
                      </div>

                      {report.userText && (
                        <p className="text-gray-500 text-sm mb-2 italic">
                          {report.userText}
                        </p>
                      )}

                      {report.distributions && report.distributions.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {report.distributions.map((dist) => (
                            <div key={dist.id} className="text-gray-700">
                              <span className="font-medium">{dist.project.name}</span>
                              {dist.description && (
                                <span className="text-gray-400 text-sm"> - {dist.description}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={closeEmployeeReportsModal} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
