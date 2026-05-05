import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { Button } from './ui';
import { ViewportFit } from './viewport-fit';

export function ArcadeScreenLayout() {
  const location = useLocation();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const isAuthResolved = useAuthStore((state) => state.isAuthResolved);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const showAuthenticatedUi = Boolean(user && isAuthResolved);
  const showGuestUi = !token || isAuthResolved;
  const isHomeRoute = location.pathname === '/';
  const routeMode = location.pathname.startsWith('/editor')
    ? 'Forge Mode'
    : location.pathname.startsWith('/play')
      ? 'Run Mode'
      : 'Menu Mode';
  const routeHint = location.pathname.startsWith('/editor')
    ? 'Creator workshop and live preview'
    : location.pathname.startsWith('/play')
      ? 'Official run wrapper with session HUD'
      : 'Main menu launch scene';

  if (isHomeRoute) {
    return (
      <div className="app-root app-root--home">
        <ViewportFit className="viewport-fit-frame--home">
          <main className="app-main app-main--home">
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
          <div className="mode-header">
            <div className="mode-header-main">
              <NavLink to="/" className="app-brand-lockup">
                <div className="app-brand-mark">D</div>
                <div className="app-brand-copy">
                  <p className="app-brand-eyebrow">Arcade Route</p>
                  <h1 className="app-brand-title">DashForge</h1>
                </div>
              </NavLink>

              <div className="mode-header-right">
                <div className="mode-chip-cluster">
                  <span className="mode-chip">{routeMode}</span>
                  <span className="mode-chip mode-chip--ghost">{routeHint}</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {!location.pathname.startsWith('/levels') && !location.pathname.startsWith('/play') ? null : (
                    <NavLink to="/levels">
                      <Button variant="secondary">Back To Levels</Button>
                    </NavLink>
                  )}

                  {showAuthenticatedUi ? (
                    <>
                      <NavLink to="/profile" className="app-user-card">
                        <span className="app-user-label">Pilot</span>
                        <span className="app-user-name">{user!.username}</span>
                      </NavLink>
                      <Button variant="ghost" onClick={() => clearAuth()}>
                        Log Out
                      </Button>
                    </>
                  ) : showGuestUi ? (
                    <>
                      <NavLink to="/?auth=login">
                        <Button variant="ghost">Login</Button>
                      </NavLink>
                      <NavLink to="/?auth=register">
                        <Button>Register</Button>
                      </NavLink>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mode-header-lane">
              <span>Neon arcade framing</span>
              <span>Fast readable UI</span>
              <span>Gameplay logic preserved</span>
            </div>
          </div>

          <main className="app-main">
            <Outlet />
          </main>
        </div>
      </ViewportFit>
    </div>
  );
}
