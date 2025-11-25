import { useState, useMemo } from 'react';
import { mockCoaches, type MockCoach } from '@/lib/mock/data';
import { Button } from '@/components/ui/button';
import { Search, Plus, Eye, Edit, Trash2, UserCog } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';

export function CoachesPage() {
	const dispatch = useAppDispatch();
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [specializationFilter, setSpecializationFilter] = useState<string>('all');

	const filteredCoaches = useMemo(() => {
		return Object.values(mockCoaches).filter((coach) => {
			const matchesSearch =
				!searchTerm ||
				coach.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				coach.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
				coach.specialization.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesStatus = statusFilter === 'all' || coach.status === statusFilter;
			const matchesSpecialization =
				specializationFilter === 'all' || coach.specialization === specializationFilter;
			return matchesSearch && matchesStatus && matchesSpecialization;
		});
	}, [searchTerm, statusFilter, specializationFilter]);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold flex items-center gap-2">
						<UserCog className="w-8 h-8" />
						Coach Management
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-1">
						Manage all gym coaches, view details, and update information
					</p>
				</div>
				<Button>
					<Plus className="w-4 h-4" />
					Add New Coach
				</Button>
			</div>

			<div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
				<div className="flex flex-col md:flex-row gap-4">
					<div className="flex-1 relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
						<input
							type="text"
							placeholder="Search coaches..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
						/>
					</div>
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
					>
						<option value="all">All Status</option>
						<option value="Active">Active</option>
						<option value="Inactive">Inactive</option>
						<option value="On Leave">On Leave</option>
					</select>
					<select
						value={specializationFilter}
						onChange={(e) => setSpecializationFilter(e.target.value)}
						className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
					>
						<option value="all">All Specializations</option>
						<option value="Strength & Conditioning">Strength & Conditioning</option>
						<option value="Fitness & Nutrition">Fitness & Nutrition</option>
						<option value="HIIT & Cardio">HIIT & Cardio</option>
						<option value="Body Transformation">Body Transformation</option>
					</select>
				</div>
			</div>

			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-gray-50 dark:bg-gray-700">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium uppercase">Coach</th>
								<th className="px-6 py-3 text-left text-xs font-medium uppercase">Contact</th>
								<th className="px-6 py-3 text-left text-xs font-medium uppercase">
									Specialization
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium uppercase">Experience</th>
								<th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
								<th className="px-6 py-3 text-left text-xs font-medium uppercase">
									Performance
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium uppercase">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
							{filteredCoaches.map((coach) => (
								<tr key={coach.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
									<td className="px-6 py-4">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
												{coach.avatar}
											</div>
											<div>
												<div className="font-medium">{coach.name}</div>
												<div className="text-sm text-gray-500">ID: {coach.id}</div>
											</div>
										</div>
									</td>
									<td className="px-6 py-4 text-sm">
										<div>{coach.email}</div>
										<div className="text-gray-500">{coach.phone}</div>
									</td>
									<td className="px-6 py-4">
										<span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900">
											{coach.specialization}
										</span>
									</td>
									<td className="px-6 py-4 text-sm">{coach.yearsExperience} years</td>
									<td className="px-6 py-4">
										<span
											className={`px-2 py-1 text-xs rounded-full ${
												coach.status === 'Active'
													? 'bg-green-100 dark:bg-green-900 text-green-800'
													: 'bg-gray-100 dark:bg-gray-700'
											}`}
										>
											{coach.status}
										</span>
									</td>
									<td className="px-6 py-4 text-sm">
										<div>⭐ {coach.rating}</div>
										<div className="text-gray-500">{coach.totalClients} clients</div>
									</td>
									<td className="px-6 py-4">
										<div className="flex items-center gap-2">
											<Button variant="ghost" size="sm">
												<Eye className="w-4 h-4" />
											</Button>
											<Button variant="ghost" size="sm">
												<Edit className="w-4 h-4" />
											</Button>
											<Button variant="ghost" size="sm">
												<Trash2 className="w-4 h-4 text-red-600" />
											</Button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

