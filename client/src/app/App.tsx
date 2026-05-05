import { Suspense, lazy } from 'react';
import { Navigate, createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ArcadeScreenLayout } from '../components/arcade-screen-layout';
import { AppLayout } from '../components/layout';
import { AdminRoute, ProtectedRoute } from '../routes/guards';

const AdminDashboardPage = lazy(() =>
  import('../pages/admin-dashboard-page').then((module) => ({ default: module.AdminDashboardPage })),
);
const AdminLevelPage = lazy(() =>
  import('../pages/admin-level-page').then((module) => ({ default: module.AdminLevelPage })),
);
const AdminLevelsPage = lazy(() =>
  import('../pages/admin-levels-page').then((module) => ({ default: module.AdminLevelsPage })),
);
const AdminCreateOfficialPage = lazy(() =>
  import('../pages/admin-create-official-page').then((module) => ({ default: module.AdminCreateOfficialPage })),
);
const AdminUsersPage = lazy(() =>
  import('../pages/admin-users-page').then((module) => ({ default: module.AdminUsersPage })),
);
const AdminPlayerSkinsPage = lazy(() =>
  import('../pages/admin-player-skins-page').then((module) => ({ default: module.AdminPlayerSkinsPage })),
);
const EditorPage = lazy(() => import('../pages/editor-page').then((module) => ({ default: module.EditorPage })));
const HomePage = lazy(() => import('../pages/home-page').then((module) => ({ default: module.HomePage })));
const LeaderboardPage = lazy(() =>
  import('../pages/leaderboard-page').then((module) => ({ default: module.LeaderboardPage })),
);
const LevelDetailPage = lazy(() =>
  import('../pages/level-detail-page').then((module) => ({ default: module.LevelDetailPage })),
);
const LevelSetupPage = lazy(() =>
  import('../pages/level-setup-page').then((module) => ({ default: module.LevelSetupPage })),
);
const LevelsPage = lazy(() => import('../pages/levels-page').then((module) => ({ default: module.LevelsPage })));
const MyLevelsPage = lazy(() => import('../pages/my-levels-page').then((module) => ({ default: module.MyLevelsPage })));
const PlayPage = lazy(() => import('../pages/play-page').then((module) => ({ default: module.PlayPage })));
const ProfilePage = lazy(() => import('../pages/profile-page').then((module) => ({ default: module.ProfilePage })));
const EditorManualPage = lazy(() =>
  import('../pages/editor-manual-page').then((module) => ({ default: module.EditorManualPage })),
);
const NotFoundPage = lazy(() =>
  import('../pages/system-state-page').then((module) => ({ default: module.NotFoundPage })),
);
const RouteErrorPage = lazy(() =>
  import('../pages/system-state-page').then((module) => ({ default: module.RouteErrorPage })),
);

const router = createBrowserRouter([
  {
    path: 'play/:slugOrId',
    element: <PlayPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: 'editor/new', element: <Navigate to="/my-levels/new" replace /> },
      { path: 'editor/:id', element: <EditorPage /> },
    ],
  },
  {
    path: '/',
    element: <ArcadeScreenLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
    ],
  },
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: 'login', element: <Navigate to="/?auth=login" replace /> },
      { path: 'register', element: <Navigate to="/?auth=register" replace /> },
      { path: 'levels', element: <LevelsPage /> },
      { path: 'levels/:slugOrId', element: <LevelDetailPage /> },
      { path: 'leaderboard', element: <LeaderboardPage /> },
      { path: 'editor-manual', element: <EditorManualPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'profile', element: <ProfilePage /> },
          { path: 'my-levels', element: <MyLevelsPage /> },
          { path: 'my-levels/new', element: <LevelSetupPage /> },
          { path: 'my-levels/:id', element: <LevelSetupPage /> },
        ],
      },
      {
        element: <AdminRoute />,
        children: [
          { path: 'admin', element: <AdminDashboardPage /> },
          { path: 'admin/levels', element: <AdminLevelsPage /> },
          { path: 'admin/levels/:id', element: <AdminLevelPage /> },
          { path: 'admin/create-official', element: <AdminCreateOfficialPage /> },
          { path: 'admin/player-skins', element: <AdminPlayerSkinsPage /> },
          { path: 'admin/users', element: <AdminUsersPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return (
    <Suspense
      fallback={
        <div className="app-route-loading" role="status" aria-live="polite">
          <div className="play-screen-loading-card">
            <p className="play-screen-loading-kicker">Loading</p>
            <p>Preparing arcade screen...</p>
            <div className="loading-bar" aria-hidden="true">
              <div className="loading-bar-fill loading-bar-fill--indeterminate" />
            </div>
          </div>
        </div>
      }
    >
      <RouterProvider router={router} />
    </Suspense>
  );
}
