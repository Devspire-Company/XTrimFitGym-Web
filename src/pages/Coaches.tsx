import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { Button } from '@/components/ui/button';
import {
	Search,
	Plus,
	Eye,
	Trash2,
	UserCog,
	X,
	Copy,
	Save,
	EyeOff,
	Edit,
	RefreshCw,
	Users,
	Calendar,
	Activity,
	Clock,
	MapPin,
} from 'lucide-react';
import { GET_USERS, GET_COACH_SESSIONS, GET_COACH_SESSION_LOGS, DELETE_USER, CREATE_USER, UPDATE_USER, USERS_UPDATED } from '@/graphql/operations/index';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import type { CreateUserMutation, CreateUserMutationVariables } from '@/graphql/generated/types';
import { RoleType } from '@/graphql/generated/graphql';
import { DatePicker } from '@/components/ui/date-picker';

interface Coach {
	id: string;
	name: string;
	firstName: string;
	middleName?: string;
	lastName: string;
	email: string;
	phone: string;
	specialization: string;
	allSpecializations?: string[]; // For editing - stores all specializations
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

	const dispatch = useAppDispatch();
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [isAddCoachModalOpen, setIsAddCoachModalOpen] = useState(false);
	const [isEditCoachModalOpen, setIsEditCoachModalOpen] = useState(false);

	// Initial data fetch with query
	const { data, loading, error } = useQuery(GET_USERS, {
		variables: { role: RoleType.Coach },
		errorPolicy: 'none',
	});

	// Real-time subscription for coach updates
	const { data: subscriptionData } = useSubscription(USERS_UPDATED, {
		variables: { role: RoleType.Coach },
		skip: !data, // Skip if initial data not loaded
	});

	// Use subscription data if available, otherwise fall back to query data
	const coachesData = subscriptionData?.usersUpdated || data?.getUsers || [];

	const [deleteUserMutation] = useMutation(DELETE_USER, {
		onCompleted: () => {
			dispatch(
				addToast({
					type: 'success',
					message: `Successfully deleted coach ${selectedCoach?.name}`,
				})
			);
			setIsDeleteModalOpen(false);
			setSelectedCoach(null);
			// Subscription will automatically update the data
		},
		onError: (error) => {
			dispatch(
				addToast({
					type: 'error',
					message: error.message || 'Failed to delete coach',
				})
			);
		},
	});

	const [createUserMutation] = useMutation<CreateUserMutation, CreateUserMutationVariables>(
		CREATE_USER,
		{
			onError: (error) => {
				dispatch(
					addToast({
						type: 'error',
						message: error.message || 'Failed to create coach account',
					})
				);
			},
			onCompleted: () => {
				// Subscription will automatically update the data
			},
		}
	);

	const [updateUserMutation] = useMutation(UPDATE_USER, {
		onError: (error) => {
			dispatch(
				addToast({
					type: 'error',
					message: error.message || 'Failed to update coach account',
				})
			);
		},
		onCompleted: () => {
			// Subscription will automatically update the data
		},
	});


	const handleView = (coach: Coach) => {
		setSelectedCoach(coach);
		setIsViewModalOpen(true);
	};

	const handleEdit = (coach: Coach) => {
		setSelectedCoach(coach);
		setIsEditCoachModalOpen(true);
	};

	const handleDelete = (coach: Coach) => {
		setSelectedCoach(coach);
		setIsDeleteModalOpen(true);
	};

	const confirmDelete = async () => {
		if (selectedCoach) {
			try {
				await deleteUserMutation({
					variables: { id: selectedCoach.id },
				});
			} catch (err) {
				console.error('Error deleting coach:', err);
			}
		}
	};

	const handleAddCoach = () => {
		setIsAddCoachModalOpen(true);
	};

	// Transform API data
	const apiCoaches: Coach[] = coachesData
		.filter((c): c is NonNullable<typeof c> => c !== null && c !== undefined)
		.map((c) => {
			const specialization = c.coachDetails?.specialization?.[0] || 'General fitness';
			const yearsExperience = c.coachDetails?.yearsOfExperience?.toString() || '0';
			const allSpecializations = (c.coachDetails?.specialization || []).filter(
				(s): s is string => s !== null && s !== undefined
			);

			return {
				id: c.id,
				name: `${c.firstName} ${c.middleName ? c.middleName + ' ' : ''}${c.lastName}`,
				firstName: c.firstName,
				middleName: c.middleName || undefined,
				lastName: c.lastName,
				email: c.email,
				phone: c.phoneNumber || 'N/A',
				specialization,
				allSpecializations, // Store all specializations for editing
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
				teachingDate: (c.coachDetails?.teachingDate || []).filter(
					(d): d is string => d !== null && d !== undefined
				),
				teachingTime: (c.coachDetails?.teachingTime || []).filter(
					(t): t is string => t !== null && t !== undefined
				),
				clientLimit: c.coachDetails?.clientLimit || 0,
			};
		});

	const filteredCoaches = useMemo(() => {
		return apiCoaches.filter((coach) => {
			const matchesSearch =
				!searchTerm ||
				coach.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				coach.email.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesStatus = statusFilter === 'all' || coach.status === statusFilter;
			return matchesSearch && matchesStatus;
		});
	}, [apiCoaches, searchTerm, statusFilter]);

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
						<svg
							className="w-16 h-16 mx-auto"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
						Unable to Load Coaches
					</h2>
					<p className="text-[var(--text-secondary)] mb-4">
						{error?.message || 'Failed to connect to the server'}
					</p>
					<button onClick={() => window.location.reload()} className="btn-primary">
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
				<div className="flex items-center gap-3">
					<Button onClick={handleAddCoach}>
						<Plus className="w-4 h-4" />
						Add New Coach
					</Button>
				</div>
			</div>

			<div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 backdrop-blur-md">
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
				</div>
			</div>

			<div className="table-container bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden backdrop-blur-md">
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
									Experience
								</th>
								<th className="px-4 py-5 text-left text-xs font-semibold text-[var(--text-primary)] uppercase">
									Teaching Time
								</th>
								<th className="px-4 py-5 text-left text-xs font-semibold text-[var(--text-primary)] uppercase">
									Client Capacity
								</th>
								<th className="px-4 py-5 text-left text-xs font-semibold text-[var(--text-primary)] uppercase">
									Status
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
										<div
											className="coach-info flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
											onClick={() => handleView(coach)}
										>
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
									<td className="px-4 py-5 text-sm text-[var(--text-secondary)]">
										{coach.yearsExperience} years
									</td>
									<td className="px-4 py-5 text-sm text-[var(--text-secondary)]">
										{coach.teachingTime && coach.teachingTime.length > 0
											? coach.teachingTime.join(', ')
											: 'N/A'}
									</td>
									<td className="px-4 py-5 text-sm">
										<span
											className={`px-2.5 py-1.5 text-xs rounded-lg font-semibold ${
												coach.clientLimit > 0 && coach.totalClients >= coach.clientLimit
													? 'bg-[rgba(239,68,68,0.15)] text-[#EF4444] border border-[rgba(239,68,68,0.3)]'
													: coach.clientLimit > 0 && coach.totalClients >= coach.clientLimit * 0.8
														? 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border border-[rgba(245,158,11,0.3)]'
														: 'bg-[rgba(16,185,129,0.15)] text-[#10B981] border border-[rgba(16,185,129,0.3)]'
											}`}
										>
											{coach.totalClients}/{coach.clientLimit > 0 ? coach.clientLimit : '∞'}
										</span>
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
									<td className="px-4 py-5">
										<div className="action-buttons flex items-center gap-2">
											<button
												onClick={() => handleView(coach)}
												className="btn-small btn-view px-3 py-1.5 rounded-lg text-xs font-semibold bg-[rgba(59,130,246,0.15)] text-[#3B82F6] border border-[rgba(59,130,246,0.3)] hover:bg-[rgba(59,130,246,0.25)] transition-colors"
												title="View Coach"
											>
												<Eye className="w-4 h-4" />
											</button>
											<button
												onClick={() => handleEdit(coach)}
												className="btn-small btn-edit px-3 py-1.5 rounded-lg text-xs font-semibold bg-[rgba(249,197,19,0.15)] text-[var(--primary-yellow)] border border-[rgba(249,197,19,0.3)] hover:bg-[rgba(249,197,19,0.25)] transition-colors"
												title="Edit Coach"
											>
												<Edit className="w-4 h-4" />
											</button>
											<button
												onClick={() => handleDelete(coach)}
												className="btn-small btn-delete px-3 py-1.5 rounded-lg text-xs font-semibold bg-[rgba(239,68,68,0.15)] text-[#EF4444] border border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.25)] transition-colors"
												title="Delete Coach"
											>
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

