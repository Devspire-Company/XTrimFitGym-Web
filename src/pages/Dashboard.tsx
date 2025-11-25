import { useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { Link } from 'react-router';
import { Users, UserCog, DollarSign, CreditCard, BarChart3 } from 'lucide-react';
import { mockMembers, mockCoaches, mockMembershipPlans } from '@/lib/mock/data';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';

// GraphQL query (will be replaced with generated types later)
const GET_DASHBOARD_STATS = gql`
	query GetDashboardStats {
		getUsers(role: member) {
			id
			firstName
			lastName
			email
		}
		getUsers(role: coach) {
			id
			firstName
			lastName
		}
	}
`;

export function DashboardPage() {
	useEffect(() => {
		document.title = 'Admin Dashboard - X-TRIM FIT GYM';
	}, []);

	const dispatch = useAppDispatch();
	const { data, loading, error } = useQuery(GET_DASHBOARD_STATS, {
		errorPolicy: 'all',
	});

	// Use mock data if API fails or in dev mode
	const useMock = import.meta.env.VITE_USE_MOCK === 'true' || error || !data;

	const members = useMock ? Object.values(mockMembers) : [];
	const coaches = useMock ? Object.values(mockCoaches) : [];
	const plans = mockMembershipPlans;

	// Calculate stats
	const totalMembers = members.length;
	const totalCoaches = coaches.length;
	const monthlyRevenue = Object.values(plans).reduce(
		(sum, plan) => sum + plan.price * plan.count,
		0
	);
	const activeSubscriptions = members.filter((m) => m.status === 'Active').length;

	// Recent members (last 3)
	const recentMembers = [...members]
		.sort((a, b) => {
			const dates: Record<string, number> = {
				'November 2024': 3,
				'October 2024': 2,
				'September 2024': 1,
				'June 2024': 0,
			};
			return (dates[b.joinDate] || 0) - (dates[a.joinDate] || 0);
		})
		.slice(0, 3);

	// Membership distribution
	const membershipDistribution = {
		Student: members.filter((m) => m.membership === 'Student').length,
		'PROMO Student': members.filter((m) => m.membership === 'PROMO Student').length,
		'Non student': members.filter((m) => m.membership === 'Non student').length,
	};

	return (
		<div className="space-y-6">
			{/* Welcome Section */}
			<div className="welcome-section relative rounded-[20px] overflow-hidden p-10">
				<div className="welcome-bg-image"></div>
				<div className="welcome-content relative z-10">
					<h1 className="text-[2.2rem] font-bold mb-2 gradient-text">Welcome Back, Admin!</h1>
					<p className="text-[var(--text-secondary)] text-[1.05rem]">
						Manage your gym operations, members, coaches, and track your business performance.
					</p>
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
			<div className="section-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-[10px]">
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

			{/* Content Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Left Column */}
				<div className="lg:col-span-2 space-y-6">
					{/* Recent Members */}
					<div className="section-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-[10px]">
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
					<div className="section-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-[10px]">
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

				{/* Right Column */}
				<div className="space-y-6">
					{/* Revenue Overview */}
					<div className="section-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-[10px]">
						<h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-[var(--text-primary)] font-['Poppins']">
							<span className="text-[var(--primary-yellow)]">📈</span> Revenue Overview
						</h2>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<span className="text-[var(--text-secondary)]">Total Revenue</span>
								<span className="text-lg font-semibold text-[var(--text-primary)] font-['Poppins']">
									₱{monthlyRevenue.toLocaleString()}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-[var(--text-secondary)]">Avg. per Member</span>
								<span className="text-lg font-semibold text-[var(--text-primary)] font-['Poppins']">
									₱{activeSubscriptions > 0 ? Math.round(monthlyRevenue / activeSubscriptions) : 0}
								</span>
							</div>
						</div>
					</div>

					{/* Membership Distribution */}
					<div className="section-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-[10px]">
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
		<div className="stat-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-[10px]">
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
