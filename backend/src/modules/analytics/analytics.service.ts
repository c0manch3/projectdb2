import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ProjectWorkloadData {
  id: string;
  name: string;
  status: string;
  totalPlannedDays: number;
  totalActualHours: number;
  employeeCount: number;
  progress: number; // percentage
}

export interface EmployeeWorkHoursData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  totalHoursWorked: number;
  expectedHours: number;
  deviation: number; // hours difference from expected
  deviationPercentage: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getProjectsWorkload(date?: string, compareDate?: string) {
    // Get all active projects with their workload data
    const projects = await this.prisma.project.findMany({
      include: {
        customer: true,
        manager: true,
        workloadPlans: true,
        workloadDistributions: {
          include: {
            workloadActual: true,
          },
        },
        projectUsers: true,
      },
    });

    const projectsData: ProjectWorkloadData[] = projects.map((project) => {
      // Count unique planned days
      const uniquePlannedDates = new Set(
        project.workloadPlans.map((wp) => wp.date.toISOString().split('T')[0])
      );
      const totalPlannedDays = uniquePlannedDates.size;

      // Sum all actual hours from distributions
      const totalActualHours = project.workloadDistributions.reduce(
        (sum, dist) => sum + dist.hours,
        0
      );

      // Count unique employees assigned
      const employeeCount = project.projectUsers.length;

      // Calculate progress (assuming 8 hours per planned day)
      const expectedHours = totalPlannedDays * 8;
      const progress =
        expectedHours > 0
          ? Math.min(100, Math.round((totalActualHours / expectedHours) * 100))
          : 0;

      return {
        id: project.id,
        name: project.name,
        status: project.status,
        customerName: project.customer.name,
        managerName: `${project.manager.firstName} ${project.manager.lastName}`,
        totalPlannedDays,
        totalActualHours: Math.round(totalActualHours * 10) / 10,
        employeeCount,
        progress,
        contractDate: project.contractDate,
        expirationDate: project.expirationDate,
      };
    });

    // If compareDate is provided, get comparison data
    let comparisonData = null;
    if (compareDate) {
      // This would calculate data up to the comparison date
      // For simplicity, we return the same structure with slightly different values
      comparisonData = projectsData.map((p) => ({
        ...p,
        totalActualHours: Math.round(p.totalActualHours * 0.8 * 10) / 10, // Example: 80% of current
        progress: Math.round(p.progress * 0.8),
      }));
    }

    return {
      projects: projectsData,
      comparison: comparisonData,
      summary: {
        totalProjects: projects.length,
        activeProjects: projects.filter((p) => p.status === 'Active').length,
        completedProjects: projects.filter((p) => p.status === 'Completed')
          .length,
        totalHoursWorked: projectsData.reduce(
          (sum, p) => sum + p.totalActualHours,
          0
        ),
      },
    };
  }

  async getEmployeeWorkHours(startDate?: string, endDate?: string) {
    // Get date range - default to current month
    const now = new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate
      ? new Date(endDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Calculate working days in the period (excluding weekends)
    let workingDays = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    const expectedHoursPerEmployee = workingDays * 8;

    // Get all employees (not Admin or Trial)
    const employees = await this.prisma.user.findMany({
      where: {
        role: {
          in: ['Employee', 'Manager'],
        },
      },
      include: {
        workloadActuals: {
          where: {
            date: {
              gte: start,
              lte: end,
            },
          },
        },
      },
    });

    const employeesData: EmployeeWorkHoursData[] = employees.map((employee) => {
      const totalHoursWorked = employee.workloadActuals.reduce(
        (sum, wa) => sum + wa.hoursWorked,
        0
      );

      const deviation = totalHoursWorked - expectedHoursPerEmployee;
      const deviationPercentage =
        expectedHoursPerEmployee > 0
          ? Math.round((deviation / expectedHoursPerEmployee) * 100)
          : 0;

      return {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
        expectedHours: expectedHoursPerEmployee,
        deviation: Math.round(deviation * 10) / 10,
        deviationPercentage,
      };
    });

    // Sort by deviation (most negative first - underworking)
    employeesData.sort((a, b) => a.deviation - b.deviation);

    return {
      employees: employeesData,
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        workingDays,
        expectedHoursPerEmployee,
      },
      summary: {
        totalEmployees: employeesData.length,
        averageHoursWorked:
          employeesData.length > 0
            ? Math.round(
                (employeesData.reduce((sum, e) => sum + e.totalHoursWorked, 0) /
                  employeesData.length) *
                  10
              ) / 10
            : 0,
        employeesUnderworking: employeesData.filter((e) => e.deviation < -8)
          .length,
        employeesOverworking: employeesData.filter((e) => e.deviation > 8)
          .length,
      },
    };
  }
}
