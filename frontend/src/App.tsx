import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from './store';
import type { UserRole } from './store/slices/authSlice';
import { setCredentials, logout } from './store/slices/authSlice';
import { authService } from './services/auth.service';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ConstructionsPage from './pages/ConstructionsPage';
import EmployeesPage from './pages/EmployeesPage';
import CompaniesPage from './pages/CompaniesPage';
import WorkloadPage from './pages/WorkloadPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ChatLogsPage from './pages/ChatLogsPage';
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
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [isInitializing, setIsInitializing] = useState(true);

  // Fetch user data on app load if we have a token but no user data
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token && !user) {
        try {
          const userData = await authService.checkToken();
          dispatch(setCredentials({ user: userData, accessToken: token }));
        } catch {
          // Token is invalid, clear it
          dispatch(logout());
        }
      }
      setIsInitializing(false);
    };
    initAuth();
  }, [dispatch, user]);

  // Show loading while initializing auth
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

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

        {/* Analytics - Manager, Admin, Trial */}
        <Route
          path="analytics"
          element={
            <RoleRoute allowedRoles={['Admin', 'Manager', 'Trial']}>
              <AnalyticsPage />
            </RoleRoute>
          }
        />
        <Route
          path="chat-logs"
          element={
            <RoleRoute allowedRoles={['Admin']}>
              <ChatLogsPage />
            </RoleRoute>
          }
        />

        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
