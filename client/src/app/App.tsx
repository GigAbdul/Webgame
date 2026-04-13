import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ArcadeScreenLayout } from '../components/arcade-screen-layout';
import { AppLayout } from '../components/layout';
import { AdminRoute, ProtectedRoute } from '../routes/guards';
import { AdminDashboardPage } from '../pages/admin-dashboard-page';
import { AdminLevelPage } from '../pages/admin-level-page';
import { AdminLevelsPage } from '../pages/admin-levels-page';
import { AdminCreateOfficialPage } from '../pages/admin-create-official-page';
import { AdminUsersPage } from '../pages/admin-users-page';
import { EditorPage } from '../pages/editor-page';
import { HomePage } from '../pages/home-page';
import { LeaderboardPage } from '../pages/leaderboard-page';
import { LevelDetailPage } from '../pages/level-detail-page';
import { LevelsPage } from '../pages/levels-page';
import { LoginPage } from '../pages/login-page';
import { MyLevelsPage } from '../pages/my-levels-page';
import { PlayPage } from '../pages/play-page';
import { ProfilePage } from '../pages/profile-page';
import { RegisterPage } from '../pages/register-page';

const router = createBrowserRouter([
  {
    path: 'play/:slugOrId',
    element: <PlayPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: 'editor/new', element: <EditorPage /> },
      { path: 'editor/:id', element: <EditorPage /> },
    ],
  },
  {
    path: '/',
    element: <ArcadeScreenLayout />,
    children: [
      { index: true, element: <HomePage /> },
    ],
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'levels', element: <LevelsPage /> },
      { path: 'levels/:slugOrId', element: <LevelDetailPage /> },
      { path: 'leaderboard', element: <LeaderboardPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'profile', element: <ProfilePage /> },
          { path: 'my-levels', element: <MyLevelsPage /> },
        ],
      },
      {
        element: <AdminRoute />,
        children: [
          { path: 'admin', element: <AdminDashboardPage /> },
          { path: 'admin/levels', element: <AdminLevelsPage /> },
          { path: 'admin/levels/:id', element: <AdminLevelPage /> },
          { path: 'admin/create-official', element: <AdminCreateOfficialPage /> },
          { path: 'admin/users', element: <AdminUsersPage /> },
        ],
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
