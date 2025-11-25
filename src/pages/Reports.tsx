import { useMemo } from 'react';
import { mockMembers, mockCoaches, mockMembershipPlans } from '@/lib/mock/data';
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
	const members = Object.values(mockMembers);
	const coaches = Object.values(mockCoaches);
	const plans = mockMembershipPlans;

	const totalRevenue = useMemo(() => {
		return Object.values(plans).reduce((sum, plan) => sum + plan.price * plan.count, 0);
	}, [plans]);

	const totalWorkouts = useMemo(() => {
		return members.reduce((sum, m) => sum + m.progress.workoutsCompleted, 0);
	}, [members]);

	const totalWeightLost = useMemo(() => {
		return members.reduce((sum, m) => sum + m.progress.weightLost, 0);
	}, [members]);

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
		labels: Object.keys(plans),
		datasets: [
			{
				data: Object.values(plans).map((p) => p.count),
				backgroundColor: ['#F9C513', '#E41E26', '#10B981'],
			},
		],
	};

	const memberGrowthData = {
		labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
		datasets: [
			{
				label: 'New Members',
				data: [1, 1, 1, 2, 3, 4],
				backgroundColor: 'rgba(249, 197, 19, 0.8)',
			},
		],
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold flex items-center gap-2">
						<BarChart3 className="w-8 h-8" />
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
					title="Total Workouts"
					value={totalWorkouts}
					change="+18%"
					changeType="positive"
				/>
			</div>

			{/* Charts */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
					<h2 className="text-xl font-semibold mb-4">Revenue Trends</h2>
					<div className="h-64">
						<Line data={revenueData} options={{ maintainAspectRatio: false }} />
					</div>
				</div>
				<div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
					<h2 className="text-xl font-semibold mb-4">Membership Distribution</h2>
					<div className="h-64">
						<Doughnut data={membershipData} options={{ maintainAspectRatio: false }} />
					</div>
				</div>
			</div>

			<div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
				<h2 className="text-xl font-semibold mb-4">Member Growth</h2>
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

