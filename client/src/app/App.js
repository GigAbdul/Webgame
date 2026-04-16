import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, createBrowserRouter, RouterProvider } from 'react-router-dom';
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
import { LevelSetupPage } from '../pages/level-setup-page';
import { LevelsPage } from '../pages/levels-page';
import { LoginPage } from '../pages/login-page';
import { MyLevelsPage } from '../pages/my-levels-page';
import { PlayPage } from '../pages/play-page';
import { ProfilePage } from '../pages/profile-page';
import { RegisterPage } from '../pages/register-page';
const router = createBrowserRouter([
    {
        path: 'play/:slugOrId',
        element: _jsx(PlayPage, {}),
    },
    {
        element: _jsx(ProtectedRoute, {}),
        children: [
            { path: 'editor/new', element: _jsx(Navigate, { to: "/my-levels/new", replace: true }) },
            { path: 'editor/:id', element: _jsx(EditorPage, {}) },
        ],
    },
    {
        path: '/',
        element: _jsx(ArcadeScreenLayout, {}),
        children: [
            { index: true, element: _jsx(HomePage, {}) },
        ],
    },
    {
        path: '/',
        element: _jsx(AppLayout, {}),
        children: [
            { path: 'login', element: _jsx(LoginPage, {}) },
            { path: 'register', element: _jsx(RegisterPage, {}) },
            { path: 'levels', element: _jsx(LevelsPage, {}) },
            { path: 'levels/:slugOrId', element: _jsx(LevelDetailPage, {}) },
            { path: 'leaderboard', element: _jsx(LeaderboardPage, {}) },
            {
                element: _jsx(ProtectedRoute, {}),
                children: [
                    { path: 'profile', element: _jsx(ProfilePage, {}) },
                    { path: 'my-levels', element: _jsx(MyLevelsPage, {}) },
                    { path: 'my-levels/new', element: _jsx(LevelSetupPage, {}) },
                    { path: 'my-levels/:id', element: _jsx(LevelSetupPage, {}) },
                ],
            },
            {
                element: _jsx(AdminRoute, {}),
                children: [
                    { path: 'admin', element: _jsx(AdminDashboardPage, {}) },
                    { path: 'admin/levels', element: _jsx(AdminLevelsPage, {}) },
                    { path: 'admin/levels/:id', element: _jsx(AdminLevelPage, {}) },
                    { path: 'admin/create-official', element: _jsx(AdminCreateOfficialPage, {}) },
                    { path: 'admin/users', element: _jsx(AdminUsersPage, {}) },
                ],
            },
        ],
    },
]);
export function App() {
    return _jsx(RouterProvider, { router: router });
}
