import { Outlet, Link, useLocation } from 'react-router';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { toggleSidebar } from '@/store/slices/uiSlice';
import { logout } from '@/store/slices/authSlice';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Home,
	Users,
	UserCog,
	CreditCard,
	BarChart3,
	Settings,
	ChevronDown,
	LogOut,
} from 'lucide-react';

export function AdminLayout() {
	const location = useLocation();
	const dispatch = useAppDispatch();
	const { user } = useAppSelector((state) => state.auth);
	const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
	const [logoutModalOpen, setLogoutModalOpen] = useState(false);

	const handleLogout = () => {
		dispatch(logout());
		window.location.href = '/';
	};

	const navItems = [
		{ path: '/dashboard', label: 'Dashboard', icon: Home },
		{ path: '/members', label: 'Member Management', icon: Users },
		{ path: '/coaches', label: 'Coach Management', icon: UserCog },
		{ path: '/memberships', label: 'Membership Management', icon: CreditCard },
		{ path: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
	];

	const isActive = (path: string) => location.pathname === path;

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			{/* Top Navbar */}
			<nav className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50">
				<div className="flex items-center justify-between h-full px-6">
					<div className="flex items-center gap-4">
						<img src="/logo.png" alt="X-TRIM FIT GYM" className="h-10" />
					</div>
					<div className="flex items-center gap-4">
						<div className="relative">
							<button
								onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
								className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
							>
								<div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
									{user?.firstName?.[0] || 'A'}
									{user?.lastName?.[0] || 'D'}
								</div>
								<div className="text-left hidden md:block">
									<h4 className="font-semibold text-sm">
										{user?.firstName} {user?.lastName}
									</h4>
									<p className="text-xs text-gray-500 dark:text-gray-400">
										System Administrator
									</p>
								</div>
								<ChevronDown className="w-4 h-4" />
							</button>
							{profileDropdownOpen && (
								<div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2">
									<Link
										to="/settings"
										className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
										onClick={() => setProfileDropdownOpen(false)}
									>
										<Settings className="w-4 h-4" />
										<span>Settings</span>
									</Link>
									<div className="border-t border-gray-200 dark:border-gray-700 my-2" />
									<button
										onClick={() => {
											setLogoutModalOpen(true);
											setProfileDropdownOpen(false);
										}}
										className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-red-600 dark:text-red-400"
									>
										<LogOut className="w-4 h-4" />
										<span>Logout</span>
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</nav>

			{/* Sidebar */}
			<aside className="fixed left-0 top-16 bottom-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto z-40">
				<nav className="p-4">
					<ul className="space-y-2">
						{navItems.map((item) => {
							const Icon = item.icon;
							return (
								<li key={item.path}>
									<Link
										to={item.path}
										className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
											isActive(item.path)
												? 'bg-primary text-primary-foreground'
												: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
										}`}
									>
										<Icon className="w-5 h-5" />
										<span className="font-medium">{item.label}</span>
									</Link>
								</li>
							);
						})}
					</ul>
				</nav>
			</aside>

			{/* Main Content */}
			<main className="ml-64 mt-16 p-6">
				<Outlet />
			</main>

			{/* Logout Modal */}
			{logoutModalOpen && (
				<div
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
					onClick={() => setLogoutModalOpen(false)}
				>
					<div
						className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="text-center mb-6">
							<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
								<LogOut className="w-8 h-8 text-red-600 dark:text-red-400" />
							</div>
							<h3 className="text-xl font-semibold mb-2">Are you sure you want to logout?</h3>
							<p className="text-gray-600 dark:text-gray-400">
								You'll need to log in again to access your admin account.
							</p>
						</div>
						<div className="flex gap-3">
							<Button
								variant="outline"
								className="flex-1"
								onClick={() => setLogoutModalOpen(false)}
							>
								Cancel
							</Button>
							<Button variant="destructive" className="flex-1" onClick={handleLogout}>
								<LogOut className="w-4 h-4" />
								Yes, Logout
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Click outside to close dropdown */}
			{profileDropdownOpen && (
				<div
					className="fixed inset-0 z-30"
					onClick={() => setProfileDropdownOpen(false)}
				/>
			)}
		</div>
	);
}

