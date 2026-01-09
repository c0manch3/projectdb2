import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from './store';
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

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="workload" element={<WorkloadPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