			{/* View Modal */}
			<div
				className={`modal-overlay ${isViewModalOpen && selectedCoach ? 'active' : ''}`}
				onClick={() => {
					setIsViewModalOpen(false);
					setSelectedCoach(null);
				}}
			>
				{selectedCoach && (
					<CoachViewModal
						coach={selectedCoach}
						onClose={() => {
							setIsViewModalOpen(false);
							setSelectedCoach(null);
						}}
					/>
				)}
			</div>

			{/* Edit Coach Modal */}
			<div
				className={`modal-overlay ${isEditCoachModalOpen && selectedCoach ? 'active' : ''}`}
				onClick={() => {
					setIsEditCoachModalOpen(false);
					setSelectedCoach(null);
				}}
			>
				{selectedCoach && (
					<EditCoachModal
						coach={selectedCoach}
						isOpen={isEditCoachModalOpen}
						onClose={() => {
							setIsEditCoachModalOpen(false);
							setSelectedCoach(null);
						}}
						onSubmit={async (formData) => {
							try {
								// Valid specialization enum values from API schema
								const validSpecializations = [
									'Weight loss',
									'Muscle building',
									'General fitness',
									'Strength training',
									'Endurance',
									'Flexibility',
									'Rehabilitation',
									'Athletic Performance',
								];

								// Filter to only include valid enum values
								const validSpecializationsList =
									formData.specializations && formData.specializations.length > 0
										? formData.specializations.filter((spec: string) =>
												validSpecializations.includes(spec)
											)
										: [];

								// Format teaching time as array with start and end times
								const formattedTeachingTime: string[] = formData.teachingTime
									? [formData.teachingTime]
									: [];

								// Format teaching days as array
								const formattedTeachingDays: string[] =
									formData.teachingDays && formData.teachingDays.length > 0
										? formData.teachingDays
										: [];

								// Build coachDetails object - always include all fields to ensure updates are saved
								const coachDetailsInput: {
									specialization: string[];
									yearsOfExperience?: number;
									teachingDate: string[];
									teachingTime: string[];
									clientLimit?: number;
								} = {
									specialization: validSpecializationsList,
									teachingDate: formattedTeachingDays,
									teachingTime: formattedTeachingTime,
								};

								// Add optional fields if provided
								if (formData.yearsExperience) {
									coachDetailsInput.yearsOfExperience = parseInt(formData.yearsExperience);
								}

								if (formData.clientLimit) {
									coachDetailsInput.clientLimit = parseInt(formData.clientLimit);
								}

								const result = await updateUserMutation({
									variables: {
										id: selectedCoach.id,
										input: {
											firstName: formData.firstName,
											middleName: formData.middleName || undefined,
											lastName: formData.lastName,
											phoneNumber: formData.phone || undefined,
											gender: formData.gender || undefined,
											dateOfBirth: formData.dateOfBirth || undefined,
											coachDetails: coachDetailsInput,
										},
									},
								});

								if (result.data?.updateUser) {
									dispatch(
										addToast({
											type: 'success',
											message: `Coach profile updated successfully!`,
										})
									);
									setIsEditCoachModalOpen(false);
									setSelectedCoach(null);
								}
							} catch (err) {
								console.error('Error updating coach:', err);
							}
						}}
					/>
				)}
			</div>

			{/* Delete Modal */}
			<div
				className={`modal-overlay ${isDeleteModalOpen && selectedCoach ? 'active' : ''}`}
				onClick={() => {
					setIsDeleteModalOpen(false);
					setSelectedCoach(null);
				}}
			>
				{selectedCoach && (
					<DeleteConfirmModal
						title="Delete Coach?"
						message={`Are you sure you want to delete ${selectedCoach.name}? This action cannot be undone.`}
						onConfirm={confirmDelete}
						onCancel={() => {
							setIsDeleteModalOpen(false);
							setSelectedCoach(null);
						}}
					/>
				)}
			</div>

			{/* Add Coach Modal */}
			<div
				className={`modal-overlay ${isAddCoachModalOpen ? 'active' : ''}`}
				onClick={() => {
					setIsAddCoachModalOpen(false);
				}}
			>
				<AddCoachModal
					isOpen={isAddCoachModalOpen}
					onClose={() => {
						setIsAddCoachModalOpen(false);
					}}
					onSubmit={async (formData) => {
						try {
							// Valid specialization enum values from API schema
							const validSpecializations = [
								'Weight loss',
								'Muscle building',
								'General fitness',
								'Strength training',
								'Endurance',
								'Flexibility',
								'Rehabilitation',
								'Athletic Performance',
							];

							// Filter to only include valid enum values
							const validSpecializationsList =
								formData.specializations && formData.specializations.length > 0
									? formData.specializations.filter((spec) => validSpecializations.includes(spec))
									: [];

							// Format teaching time as array with start and end times
							// The format is already "HH:MM AM/PM - HH:MM AM/PM" from handleSubmit
							const formattedTeachingTime: string[] | undefined = formData.teachingTime
								? [formData.teachingTime]
								: undefined;

							// Format teaching days as array
							const formattedTeachingDays: string[] | undefined =
								formData.teachingDays && formData.teachingDays.length > 0
									? formData.teachingDays
									: undefined;

							const result = await createUserMutation({
								variables: {
									input: {
										firstName: formData.firstName,
										middleName: formData.middleName || undefined,
										lastName: formData.lastName,
										email: formData.email,
										password: formData.password,
										role: RoleType.Coach,
										phoneNumber: formData.phone || undefined,
										gender: formData.gender || undefined,
										dateOfBirth: formData.dateOfBirth || undefined,
										coachDetails: {
											specialization:
												validSpecializationsList.length > 0 ? validSpecializationsList : undefined,
											yearsOfExperience: formData.yearsExperience
												? parseInt(formData.yearsExperience)
												: undefined,
											teachingDate: formattedTeachingDays,
											teachingTime: formattedTeachingTime,
											clientLimit: formData.clientLimit
												? parseInt(formData.clientLimit)
												: undefined,
										},
									},
								},
							});

							if (result.data?.createUser) {
								dispatch(
									addToast({
										type: 'success',
										message: `Coach account created successfully!`,
									})
								);
								setIsAddCoachModalOpen(false);
							}
						} catch (err) {
							console.error('Error creating coach:', err);
						}
					}}
				/>
			</div>
		</div>
	);
}

