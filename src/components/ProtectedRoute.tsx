import { Navigate, useLocation } from 'react-router';
import { useAppSelector } from '@/store/hooks';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
	children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
	const location = useLocation();

	if (!isAuthenticated) {
		// Redirect to login but save the location they were trying to go to
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	return <>{children}</>;
}

