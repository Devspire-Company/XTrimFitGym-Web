import { Navigate, useLocation } from 'react-router';
import { useAppSelector } from '@/store/hooks';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
	children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
	const user = useAppSelector((state) => state.auth.user);
	const location = useLocation();

	// Check if user is authenticated
	if (!isAuthenticated) {
		// Redirect to login but save the location they were trying to go to
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	// Check if user is an admin - only admins can access the web app
	if (user?.role !== 'admin') {
		// Logout non-admin users and redirect to login
		return <Navigate to="/login" replace />;
	}

	return <>{children}</>;
}