function CoachViewModal({ coach, onClose }: { coach: Coach; onClose: () => void }) {
	// Fetch coach sessions
	const { data: sessionsData, loading: sessionsLoading } = useQuery(GET_COACH_SESSIONS, {
		variables: { coachId: coach.id },
		skip: !coach.id,
	});

	// Fetch coach session logs
	const { data: sessionLogsData, loading: sessionLogsLoading } = useQuery(GET_COACH_SESSION_LOGS, {
		variables: { coachId: coach.id },
		skip: !coach.id,
	});

	// Extract clients from sessions and session logs (they're already populated)
	const clients = useMemo(() => {
		const clientMap = new Map<string, any>();
		
		// Get clients from sessions
		if (sessionsData?.getCoachSessions) {
			sessionsData.getCoachSessions.forEach((session: any) => {
				if (session.clients) {
					session.clients.forEach((client: any) => {
						if (client?.id && !clientMap.has(client.id)) {
							clientMap.set(client.id, client);
						}
					});
				}
			});
		}
		
		// Get clients from session logs
		if (sessionLogsData?.getCoachSessionLogs) {
			sessionLogsData.getCoachSessionLogs.forEach((log: any) => {
				if (log.client?.id && !clientMap.has(log.client.id)) {
					clientMap.set(log.client.id, log.client);
				}
			});
		}
		
		return Array.from(clientMap.values());
	}, [sessionsData, sessionLogsData]);
	const sessions = sessionsData?.getCoachSessions || [];
	const sessionLogs = sessionLogsData?.getCoachSessionLogs || [];

	const formatDate = (dateString: string) => {
		if (!dateString) return 'N/A';
		try {
			return new Date(dateString).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
			});
		} catch {
			return dateString;
		}
	};

	const formatTime = (timeString: string) => {
		if (!timeString) return 'N/A';
		return timeString;
	};

	return (
		<div className="modal modal-large" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
			<div className="modal-header" style={{ flexShrink: 0 }}>
				<h3>
					<Eye className="w-5 h-5" />
					View Coach Details
				</h3>
				<button className="modal-close" onClick={onClose} title="Close" aria-label="Close">
					<X className="w-5 h-5" />
				</button>
			</div>
			<div className="modal-body" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
				{/* Basic Information Section */}
				<div className="grid grid-cols-2 gap-6 mb-8">
					{/* Personal Information */}
					<div className="bg-[rgba(255,255,255,0.03)] rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
						<h3 className="font-semibold mb-3 text-[var(--text-primary)] flex items-center gap-2">
							<UserCog className="w-4 h-4" />
							Personal Information
						</h3>
						<div className="space-y-2 text-sm">
							<div>
								<span className="text-[var(--text-secondary)]">Full Name:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">{coach.name}</span>
							</div>
							<div>
								<span className="text-[var(--text-secondary)]">Email:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">{coach.email}</span>
							</div>
							<div>
								<span className="text-[var(--text-secondary)]">Phone:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">{coach.phone}</span>
							</div>
							<div>
								<span className="text-[var(--text-secondary)]">Date of Birth:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">
									{coach.dateOfBirth && coach.dateOfBirth !== 'N/A'
										? new Date(coach.dateOfBirth).toLocaleDateString('en-US', {
												year: 'numeric',
												month: 'long',
												day: 'numeric',
											})
										: 'N/A'}
								</span>
							</div>
							<div>
								<span className="text-[var(--text-secondary)]">Gender:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">
									{coach.gender || 'N/A'}
								</span>
							</div>
						</div>
					</div>
					{/* Professional Information */}
					<div className="bg-[rgba(255,255,255,0.03)] rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
						<h3 className="font-semibold mb-3 text-[var(--text-primary)] flex items-center gap-2">
							<Activity className="w-4 h-4" />
							Professional Information
						</h3>
						<div className="space-y-2 text-sm">
							<div>
								<span className="text-[var(--text-secondary)]">Years of Experience:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">
									{coach.yearsExperience} years
								</span>
							</div>
							<div>
								<span className="text-[var(--text-secondary)]">Status:</span>{' '}
								<span
									className={`font-medium ${
										coach.status === 'Active' ? 'text-[#10B981]' : 'text-[var(--text-primary)]'
									}`}
								>
									{coach.status}
								</span>
							</div>
							<div>
								<span className="text-[var(--text-secondary)]">Total Clients:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">{coach.totalClients}</span>
							</div>
							<div>
								<span className="text-[var(--text-secondary)]">Rating:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">
									{coach.rating.toFixed(1)} ⭐
								</span>
							</div>
							<div>
								<span className="text-[var(--text-secondary)]">Client Limit:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">
									{coach.clientLimit || 'Unlimited'}
								</span>
							</div>
							<div>
								<span className="text-[var(--text-secondary)]">Specialization:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">
									{coach.specialization || 'N/A'}
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Schedule Section */}
				<div className="bg-[rgba(255,255,255,0.03)] rounded-xl p-4 border border-[rgba(255,255,255,0.08)] mb-8">
					<h3 className="font-semibold mb-3 text-[var(--text-primary)] flex items-center gap-2">
						<Clock className="w-4 h-4" />
						Schedule
					</h3>
					<div className="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span className="text-[var(--text-secondary)]">Teaching Days:</span>{' '}
							<span className="font-medium text-[var(--text-primary)]">
								{coach.teachingDate && coach.teachingDate.length > 0
									? coach.teachingDate.join(', ')
									: 'N/A'}
							</span>
						</div>
						<div>
							<span className="text-[var(--text-secondary)]">Teaching Times:</span>{' '}
							<span className="font-medium text-[var(--text-primary)]">
								{coach.teachingTime && coach.teachingTime.length > 0
									? coach.teachingTime.join(', ')
									: 'N/A'}
							</span>
						</div>
					</div>
				</div>

				{/* Clients Section */}
				<div className="bg-[rgba(255,255,255,0.03)] rounded-xl p-4 border border-[rgba(255,255,255,0.08)] mb-8">
					<h3 className="font-semibold mb-4 text-[var(--text-primary)] flex items-center gap-2">
						<Users className="w-4 h-4" />
						Clients ({clients.length})
					</h3>
					{sessionsLoading ? (
						<div className="text-center py-4 text-[var(--text-secondary)]">Loading clients...</div>
					) : clients.length > 0 ? (
						<div className="space-y-2">
							{clients.map((client: any) => (
								<div
									key={client.id}
									className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.05)] rounded-lg border border-[rgba(255,255,255,0.08)]"
								>
									<div>
										<div className="font-medium text-[var(--text-primary)]">
											{client.firstName} {client.lastName}
										</div>
										<div className="text-xs text-[var(--text-secondary)]">{client.email}</div>
									</div>
									<div className="text-xs text-[var(--text-secondary)] font-mono">
										ID: {client.id.slice(0, 8)}...
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-4 text-[var(--text-secondary)]">No clients assigned</div>
					)}
				</div>

				{/* Sessions Section */}
				<div className="bg-[rgba(255,255,255,0.03)] rounded-xl p-4 border border-[rgba(255,255,255,0.08)] mb-8">
					<h3 className="font-semibold mb-4 text-[var(--text-primary)] flex items-center gap-2">
						<Calendar className="w-4 h-4" />
						Sessions ({sessions.length})
					</h3>
					{sessionsLoading ? (
						<div className="text-center py-4 text-[var(--text-secondary)]">Loading sessions...</div>
					) : sessions.length > 0 ? (
						<div className="space-y-3">
							{sessions.map((session: any) => (
								<div
									key={session.id}
									className="p-4 bg-[rgba(255,255,255,0.05)] rounded-lg border border-[rgba(255,255,255,0.08)]"
								>
									<div className="flex items-start justify-between mb-2">
										<div className="flex-1">
											<div className="font-medium text-[var(--text-primary)] mb-1">
												{session.name || 'Session'}
											</div>
											<div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
												<span className="flex items-center gap-1">
													<Calendar className="w-3 h-3" />
													{formatDate(session.date)}
												</span>
												<span className="flex items-center gap-1">
													<Clock className="w-3 h-3" />
													{formatTime(session.startTime)}
													{session.endTime && ` - ${formatTime(session.endTime)}`}
												</span>
												{session.gymArea && (
													<span className="flex items-center gap-1">
														<MapPin className="w-3 h-3" />
														{session.gymArea}
													</span>
												)}
											</div>
										</div>
										<span
											className={`px-2 py-1 text-xs rounded-lg font-semibold ${
												session.status === 'completed'
													? 'bg-[rgba(16,185,129,0.15)] text-[#10B981] border border-[rgba(16,185,129,0.3)]'
													: session.status === 'cancelled'
														? 'bg-[rgba(239,68,68,0.15)] text-[#EF4444] border border-[rgba(239,68,68,0.3)]'
														: 'bg-[rgba(249,197,19,0.15)] text-[var(--primary-yellow)] border border-[rgba(249,197,19,0.3)]'
											}`}
										>
											{session.status}
										</span>
									</div>
									{session.clients && session.clients.length > 0 && (
										<div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.08)]">
											<div className="text-xs text-[var(--text-secondary)] mb-1">Clients:</div>
											<div className="flex flex-wrap gap-2">
												{session.clients.map((client: any) => (
													<span
														key={client.id}
														className="px-2 py-1 text-xs bg-[rgba(255,255,255,0.05)] rounded border border-[rgba(255,255,255,0.08)] text-[var(--text-primary)]"
													>
														{client.firstName} {client.lastName}
													</span>
												))}
											</div>
										</div>
									)}
									{session.note && (
										<div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.08)]">
											<div className="text-xs text-[var(--text-secondary)]">Note:</div>
											<div className="text-sm text-[var(--text-primary)]">{session.note}</div>
										</div>
									)}
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-4 text-[var(--text-secondary)]">No sessions found</div>
					)}
				</div>

				{/* Session Logs / Activities Section */}
				<div className="bg-[rgba(255,255,255,0.03)] rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
					<h3 className="font-semibold mb-4 text-[var(--text-primary)] flex items-center gap-2">
						<Activity className="w-4 h-4" />
						Session Logs & Activities ({sessionLogs.length})
					</h3>
					{sessionLogsLoading ? (
						<div className="text-center py-4 text-[var(--text-secondary)]">Loading activities...</div>
					) : sessionLogs.length > 0 ? (
						<div className="space-y-3">
							{sessionLogs.map((log: any) => (
								<div
									key={log.id}
									className="p-4 bg-[rgba(255,255,255,0.05)] rounded-lg border border-[rgba(255,255,255,0.08)]"
								>
									<div className="flex items-start justify-between mb-2">
										<div className="flex-1">
											{log.session && (
												<div className="font-medium text-[var(--text-primary)] mb-1">
													{log.session.name || 'Session Activity'}
												</div>
											)}
											<div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
												{log.session?.date && (
													<span className="flex items-center gap-1">
														<Calendar className="w-3 h-3" />
														{formatDate(log.session.date)}
													</span>
												)}
												{log.completedAt && (
													<span className="flex items-center gap-1">
														<Clock className="w-3 h-3" />
														Completed: {formatDate(log.completedAt)}
													</span>
												)}
											</div>
										</div>
										{log.session && (
											<span
												className={`px-2 py-1 text-xs rounded-lg font-semibold ${
													log.session.status === 'completed'
														? 'bg-[rgba(16,185,129,0.15)] text-[#10B981] border border-[rgba(16,185,129,0.3)]'
														: 'bg-[rgba(107,114,128,0.15)] text-[#9CA3AF] border border-[rgba(107,114,128,0.3)]'
												}`}
											>
												{log.session.status}
											</span>
										)}
									</div>
									{log.client && (
										<div className="mt-2 text-sm">
											<span className="text-[var(--text-secondary)]">Client:</span>{' '}
											<span className="font-medium text-[var(--text-primary)]">
												{log.client.firstName} {log.client.lastName}
											</span>
										</div>
									)}
									{(log.weight !== null && log.weight !== undefined) && (
										<div className="mt-2 text-sm">
											<span className="text-[var(--text-secondary)]">Weight Recorded:</span>{' '}
											<span className="font-medium text-[var(--text-primary)]">
												{log.weight} kg
											</span>
										</div>
									)}
									{log.notes && (
										<div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.08)]">
											<div className="text-xs text-[var(--text-secondary)] mb-1">Notes:</div>
											<div className="text-sm text-[var(--text-primary)]">{log.notes}</div>
										</div>
									)}
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-4 text-[var(--text-secondary)]">No session logs found</div>
					)}
				</div>
			</div>
			<div className="modal-footer" style={{ flexShrink: 0 }}>
				<button type="button" className="btn-secondary" onClick={onClose}>
					<X className="w-4 h-4" />
					Close
				</button>
			</div>
		</div>
	);
}

