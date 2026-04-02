import { createBrowserRouter, Navigate } from 'react-router';
import { Root } from '@/components/Root';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { MembersPage } from '@/pages/Members';
import { CoachesPage } from '@/pages/Coaches';
import { MembershipsPage } from '@/pages/Memberships';
import { ReportsPage } from '@/pages/Reports';
import { SettingsPage } from '@/pages/Settings';
import { AttendancePage } from '@/pages/Attendance';
import { SubscriptionRequestsPage } from '@/pages/SubscriptionRequests';
import { EquipmentPage } from '@/pages/Equipment';
import { WalkInAttendancePage } from '@/pages/WalkInAttendance';

export const router = createBrowserRouter([
	{
		element: <Root />,
		children: [
			{
				path: '/login/*',
				element: <LoginPage />,
			},
			{
				path: '/sign-up/*',
				element: <Navigate to="/login" replace />,
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
					{
						path: 'attendance',
						element: <AttendancePage />,
					},
					{
						path: 'walk-in-attendance',
						element: <WalkInAttendancePage />,
					},
					{
						path: 'subscription-requests',
						element: <SubscriptionRequestsPage />,
					},
					{
						path: 'equipment',
						element: <EquipmentPage />,
					},
				],
			},
		],
	},
]);

