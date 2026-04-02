import { Navigate, useLocation } from 'react-router';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAppSelector } from '@/store/hooks';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
	children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const { isLoaded, isSignedIn } = useClerkAuth();
	const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
	const user = useAppSelector((state) => state.auth.user);
	const location = useLocation();

	if (!isLoaded) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-[var(--bg-darker)]">
				<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary-yellow)]" />
			</div>
		);
	}

	if (!isSignedIn) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	if (!isAuthenticated || !user) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-[var(--bg-darker)]">
				<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary-yellow)]" />
			</div>
		);
	}

	if (user.role !== 'admin') {
		return <Navigate to="/login" replace />;
	}

	return <>{children}</>;
}
