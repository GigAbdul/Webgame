import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { Button } from './ui';

export function ArcadeScreenLayout() {
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const isHomeRoute = location.pathname === '/';
  const routeMode = location.pathname.startsWith('/editor')
    ? 'Forge Mode'
    : location.pathname.startsWith('/play')
      ? 'Run Mode'
      : 'Menu';

  return (
    <div className="min-h-screen text-white">
      <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col px-3 pb-4 pt-3 md:px-5">
        <div className="immersive-shell-bar mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <NavLink to="/" className="immersive-brand">
              <span className="immersive-brand-mark">D</span>
              <span className="font-display text-[11px] tracking-[0.26em] text-white/92">DashForge</span>
            </NavLink>

            <div className="game-chip-gold px-4 py-2 font-display text-[10px] tracking-[0.22em] text-[#734700]">
              {routeMode}
            </div>

            {!isHomeRoute ? (
              <NavLink to="/levels">
                <Button variant="ghost">Back To Levels</Button>
              </NavLink>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {user ? (
              <>
                <NavLink to="/profile" className="game-chip-purple px-4 py-2">
                  <p className="font-display text-[10px] tracking-[0.2em] text-white/68">Pilot</p>
                  <p className="font-display text-sm text-white">{user.username}</p>
                </NavLink>
                <button
                  type="button"
                  onClick={() => clearAuth()}
                  className="game-chip-purple px-4 py-2 font-display text-[10px] tracking-[0.22em] text-white"
                >
                  Logout
                </button>
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

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
