import { useEffect } from 'react';
import { SignIn, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router';
import { useAppSelector } from '@/store/hooks';
import { clerkAuthAppearance } from '@/lib/clerkAppearance';

export function LoginPage() {
	useEffect(() => {
		document.title = 'Login - X-TRIM FIT GYM';
	}, []);

	const navigate = useNavigate();
	const { isLoaded, isSignedIn } = useClerkAuth();
	const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
	const user = useAppSelector((s) => s.auth.user);

	useEffect(() => {
		if (!isLoaded) return;
		if (isSignedIn && isAuthenticated && user?.role === 'admin') {
			navigate('/dashboard', { replace: true });
		}
	}, [isLoaded, isSignedIn, isAuthenticated, user, navigate]);

	if (!isLoaded) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--bg-darker)] to-[var(--bg-dark)]">
				<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary-yellow)]" />
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--bg-darker)] to-[var(--bg-dark)] p-4">
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<img src="/logo.png" alt="X-TRIM FIT GYM" className="h-16 w-auto mx-auto mb-4" />
					<h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Welcome Back</h1>
					<p className="text-[var(--text-secondary)]">Sign in to access your admin dashboard</p>
				</div>

				<div className="flex justify-center clerk-auth-host">
					<SignIn
						routing="path"
						path="/login"
						signInUrl="/login"
						forceRedirectUrl="/dashboard"
						fallbackRedirectUrl="/dashboard"
						appearance={{
							...clerkAuthAppearance,
							elements: {
								...clerkAuthAppearance.elements,
								footerAction: 'hidden',
							},
						}}
					/>
				</div>

				<p className="text-center text-sm text-[var(--text-secondary)] mt-6">
					© {new Date().getFullYear()} X-TRIM FIT GYM. All rights reserved.
				</p>
			</div>
		</div>
	);
}
