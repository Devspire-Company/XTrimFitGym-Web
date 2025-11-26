import { useMemo, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	ArcElement,
	BarElement,
	Title,
	Tooltip,
	Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { BarChart3, DollarSign, Users, UserCog, Dumbbell } from 'lucide-react';
import { GET_DASHBOARD_STATS } from '@/graphql/operations/index';

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	ArcElement,
	BarElement,
	Title,
	Tooltip,
	Legend
);

export function ReportsPage() {
	useEffect(() => {
		document.title = 'Reports & Analytics - X-TRIM FIT GYM';
	}, []);

	// Fetch real data from API
	const { data, loading, error, refetch } = useQuery(GET_DASHBOARD_STATS, {
		errorPolicy: 'none',
	});

	// Show loading state
	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-yellow)] mx-auto mb-4"></div>
					<p className="text-[var(--text-secondary)]">Loading reports...</p>
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
					<h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Unable to Load Reports</h2>
					<p className="text-[var(--text-secondary)] mb-4">
						{error?.message || 'Failed to connect to the server'}
					</p>
					<button 
						onClick={() => refetch()} 
						className="btn-primary"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	const members = (data?.members || []).map((m: any) => ({
		id: m.id,
		name: `${m.firstName} ${m.lastName}`,
		status: m.membershipDetails?.membershipTransaction?.status === 'ACTIVE' ? 'Active' : 'Inactive',
		membership: m.membershipDetails?.membershipTransaction?.membership?.name || 'No Plan',
		joinDate: m.createdAt || new Date().toISOString(),
	}));

	const coaches = (data?.coaches || []).map((c: any) => ({
		id: c.id,
		name: `${c.firstName} ${c.lastName}`,
		specialization: c.coachDetails?.specialization?.[0] || 'General Fitness',
	}));

	const totalMembers = members.length;
	const activeMembers = members.filter((m: any) => m.status === 'Active').length;
	const totalRevenue = activeMembers * 50; // Placeholder calculation
	const totalWorkouts = 0; // Would need session logs from API
	const totalWeightLost = 0; // Would need session logs from API

	// Group members by membership type
	const membershipTypes = members.reduce((acc: any, m: any) => {
		acc[m.membership] = (acc[m.membership] || 0) + 1;
		return acc;
	}, {});

	const revenueData = {
		labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
		datasets: [
			{
				label: 'Revenue',
				data: [2500, 3000, 2800, 3200],
				borderColor: '#F9C513',
				backgroundColor: 'rgba(249, 197, 19, 0.1)',
				tension: 0.4,
			},
		],
	};

	const membershipData = {
		labels: Object.keys(membershipTypes),
		datasets: [
			{
				data: Object.values(membershipTypes),
				backgroundColor: ['#F9C513', '#E41E26', '#10B981', '#3B82F6'],
			},
		],
	};

	// Group members by month for growth data
	const memberGrowthData = useMemo(() => {
		const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
		const counts = months.map((_, i) => {
			const date = new Date();
			date.setMonth(date.getMonth() - (5 - i));
			return members.filter((m: any) => {
				const joinDate = new Date(m.joinDate);
				return joinDate.getMonth() === date.getMonth() && joinDate.getFullYear() === date.getFullYear();
			}).length;
		});

		return {
			labels: months,
			datasets: [
				{
					label: 'New Members',
					data: counts,
					backgroundColor: 'rgba(249, 197, 19, 0.8)',
				},
			],
		};
	}, [members]);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold flex items-center gap-2">
						<BarChart3 className="w-8 h-8" color="var(--primary-yellow)" />
						Reports & Analytics
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-1">
						Comprehensive insights and analytics for your gym operations
					</p>
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<SummaryCard
					icon={DollarSign}
					title="Total Revenue"
					value={`₱${totalRevenue.toLocaleString()}`}
					change="+12.5%"
					changeType="positive"
				/>
				<SummaryCard
					icon={Users}
					title="Total Members"
					value={members.length}
					change="+25%"
					changeType="positive"
				/>
				<SummaryCard
					icon={UserCog}
					title="Active Coaches"
					value={coaches.length}
					change="0%"
					changeType="neutral"
				/>
				<SummaryCard
					icon={Dumbbell}
					title="Active Members"
					value={activeMembers}
					change="+18%"
					changeType="positive"
				/>
			</div>

			{/* Charts */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="section-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-md">
					<h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)] font-['Poppins']">
						Revenue Trends
					</h2>
					<div className="h-64">
						<Line data={revenueData} options={{ maintainAspectRatio: false }} />
					</div>
				</div>
				<div className="section-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-md">
					<h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)] font-['Poppins']">
						Membership Distribution
					</h2>
					<div className="h-64">
						<Doughnut data={membershipData} options={{ maintainAspectRatio: false }} />
					</div>
				</div>
			</div>

			<div className="section-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-md">
				<h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)] font-['Poppins']">
					Member Growth
				</h2>
				<div className="h-64">
					<Bar data={memberGrowthData} options={{ maintainAspectRatio: false }} />
				</div>
			</div>
		</div>
	);
}

function SummaryCard({
	icon: Icon,
	title,
	value,
	change,
	changeType,
}: {
	icon: typeof DollarSign;
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
