import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Link } from 'react-router';
import { Users, UserCog, DollarSign, CreditCard, BarChart3, RefreshCw } from 'lucide-react';
import { GET_USERS, GET_REVENUE_SUMMARY } from '@/graphql/operations/index';
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	BarElement,
	Title,
	Tooltip,
	Legend,
	Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	BarElement,
	Title,
	Tooltip,
	Legend,
	Filler
);

export function DashboardPage() {
	useEffect(() => {
		document.title = 'Admin Dashboard - X-TRIM FIT GYM';
	}, []);

	// Fetch members and coaches separately
	const { data: membersData, loading: membersLoading, refetch: refetchMembers } = useQuery(GET_USERS, {
		variables: { role: 'member' },
		errorPolicy: 'none',
		pollInterval: 30000,
	});

	const { data: coachesData, loading: coachesLoading, refetch: refetchCoaches } = useQuery(GET_USERS, {
		variables: { role: 'coach' },
		errorPolicy: 'none',
		pollInterval: 30000,
	});

	// Fetch analytics data from stored analytics schema
	const { data: analyticsData, loading: analyticsLoading, error: analyticsError, refetch: refetchAnalytics } = useQuery(GET_REVENUE_SUMMARY, {
		errorPolicy: 'all',
		fetchPolicy: 'network-only',
		notifyOnNetworkStatusChange: true,
		pollInterval: 30000,
	});

	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			await Promise.all([refetchMembers(), refetchCoaches(), refetchAnalytics()]);
		} finally {
			setIsRefreshing(false);
		}
	};

	// Only block on members and coaches loading - analytics can load in background
	const loading = membersLoading || coachesLoading;
	const error = null; // Handle errors separately if needed
	const data = {
		members: membersData?.getUsers || [],
		coaches: coachesData?.getUsers || [],
	};

	// Show loading state
	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-yellow)] mx-auto mb-4"></div>
					<p className="text-[var(--text-secondary)]">Loading dashboard...</p>
				</div>
			</div>
		);
	}

	// Show error state
	if (error || !data) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="text-red-500 mb-4">
						<svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Unable to Load Dashboard</h2>
					<p className="text-[var(--text-secondary)] mb-4">
						{error?.message || 'Failed to connect to the server'}
					</p>
					<button 
						onClick={() => window.location.reload()} 
						className="btn-primary"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	const members = (data?.members || []).map((m: any) => {
		// IMPORTANT: Only use currentMembership which only returns ACTIVE transactions
		// Do NOT use membershipDetails.membershipTransaction as it may include canceled/expired transactions
		const membershipTransaction = m.currentMembership;
		// Only consider it active if the transaction exists and status is ACTIVE
		const isActive = membershipTransaction?.status === 'ACTIVE';
		return {
			id: m.id,
			name: `${m.firstName} ${m.lastName}`,
			email: m.email,
			phone: m.phoneNumber || 'N/A',
			membership: isActive ? (membershipTransaction?.membership?.name || 'No Plan') : 'No Plan',
			status: isActive ? 'Active' : 'Inactive',
			joinDate: m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A',
			avatar: `${m.firstName?.[0] || ''}${m.lastName?.[0] || ''}`,
			// Only include price if transaction is ACTIVE
			monthlyPrice: isActive ? (membershipTransaction?.membership?.monthlyPrice || 0) : 0,
			progress: {
				weightLost: 0,
				workoutsCompleted: 0,
			},
		};
	});

	const coaches = (data?.coaches || []).map((c: any) => ({
		id: c.id,
		name: `${c.firstName} ${c.lastName}`,
		email: c.email,
		phone: c.phoneNumber || 'N/A',
		specialization: c.coachDetails?.specialization?.[0] || 'General Fitness',
		yearsExperience: c.coachDetails?.yearsOfExperience?.toString() || '0',
		status: 'Active',
		avatar: `${c.firstName?.[0] || ''}${c.lastName?.[0] || ''}`,
		totalClients: c.coachDetails?.clientsIds?.length || 0,
		rating: c.coachDetails?.ratings || 5.0,
	}));

	// Calculate stats
	const totalMembers = members.length;
	const totalCoaches = coaches.length;
	
	// Use analytics data from stored analytics schema
	const analytics = analyticsData?.getRevenueSummary;
	const monthlyRevenue = analytics?.totalRevenue || 0;
	const activeSubscriptions = analytics?.activeSubscriptions || 0;

	// Recent members (last 3) - sort by join date
	const recentMembers = [...members]
		.sort((a, b) => {
			const dateA = new Date(data.members.find((m: any) => m.id === a.id)?.createdAt || 0).getTime();
			const dateB = new Date(data.members.find((m: any) => m.id === b.id)?.createdAt || 0).getTime();
			return dateB - dateA;
		})
		.slice(0, 3);

	// Membership distribution - group by actual membership names
	const membershipTypes = [...new Set(members.map(m => m.membership))];
	const membershipDistribution: Record<string, number> = {};
	membershipTypes.forEach(type => {
		membershipDistribution[type] = members.filter((m) => m.membership === type).length;
	});

	return (
		<div className="space-y-6">
			{/* Welcome Section */}
			<div className="welcome-section relative rounded-[20px] overflow-hidden p-10">
				<div className="welcome-bg-image"></div>
				<div className="welcome-content relative z-10 flex items-center justify-between">
					<div>
						<h1 className="text-[2.2rem] font-bold mb-2 gradient-text">Welcome Back, Admin!</h1>
						<p className="text-[var(--text-secondary)] text-[1.05rem]">
							Manage your gym operations, members, coaches, and track your business performance.
						</p>
					</div>
					<button
						onClick={handleRefresh}
						disabled={isRefreshing || loading}
						className="flex items-center gap-2 px-4 py-2 bg-[rgba(249,197,19,0.1)] border border-[rgba(249,197,19,0.3)] rounded-lg text-[var(--primary-yellow)] font-medium hover:bg-[rgba(249,197,19,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						title="Refresh data"
					>
						<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
						Refresh
					</button>
				</div>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<StatCard
					icon={Users}
					title="Total Members"
					value={totalMembers}
					change={`+${members.filter((m) => m.joinDate === 'November 2024').length} this month`}
					changeType="positive"
				/>
				<StatCard
					icon={UserCog}
					title="Total Coaches"
					value={totalCoaches}
					change="Active coaches"
					changeType="neutral"
				/>
				<StatCard
					icon={DollarSign}
					title="Monthly Revenue"
					value={`₱${monthlyRevenue.toLocaleString()}`}
					change="+15% from last month"
					changeType="positive"
				/>
				<StatCard
					icon={CreditCard}
					title="Active Subscriptions"
					value={activeSubscriptions}
					change="All active"
					changeType="neutral"
				/>
			</div>

			{/* Quick Actions */}
			<div className="section-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-md">
				<h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-[var(--text-primary)] font-['Poppins']">
					<span className="text-[var(--primary-yellow)]">⚡</span> Quick Actions
				</h2>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<QuickActionButton href="/members" icon={Users} label="Add Member" />
					<QuickActionButton href="/coaches" icon={UserCog} label="Add Coach" />
					<QuickActionButton href="/memberships" icon={CreditCard} label="Manage Plans" />
					<QuickActionButton href="/reports" icon={BarChart3} label="View Reports" />
				</div>
			</div>

			{/* Revenue Overview Chart - Full Width */}
			<div className="section-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-md">
				<h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-[var(--text-primary)] font-['Poppins']">
					<span className="text-[var(--primary-yellow)]">📈</span> Revenue Overview
				</h2>
				
				{/* Revenue Chart */}
				{analytics?.revenueByPeriod && analytics.revenueByPeriod.length > 0 ? (
					<div className="mb-6">
						<RevenueChart data={analytics.revenueByPeriod} />
					</div>
				) : (
					<div className="mb-6 h-80 flex items-center justify-center text-[var(--text-secondary)]">
						<p>No revenue data available</p>
					</div>
				)}

				{/* Key Stats */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[rgba(255,255,255,0.08)]">
					<div className="flex flex-col">
						<span className="text-sm text-[var(--text-secondary)] mb-1">Total Revenue</span>
						<span className="text-lg font-semibold text-[var(--text-primary)] font-['Poppins']">
							₱{monthlyRevenue.toLocaleString()}
						</span>
					</div>
					<div className="flex flex-col">
						<span className="text-sm text-[var(--text-secondary)] mb-1">Active Subscriptions</span>
						<span className="text-lg font-semibold text-[var(--text-primary)] font-['Poppins']">
							{activeSubscriptions}
						</span>
					</div>
					<div className="flex flex-col">
						<span className="text-sm text-[var(--text-secondary)] mb-1">New This Period</span>
						<span className="text-lg font-semibold text-[var(--primary-yellow)] font-['Poppins']">
							+{analytics?.newSubscriptions || 0}
						</span>
					</div>
					<div className="flex flex-col">
						<span className="text-sm text-[var(--text-secondary)] mb-1">Avg. per Member</span>
						<span className="text-lg font-semibold text-[var(--text-primary)] font-['Poppins']">
							₱{activeSubscriptions > 0 ? Math.round(monthlyRevenue / activeSubscriptions) : 0}
						</span>
					</div>
				</div>
			</div>

			{/* Content Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Recent Members */}
				<div className="section-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-md">
					<div className="section-header flex items-center justify-between mb-6 pb-4 border-b border-[rgba(255,255,255,0.08)]">
						<h2 className="text-xl font-semibold flex items-center gap-2 text-[var(--text-primary)] font-['Poppins']">
							<Users className="w-5 h-5 text-[var(--primary-yellow)]" />
							Recent Members
						</h2>
						<Link
							to="/members"
							className="view-all text-sm text-[var(--primary-yellow)] font-medium flex items-center gap-1"
						>
							View All <span>→</span>
						</Link>
					</div>
					<div className="space-y-4">
						{recentMembers.map((member) => (
							<div
								key={member.id}
								className="member-item flex items-center gap-4 p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)]"
							>
								<div className="member-avatar w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary-red)] to-[var(--primary-yellow)] flex items-center justify-center font-semibold text-white text-base flex-shrink-0">
									{member.avatar}
								</div>
								<div className="member-info flex-1">
									<h3 className="font-semibold text-[var(--text-primary)] mb-1">{member.name}</h3>
									<p className="text-sm text-[var(--text-secondary)]">
										{member.membership} Member • Joined {member.joinDate}
									</p>
								</div>
								<button className="btn-small text-sm text-[var(--primary-yellow)] bg-[rgba(249,197,19,0.1)] border border-[rgba(249,197,19,0.3)] px-4 py-2 rounded-lg font-semibold">
									View
								</button>
							</div>
						))}
					</div>
				</div>

				{/* Coaches */}
				<div className="section-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-md">
					<div className="section-header flex items-center justify-between mb-6 pb-4 border-b border-[rgba(255,255,255,0.08)]">
						<h2 className="text-xl font-semibold flex items-center gap-2 text-[var(--text-primary)] font-['Poppins']">
							<UserCog className="w-5 h-5 text-[var(--primary-yellow)]" />
							Coaches
						</h2>
						<Link
							to="/coaches"
							className="view-all text-sm text-[var(--primary-yellow)] font-medium flex items-center gap-1"
						>
							View All <span>→</span>
						</Link>
					</div>
					<div className="space-y-4">
						{coaches.map((coach) => (
							<div
								key={coach.id}
								className="coach-item flex items-center gap-4 p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)]"
							>
								<div className="coach-avatar w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary-red)] to-[var(--primary-yellow)] flex items-center justify-center font-semibold text-white text-base flex-shrink-0">
									{coach.avatar}
								</div>
								<div className="coach-info flex-1">
									<h3 className="font-semibold text-[var(--text-primary)] mb-1">{coach.name}</h3>
									<p className="text-sm text-[var(--text-secondary)]">
										{coach.specialization} • {coach.yearsExperience} years experience
									</p>
								</div>
								<button className="btn-small text-sm text-[var(--primary-yellow)] bg-[rgba(249,197,19,0.1)] border border-[rgba(249,197,19,0.3)] px-4 py-2 rounded-lg font-semibold">
									View
								</button>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Membership Distribution - Full Width */}
			<div className="section-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-md">
				<h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-[var(--text-primary)] font-['Poppins']">
					<span className="text-[var(--primary-yellow)]">📊</span> Membership Distribution
				</h2>
				<div className="membership-distribution space-y-3">
					{Object.entries(membershipDistribution).map(([name, count]) => {
						const percentage = totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0;
						return (
							<div
								key={name}
								className="membership-item flex items-center justify-between p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)]"
							>
								<div className="membership-info flex items-center gap-3">
									<div
										className={`membership-color w-4 h-4 rounded ${
											name === 'Student'
												? 'bg-[var(--primary-gray)]'
												: name === 'PROMO Student'
													? 'bg-gradient-to-br from-[var(--primary-red)] to-[var(--primary-yellow)]'
													: 'bg-gradient-to-br from-[#8B4513] to-[#A0522D]'
										}`}
									/>
									<span className="membership-name font-medium text-[var(--text-primary)]">
										{name}
									</span>
								</div>
								<div className="membership-stats flex flex-col items-end gap-1">
									<span className="membership-count font-bold text-[var(--text-primary)] font-['Poppins']">
										{count}
									</span>
									<span className="membership-percentage text-sm text-[var(--text-secondary)]">
										{percentage}%
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function StatCard({
	icon: Icon,
	title,
	value,
	change,
	changeType,
}: {
	icon: typeof Users;
	title: string;
	value: string | number;
	change: string;
	changeType: 'positive' | 'negative' | 'neutral';
}) {
	return (
		<div className="stat-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-md">
			<div className="flex items-center justify-between mb-6">
				<div className="stat-icon w-14 h-14 rounded-[14px] bg-gradient-to-br from-[rgba(249,197,19,0.15)] to-[rgba(228,30,38,0.1)] flex items-center justify-center text-[1.6rem] text-[var(--primary-yellow)]">
					<Icon className="w-6 h-6" />
				</div>
			</div>
			<h3 className="text-[0.85rem] font-medium text-[var(--text-secondary)] mb-2 uppercase">
				{title}
			</h3>
			<div className="stat-value text-[2.2rem] font-bold text-[var(--text-primary)] mb-2 font-['Poppins']">
				{value}
			</div>
			<div
				className={`stat-change text-[0.8rem] font-semibold flex items-center gap-1 ${
					changeType === 'positive'
						? 'text-[var(--primary-yellow)]'
						: changeType === 'negative'
							? 'text-[#EF4444]'
							: 'text-[var(--text-secondary)]'
				}`}
			>
				{change}
			</div>
		</div>
	);
}

function QuickActionButton({
	href,
	icon: Icon,
	label,
}: {
	href: string;
	icon: typeof Users;
	label: string;
}) {
	return (
		<Link
			to={href}
			className="quick-action-btn flex flex-row items-center justify-center gap-3 p-5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-[var(--text-primary)] text-[0.9rem] font-medium"
		>
			<Icon className="w-5 h-5 text-[var(--primary-yellow)] flex-shrink-0" />
			<span className="whitespace-nowrap">{label}</span>
		</Link>
	);
}

function RevenueChart({ data }: { data: Array<{ period: string; revenue: number; count: number }> }) {
	const chartData = {
		labels: data.map((item) => item.period),
		datasets: [
			{
				label: 'Revenue',
				data: data.map((item) => item.revenue),
				borderColor: 'rgba(249, 197, 19, 1)',
				backgroundColor: 'rgba(249, 197, 19, 0.1)',
				borderWidth: 3,
				fill: true,
				tension: 0.4,
				pointBackgroundColor: 'rgba(249, 197, 19, 1)',
				pointBorderColor: '#fff',
				pointBorderWidth: 2,
				pointRadius: 5,
				pointHoverRadius: 7,
				pointHoverBackgroundColor: 'rgba(249, 197, 19, 1)',
				pointHoverBorderColor: '#fff',
				pointHoverBorderWidth: 2,
			},
		],
	};

	const chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: false,
			},
			tooltip: {
				backgroundColor: 'rgba(19, 22, 31, 0.95)',
				titleColor: 'rgba(255, 255, 255, 1)',
				bodyColor: 'rgba(249, 197, 19, 1)',
				borderColor: 'rgba(249, 197, 19, 0.3)',
				borderWidth: 1,
				padding: 12,
				titleFont: {
					size: 14,
					weight: '600' as const,
					family: "'Poppins', sans-serif",
				},
				bodyFont: {
					size: 13,
					weight: '500' as const,
					family: "'Inter', sans-serif",
				},
				callbacks: {
					label: function (context: any) {
						return `₱${context.parsed.y.toLocaleString()}`;
					},
				},
			},
		},
		scales: {
			x: {
				grid: {
					color: 'rgba(255, 255, 255, 0.05)',
					drawBorder: false,
				},
				ticks: {
					color: 'rgba(184, 188, 200, 0.8)',
					font: {
						size: 11,
						family: "'Inter', sans-serif",
					},
				},
			},
			y: {
				grid: {
					color: 'rgba(255, 255, 255, 0.05)',
					drawBorder: false,
				},
				ticks: {
					color: 'rgba(184, 188, 200, 0.8)',
					font: {
						size: 11,
						family: "'Inter', sans-serif",
					},
					callback: function (value: any) {
						return '₱' + (value / 1000).toFixed(0) + 'k';
					},
				},
			},
		},
	};

	return (
		<div className="h-80">
			<Line data={chartData} options={chartOptions} />
		</div>
	);
}
