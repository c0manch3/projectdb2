import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from './store';
import type { UserRole } from './store/slices/authSlice';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ConstructionsPage from './pages/ConstructionsPage';
import EmployeesPage from './pages/EmployeesPage';
import CompaniesPage from './pages/CompaniesPage';
import WorkloadPage from './pages/WorkloadPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Protected route wrapper - just checks authentication
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login with the current path as redirect parameter
    const redirectUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectUrl}`} replace />;
  }

  return <>{children}</>;
}

// Role-based route wrapper
function RoleRoute({
  children,
  allowedRoles
}: {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}) {
  const { user } = useAppSelector((state) => state.auth);

  if (!user || !allowedRoles.includes(user.role)) {
    // Redirect to projects (dashboard) if user doesn't have permission
    return <Navigate to="/projects" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="constructions" element={<ConstructionsPage />} />

        {/* Admin/Manager only routes */}
        <Route
          path="employees"
          element={
            <RoleRoute allowedRoles={['Admin', 'Manager']}>
              <EmployeesPage />
            </RoleRoute>
          }
        />
        <Route
          path="companies"
          element={
            <RoleRoute allowedRoles={['Admin', 'Manager']}>
              <CompaniesPage />
            </RoleRoute>
          }
        />

        <Route path="workload" element={<WorkloadPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
