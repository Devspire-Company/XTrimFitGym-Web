import { createBrowserRouter, Navigate } from 'react-router';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { MembersPage } from '@/pages/Members';
import { CoachesPage } from '@/pages/Coaches';
import { MembershipsPage } from '@/pages/Memberships';
import { ReportsPage } from '@/pages/Reports';
import { SettingsPage } from '@/pages/Settings';

export const router = createBrowserRouter([
	{
		path: '/login',
		element: <LoginPage />,
	},
	{
		path: '/',
		element: (
			<ProtectedRoute>
				<AdminLayout />
			</ProtectedRoute>
		),
		errorElement: <div>Error occurred</div>,
		children: [
			{
				index: true,
				element: <Navigate to="/dashboard" replace />,
			},
			{
				path: 'dashboard',
				element: <DashboardPage />,
			},
			{
				path: 'members',
				element: <MembersPage />,
			},
			{
				path: 'coaches',
				element: <CoachesPage />,
			},
			{
				path: 'memberships',
				element: <MembershipsPage />,
			},
			{
				path: 'reports',
				element: <ReportsPage />,
			},
			{
				path: 'settings',
				element: <SettingsPage />,
			},
		],
	},
]);

