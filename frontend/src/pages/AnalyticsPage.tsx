import { useEffect, useState, useRef, useCallback } from 'react';
import { useAppSelector } from '@/store';
import { api } from '@/services/auth.service';
import * as d3 from 'd3';
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

  // Date range state
  const now = new Date();
  const [startDate, setStartDate] = useState<string>(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  );
  const [compareDate, setCompareDate] = useState<string>('');
  const [showComparison, setShowComparison] = useState(false);

  // Bubble chart ref
  const bubbleChartRef = useRef<SVGSVGElement>(null);
  const bubbleChartContainerRef = useRef<HTMLDivElement>(null);

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
      setError('Failed to load analytics data');
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
      toast.error('Failed to load employee reports');
    } finally {
      setLoadingReports(false);
    }
  };

  const closeEmployeeReportsModal = () => {
    setShowEmployeeReportsModal(false);
    setSelectedEmployee(null);
    setEmployeeReports([]);
  };

  // D3 Bubble Chart
  useEffect(() => {
    if (!projectsData || !bubbleChartRef.current || activeTab !== 'projects') return;

    const svg = d3.select(bubbleChartRef.current);
    svg.selectAll('*').remove();

    const container = bubbleChartContainerRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = 400;

    svg.attr('width', width).attr('height', height);

    const projects = projectsData.projects.filter(p => p.totalActualHours > 0 || p.employeeCount > 0);

    if (projects.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#6b7280')
        .text('No workload data to display');
      return;
    }

    // Create bubble data
    const bubbleData = projects.map(p => ({
      ...p,
      radius: Math.max(20, Math.min(60, p.totalActualHours * 2 + 10)),
    }));

    // Create color scale
    const colorScale = d3.scaleOrdinal<string>()
      .domain(['Active', 'Completed'])
      .range(['#3b82f6', '#22c55e']);

    // Create simulation
    const simulation = d3.forceSimulation(bubbleData as any)
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05))
      .force('collide', d3.forceCollide((d: any) => d.radius + 2))
      .stop();

    // Run simulation
    for (let i = 0; i < 120; i++) simulation.tick();

    // Create tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'analytics-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'white')
      .style('border', '1px solid #e5e7eb')
      .style('border-radius', '8px')
      .style('padding', '12px')
      .style('box-shadow', '0 4px 6px -1px rgba(0,0,0,0.1)')
      .style('font-size', '14px')
      .style('z-index', '1000')
      .style('pointer-events', 'none');

    // Draw bubbles
    const bubbles = svg.selectAll('g.bubble')
      .data(bubbleData)
      .enter()
      .append('g')
      .attr('class', 'bubble')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`);

    bubbles.append('circle')
      .attr('r', (d: any) => d.radius)
      .attr('fill', (d: any) => colorScale(d.status))
      .attr('opacity', 0.8)
      .attr('stroke', (d: any) => d3.color(colorScale(d.status))?.darker(0.5)?.toString() || '#000')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d: any) {
        d3.select(this).attr('opacity', 1);
        tooltip.style('visibility', 'visible')
          .html(`
            <div style="font-weight: 600; margin-bottom: 4px;">${d.name}</div>
            <div style="color: #6b7280;">Customer: ${d.customerName}</div>
            <div style="color: #6b7280;">Manager: ${d.managerName}</div>
            <div style="color: #6b7280;">Hours: ${d.totalActualHours}h</div>
            <div style="color: #6b7280;">Team: ${d.employeeCount} members</div>
            <div style="color: #6b7280;">Progress: ${d.progress}%</div>
          `);
      })
      .on('mousemove', function(event) {
        tooltip.style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.8);
        tooltip.style('visibility', 'hidden');
      });

    // Add labels for larger bubbles
    bubbles.filter((d: any) => d.radius > 30)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('fill', 'white')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .style('pointer-events', 'none')
      .text((d: any) => d.name.length > 10 ? d.name.substring(0, 10) + '...' : d.name);

    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 120}, 20)`);

    ['Active', 'Completed'].forEach((status, i) => {
      const g = legend.append('g')
        .attr('transform', `translate(0, ${i * 25})`);

      g.append('circle')
        .attr('r', 8)
        .attr('fill', colorScale(status));

      g.append('text')
        .attr('x', 15)
        .attr('y', 4)
        .attr('font-size', '12px')
        .attr('fill', '#374151')
        .text(status);
    });

    // Cleanup tooltip on unmount
    return () => {
      d3.selectAll('.analytics-tooltip').remove();
    };
  }, [projectsData, activeTab]);

  // Export to PDF
  const exportToPDF = () => {
    if (!projectsData || !employeesData) {
      toast.error('No data to export');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(31, 41, 55);
    doc.text('ProjectDB Analytics Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Date range
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Report generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text(`Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text('Summary', 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.text(`Total Projects: ${projectsData.summary.totalProjects}`, 14, yPos);
    yPos += 6;
    doc.text(`Active Projects: ${projectsData.summary.activeProjects}`, 14, yPos);
    yPos += 6;
    doc.text(`Completed Projects: ${projectsData.summary.completedProjects}`, 14, yPos);
    yPos += 6;
    doc.text(`Total Hours Worked: ${projectsData.summary.totalHoursWorked}h`, 14, yPos);
    yPos += 6;
    doc.text(`Total Employees: ${employeesData.summary.totalEmployees}`, 14, yPos);
    yPos += 6;
    doc.text(`Average Hours per Employee: ${employeesData.summary.averageHoursWorked}h`, 14, yPos);
    yPos += 15;

    // Projects Section
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text('Projects Workload', 14, yPos);
    yPos += 10;

    // Table header
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text('Project', 14, yPos);
    doc.text('Status', 70, yPos);
    doc.text('Team', 95, yPos);
    doc.text('Hours', 115, yPos);
    doc.text('Progress', 135, yPos);
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
    doc.text('Employee Work Hours', 14, yPos);
    yPos += 10;

    // Table header
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text('Employee', 14, yPos);
    doc.text('Hours Worked', 80, yPos);
    doc.text('Expected', 115, yPos);
    doc.text('Deviation', 145, yPos);
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
    toast.success('PDF report exported successfully');
  };

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
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="page-title">Analytics</h1>
        <button
          onClick={exportToPDF}
          className="btn-primary flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Export PDF
        </button>
      </div>

      {/* Date Range Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field w-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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
            <label htmlFor="showComparison" className="text-sm text-gray-700">Compare with</label>
          </div>
          {showComparison && (
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Compare Date</label>
              <input
                type="date"
                value={compareDate}
                onChange={(e) => setCompareDate(e.target.value)}
                className="input-field w-full"
              />
            </div>
          )}
        </div>
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
        <div className="space-y-6">
          {/* D3 Bubble Chart */}
          <div className="card">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Projects Workload Visualization</h2>
              <p className="text-sm text-gray-500 mt-1">Bubble size represents hours worked. Hover for details.</p>
            </div>
            <div ref={bubbleChartContainerRef} className="p-4">
              <svg ref={bubbleChartRef} className="w-full" style={{ minHeight: '400px' }}></svg>
            </div>
          </div>

          {/* Comparison Data */}
          {showComparison && projectsData?.comparison && (
            <div className="card">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Period Comparison</h2>
                <p className="text-sm text-gray-500 mt-1">Comparing current period with {compareDate}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Hours</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Previous Hours</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {projectsData.projects.map((project, idx) => {
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
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Projects Workload Details</h2>
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
                    <tr
                      key={employee.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => fetchEmployeeReports(employee)}
                      title="Click to view detailed reports"
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
            <div className="p-6 text-center text-gray-500">No employee data available</div>
          )}
        </div>
      )}

      {/* Employee Reports Modal */}
      {showEmployeeReportsModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={closeEmployeeReportsModal}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Reports for {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={closeEmployeeReportsModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Summary */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Total Hours</div>
                    <div className="text-xl font-bold text-gray-900">{selectedEmployee.totalHoursWorked}h</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Expected Hours</div>
                    <div className="text-xl font-bold text-gray-900">{selectedEmployee.expectedHours}h</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Deviation</div>
                    <div className={`text-xl font-bold ${
                      selectedEmployee.deviation < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {selectedEmployee.deviation > 0 ? '+' : ''}{selectedEmployee.deviation}h
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Reports Count</div>
                    <div className="text-xl font-bold text-blue-600">{employeeReports.length}</div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
                {loadingReports ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-500">Loading reports...</span>
                  </div>
                ) : employeeReports.length === 0 ? (
                  <div className="text-center py-12">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500">No reports found for this period</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {employeeReports.map((report) => (
                      <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                              {new Date(report.date).toLocaleDateString('ru-RU', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-lg font-semibold text-gray-900">
                              {report.hoursWorked}h
                            </div>
                          </div>
                        </div>

                        {report.userText && (
                          <p className="text-gray-600 text-sm mb-3 italic">"{report.userText}"</p>
                        )}

                        {report.distributions && report.distributions.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Project Distribution</p>
                            <div className="space-y-2">
                              {report.distributions.map((dist) => (
                                <div
                                  key={dist.id}
                                  className="flex items-center justify-between bg-gray-100 rounded-md px-3 py-2"
                                >
                                  <div className="flex-1">
                                    <span className="font-medium text-gray-900">{dist.project.name}</span>
                                    {dist.description && (
                                      <span className="text-gray-500 text-sm ml-2">- {dist.description}</span>
                                    )}
                                  </div>
                                  <span className="text-blue-600 font-semibold">{dist.hours}h</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
                <button
                  onClick={closeEmployeeReportsModal}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
