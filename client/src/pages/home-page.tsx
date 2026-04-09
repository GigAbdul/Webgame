import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';

const dockItems = [
  { label: 'L', title: 'Levels', to: '/levels' },
  { label: 'R', title: 'Rank', to: '/leaderboard' },
  { label: 'B', title: 'Build', to: '/editor/new' },
  { label: 'P', title: 'Profile', to: '/profile' },
];

export function HomePage() {
  const user = useAuthStore((state) => state.user);
  const profileRoute = user ? '/profile' : '/register';
  const forgeRoute = user ? '/editor/new' : '/register';
  const playRoute = user ? '/levels' : '/login';

  return (
    <div className="home-screen">
      <div className="home-shard left-[-2%] top-[10%] h-[15%] w-[18%]" />
      <div className="home-shard left-[16%] top-[-2%] h-[18%] w-[22%]" />
      <div className="home-shard right-[14%] top-[4%] h-[18%] w-[18%]" />
      <div className="home-shard right-[-2%] top-[0%] h-[24%] w-[20%]" />
      <div className="home-shard left-[6%] bottom-[24%] h-[14%] w-[20%]" />
      <div className="home-shard right-[0%] bottom-[22%] h-[18%] w-[24%]" />

      <div className="home-main-grid">
        <div className="home-hero-copy">
          <div className="home-status-ribbon">
            <span>Neon Arcade Interface</span>
            <strong>Official Runs + Creator Workshop</strong>
          </div>
          <h1 className="menu-title">DashForge</h1>
          <div className="menu-subtitle">Arcade Main Menu</div>
          <p>
            A Geometry Dash-inspired web game interface with loud color, fast readability, official stage runs, and a
            creator workflow that feels like part of the same universe.
          </p>
        </div>

        <div className="home-action-stage">
          <div className="home-action-grid">
            <Link to={profileRoute} className="home-action-card" aria-label={user ? 'Open profile' : 'Create account'}>
              <div className="home-action-emblem">P</div>
              <div>
                <p className="arcade-eyebrow">Pilot Route</p>
                <h2 className="home-action-title">{user ? 'Profile Hub' : 'Create Pilot'}</h2>
              </div>
              <p className="home-action-copy">
                {user
                  ? 'Track stars, profile progress, and your current forge identity.'
                  : 'Register a pilot to save progress, earn stars, and unlock the editor.'}
              </p>
            </Link>

            <div className="home-play-core">
              <Link to={playRoute} className="home-play-button" aria-label="Play official levels">
                <div className="home-play-icon" />
                <div className="home-play-title">Play</div>
                <div className="home-play-subtitle">Enter the official stage select and launch a run</div>
              </Link>
            </div>

            <Link to={forgeRoute} className="home-action-card home-action-card--warm" aria-label="Open forge mode">
              <div className="home-action-emblem">F</div>
              <div>
                <p className="arcade-eyebrow">Creator Route</p>
                <h2 className="home-action-title">Forge Mode</h2>
              </div>
              <p className="home-action-copy">
                Build routes, test timings, tune triggers, and send polished levels into the moderation flow.
              </p>
            </Link>
          </div>

          <div className="home-info-row">
            <div className="home-pilot-pod">
              <div className="home-pilot-cube" aria-hidden="true">
                <span />
              </div>
              <div className="home-pilot-copy">
                <p className="arcade-eyebrow">Pilot Status</p>
                <div className="home-pilot-name">{user ? user.username : 'Guest Pilot'}</div>
                <p className="home-pilot-description">
                  {user
                    ? `Logged in and ready to run. Current total stars: ${user.totalStars}.`
                    : 'Jump in through login or register, then launch official routes and start collecting stars.'}
                </p>
              </div>
            </div>

            <div className="home-bottom-panel">
              <div>
                <p className="arcade-eyebrow">Quick Loop</p>
                <h3 className="home-action-title">Play. Learn. Build. Repeat.</h3>
              </div>
              <p className="home-bottom-copy">
                Official stages give the project its arcade pulse, while the forge keeps it alive. The UI now leans into
                that rhythm instead of looking like a generic web dashboard.
              </p>
            </div>
          </div>
        </div>

        <div className="home-quick-dock">
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
              className="home-dock-item"
              aria-label={item.title}
            >
              <div className="home-dock-button">
                <span className="home-dock-icon">{item.label}</span>
              </div>
              <span className="font-display text-[10px] tracking-[0.22em] text-white/84">{item.title}</span>
            </Link>
          ))}

          {user?.role === 'ADMIN' ? (
            <Link to="/admin" className="home-dock-item" aria-label="Admin">
              <div className="home-dock-button">
                <span className="home-dock-icon">A</span>
              </div>
              <span className="font-display text-[10px] tracking-[0.22em] text-white/84">Admin</span>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
