import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { Button } from './ui';
import { ViewportFit } from './viewport-fit';

const primaryNavigation = [
  { to: '/', label: 'Home' },
  { to: '/levels', label: 'Official Levels' },
  { to: '/leaderboard', label: 'Leaderboard' },
];

const signedInNavigation = [
  { to: '/profile', label: 'Profile' },
  { to: '/my-levels', label: 'Workshop' },
];

export function AppLayout() {
  const location = useLocation();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const isAuthResolved = useAuthStore((state) => state.isAuthResolved);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const showAuthenticatedUi = Boolean(user && isAuthResolved);
  const showGuestUi = !token || isAuthResolved;
  const isHomeRoute = location.pathname === '/';
  const isWorkshopDetailRoute = location.pathname.startsWith('/my-levels/');
  const isSkinStudioRoute = location.pathname === '/admin/player-skins';
  const levelsViewportFitClassName = isSkinStudioRoute
    ? 'viewport-fit-frame--skin-studio'
    : location.pathname === '/levels'
      ? 'viewport-fit-frame--levels-classic'
      : 'viewport-fit-frame--arcade-blue';
  const isFullScreenArcadeRoute =
    location.pathname === '/levels' ||
    location.pathname === '/my-levels' ||
    location.pathname === '/leaderboard' ||
    isWorkshopDetailRoute ||
    isSkinStudioRoute;

  useEffect(() => {
    document.body.classList.toggle('skin-studio-route-active', isSkinStudioRoute);
    document.getElementById('root')?.classList.toggle('skin-studio-route-active', isSkinStudioRoute);

    return () => {
      document.body.classList.remove('skin-studio-route-active');
      document.getElementById('root')?.classList.remove('skin-studio-route-active');
    };
  }, [isSkinStudioRoute]);

  if (isSkinStudioRoute) {
    return (
      <div className="app-root app-root--levels viewport-fit-frame--skin-studio">
        <main className="app-main app-main--levels app-main--skin-studio">
          <Outlet />
        </main>
      </div>
    );
  }

  if (isFullScreenArcadeRoute) {
    return (
      <div className="app-root app-root--levels">
        <ViewportFit className={levelsViewportFitClassName}>
          <main className="app-main app-main--levels">
            <Outlet />
          </main>
        </ViewportFit>
      </div>
    );
  }

  return (
    <div className="app-root">
      <ViewportFit className="viewport-fit-frame--app">
        <div className="app-shell">
          {isHomeRoute ? (
            <div className="app-home-toolbar">
              <div className="app-corner-chip">Arcade Title Screen</div>
              <div className="flex flex-wrap items-center gap-3">
                {showAuthenticatedUi ? (
                  <>
                    <NavLink to="/profile" className="app-user-card">
                      <span className="app-user-label">Pilot</span>
                      <span className="app-user-name">{user!.username}</span>
                    </NavLink>
                    <div className="app-star-card">
                      <span className="app-user-label">Stars</span>
                      <span className="app-user-name">{user!.totalStars}</span>
                    </div>
                    <Button variant="ghost" onClick={() => clearAuth()}>
                      Log Out
                    </Button>
                  </>
                ) : showGuestUi ? (
                  <>
                    <NavLink to="/login">
                      <Button variant="ghost">Login</Button>
                    </NavLink>
                    <NavLink to="/register">
                      <Button>Register</Button>
                    </NavLink>
                  </>
                ) : null}
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
                    {showAuthenticatedUi ? (
                      <>
                        <NavLink to="/profile" className="app-user-card">
                          <span className="app-user-label">Pilot</span>
                          <span className="app-user-name">{user!.username}</span>
                        </NavLink>
                        <div className="app-star-card">
                          <span className="app-user-label">Stars</span>
                          <span className="app-user-name">{user!.totalStars}</span>
                        </div>
                        <Button variant="ghost" onClick={() => clearAuth()}>
                          Log Out
                        </Button>
                      </>
                    ) : showGuestUi ? (
                      <>
                        <NavLink to="/login">
                          <Button variant="ghost">Login</Button>
                        </NavLink>
                        <NavLink to="/register">
                          <Button>Register</Button>
                        </NavLink>
                      </>
                    ) : null}
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

                  {showAuthenticatedUi
                    ? signedInNavigation.map((item) => (
                        <NavLink key={item.to} to={item.to} className={({ isActive }) => getNavClass(isActive)}>
                          {item.label}
                        </NavLink>
                      ))
                    : null}

                  {showAuthenticatedUi && user?.role === 'ADMIN' ? (
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
      </ViewportFit>
    </div>
  );
}

function getNavClass(isActive: boolean) {
  return isActive ? 'app-nav-link is-active' : 'app-nav-link';
}
