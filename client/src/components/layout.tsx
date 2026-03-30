import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { Button } from './ui';

const navigation = [
  { to: '/', label: 'Home' },
  { to: '/levels', label: 'Official Levels' },
  { to: '/leaderboard', label: 'Leaderboard' },
];

export function AppLayout() {
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const isHomeRoute = location.pathname === '/';
  const navButtonClass =
    'font-display inline-flex items-center justify-center rounded-none px-4 py-3 text-[10px] tracking-[0.22em] uppercase text-white transition hover:brightness-110';

  return (
    <div className="min-h-screen text-white">
      <div
        className={
          isHomeRoute
            ? 'relative mx-auto flex min-h-screen max-w-[1500px] flex-col px-3 pb-4 pt-3 md:px-5'
            : 'relative mx-auto flex min-h-screen max-w-[1500px] flex-col px-3 pb-8 pt-3 md:px-5'
        }
      >
        {isHomeRoute ? (
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="game-chip-purple px-4 py-2 font-display text-[10px] tracking-[0.24em] text-white/85">
              DashForge Menu
            </div>
            <div className="flex flex-wrap gap-2">
              {user ? (
                <>
                  <NavLink
                    to="/profile"
                    className="game-chip-purple px-4 py-2 font-display text-[10px] tracking-[0.22em] text-white"
                  >
                    {user.username}
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => clearAuth()}
                    className="game-chip-purple px-4 py-2 font-display text-[10px] tracking-[0.22em] text-white/90"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <NavLink
                    to="/login"
                    className="game-chip-purple px-4 py-2 font-display text-[10px] tracking-[0.22em] text-white/90"
                  >
                    Login
                  </NavLink>
                  <NavLink
                    to="/register"
                    className="game-chip px-4 py-2 font-display text-[10px] tracking-[0.22em] text-[#173300]"
                  >
                    Register
                  </NavLink>
                </>
              )}
            </div>
          </div>
        ) : null}

        {!isHomeRoute ? (
          <header className="game-screen mb-8 px-4 py-5 md:px-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-4">
                  <NavLink to="/" className="flex items-center gap-4">
                    <div className="game-chip grid h-16 w-16 place-items-center font-display text-2xl text-[#173300]">
                      D
                    </div>
                    <div>
                      <p className="font-display text-[11px] tracking-[0.34em] text-[#ffd44a]">Arcade Hub</p>
                      <h1 className="menu-title text-[2.6rem] md:text-[3.5rem]">DashForge</h1>
                    </div>
                  </NavLink>

                  <div className="game-stat px-4 py-3">
                    <p className="font-display text-[10px] tracking-[0.24em] text-[#ffd44a]">Mode</p>
                    <p className="mt-1 font-display text-sm text-white">Official + Forge</p>
                  </div>

                  <div className="game-stat px-4 py-3">
                    <p className="font-display text-[10px] tracking-[0.24em] text-[#ffd44a]">Loop</p>
                    <p className="mt-1 font-display text-sm text-white">Play / Build / Publish</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {user ? (
                    <>
                      <NavLink to="/profile" className="game-chip-purple px-4 py-3">
                        <p className="font-display text-[10px] tracking-[0.22em] text-white/65">Pilot</p>
                        <p className="font-display text-sm text-white">{user.username}</p>
                      </NavLink>
                      <div className="game-chip-gold px-4 py-3">
                        <p className="font-display text-[10px] tracking-[0.22em] text-[#734700]/75">Stars</p>
                        <p className="font-display text-sm text-[#734700]">{user.totalStars}</p>
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

              <div className="h-[4px] bg-[linear-gradient(90deg,transparent,#caff45,#ffd44a,transparent)]" />

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <nav className="flex flex-wrap gap-3">
                  {navigation.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        isActive
                          ? `game-chip ${navButtonClass} text-[#173300]`
                          : `game-chip-purple ${navButtonClass}`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                  {user ? (
                    <>
                      <NavLink to="/profile" className={`game-chip-purple ${navButtonClass}`}>
                        Profile
                      </NavLink>
                      <NavLink to="/my-levels" className={`game-chip-purple ${navButtonClass}`}>
                        My Levels
                      </NavLink>
                      <NavLink to="/editor/new" className={`game-chip-gold ${navButtonClass} text-[#734700]`}>
                        Editor
                      </NavLink>
                      {user.role === 'ADMIN' ? (
                        <NavLink to="/admin" className={`game-chip-purple ${navButtonClass}`}>
                          Admin
                        </NavLink>
                      ) : null}
                    </>
                  ) : null}
                </nav>

                <div className="flex flex-wrap items-center gap-3 text-xs text-white/72">
                  <span className="font-display tracking-[0.22em] text-[#ffd44a]">Stage Select UI</span>
                  <span className="h-2 w-2 rounded-full bg-[#caff45] shadow-[0_0_12px_rgba(202,255,69,0.9)]" />
                  <span>Original look, no ripped assets</span>
                  <span className="h-2 w-2 rounded-full bg-[#ffd44a] shadow-[0_0_12px_rgba(255,212,74,0.9)]" />
                  <span>Stars sync live</span>
                </div>
              </div>
            </div>
          </header>
        ) : null}

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
