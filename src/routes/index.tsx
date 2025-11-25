import { createBrowserRouter } from 'react-router';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DashboardPage } from '@/pages/Dashboard';
import { MembersPage } from '@/pages/Members';
import { CoachesPage } from '@/pages/Coaches';
import { MembershipsPage } from '@/pages/Memberships';
import { ReportsPage } from '@/pages/Reports';
import { SettingsPage } from '@/pages/Settings';

export const router = createBrowserRouter([
	{
		path: '/',
		element: <AdminLayout />,
		errorElement: <div>Error occurred</div>,
		children: [
			{
				index: true,
				element: <DashboardPage />,
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

