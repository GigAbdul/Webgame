import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';

const dockItems = [
  { label: 'R', title: 'Rank', to: '/leaderboard' },
  { label: 'L', title: 'Levels', to: '/levels' },
  { label: 'B', title: 'Build', to: '/editor/new' },
  { label: 'P', title: 'Profile', to: '/profile' },
];

export function HomePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="menu-scene">
      <div className="menu-tile left-[0%] top-[12%] h-[18%] w-[18%]" />
      <div className="menu-tile left-[18%] top-[0%] h-[18%] w-[26%]" />
      <div className="menu-tile right-[18%] top-[6%] h-[20%] w-[18%]" />
      <div className="menu-tile right-[0%] top-[0%] h-[26%] w-[22%]" />
      <div className="menu-tile left-[8%] bottom-[18%] h-[16%] w-[22%]" />
      <div className="menu-tile right-[0%] bottom-[16%] h-[20%] w-[28%]" />

      <div className="relative z-10 flex min-h-[calc(100vh-110px)] flex-col">
        <div className="px-4 pt-5 md:px-8 md:pt-7">
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="menu-title">DashForge</h1>
            <div className="menu-subtitle">Arcade Menu</div>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center px-4 pb-6 pt-6 md:px-8">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8">
            <div className="flex w-full items-end justify-center gap-4 md:gap-10">
              <Link
                to={user ? '/profile' : '/register'}
                className="menu-button menu-button-side"
                aria-label={user ? 'Open profile' : 'Create account'}
              >
                <div className="menu-face-icon">
                  <div className="menu-face-mouth" />
                </div>
              </Link>

              <Link
                to={user ? '/levels' : '/login'}
                className="menu-button menu-button-main menu-cross"
                aria-label="Play official levels"
              >
                <div className="menu-play-icon" />
              </Link>

              <Link
                to={user ? '/editor/new' : '/register'}
                className="menu-button menu-button-side"
                aria-label={user ? 'Open editor' : 'Register to build'}
              >
                <div className="menu-stack-label">
                  Forge
                  <br />
                  Mode
                </div>
              </Link>
            </div>

            <div className="text-center">
              <p className="font-display text-sm tracking-[0.3em] text-white/90">Play Official Levels</p>
              <p className="mt-2 text-sm text-white/80">
                Главное меню теперь собрано как arcade scene: большой launch по центру, режимы по бокам и быстрый dock снизу.
              </p>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-[110px] left-4 z-10 flex items-end gap-4 md:left-8">
          <div className="menu-character">
            <div className="menu-character-trail" />
            <div className="menu-character-spike left-[10px]" />
            <div className="menu-character-spike left-[36px]" />
            <div className="menu-character-spike left-[62px]" />
            <div className="menu-character-body">
              <div className="menu-character-mouth" />
            </div>
          </div>
          <div className="pb-4">
            <p className="font-display text-[10px] tracking-[0.22em] text-white/75">Pilot Select</p>
            <p className="text-sm text-white/85">{user ? user.username : 'Create a pilot and jump in'}</p>
          </div>
        </div>

        <div className="menu-dock z-10 mt-auto">
          {dockItems.map((item) => (
            <Link
              key={item.title}
              to={
                item.to === '/editor/new' && !user
                  ? '/register'
                  : item.to === '/profile' && !user
                    ? '/login'
                    : item.to
              }
              className="flex flex-col items-center gap-2"
              aria-label={item.title}
            >
              <div className="menu-dock-button">
                <span className="menu-dock-icon">{item.label}</span>
              </div>
              <span className="font-display text-[10px] tracking-[0.22em] text-white/80">{item.title}</span>
            </Link>
          ))}

          {user?.role === 'ADMIN' ? (
            <Link to="/admin" className="flex flex-col items-center gap-2" aria-label="Admin">
              <div className="menu-dock-button">
                <span className="menu-dock-icon">A</span>
              </div>
              <span className="font-display text-[10px] tracking-[0.22em] text-white/80">Admin</span>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