function DeleteConfirmModal({
	title,
	message,
	onConfirm,
	onCancel,
}: {
	title: string;
	message: string;
	onConfirm: () => void;
	onCancel: () => void;
}) {
	return (
		<div className="modal modal-center" onClick={(e) => e.stopPropagation()}>
			<div className="modal-body">
				<div className="modal-delete-icon">
					<Trash2 className="w-10 h-10" />
				</div>
				<h3 className="modal-delete-title">{title}</h3>
				<p className="modal-delete-text">{message}</p>
				<div className="modal-delete-actions">
					<button
						type="button"
						className="btn-secondary"
						onClick={onCancel}
						style={{
							flex: 1,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							gap: '0.5rem',
							padding: '0.75rem 1.5rem',
							borderRadius: '0.75rem',
							fontWeight: '600',
							transition: 'all 0.2s',
							cursor: 'pointer',
						}}
					>
						<X className="w-4 h-4" />
						Cancel
					</button>
					<button
						type="button"
						className="btn-danger"
						onClick={onConfirm}
						style={{
							flex: 1,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							gap: '0.5rem',
							padding: '0.75rem 1.5rem',
							borderRadius: '0.75rem',
							fontWeight: '600',
							transition: 'all 0.2s',
							cursor: 'pointer',
						}}
					>
						<Trash2 className="w-4 h-4" />
						Delete
					</button>
				</div>
			</div>
		</div>
	);
}

