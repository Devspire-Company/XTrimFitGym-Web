import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Search, Plus, Eye, Edit, Trash2, UserCog } from 'lucide-react';
import { GET_ALL_COACHES } from '@/graphql/operations/index';

interface Coach {
	id: string;
	name: string;
	firstName: string;
	middleName?: string;
	lastName: string;
	email: string;
	phone: string;
	specialization: string;
	yearsExperience: string;
	status: string;
	avatar: string;
	totalClients: number;
	rating: number;
	dateOfBirth: string;
	gender: string;
	certifications: string[];
	achievements: string[];
	bio: string;
	teachingDate: string[];
	teachingTime: string[];
	clientLimit: number;
}

export function CoachesPage() {
	useEffect(() => {
		document.title = 'Coach Management - X-TRIM FIT GYM';
	}, []);

	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [specializationFilter, setSpecializationFilter] = useState<string>('all');

	// GraphQL queries and mutations
	const { data, loading, error, refetch } = useQuery(GET_ALL_COACHES, {
		errorPolicy: 'none',
	});

	// Transform API data
	const apiCoaches: Coach[] = (data?.getUsers || []).map((c: any) => {
		const specialization = c.coachDetails?.specialization?.[0] || 'General Fitness';
		const yearsExperience = c.coachDetails?.yearsOfExperience?.toString() || '0';
		
		return {
			id: c.id,
			name: `${c.firstName} ${c.middleName ? c.middleName + ' ' : ''}${c.lastName}`,
			firstName: c.firstName,
			middleName: c.middleName,
			lastName: c.lastName,
			email: c.email,
			phone: c.phoneNumber || 'N/A',
			specialization,
			yearsExperience,
			status: 'Active',
			avatar: `${c.firstName?.[0] || ''}${c.lastName?.[0] || ''}`,
			totalClients: c.coachDetails?.clientsIds?.length || 0,
			rating: c.coachDetails?.ratings || 5.0,
			dateOfBirth: c.dateOfBirth || 'N/A',
			gender: c.gender || 'N/A',
			certifications: [], // Not in API schema
			achievements: [], // Not in API schema
			bio: c.coachDetails?.moreDetails || 'No bio available',
			teachingDate: c.coachDetails?.teachingDate || [],
			teachingTime: c.coachDetails?.teachingTime || [],
			clientLimit: c.coachDetails?.clientLimit || 0,
		};
	});

	const filteredCoaches = useMemo(() => {
		return apiCoaches.filter((coach) => {
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
	}, [apiCoaches, searchTerm, statusFilter, specializationFilter]);

	// Show loading state
	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-yellow)] mx-auto mb-4"></div>
					<p className="text-[var(--text-secondary)]">Loading coaches...</p>
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
					<h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Unable to Load Coaches</h2>
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

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold flex items-center gap-2">
						<UserCog className="w-8 h-8" color="var(--primary-yellow)" />
						Coach Management
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-1">
						Manage all gym coaches, view details, and update information ({apiCoaches.length} total)
					</p>
				</div>
				<Button>
					<Plus className="w-4 h-4" />
					Add New Coach
				</Button>
			</div>

			<div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 backdrop-blur-[10px]">
				<div className="search-filter-bar flex flex-col md:flex-row gap-4">
					<div className="search-box flex-1 relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
						<input
							type="text"
							placeholder="Search coaches..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary-yellow)] focus:ring-[3px] focus:ring-[rgba(249,197,19,0.1)]"
						/>
					</div>
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className="px-4 py-2.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary-yellow)] focus:ring-[3px] focus:ring-[rgba(249,197,19,0.1)]"
					>
						<option value="all">All Status</option>
						<option value="Active">Active</option>
						<option value="Inactive">Inactive</option>
						<option value="On Leave">On Leave</option>
					</select>
					<select
						value={specializationFilter}
						onChange={(e) => setSpecializationFilter(e.target.value)}
						className="px-4 py-2.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary-yellow)] focus:ring-[3px] focus:ring-[rgba(249,197,19,0.1)]"
					>
						<option value="all">All Specializations</option>
						<option value="Strength & Conditioning">Strength & Conditioning</option>
						<option value="Fitness & Nutrition">Fitness & Nutrition</option>
						<option value="HIIT & Cardio">HIIT & Cardio</option>
						<option value="Body Transformation">Body Transformation</option>
					</select>
				</div>
			</div>

			<div className="table-container bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden backdrop-blur-[10px]">
				<div className="overflow-x-auto">
					<table className="coaches-table w-full text-sm">
						<thead className="bg-[rgba(249,197,19,0.05)] border-b-2 border-[rgba(249,197,19,0.2)]">
							<tr>
								<th className="px-4 py-5 text-left text-xs font-semibold text-[var(--text-primary)] uppercase">
									Coach
								</th>
								<th className="px-4 py-5 text-left text-xs font-semibold text-[var(--text-primary)] uppercase">
									Contact
								</th>
								<th className="px-4 py-5 text-left text-xs font-semibold text-[var(--text-primary)] uppercase">
									Specialization
								</th>
								<th className="px-4 py-5 text-left text-xs font-semibold text-[var(--text-primary)] uppercase">
									Experience
								</th>
								<th className="px-4 py-5 text-left text-xs font-semibold text-[var(--text-primary)] uppercase">
									Status
								</th>
								<th className="px-4 py-5 text-left text-xs font-semibold text-[var(--text-primary)] uppercase">
									Performance
								</th>
								<th className="px-4 py-5 text-left text-xs font-semibold text-[var(--text-primary)] uppercase">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredCoaches.map((coach) => (
								<tr key={coach.id} className="coaches-table tbody tr">
									<td className="px-4 py-5">
										<div className="coach-info flex items-center gap-3">
											<div className="coach-avatar w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--primary-red)] to-[var(--primary-yellow)] flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
												{coach.avatar}
											</div>
											<div className="coach-details">
												<h4 className="font-semibold text-[var(--text-primary)] mb-1">
													{coach.name}
												</h4>
												<p className="text-xs text-[var(--text-secondary)]">ID: {coach.id}</p>
											</div>
										</div>
									</td>
									<td className="px-4 py-5 text-sm">
										<div className="contact-info">
											<div className="text-[var(--text-primary)]">{coach.email}</div>
											<div className="text-[var(--text-secondary)]">{coach.phone}</div>
										</div>
									</td>
									<td className="px-4 py-5">
										<span className="specialization-badge px-2.5 py-1.5 text-xs rounded-lg font-semibold bg-[rgba(249,197,19,0.15)] text-[var(--primary-yellow)] border border-[rgba(249,197,19,0.3)]">
											{coach.specialization}
										</span>
									</td>
									<td className="px-4 py-5 text-sm text-[var(--text-secondary)]">
										{coach.yearsExperience} years
									</td>
									<td className="px-4 py-5">
										<span
											className={`status-badge px-2.5 py-1.5 text-xs rounded-lg font-semibold ${
												coach.status === 'Active'
													? 'active bg-[rgba(16,185,129,0.15)] text-[#10B981] border border-[rgba(16,185,129,0.3)]'
													: coach.status === 'On Leave'
														? 'on-leave bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border border-[rgba(245,158,11,0.3)]'
														: 'inactive bg-[rgba(107,114,128,0.15)] text-[#9CA3AF] border border-[rgba(107,114,128,0.3)]'
											}`}
										>
											{coach.status}
										</span>
									</td>
									<td className="px-4 py-5 text-sm">
										<div className="performance-info">
											<div className="performance-item flex items-center gap-2">
												<span className="rating-stars text-[var(--primary-yellow)]">⭐</span>
												<span className="performance-value text-[var(--text-primary)] font-semibold">
													{coach.rating}
												</span>
											</div>
											<div className="text-[var(--text-secondary)]">
												{coach.totalClients} clients
											</div>
										</div>
									</td>
									<td className="px-4 py-5">
										<div className="action-buttons flex items-center gap-2">
											<button className="btn-small btn-view px-3 py-1.5 rounded-lg text-xs font-semibold bg-[rgba(59,130,246,0.15)] text-[#3B82F6] border border-[rgba(59,130,246,0.3)]">
												<Eye className="w-4 h-4" />
											</button>
											<button className="btn-small btn-edit px-3 py-1.5 rounded-lg text-xs font-semibold bg-[rgba(249,197,19,0.15)] text-[var(--primary-yellow)] border border-[rgba(249,197,19,0.3)]">
												<Edit className="w-4 h-4" />
											</button>
											<button className="btn-small btn-delete px-3 py-1.5 rounded-lg text-xs font-semibold bg-[rgba(239,68,68,0.15)] text-[#EF4444] border border-[rgba(239,68,68,0.3)]">
												<Trash2 className="w-4 h-4" />
											</button>
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
