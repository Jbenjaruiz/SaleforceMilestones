import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import Header from './components/Header.jsx';
import { LoadingState } from './components/States.jsx';
import AdminProjectsPage from './pages/AdminProjectsPage.jsx';
import AdminRolesPage from './pages/AdminRolesPage.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LoginPage from './pages/LoginPage.jsx';

/** Todo menos el inicio de sesión exige una sesión abierta. */
function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <main className="container main"><LoadingState>Comprobando su sesión…</LoadingState></main>;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Usuarios, roles, proyectos e importaciones son solo del Administrador. */
function RequireAdmin() {
  const { user } = useAuth();
  return user?.isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}

function Layout() {
  return (
    <>
      <Header />
      <Outlet />
      <footer className="footer container">
        <p>Los avances, fechas y retrasos se calculan con las tareas de cada hito y la fecha actual.</p>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="admin" element={<RequireAdmin />}>
                <Route path="projects" element={<AdminProjectsPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="roles" element={<AdminRolesPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}