function AddCoachModal({
	isOpen,
	onClose,
	onSubmit,
}: {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (data: {
		firstName: string;
		middleName?: string;
		lastName: string;
		email: string;
		password: string;
		phone?: string;
		specializations: string[];
		yearsExperience?: string;
		gender?: string;
		dateOfBirth?: string;
		teachingDays?: string[];
		teachingTime?: string;
		clientLimit?: string;
	}) => Promise<void>;
}) {
	const dispatch = useAppDispatch();
	const availableSpecializations = [
		'Weight loss',
		'Muscle building',
		'General fitness',
		'Strength training',
		'Endurance',
		'Flexibility',
		'Rehabilitation',
		'Athletic Performance',
	];
	const availableDays = [
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday',
		'Sunday',
	];

	const [formData, setFormData] = useState({
		firstName: '',
		middleName: '',
		lastName: '',
		email: '',
		password: '',
		phone: '',
		specializations: [] as string[],
		yearsExperience: '',
		gender: '',
		dateOfBirth: '',
		teachingDays: [] as string[],
		teachingTimeStartHour: '9',
		teachingTimeStartMinute: '00',
		teachingTimeStartPeriod: 'AM',
		teachingTimeEndHour: '5',
		teachingTimeEndMinute: '00',
		teachingTimeEndPeriod: 'PM',
		clientLimit: '',
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		try {
			// Format teaching time range (start - end) with AM/PM before submitting
			const startTime = `${formData.teachingTimeStartHour}:${formData.teachingTimeStartMinute} ${formData.teachingTimeStartPeriod}`;
			const endTime = `${formData.teachingTimeEndHour}:${formData.teachingTimeEndMinute} ${formData.teachingTimeEndPeriod}`;
			const formattedTeachingTime = `${startTime} - ${endTime}`;

			await onSubmit({
				...formData,
				teachingTime: formattedTeachingTime,
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleSpecializationChange = (specialization: string) => {
		setFormData((prev) => {
			const isSelected = prev.specializations.includes(specialization);
			return {
				...prev,
				specializations: isSelected
					? prev.specializations.filter((s) => s !== specialization)
					: [...prev.specializations, specialization],
			};
		});
	};

	const handleDayChange = (day: string) => {
		setFormData((prev) => {
			const isSelected = prev.teachingDays.includes(day);
			return {
				...prev,
				teachingDays: isSelected
					? prev.teachingDays.filter((d) => d !== day)
					: [...prev.teachingDays, day],
			};
		});
	};

	const handleCopyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			dispatch(
				addToast({
					type: 'success',
					message: 'Copied to clipboard!',
				})
			);
		} catch {
			dispatch(
				addToast({
					type: 'error',
					message: 'Failed to copy to clipboard',
				})
			);
		}
	};

	const handleClose = () => {
		if (!isSubmitting) {
			setFormData({
				firstName: '',
				middleName: '',
				lastName: '',
				email: '',
				password: '',
				phone: '',
				specializations: [],
				yearsExperience: '',
				gender: '',
				dateOfBirth: '',
				teachingDays: [],
				teachingTimeStartHour: '9',
				teachingTimeStartMinute: '00',
				teachingTimeStartPeriod: 'AM',
				teachingTimeEndHour: '5',
				teachingTimeEndMinute: '00',
				teachingTimeEndPeriod: 'PM',
				clientLimit: '',
			});
			setShowPassword(false);
			onClose();
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="modal modal-large"
			onClick={(e) => e.stopPropagation()}
			style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}
		>
			<div className="modal-header" style={{ flexShrink: 0 }}>
				<h3>
					<Plus className="w-5 h-5" />
					Add New Coach
				</h3>
				<button
					className="modal-close"
					onClick={handleClose}
					title="Close"
					aria-label="Close"
					disabled={isSubmitting}
				>
					<X className="w-5 h-5" />
				</button>
			</div>
			<form
				onSubmit={handleSubmit}
				style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
			>
				<div className="modal-body" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
					{/* Warning about copying credentials */}
					<div
						style={{
							marginBottom: '1.5rem',
							padding: '1rem 1.25rem',
							background: 'rgba(249, 197, 19, 0.1)',
							border: '2px solid rgba(249, 197, 19, 0.3)',
							borderRadius: '12px',
						}}
					>
						<div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
							<Save
								className="w-5 h-5"
								style={{ color: 'var(--primary-yellow)', marginTop: '0.125rem', flexShrink: 0 }}
							/>
							<div>
								<h4
									style={{
										fontFamily: 'Poppins, sans-serif',
										fontSize: '0.95rem',
										fontWeight: '600',
										color: 'var(--text-primary)',
										margin: '0 0 0.5rem 0',
									}}
								>
									⚠️ IMPORTANT: Copy Credentials Before Saving
								</h4>
								<p
									style={{
										fontSize: '0.85rem',
										color: 'var(--text-secondary)',
										margin: 0,
										lineHeight: '1.5',
									}}
								>
									Please copy the email and password below before clicking "Create Coach Account".
									These credentials should be sent to the designated coach for them to log in to the
									app.
								</p>
							</div>
						</div>
					</div>

					<div className="form-grid">
						<div className="form-group">
							<label htmlFor="firstName">
								First Name <span className="required">*</span>
							</label>
							<input
								type="text"
								id="firstName"
								name="firstName"
								required
								value={formData.firstName}
								onChange={handleChange}
							/>
						</div>
						<div className="form-group">
							<label htmlFor="middleName">Middle Name</label>
							<input
								type="text"
								id="middleName"
								name="middleName"
								value={formData.middleName}
								onChange={handleChange}
							/>
						</div>
						<div className="form-group">
							<label htmlFor="lastName">
								Last Name <span className="required">*</span>
							</label>
							<input
								type="text"
								id="lastName"
								name="lastName"
								required
								value={formData.lastName}
								onChange={handleChange}
							/>
						</div>
						<div className="form-group">
							<label htmlFor="email">
								Email Address <span className="required">*</span>
							</label>
							<div style={{ display: 'flex', gap: '0.5rem' }}>
								<input
									type="email"
									id="email"
									name="email"
									required
									value={formData.email}
									onChange={handleChange}
									style={{ flex: 1 }}
								/>
								<button
									type="button"
									onClick={() => handleCopyToClipboard(formData.email)}
									disabled={!formData.email}
									style={{
										padding: '0.9rem 1rem',
										background: 'var(--primary-yellow)',
										color: '#1a1a1a',
										borderRadius: '12px',
										fontWeight: '600',
										cursor: formData.email ? 'pointer' : 'not-allowed',
										display: 'flex',
										alignItems: 'center',
										gap: '0.5rem',
										border: 'none',
										transition: 'all 0.3s ease',
										opacity: formData.email ? 1 : 0.5,
									}}
									title="Copy email"
								>
									<Copy className="w-4 h-4" />
								</button>
							</div>
						</div>
						<div className="form-group">
							<label htmlFor="password">
								Password <span className="required">*</span>
							</label>
							<div style={{ display: 'flex', gap: '0.5rem' }}>
								<input
									type={showPassword ? 'text' : 'password'}
									id="password"
									name="password"
									required
									value={formData.password}
									onChange={handleChange}
									style={{ flex: 1 }}
								/>
								<button
									type="button"
									onClick={() => handleCopyToClipboard(formData.password)}
									disabled={!formData.password}
									style={{
										padding: '0.9rem 1rem',
										background: 'var(--primary-yellow)',
										color: '#1a1a1a',
										borderRadius: '12px',
										fontWeight: '600',
										cursor: formData.password ? 'pointer' : 'not-allowed',
										display: 'flex',
										alignItems: 'center',
										gap: '0.5rem',
										border: 'none',
										transition: 'all 0.3s ease',
										opacity: formData.password ? 1 : 0.5,
									}}
									title="Copy password"
								>
									<Copy className="w-4 h-4" />
								</button>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									style={{
										padding: '0.9rem 1rem',
										background: 'rgba(255, 255, 255, 0.05)',
										color: 'var(--text-secondary)',
										borderRadius: '12px',
										border: '1px solid rgba(255, 255, 255, 0.1)',
										cursor: 'pointer',
										display: 'flex',
										alignItems: 'center',
										transition: 'all 0.3s ease',
									}}
									title={showPassword ? 'Hide password' : 'Show password'}
								>
									{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
								</button>
							</div>
						</div>
						<div className="form-group">
							<label htmlFor="phone">Phone Number</label>
							<input
								type="tel"
								id="phone"
								name="phone"
								value={formData.phone}
								onChange={handleChange}
							/>
						</div>
						<div className="form-group">
							<label htmlFor="yearsExperience">Years of Experience</label>
							<input
								type="number"
								id="yearsExperience"
								name="yearsExperience"
								min="0"
								value={formData.yearsExperience}
								onChange={handleChange}
							/>
						</div>
						<div className="form-group">
							<label htmlFor="gender">Gender</label>
							<select id="gender" name="gender" value={formData.gender} onChange={handleChange}>
								<option value="">Select Gender</option>
								<option value="Male">Male</option>
								<option value="Female">Female</option>
								<option value="Prefer not to say">Prefer not to say</option>
							</select>
						</div>
						<div className="form-group">
							<label htmlFor="dateOfBirth">Date of Birth</label>
							<DatePicker
								date={
									formData.dateOfBirth && formData.dateOfBirth.trim() !== ''
										? (() => {
												try {
													const date = new Date(formData.dateOfBirth);
													return isNaN(date.getTime()) ? undefined : date;
												} catch {
													return undefined;
												}
											})()
										: undefined
								}
								onDateChange={(date) => {
									setFormData({
										...formData,
										dateOfBirth: date ? date.toISOString().split('T')[0] : '',
									});
								}}
								placeholder="Select date of birth"
								maxDate={new Date()}
								className="w-full"
							/>
						</div>
						<div className="form-group" style={{ gridColumn: '1 / -1' }}>
							<label>Teaching Days</label>
							<div
								style={{
									display: 'grid',
									gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
									gap: '0.75rem',
									marginTop: '0.5rem',
								}}
							>
								{availableDays.map((day) => (
									<label
										key={day}
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: '0.5rem',
											padding: '0.75rem',
											background: formData.teachingDays.includes(day)
												? 'rgba(249, 197, 19, 0.1)'
												: 'rgba(255, 255, 255, 0.05)',
											border: formData.teachingDays.includes(day)
												? '1px solid rgba(249, 197, 19, 0.3)'
												: '1px solid rgba(255, 255, 255, 0.1)',
											borderRadius: '8px',
											cursor: 'pointer',
											transition: 'all 0.3s ease',
										}}
										onMouseEnter={(e) => {
											if (!formData.teachingDays.includes(day)) {
												e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
											}
										}}
										onMouseLeave={(e) => {
											if (!formData.teachingDays.includes(day)) {
												e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
											}
										}}
									>
										<input
											type="checkbox"
											checked={formData.teachingDays.includes(day)}
											onChange={() => handleDayChange(day)}
											style={{
												width: '18px',
												height: '18px',
												cursor: 'pointer',
												accentColor: 'var(--primary-yellow)',
											}}
										/>
										<span
											style={{
												color: 'var(--text-primary)',
												fontSize: '0.9rem',
												userSelect: 'none',
											}}
										>
											{day}
										</span>
									</label>
								))}
							</div>
							<small
								style={{
									display: 'block',
									fontSize: '0.75rem',
									color: 'var(--text-secondary)',
									marginTop: '0.5rem',
								}}
							>
								Select the days when the coach will be available for teaching
							</small>
						</div>
						<div className="form-group" style={{ gridColumn: '1 / -1' }}>
							<label>Teaching Time Range</label>
							<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
								{/* Start Time */}
								<div>
									<label
										htmlFor="teachingTimeStart"
										style={{
											display: 'block',
											fontSize: '0.85rem',
											fontWeight: '600',
											color: 'var(--text-secondary)',
											marginBottom: '0.5rem',
										}}
									>
										Start Time
									</label>
									<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
										<select
											id="teachingTimeStartHour"
											name="teachingTimeStartHour"
											value={formData.teachingTimeStartHour}
											onChange={handleChange}
											style={{ flex: 1 }}
										>
											{Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
												<option key={hour} value={hour.toString()}>
													{hour}
												</option>
											))}
										</select>
										<span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>:</span>
										<select
											id="teachingTimeStartMinute"
											name="teachingTimeStartMinute"
											value={formData.teachingTimeStartMinute}
											onChange={handleChange}
											style={{ flex: 1 }}
										>
											{['00', '15', '30', '45'].map((minute) => (
												<option key={minute} value={minute}>
													{minute}
												</option>
											))}
										</select>
										<select
											id="teachingTimeStartPeriod"
											name="teachingTimeStartPeriod"
											value={formData.teachingTimeStartPeriod}
											onChange={handleChange}
											style={{ flex: 1 }}
										>
											<option value="AM">AM</option>
											<option value="PM">PM</option>
										</select>
									</div>
								</div>
								{/* End Time */}
								<div>
									<label
										htmlFor="teachingTimeEnd"
										style={{
											display: 'block',
											fontSize: '0.85rem',
											fontWeight: '600',
											color: 'var(--text-secondary)',
											marginBottom: '0.5rem',
										}}
									>
										End Time
									</label>
									<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
										<select
											id="teachingTimeEndHour"
											name="teachingTimeEndHour"
											value={formData.teachingTimeEndHour}
											onChange={handleChange}
											style={{ flex: 1 }}
										>
											{Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
												<option key={hour} value={hour.toString()}>
													{hour}
												</option>
											))}
										</select>
										<span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>:</span>
										<select
											id="teachingTimeEndMinute"
											name="teachingTimeEndMinute"
											value={formData.teachingTimeEndMinute}
											onChange={handleChange}
											style={{ flex: 1 }}
										>
											{['00', '15', '30', '45'].map((minute) => (
												<option key={minute} value={minute}>
													{minute}
												</option>
											))}
										</select>
										<select
											id="teachingTimeEndPeriod"
											name="teachingTimeEndPeriod"
											value={formData.teachingTimeEndPeriod}
											onChange={handleChange}
											style={{ flex: 1 }}
										>
											<option value="AM">AM</option>
											<option value="PM">PM</option>
										</select>
									</div>
								</div>
							</div>
							<small
								style={{
									display: 'block',
									fontSize: '0.75rem',
									color: 'var(--text-secondary)',
									marginTop: '0.5rem',
								}}
							>
								Select the coach's preferred teaching time range
							</small>
						</div>
						<div className="form-group">
							<label htmlFor="clientLimit">Client Limit</label>
							<input
								type="number"
								id="clientLimit"
								name="clientLimit"
								min="1"
								value={formData.clientLimit}
								onChange={handleChange}
								placeholder="Enter maximum number of clients"
							/>
							<small
								style={{
									display: 'block',
									fontSize: '0.75rem',
									color: 'var(--text-secondary)',
									marginTop: '0.5rem',
								}}
							>
								Maximum number of clients this coach can handle (leave empty for unlimited)
							</small>
						</div>
						<div className="form-group" style={{ gridColumn: '1 / -1' }}>
							<label>Specializations</label>
							<div
								style={{
									display: 'grid',
									gridTemplateColumns: 'repeat(2, 1fr)',
									gap: '0.75rem',
									marginTop: '0.5rem',
								}}
							>
								{availableSpecializations.map((spec) => (
									<label
										key={spec}
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: '0.5rem',
											padding: '0.75rem',
											background: formData.specializations.includes(spec)
												? 'rgba(249, 197, 19, 0.1)'
												: 'rgba(255, 255, 255, 0.05)',
											border: formData.specializations.includes(spec)
												? '1px solid rgba(249, 197, 19, 0.3)'
												: '1px solid rgba(255, 255, 255, 0.1)',
											borderRadius: '8px',
											cursor: 'pointer',
											transition: 'all 0.3s ease',
										}}
										onMouseEnter={(e) => {
											if (!formData.specializations.includes(spec)) {
												e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
											}
										}}
										onMouseLeave={(e) => {
											if (!formData.specializations.includes(spec)) {
												e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
											}
										}}
									>
										<input
											type="checkbox"
											checked={formData.specializations.includes(spec)}
											onChange={() => handleSpecializationChange(spec)}
											style={{
												width: '18px',
												height: '18px',
												cursor: 'pointer',
												accentColor: 'var(--primary-yellow)',
											}}
										/>
										<span
											style={{
												color: 'var(--text-primary)',
												fontSize: '0.9rem',
												userSelect: 'none',
											}}
										>
											{spec}
										</span>
									</label>
								))}
							</div>
						</div>
					</div>
				</div>
				<div className="modal-footer" style={{ flexShrink: 0 }}>
					<button
						type="button"
						className="btn-secondary"
						onClick={handleClose}
						disabled={isSubmitting}
					>
						<X className="w-4 h-4" />
						Cancel
					</button>
					<button type="submit" className="btn-primary" disabled={isSubmitting}>
						{isSubmitting ? (
							<>
								<RefreshCw className="w-4 h-4 animate-spin" />
								Creating...
							</>
						) : (
							<>
								<Save className="w-4 h-4" />
								Create Coach Account
							</>
						)}
					</button>
				</div>
			</form>
		</div>
	);
}

