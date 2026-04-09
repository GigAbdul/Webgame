import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { Button } from './ui';

const primaryNavigation = [
  { to: '/', label: 'Home' },
  { to: '/levels', label: 'Official Levels' },
  { to: '/leaderboard', label: 'Leaderboard' },
];

const signedInNavigation = [
  { to: '/profile', label: 'Profile' },
  { to: '/my-levels', label: 'My Levels' },
  { to: '/editor/new', label: 'Editor' },
];

export function AppLayout() {
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const isHomeRoute = location.pathname === '/';

  return (
    <div className="app-root">
      <div className="app-shell">
        {isHomeRoute ? (
          <div className="app-home-toolbar">
            <div className="app-corner-chip">Arcade Title Screen</div>
            <div className="flex flex-wrap items-center gap-3">
              {user ? (
                <>
                  <NavLink to="/profile" className="app-user-card">
                    <span className="app-user-label">Pilot</span>
                    <span className="app-user-name">{user.username}</span>
                  </NavLink>
                  <div className="app-star-card">
                    <span className="app-user-label">Stars</span>
                    <span className="app-user-name">{user.totalStars}</span>
                  </div>
                  <Button variant="ghost" onClick={() => clearAuth()}>
                    Log Out
                  </Button>
                </>
              ) : (
                <>
                  <NavLink to="/login">
                    <Button variant="ghost">Login</Button>
                  </NavLink>
                  <NavLink to="/register">
                    <Button>Register</Button>
                  </NavLink>
                </>
              )}
            </div>
          </div>
        ) : (
          <header className="app-header">
            <div className="app-header-main">
              <NavLink to="/" className="app-brand-lockup">
                <div className="app-brand-mark">D</div>
                <div className="app-brand-copy">
                  <p className="app-brand-eyebrow">Arcade Hub</p>
                  <h1 className="app-brand-title">DashForge</h1>
                </div>
              </NavLink>

              <div className="app-toolbar">
                <div className="app-toolbar-group">
                  <div className="app-status-tile">
                    <span className="app-status-label">Mode</span>
                    <span className="app-status-value">Play / Build / Publish</span>
                  </div>
                  <div className="app-status-tile">
                    <span className="app-status-label">Identity</span>
                    <span className="app-status-value">Arcade First Interface</span>
                  </div>
                </div>

                <div className="app-toolbar-group">
                  {user ? (
                    <>
                      <NavLink to="/profile" className="app-user-card">
                        <span className="app-user-label">Pilot</span>
                        <span className="app-user-name">{user.username}</span>
                      </NavLink>
                      <div className="app-star-card">
                        <span className="app-user-label">Stars</span>
                        <span className="app-user-name">{user.totalStars}</span>
                      </div>
                      <Button variant="ghost" onClick={() => clearAuth()}>
                        Log Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <NavLink to="/login">
                        <Button variant="ghost">Login</Button>
                      </NavLink>
                      <NavLink to="/register">
                        <Button>Register</Button>
                      </NavLink>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="app-header-rail" />

            <div className="app-header-bottom">
              <nav className="app-nav-track">
                {primaryNavigation.map((item) => (
                  <NavLink key={item.to} to={item.to} className={({ isActive }) => getNavClass(isActive)}>
                    {item.label}
                  </NavLink>
                ))}

                {user
                  ? signedInNavigation.map((item) => (
                      <NavLink key={item.to} to={item.to} className={({ isActive }) => getNavClass(isActive)}>
                        {item.label}
                      </NavLink>
                    ))
                  : null}

                {user?.role === 'ADMIN' ? (
                  <NavLink to="/admin" className={({ isActive }) => getNavClass(isActive)}>
                    Admin
                  </NavLink>
                ) : null}
              </nav>

              <div className="app-marquee">
                <span className="app-marquee-pill">Official Levels</span>
                <span className="app-marquee-copy">Bold neon UI, live stars, creator workshop, no ripped assets.</span>
              </div>
            </div>
          </header>
        )}

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function getNavClass(isActive: boolean) {
  return isActive ? 'app-nav-link is-active' : 'app-nav-link';
}
