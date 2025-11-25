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
			<div className="relative rounded-lg overflow-hidden bg-gradient-to-r from-primary/10 to-primary/5 p-8">
				<div className="relative z-10">
					<h1 className="text-3xl font-bold mb-2">Welcome Back, Admin!</h1>
					<p className="text-gray-600 dark:text-gray-400">
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
			<div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
				<h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
					<span>⚡</span> Quick Actions
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
					<div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-semibold flex items-center gap-2">
								<Users className="w-5 h-5" />
								Recent Members
							</h2>
							<Link
								to="/members"
								className="text-sm text-primary hover:underline flex items-center gap-1"
							>
								View All <span>→</span>
							</Link>
						</div>
						<div className="space-y-3">
							{recentMembers.map((member) => (
								<div
									key={member.id}
									className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
								>
									<div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
										{member.avatar}
									</div>
									<div className="flex-1">
										<h3 className="font-medium">{member.name}</h3>
										<p className="text-sm text-gray-600 dark:text-gray-400">
											{member.membership} Member • Joined {member.joinDate}
										</p>
									</div>
									<button className="text-sm text-primary hover:underline">View</button>
								</div>
							))}
						</div>
					</div>

					{/* Coaches */}
					<div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-semibold flex items-center gap-2">
								<UserCog className="w-5 h-5" />
								Coaches
							</h2>
							<Link
								to="/coaches"
								className="text-sm text-primary hover:underline flex items-center gap-1"
							>
								View All <span>→</span>
							</Link>
						</div>
						<div className="space-y-3">
							{coaches.map((coach) => (
								<div
									key={coach.id}
									className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
								>
									<div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
										{coach.avatar}
									</div>
									<div className="flex-1">
										<h3 className="font-medium">{coach.name}</h3>
										<p className="text-sm text-gray-600 dark:text-gray-400">
											{coach.specialization} • {coach.yearsExperience} years experience
										</p>
									</div>
									<button className="text-sm text-primary hover:underline">View</button>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Right Column */}
				<div className="space-y-6">
					{/* Revenue Overview */}
					<div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
						<h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
							<span>📈</span> Revenue Overview
						</h2>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<span className="text-gray-600 dark:text-gray-400">Total Revenue</span>
								<span className="text-lg font-semibold">₱{monthlyRevenue.toLocaleString()}</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-gray-600 dark:text-gray-400">Avg. per Member</span>
								<span className="text-lg font-semibold">
									₱{activeSubscriptions > 0 ? Math.round(monthlyRevenue / activeSubscriptions) : 0}
								</span>
							</div>
						</div>
					</div>

					{/* Membership Distribution */}
					<div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
						<h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
							<span>📊</span> Membership Distribution
						</h2>
						<div className="space-y-3">
							{Object.entries(membershipDistribution).map(([name, count]) => {
								const percentage = totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0;
								return (
									<div key={name} className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<div
												className={`w-3 h-3 rounded-full ${
													name === 'Student'
														? 'bg-yellow-500'
														: name === 'PROMO Student'
															? 'bg-orange-500'
															: 'bg-blue-500'
												}`}
											/>
											<span className="text-sm">{name}</span>
										</div>
										<div className="flex items-center gap-2">
											<span className="font-medium">{count}</span>
											<span className="text-sm text-gray-600 dark:text-gray-400">{percentage}%</span>
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
		<div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
			<div className="flex items-center justify-between mb-4">
				<div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
					<Icon className="w-6 h-6 text-primary" />
				</div>
			</div>
			<h3 className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</h3>
			<div className="text-2xl font-bold mb-2">{value}</div>
			<div
				className={`text-sm ${
					changeType === 'positive'
						? 'text-green-600 dark:text-green-400'
						: changeType === 'negative'
							? 'text-red-600 dark:text-red-400'
							: 'text-gray-600 dark:text-gray-400'
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
			className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
		>
			<Icon className="w-6 h-6 text-primary" />
			<span className="text-sm font-medium">{label}</span>
		</Link>
	);
}