function EditCoachModal({
	coach,
	isOpen,
	onClose,
	onSubmit,
}: {
	coach: Coach;
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (data: {
		firstName: string;
		middleName?: string;
		lastName: string;
		phone?: string;
		specializations: string[];
		yearsExperience?: string;
		gender?: string;
		dateOfBirth?: string;
		teachingDays?: string[];
		teachingTime?: string;
		clientLimit?: string;
	}) => Promise<void>;
}) {
	const availableSpecializations = [
		'Weight loss',
		'Muscle building',
		'General fitness',
		'Strength training',
		'Endurance',
		'Flexibility',
		'Rehabilitation',
		'Athletic Performance',
	];
	const availableDays = [
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday',
		'Sunday',
	];

	// Parse teaching time from coach data
	const parseTeachingTime = (timeString?: string) => {
		if (!timeString || timeString === 'N/A') {
			return {
				startHour: '9',
				startMinute: '00',
				startPeriod: 'AM',
				endHour: '5',
				endMinute: '00',
				endPeriod: 'PM',
			};
		}
		// Format: "HH:MM AM/PM - HH:MM AM/PM"
		const parts = timeString.split(' - ');
		if (parts.length === 2) {
			const start = parts[0].trim().split(' ');
			const end = parts[1].trim().split(' ');
			if (start.length === 2 && end.length === 2) {
				const [startTime, startPeriod] = start;
				const [endTime, endPeriod] = end;
				const [startHour, startMinute] = startTime.split(':');
				const [endHour, endMinute] = endTime.split(':');
				return {
					startHour: startHour || '9',
					startMinute: startMinute || '00',
					startPeriod: startPeriod || 'AM',
					endHour: endHour || '5',
					endMinute: endMinute || '00',
					endPeriod: endPeriod || 'PM',
				};
			}
		}
		return {
			startHour: '9',
			startMinute: '00',
			startPeriod: 'AM',
			endHour: '5',
			endMinute: '00',
			endPeriod: 'PM',
		};
	};

	const teachingTimeParsed = parseTeachingTime(coach.teachingTime?.[0]);

	const [formData, setFormData] = useState({
		firstName: coach.firstName || '',
		middleName: coach.middleName || '',
		lastName: coach.lastName || '',
		phone: coach.phone !== 'N/A' ? coach.phone : '',
		specializations:
			coach.allSpecializations && coach.allSpecializations.length > 0
				? coach.allSpecializations
				: coach.specialization
					? [coach.specialization]
					: [],
		yearsExperience: coach.yearsExperience || '',
		gender: coach.gender !== 'N/A' ? coach.gender : '',
		dateOfBirth: coach.dateOfBirth && coach.dateOfBirth !== 'N/A' ? coach.dateOfBirth : '',
		teachingDays: coach.teachingDate || [],
		teachingTimeStartHour: teachingTimeParsed.startHour,
		teachingTimeStartMinute: teachingTimeParsed.startMinute,
		teachingTimeStartPeriod: teachingTimeParsed.startPeriod,
		teachingTimeEndHour: teachingTimeParsed.endHour,
		teachingTimeEndMinute: teachingTimeParsed.endMinute,
		teachingTimeEndPeriod: teachingTimeParsed.endPeriod,
		clientLimit: coach.clientLimit && coach.clientLimit > 0 ? coach.clientLimit.toString() : '',
	});
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		try {
			// Format teaching time range (start - end) with AM/PM before submitting
			const startTime = `${formData.teachingTimeStartHour}:${formData.teachingTimeStartMinute} ${formData.teachingTimeStartPeriod}`;
			const endTime = `${formData.teachingTimeEndHour}:${formData.teachingTimeEndMinute} ${formData.teachingTimeEndPeriod}`;
			const formattedTeachingTime = `${startTime} - ${endTime}`;

			await onSubmit({
				...formData,
				teachingTime: formattedTeachingTime,
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleSpecializationChange = (specialization: string) => {
		setFormData((prev) => {
			const isSelected = prev.specializations.includes(specialization);
			return {
				...prev,
				specializations: isSelected
					? prev.specializations.filter((s) => s !== specialization)
					: [...prev.specializations, specialization],
			};
		});
	};

	const handleDayChange = (day: string) => {
		setFormData((prev) => {
			const isSelected = prev.teachingDays.includes(day);
			return {
				...prev,
				teachingDays: isSelected
					? prev.teachingDays.filter((d) => d !== day)
					: [...prev.teachingDays, day],
			};
		});
	};

	const handleClose = () => {
		if (!isSubmitting) {
			onClose();
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="modal modal-large"
			onClick={(e) => e.stopPropagation()}
			style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}
		>
			<div className="modal-header" style={{ flexShrink: 0 }}>
				<h3>
					<Edit className="w-5 h-5" />
					Edit Coach Profile
				</h3>
				<button
					className="modal-close"
					onClick={handleClose}
					title="Close"
					aria-label="Close"
					disabled={isSubmitting}
				>
					<X className="w-5 h-5" />
				</button>
			</div>
			<form
				onSubmit={handleSubmit}
				style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
			>
				<div className="modal-body" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
					<div className="form-grid">
						<div className="form-group">
							<label htmlFor="firstName">
								First Name <span className="required">*</span>
							</label>
							<input
								type="text"
								id="firstName"
								name="firstName"
								required
								value={formData.firstName}
								onChange={handleChange}
							/>
						</div>
						<div className="form-group">
							<label htmlFor="middleName">Middle Name</label>
							<input
								type="text"
								id="middleName"
								name="middleName"
								value={formData.middleName}
								onChange={handleChange}
							/>
						</div>
						<div className="form-group">
							<label htmlFor="lastName">
								Last Name <span className="required">*</span>
							</label>
							<input
								type="text"
								id="lastName"
								name="lastName"
								required
								value={formData.lastName}
								onChange={handleChange}
							/>
						</div>
						<div className="form-group">
							<label htmlFor="phone">Phone Number</label>
							<input
								type="tel"
								id="phone"
								name="phone"
								value={formData.phone}
								onChange={handleChange}
							/>
						</div>
						<div className="form-group">
							<label htmlFor="yearsExperience">Years of Experience</label>
							<input
								type="number"
								id="yearsExperience"
								name="yearsExperience"
								min="0"
								value={formData.yearsExperience}
								onChange={handleChange}
							/>
						</div>
						<div className="form-group">
							<label htmlFor="gender">Gender</label>
							<select id="gender" name="gender" value={formData.gender} onChange={handleChange}>
								<option value="">Select Gender</option>
								<option value="Male">Male</option>
								<option value="Female">Female</option>
								<option value="Prefer not to say">Prefer not to say</option>
							</select>
						</div>
						<div className="form-group">
							<label htmlFor="dateOfBirth">Date of Birth</label>
							<DatePicker
								date={
									formData.dateOfBirth && formData.dateOfBirth.trim() !== ''
										? (() => {
												try {
													const date = new Date(formData.dateOfBirth);
													return isNaN(date.getTime()) ? undefined : date;
												} catch {
													return undefined;
												}
											})()
										: undefined
								}
								onDateChange={(date) => {
									setFormData({
										...formData,
										dateOfBirth: date ? date.toISOString().split('T')[0] : '',
									});
								}}
								placeholder="Select date of birth"
								maxDate={new Date()}
								className="w-full"
							/>
						</div>
						<div className="form-group" style={{ gridColumn: '1 / -1' }}>
							<label>Teaching Days</label>
							<div
								style={{
									display: 'grid',
									gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
									gap: '0.75rem',
									marginTop: '0.5rem',
								}}
							>
								{availableDays.map((day) => (
									<label
										key={day}
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: '0.5rem',
											padding: '0.75rem',
											background: formData.teachingDays.includes(day)
												? 'rgba(249, 197, 19, 0.1)'
												: 'rgba(255, 255, 255, 0.05)',
											border: formData.teachingDays.includes(day)
												? '1px solid rgba(249, 197, 19, 0.3)'
												: '1px solid rgba(255, 255, 255, 0.1)',
											borderRadius: '8px',
											cursor: 'pointer',
											transition: 'all 0.3s ease',
										}}
										onMouseEnter={(e) => {
											if (!formData.teachingDays.includes(day)) {
												e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
											}
										}}
										onMouseLeave={(e) => {
											if (!formData.teachingDays.includes(day)) {
												e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
											}
										}}
									>
										<input
											type="checkbox"
											checked={formData.teachingDays.includes(day)}
											onChange={() => handleDayChange(day)}
											style={{
												width: '18px',
												height: '18px',
												cursor: 'pointer',
												accentColor: 'var(--primary-yellow)',
											}}
										/>
										<span
											style={{
												color: 'var(--text-primary)',
												fontSize: '0.9rem',
												userSelect: 'none',
											}}
										>
											{day}
										</span>
									</label>
								))}
							</div>
							<small
								style={{
									display: 'block',
									fontSize: '0.75rem',
									color: 'var(--text-secondary)',
									marginTop: '0.5rem',
								}}
							>
								Select the days when the coach will be available for teaching
							</small>
						</div>
						<div className="form-group" style={{ gridColumn: '1 / -1' }}>
							<label>Teaching Time Range</label>
							<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
								{/* Start Time */}
								<div>
									<label
										htmlFor="teachingTimeStart"
										style={{
											display: 'block',
											fontSize: '0.85rem',
											fontWeight: '600',
											color: 'var(--text-secondary)',
											marginBottom: '0.5rem',
										}}
									>
										Start Time
									</label>
									<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
										<select
											id="teachingTimeStartHour"
											name="teachingTimeStartHour"
											value={formData.teachingTimeStartHour}
											onChange={handleChange}
											style={{ flex: 1 }}
										>
											{Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
												<option key={hour} value={hour.toString()}>
													{hour}
												</option>
											))}
										</select>
										<span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>:</span>
										<select
											id="teachingTimeStartMinute"
											name="teachingTimeStartMinute"
											value={formData.teachingTimeStartMinute}
											onChange={handleChange}
											style={{ flex: 1 }}
										>
											{['00', '15', '30', '45'].map((minute) => (
												<option key={minute} value={minute}>
													{minute}
												</option>
											))}
										</select>
										<select
											id="teachingTimeStartPeriod"
											name="teachingTimeStartPeriod"
											value={formData.teachingTimeStartPeriod}
											onChange={handleChange}
											style={{ flex: 1 }}
										>
											<option value="AM">AM</option>
											<option value="PM">PM</option>
										</select>
									</div>
								</div>
								{/* End Time */}
								<div>
									<label
										htmlFor="teachingTimeEnd"
										style={{
											display: 'block',
											fontSize: '0.85rem',
											fontWeight: '600',
											color: 'var(--text-secondary)',
											marginBottom: '0.5rem',
										}}
									>
										End Time
									</label>
									<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
										<select
											id="teachingTimeEndHour"
											name="teachingTimeEndHour"
											value={formData.teachingTimeEndHour}
											onChange={handleChange}
											style={{ flex: 1 }}
										>
											{Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
												<option key={hour} value={hour.toString()}>
													{hour}
												</option>
											))}
										</select>
										<span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>:</span>
										<select
											id="teachingTimeEndMinute"
											name="teachingTimeEndMinute"
											value={formData.teachingTimeEndMinute}
											onChange={handleChange}
											style={{ flex: 1 }}
										>
											{['00', '15', '30', '45'].map((minute) => (
												<option key={minute} value={minute}>
													{minute}
												</option>
											))}
										</select>
										<select
											id="teachingTimeEndPeriod"
											name="teachingTimeEndPeriod"
											value={formData.teachingTimeEndPeriod}
											onChange={handleChange}
											style={{ flex: 1 }}
										>
											<option value="AM">AM</option>
											<option value="PM">PM</option>
										</select>
									</div>
								</div>
							</div>
							<small
								style={{
									display: 'block',
									fontSize: '0.75rem',
									color: 'var(--text-secondary)',
									marginTop: '0.5rem',
								}}
							>
								Select the coach's preferred teaching time range
							</small>
						</div>
						<div className="form-group">
							<label htmlFor="clientLimit">Client Limit</label>
							<input
								type="number"
								id="clientLimit"
								name="clientLimit"
								min="1"
								value={formData.clientLimit}
								onChange={handleChange}
								placeholder="Enter maximum number of clients"
							/>
							<small
								style={{
									display: 'block',
									fontSize: '0.75rem',
									color: 'var(--text-secondary)',
									marginTop: '0.5rem',
								}}
							>
								Maximum number of clients this coach can handle (leave empty for unlimited)
							</small>
						</div>
						<div className="form-group" style={{ gridColumn: '1 / -1' }}>
							<label>Specializations</label>
							<div
								style={{
									display: 'grid',
									gridTemplateColumns: 'repeat(2, 1fr)',
									gap: '0.75rem',
									marginTop: '0.5rem',
								}}
							>
								{availableSpecializations.map((spec) => (
									<label
										key={spec}
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: '0.5rem',
											padding: '0.75rem',
											background: formData.specializations.includes(spec)
												? 'rgba(249, 197, 19, 0.1)'
												: 'rgba(255, 255, 255, 0.05)',
											border: formData.specializations.includes(spec)
												? '1px solid rgba(249, 197, 19, 0.3)'
												: '1px solid rgba(255, 255, 255, 0.1)',
											borderRadius: '8px',
											cursor: 'pointer',
											transition: 'all 0.3s ease',
										}}
										onMouseEnter={(e) => {
											if (!formData.specializations.includes(spec)) {
												e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
											}
										}}
										onMouseLeave={(e) => {
											if (!formData.specializations.includes(spec)) {
												e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
											}
										}}
									>
										<input
											type="checkbox"
											checked={formData.specializations.includes(spec)}
											onChange={() => handleSpecializationChange(spec)}
											style={{
												width: '18px',
												height: '18px',
												cursor: 'pointer',
												accentColor: 'var(--primary-yellow)',
											}}
										/>
										<span
											style={{
												color: 'var(--text-primary)',
												fontSize: '0.9rem',
												userSelect: 'none',
											}}
										>
											{spec}
										</span>
									</label>
								))}
							</div>
						</div>
					</div>
				</div>
				<div className="modal-footer" style={{ flexShrink: 0 }}>
					<button
						type="button"
						className="btn-secondary"
						onClick={handleClose}
						disabled={isSubmitting}
					>
						<X className="w-4 h-4" />
						Cancel
					</button>
					<button type="submit" className="btn-primary" disabled={isSubmitting}>
						{isSubmitting ? (
							<>
								<RefreshCw className="w-4 h-4 animate-spin" />
								Updating...
							</>
						) : (
							<>
								<Save className="w-4 h-4" />
								Update Coach Profile
							</>
						)}
					</button>
				</div>
			</form>
		</div>
	);
}
