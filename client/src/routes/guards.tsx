import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';

function getLoginRedirect(location: ReturnType<typeof useLocation>) {
  const fromPath = `${location.pathname}${location.search}${location.hash}`;
  return `/?auth=login&from=${encodeURIComponent(fromPath)}`;
}

export function ProtectedRoute() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const isAuthResolved = useAuthStore((state) => state.isAuthResolved);
  const location = useLocation();

  if (token && !isAuthResolved) {
    return null;
  }

  if (!user) {
    return <Navigate to={getLoginRedirect(location)} replace />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const isAuthResolved = useAuthStore((state) => state.isAuthResolved);
  const location = useLocation();

  if (token && !isAuthResolved) {
    return null;
  }

  if (!user) {
    return <Navigate to={getLoginRedirect(location)} replace />;
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

