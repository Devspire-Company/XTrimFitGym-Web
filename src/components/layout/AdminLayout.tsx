import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { useState, useRef, useEffect } from 'react';
import {
	Home,
	Users,
	UserCog,
	CreditCard,
	BarChart3,
	Settings,
	ChevronDown,
	LogOut,
	X,
} from 'lucide-react';

export function AdminLayout() {
	const location = useLocation();
	const dispatch = useAppDispatch();
	const { user } = useAppSelector((state) => state.auth);
	const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
	const [logoutModalOpen, setLogoutModalOpen] = useState(false);
	const [sidebarExpanded, setSidebarExpanded] = useState(false);
	const sidebarRef = useRef<HTMLElement>(null);
	const navigate = useNavigate();

	const handleLogout = () => {
		dispatch(logout());
		setLogoutModalOpen(false);
		navigate('/login');
	};

	const navItems = [
		{ path: '/dashboard', label: 'Dashboard', icon: Home },
		{ path: '/members', label: 'Member Management', icon: Users },
		{ path: '/coaches', label: 'Coach Management', icon: UserCog },
		{ path: '/memberships', label: 'Membership Management', icon: CreditCard },
		{ path: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
	];

	const isActive = (path: string) => location.pathname === path;

	// Sidebar hover behavior - expand on hover, collapse on leave
	useEffect(() => {
		const sidebar = sidebarRef.current;
		if (!sidebar) return;

		const handleMouseEnter = (e: MouseEvent) => {
			e.stopPropagation();
			setSidebarExpanded(true);
		};

		const handleMouseLeave = (e: MouseEvent) => {
			e.stopPropagation();
			setSidebarExpanded(false);
		};

		// Use mouseenter/mouseleave for better hover detection
		sidebar.addEventListener('mouseenter', handleMouseEnter);
		sidebar.addEventListener('mouseleave', handleMouseLeave);

		return () => {
			sidebar.removeEventListener('mouseenter', handleMouseEnter);
			sidebar.removeEventListener('mouseleave', handleMouseLeave);
		};
	}, []);

	return (
		<div
			className={`min-h-screen ${sidebarExpanded ? 'sidebar-expanded' : ''}`}
			style={
				{
					background: 'linear-gradient(135deg, var(--bg-darker) 0%, var(--bg-dark) 100%)',
					'--sidebar-width': sidebarExpanded ? '280px' : '90px',
				} as React.CSSProperties
			}
		>
			{/* Top Navbar */}
			<nav className="top-navbar fixed top-0 left-0 right-0 h-20 bg-[rgba(19,22,31,0.95)] backdrop-blur-md border-b border-[rgba(255,255,255,0.08)] z-50">
				<div className="flex items-center justify-between h-full px-10">
					<div className="logo flex items-center gap-3 h-10">
						<img
							src="/logo.png"
							alt="X-TRIM FIT GYM"
							className="h-full w-auto object-contain cursor-pointer"
							onClick={() => navigate('/dashboard')}
						/>
					</div>
					<div className="nav-right flex items-center gap-4">
						<div className="relative">
							<button
								onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
								className="user-profile flex items-center gap-3 px-2 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)]"
							>
								<div className="user-avatar w-9 h-9 rounded-[10px] bg-gradient-to-br from-[var(--primary-red)] to-[var(--primary-yellow)] flex items-center justify-center font-bold text-white text-sm">
									{user?.firstName?.[0] || 'A'}
									{user?.lastName?.[0] || 'D'}
								</div>
								<div className="user-info text-left hidden md:block">
									<h4 className="text-sm font-semibold text-[var(--text-primary)]">
										{user?.firstName} {user?.lastName}
									</h4>
									<p className="text-xs text-[var(--text-secondary)]">System Administrator</p>
								</div>
								<ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
							</button>
							{profileDropdownOpen && (
								<div className="dropdown-menu absolute right-0 top-full mt-2 w-56 bg-[var(--bg-darker)] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.1)] py-2 opacity-100 visible transform-none">
									<Link
										to="/settings"
										className="dropdown-item flex items-center gap-3 px-5 py-3 text-[var(--text-secondary)] text-sm hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--primary-yellow)] hover:pl-6"
										onClick={() => setProfileDropdownOpen(false)}
									>
										<Settings className="w-5 h-5" />
										<span>Settings</span>
									</Link>
									<div className="dropdown-divider h-px bg-[rgba(255,255,255,0.08)] my-1" />
									<button
										onClick={() => {
											setLogoutModalOpen(true);
											setProfileDropdownOpen(false);
										}}
										className="dropdown-item w-full flex items-center gap-3 px-5 py-3 text-[var(--text-secondary)] text-sm hover:bg-[rgba(255,255,255,0.05)] hover:text-[#EF4444] hover:pl-6"
									>
										<LogOut className="w-5 h-5" />
										<span>Logout</span>
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</nav>

			{/* Sidebar */}
			<aside ref={sidebarRef} className={`sidebar ${sidebarExpanded ? 'expanded' : ''}`}>
				<nav>
					<ul className="sidebar-menu">
						{navItems.map((item) => {
							const Icon = item.icon;
							return (
								<li key={item.path}>
									<Link
										to={item.path}
										className={`sidebar-menu a ${isActive(item.path) ? 'active' : ''}`}
									>
										<Icon className="w-5 h-5" />
										<span>{item.label}</span>
									</Link>
								</li>
							);
						})}
					</ul>
				</nav>
			</aside>

			{/* Main Content */}
			<main className="main-content">
				<Outlet />
			</main>

			{/* Logout Modal */}
			<div
				className={`modal-overlay ${logoutModalOpen ? 'active' : ''}`}
				onClick={() => setLogoutModalOpen(false)}
			>
				<div className="modal modal-center" onClick={(e) => e.stopPropagation()}>
					<div className="modal-body">
						<div className="modal-logout-icon">
							<LogOut className="w-10 h-10" />
						</div>
						<h3 className="modal-logout-title">Are you sure you want to logout?</h3>
						<p className="modal-logout-text">
							You'll need to log in again to access your admin account.
						</p>
						<div className="modal-logout-actions">
							<button
								type="button"
								className="btn-secondary"
								onClick={() => setLogoutModalOpen(false)}
							>
								<X className="w-4 h-4" />
								Cancel
							</button>
							<button type="button" className="btn-primary" onClick={handleLogout}>
								<LogOut className="w-4 h-4" />
								Yes, Logout
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Click outside to close dropdown */}
			{profileDropdownOpen && (
				<div className="fixed inset-0 z-30" onClick={() => setProfileDropdownOpen(false)} />
			)}
		</div>
	);
}
