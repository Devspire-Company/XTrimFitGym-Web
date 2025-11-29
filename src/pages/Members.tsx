import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
	Search,
	Eye,
	Trash2,
	Users,
	X,
	CreditCard,
	Loader2,
	RefreshCw,
	MoreVertical,
} from 'lucide-react';
import { GET_USERS, DELETE_USER, CANCEL_MEMBERSHIP } from '@/graphql/operations/index';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import { DirectSubscribeModal } from '@/components/modals/DirectSubscribeModal';

interface Member {
	id: string;
	name: string;
	firstName: string;
	middleName?: string;
	lastName: string;
	email: string;
	phone: string;
	membership: string;
	status: string;
	joinDate: string;
	avatar: string;
	dateOfBirth: string;
	gender: string;
	address: string;
	emergencyContact: string;
	medicalConditions: string;
	fitnessGoals: string;
	progress: {
		weightLost: number;
		workoutsCompleted: number;
	};
	transactionId?: string; // ID of the active membership transaction
	durationType?: string; // MONTHLY, QUARTERLY, YEARLY
	startDate?: string; // Subscription start date
	endDate?: string; // Subscription end date
	daysLeft?: number; // Remaining days in subscription
}

export function MembersPage() {
	useEffect(() => {
		document.title = 'Member Management - X-TRIM FIT GYM';
	}, []);

	const dispatch = useAppDispatch();
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [membershipFilter, setMembershipFilter] = useState<string>('all');
	const [selectedMember, setSelectedMember] = useState<Member | null>(null);
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);
	const [memberToSubscribe, setMemberToSubscribe] = useState<{ id: string; name: string } | null>(
		null
	);
	const [isUnsubscribeModalOpen, setIsUnsubscribeModalOpen] = useState(false);
	const [memberToUnsubscribe, setMemberToUnsubscribe] = useState<{
		id: string;
		name: string;
		transactionId: string;
	} | null>(null);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
	const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(
		null
	);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = () => {
			if (openDropdownId) {
				setOpenDropdownId(null);
			}
		};

		if (openDropdownId) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [openDropdownId]);

	// GraphQL queries and mutations
	const { data, loading, error, refetch } = useQuery(GET_USERS, {
		variables: { role: 'member' as any },
		errorPolicy: 'none',
	});

	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			await refetch();
		} finally {
			setIsRefreshing(false);
		}
	};

	const [deleteUserMutation] = useMutation(DELETE_USER, {
		onCompleted: () => {
			dispatch(
				addToast({
					type: 'success',
					message: 'Member deleted successfully',
				})
			);
			refetch();
		},
		onError: (error) => {
			dispatch(
				addToast({
					type: 'error',
					message: error.message || 'Failed to delete member',
				})
			);
		},
	});

	const [cancelMembershipMutation, { loading: isUnsubscribing }] = useMutation(CANCEL_MEMBERSHIP, {
		refetchQueries: [
			{ query: GET_USERS, variables: { role: 'member' } },
			{ query: GET_USERS, variables: { role: 'coach' } },
		],
		onCompleted: () => {
			dispatch(
				addToast({
					type: 'success',
					message: `Successfully unsubscribed ${memberToUnsubscribe?.name}`,
				})
			);
			setIsUnsubscribeModalOpen(false);
			setMemberToUnsubscribe(null);
			refetch();
		},
		onError: (error) => {
			dispatch(
				addToast({
					type: 'error',
					message: error.message || 'Failed to unsubscribe member',
				})
			);
		},
	});

	// Helper function to calculate days left
	const calculateDaysLeft = (startDate: string, durationType: string): number => {
		if (!startDate || !durationType) return 0;

		const start = new Date(startDate);
		const now = new Date();
		const end = new Date(start);

		// Calculate end date based on duration type
		switch (durationType.toUpperCase()) {
			case 'MONTHLY':
				end.setMonth(end.getMonth() + 1);
				break;
			case 'QUARTERLY':
				end.setMonth(end.getMonth() + 3);
				break;
			case 'YEARLY':
				end.setFullYear(end.getFullYear() + 1);
				break;
			default:
				return 0;
		}

		// Calculate difference in days
		const diffTime = end.getTime() - now.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		return diffDays > 0 ? diffDays : 0;
	};

	// Transform API data
	const apiMembers: Member[] = (data?.getUsers || []).map((m: any) => {
		// Check both currentMembership and membershipTransaction for subscription info
		const membershipTransaction = m.currentMembership || m.membershipDetails?.membershipTransaction;
		const membership = membershipTransaction?.membership?.name || 'No Plan';
		const status = membershipTransaction?.status === 'ACTIVE' ? 'Active' : 'Inactive';
		const joinDate = m.createdAt
			? new Date(m.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
			: 'N/A';

		const durationType =
			membershipTransaction?.membership?.durationType || membershipTransaction?.durationType;
		const startDate =
			membershipTransaction?.startDate || membershipTransaction?.createdAt || m.createdAt;
		const endDate = membershipTransaction?.endDate;
		const daysLeft =
			status === 'Active' && startDate && durationType
				? calculateDaysLeft(startDate, durationType)
				: 0;

		return {
			id: m.id,
			name: `${m.firstName} ${m.middleName ? m.middleName + ' ' : ''}${m.lastName}`,
			firstName: m.firstName,
			middleName: m.middleName,
			lastName: m.lastName,
			email: m.email,
			phone: m.phoneNumber || 'N/A',
			membership,
			status,
			joinDate,
			avatar: `${m.firstName?.[0] || ''}${m.lastName?.[0] || ''}`,
			dateOfBirth: m.dateOfBirth || 'N/A',
			gender: m.gender || 'N/A',
			address: 'N/A', // Not in API schema
			emergencyContact: 'N/A', // Not in API schema
			medicalConditions: 'None', // Not in API schema
			fitnessGoals: m.membershipDetails?.fitnessGoal?.join(', ') || 'N/A',
			progress: {
				weightLost: 0, // Would need session logs from API
				workoutsCompleted: 0, // Would need session logs from API
			},
			transactionId: membershipTransaction?.id, // Store transaction ID for unsubscribe
			durationType,
			startDate,
			endDate,
			daysLeft,
		};
	});

	const filteredMembers = useMemo(() => {
		return apiMembers.filter((member) => {
			const matchesSearch =
				!searchTerm ||
				member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
				member.phone.includes(searchTerm);
			const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
			const matchesMembership =
				membershipFilter === 'all' || member.membership === membershipFilter;
			return matchesSearch && matchesStatus && matchesMembership;
		});
	}, [apiMembers, searchTerm, statusFilter, membershipFilter]);

	const handleView = (member: Member) => {
		setSelectedMember(member);
		setIsViewModalOpen(true);
	};

	const handleDelete = (member: Member) => {
		setSelectedMember(member);
		setIsDeleteModalOpen(true);
	};

	const handleSubscribe = (member: Member) => {
		console.log('🔔 Subscribe button clicked for member:', member);
		if (!member || !member.id) {
			console.error('❌ Invalid member data:', member);
			return;
		}
		setMemberToSubscribe({ id: member.id, name: member.name });
		setIsSubscribeModalOpen(true);
	};

	const handleUnsubscribe = (member: Member) => {
		console.log('🔔 Unsubscribe button clicked for member:', member);
		if (!member || !member.id || !member.transactionId) {
			console.error('❌ Invalid member data or missing transaction ID:', member);
			dispatch(
				addToast({
					type: 'error',
					message: 'Cannot unsubscribe: No active subscription found',
				})
			);
			return;
		}
		setMemberToUnsubscribe({
			id: member.id,
			name: member.name,
			transactionId: member.transactionId,
		});
		setIsUnsubscribeModalOpen(true);
	};

	const confirmDelete = async () => {
		if (selectedMember) {
			try {
				await deleteUserMutation({
					variables: { id: selectedMember.id },
				});
				setIsDeleteModalOpen(false);
				setSelectedMember(null);
			} catch (err) {
				console.error('Error deleting member:', err);
			}
		}
	};

	const confirmUnsubscribe = async () => {
		if (memberToUnsubscribe) {
			try {
				await cancelMembershipMutation({
					variables: { transactionId: memberToUnsubscribe.transactionId },
				});
			} catch (err) {
				console.error('Error unsubscribing member:', err);
			}
		}
	};

	// Debug: Log when modal state changes
	useEffect(() => {
		console.log('📊 Subscribe modal state changed:', {
			isOpen: isSubscribeModalOpen,
			memberToSubscribe,
		});
	}, [isSubscribeModalOpen, memberToSubscribe]);

	// Debug: Log when modal state changes
	useEffect(() => {
		console.log('📊 Subscribe modal state:', {
			isOpen: isSubscribeModalOpen,
			memberToSubscribe,
		});
	}, [isSubscribeModalOpen, memberToSubscribe]);

	// Show loading state
	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-yellow)] mx-auto mb-4"></div>
					<p className="text-[var(--text-secondary)]">Loading members...</p>
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
						Unable to Load Members
					</h2>
					<p className="text-[var(--text-secondary)] mb-4">
						{error?.message || 'Failed to connect to the server'}
					</p>
					<button onClick={() => refetch()} className="btn-primary">
						Retry
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold flex items-center gap-2">
						<Users className="w-8 h-8" color="var(--primary-yellow)" />
						Member Management
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-1">
						Manage all gym members, view details, and update information ({apiMembers.length} total)
					</p>
				</div>
				<div className="flex items-center gap-3">
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

			{/* Search and Filters */}
			<div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 backdrop-blur-md">
				<div className="search-filter-bar flex flex-col md:flex-row gap-4">
					<div className="search-box flex-1 relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
						<input
							type="text"
							placeholder="Search members by name, email, or phone..."
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
						<option value="Suspended">Suspended</option>
					</select>
					<select
						value={membershipFilter}
						onChange={(e) => setMembershipFilter(e.target.value)}
						className="px-4 py-2.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary-yellow)] focus:ring-[3px] focus:ring-[rgba(249,197,19,0.1)]"
					>
						<option value="all">All Memberships</option>
						<option value="Student">Student</option>
						<option value="PROMO Student">PROMO Student</option>
						<option value="Non student">Non student</option>
					</select>
				</div>
			</div>

			{/* Members Table */}
			<div className="table-container bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden backdrop-blur-md">
				<div className="overflow-x-auto">
					<table className="members-table w-full text-sm">
						<thead className="bg-[rgba(249,197,19,0.05)] border-b-2 border-[rgba(249,197,19,0.2)]">
							<tr>
								<th className="px-4 py-5 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
									Member
								</th>
								<th className="px-4 py-5 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
									Contact
								</th>
								<th className="px-4 py-5 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
									Membership
								</th>
								<th className="px-4 py-5 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
									Status
								</th>
								<th className="px-4 py-5 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
									Join Date
								</th>
								<th className="px-4 py-5 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
									Days Left
								</th>
								<th className="px-4 py-5 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredMembers.length === 0 ? (
								<tr>
									<td colSpan={7} className="px-6 py-12 text-center text-[var(--text-secondary)]">
										No members found
									</td>
								</tr>
							) : (
								filteredMembers.map((member) => (
									<tr key={member.id} className="members-table tbody tr">
										<td className="px-4 py-5">
											<div className="member-info flex items-center gap-3">
												<div className="member-avatar w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--primary-red)] to-[var(--primary-yellow)] flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
													{member.avatar}
												</div>
												<div className="member-details">
													<h4 className="font-semibold text-[var(--text-primary)] mb-1">
														{member.name}
													</h4>
													<p className="text-xs text-[var(--text-secondary)]">ID: {member.id}</p>
												</div>
											</div>
										</td>
										<td className="px-4 py-5">
											<div className="contact-info text-sm">
												<div className="text-[var(--text-primary)]">{member.email}</div>
												<div className="text-[var(--text-secondary)]">{member.phone}</div>
											</div>
										</td>
										<td className="px-4 py-5">
											<span
												className={`membership-badge px-2.5 py-1.5 text-xs rounded-lg font-semibold ${
													member.membership === 'Student'
														? 'student bg-[rgba(106,123,148,0.2)] text-[var(--primary-gray)] border border-[rgba(106,123,148,0.3)]'
														: member.membership === 'PROMO Student'
															? 'promo-student bg-gradient-to-br from-[rgba(249,197,19,0.2)] to-[rgba(228,30,38,0.2)] text-[var(--primary-yellow)] border border-[rgba(249,197,19,0.3)]'
															: 'non-student bg-gradient-to-br from-[rgba(139,69,19,0.2)] to-[rgba(160,82,45,0.2)] text-[#D2691E] border border-[rgba(160,82,45,0.3)]'
												}`}
											>
												{member.membership}
											</span>
										</td>
										<td className="px-4 py-5">
											<span
												className={`status-badge px-2.5 py-1.5 text-xs rounded-lg font-semibold ${
													member.status === 'Active'
														? 'active bg-[rgba(16,185,129,0.15)] text-[#10B981] border border-[rgba(16,185,129,0.3)]'
														: member.status === 'Inactive'
															? 'inactive bg-[rgba(107,114,128,0.15)] text-[#9CA3AF] border border-[rgba(107,114,128,0.3)]'
															: 'suspended bg-[rgba(239,68,68,0.15)] text-[#EF4444] border border-[rgba(239,68,68,0.3)]'
												}`}
											>
												{member.status}
											</span>
										</td>
										<td className="px-4 py-5 text-sm text-[var(--text-secondary)]">
											{member.joinDate}
										</td>
										<td className="px-4 py-5 text-sm">
											{member.status === 'Active' && member.daysLeft !== undefined ? (
												<span
													className={`px-2.5 py-1.5 text-xs rounded-lg font-semibold ${
														member.daysLeft <= 7
															? 'bg-[rgba(239,68,68,0.15)] text-[#EF4444] border border-[rgba(239,68,68,0.3)]'
															: member.daysLeft <= 30
																? 'bg-[rgba(249,197,19,0.15)] text-[var(--primary-yellow)] border border-[rgba(249,197,19,0.3)]'
																: 'bg-[rgba(16,185,129,0.15)] text-[#10B981] border border-[rgba(16,185,129,0.3)]'
													}`}
												>
													{member.daysLeft} {member.daysLeft === 1 ? 'day' : 'days'}
												</span>
											) : (
												<span className="text-[var(--text-secondary)]">—</span>
											)}
										</td>
										<td className="px-4 py-5">
											<div className="relative">
												<button
													onClick={(e) => {
														e.stopPropagation();
														const button = e.currentTarget;
														const rect = button.getBoundingClientRect();
														if (openDropdownId === member.id) {
															setOpenDropdownId(null);
															setDropdownPosition(null);
														} else {
															setOpenDropdownId(member.id);
															setDropdownPosition({
																top: rect.bottom + 4,
																right: window.innerWidth - rect.right,
															});
														}
													}}
													className="btn-small px-3 py-1.5 rounded-lg text-xs font-semibold bg-[rgba(255,255,255,0.05)] text-[var(--text-primary)] border border-[var(--card-border)] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
													title="Actions"
												>
													<MoreVertical className="w-4 h-4" />
												</button>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Dropdown Menu - Rendered outside table */}
			{openDropdownId && dropdownPosition && (
				<>
					<div
						className="fixed inset-0 z-[45]"
						onClick={() => {
							setOpenDropdownId(null);
							setDropdownPosition(null);
						}}
						style={{ pointerEvents: 'auto' }}
					></div>
					<div
						className="fixed w-48 bg-[#1a1a1a] border border-[var(--card-border)] rounded-lg shadow-lg z-[60]"
						style={{
							top: `${dropdownPosition.top}px`,
							right: `${dropdownPosition.right}px`,
							pointerEvents: 'auto',
						}}
						onClick={(e) => e.stopPropagation()}
						onMouseDown={(e) => e.stopPropagation()}
					>
						<div className="py-1">
							{(() => {
								const member = filteredMembers.find((m) => m.id === openDropdownId);
								if (!member) return null;
								return (
									<>
										<button
											type="button"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												handleView(member);
												setOpenDropdownId(null);
												setDropdownPosition(null);
											}}
											onMouseDown={(e) => e.stopPropagation()}
											className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[rgba(59,130,246,0.1)] flex items-center gap-2 cursor-pointer"
										>
											<Eye className="w-4 h-4 text-[#3B82F6]" />
											View
										</button>
										{member.status === 'Active' && member.transactionId ? (
											<button
												type="button"
												onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													handleUnsubscribe(member);
													setOpenDropdownId(null);
													setDropdownPosition(null);
												}}
												onMouseDown={(e) => e.stopPropagation()}
												className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[rgba(239,68,68,0.1)] flex items-center gap-2 cursor-pointer"
											>
												<X className="w-4 h-4 text-[#EF4444]" />
												Unsubscribe
											</button>
										) : (
											<button
												type="button"
												onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													handleSubscribe(member);
													setOpenDropdownId(null);
													setDropdownPosition(null);
												}}
												onMouseDown={(e) => e.stopPropagation()}
												className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[rgba(16,185,129,0.1)] flex items-center gap-2 cursor-pointer"
											>
												<CreditCard className="w-4 h-4 text-[#10B981]" />
												Subscribe
											</button>
										)}
										<button
											type="button"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												handleDelete(member);
												setOpenDropdownId(null);
												setDropdownPosition(null);
											}}
											onMouseDown={(e) => e.stopPropagation()}
											className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[rgba(239,68,68,0.1)] flex items-center gap-2 cursor-pointer"
										>
											<Trash2 className="w-4 h-4 text-[#EF4444]" />
											Delete
										</button>
									</>
								);
							})()}
						</div>
					</div>
				</>
			)}

			{/* View Modal */}
			<div
				className={`modal-overlay ${isViewModalOpen && selectedMember ? 'active' : ''}`}
				onClick={() => {
					setIsViewModalOpen(false);
					setSelectedMember(null);
				}}
			>
				{selectedMember && (
					<MemberViewModal
						member={selectedMember}
						onClose={() => {
							setIsViewModalOpen(false);
							setSelectedMember(null);
						}}
					/>
				)}
			</div>

			{/* Delete Modal */}
			<div
				className={`modal-overlay ${isDeleteModalOpen && selectedMember ? 'active' : ''}`}
				onClick={() => {
					setIsDeleteModalOpen(false);
					setSelectedMember(null);
				}}
			>
				{selectedMember && (
					<DeleteConfirmModal
						title="Delete Member?"
						message={`Are you sure you want to delete ${selectedMember.name}? This action cannot be undone.`}
						onConfirm={confirmDelete}
						onCancel={() => {
							setIsDeleteModalOpen(false);
							setSelectedMember(null);
						}}
					/>
				)}
			</div>

			{/* Direct Subscribe Modal */}
			{memberToSubscribe && (
				<DirectSubscribeModal
					isOpen={isSubscribeModalOpen}
					onClose={() => {
						setIsSubscribeModalOpen(false);
						setMemberToSubscribe(null);
					}}
					memberId={memberToSubscribe.id}
					memberName={memberToSubscribe.name}
					onSuccess={() => {
						// Refetch members to show updated subscription
						refetch();
					}}
				/>
			)}

			{/* Unsubscribe Confirmation Modal */}
			{memberToUnsubscribe && (
				<div
					className={`modal-overlay ${isUnsubscribeModalOpen ? 'active' : ''}`}
					onClick={() => {
						setIsUnsubscribeModalOpen(false);
						setMemberToUnsubscribe(null);
					}}
				>
					<div className="modal modal-center" onClick={(e) => e.stopPropagation()}>
						<div className="modal-body">
							<div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
								<div
									className="modal-error-icon-large"
									style={{
										background: 'linear-gradient(135deg, #EF4444, #DC2626)',
									}}
								>
									<X size={48} style={{ color: 'white' }} />
								</div>
							</div>

							<h2 className="modal-title" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
								Unsubscribe Member?
							</h2>

							<p className="modal-text" style={{ textAlign: 'center', marginBottom: '2rem' }}>
								Are you sure you want to unsubscribe <strong>{memberToUnsubscribe.name}</strong>?
								This action will cancel their current membership subscription.
							</p>

							<div
								className="modal-actions"
								style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}
							>
								<button
									type="button"
									className="btn-secondary"
									onClick={() => {
										setIsUnsubscribeModalOpen(false);
										setMemberToUnsubscribe(null);
									}}
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
									className="btn-primary"
									onClick={confirmUnsubscribe}
									disabled={isUnsubscribing}
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
										cursor: isUnsubscribing ? 'not-allowed' : 'pointer',
										opacity: isUnsubscribing ? 0.6 : 1,
										background: 'linear-gradient(135deg, #EF4444, #DC2626)',
										color: 'white',
										border: 'none',
									}}
								>
									{isUnsubscribing ? (
										<>
											<Loader2 className="w-4 h-4 animate-spin" />
											Processing...
										</>
									) : (
										<>
											<X className="w-4 h-4" />
											Unsubscribe
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function MemberViewModal({ member, onClose }: { member: Member; onClose: () => void }) {
	return (
		<div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
			<div className="modal-header">
				<h3>
					<Eye className="w-5 h-5" />
					View Member
				</h3>
				<button className="modal-close" onClick={onClose} title="Close" aria-label="Close">
					<X className="w-5 h-5" />
				</button>
			</div>
			<div className="modal-body">
				<div className="grid grid-cols-2 gap-6">
					{/* Personal Information */}
					<div>
						<h3 className="font-semibold mb-3 text-[var(--text-primary)]">Personal Information</h3>
						<div className="space-y-2 text-sm">
							<div>
								<span className="text-[var(--text-secondary)]">Full Name:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">{member.name}</span>
							</div>
							<div>
								<span className="text-[var(--text-secondary)]">First Name:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">{member.firstName}</span>
							</div>
							{member.middleName && (
								<div>
									<span className="text-[var(--text-secondary)]">Middle Name:</span>{' '}
									<span className="font-medium text-[var(--text-primary)]">
										{member.middleName}
									</span>
								</div>
							)}
							<div>
								<span className="text-[var(--text-secondary)]">Last Name:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">{member.lastName}</span>
							</div>
							<div>
								<span className="text-[var(--text-secondary)]">Email:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">{member.email}</span>
							</div>
							<div>
								<span className="text-[var(--text-secondary)]">Phone:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">{member.phone}</span>
							</div>
							<div>
								<span className="text-[var(--text-secondary)]">Date of Birth:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">
									{member.dateOfBirth && member.dateOfBirth !== 'N/A'
										? new Date(member.dateOfBirth).toLocaleDateString('en-US', {
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
									{member.gender || 'N/A'}
								</span>
							</div>
						</div>
					</div>

					{/* Membership & Subscription */}
					<div>
						<h3 className="font-semibold mb-3 text-[var(--text-primary)]">
							Membership & Subscription
						</h3>
						<div className="space-y-2 text-sm">
							<div>
								<span className="text-[var(--text-secondary)]">Membership Plan:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">{member.membership}</span>
							</div>
							<div>
								<span className="text-[var(--text-secondary)]">Status:</span>{' '}
								<span
									className={`font-medium ${
										member.status === 'Active' ? 'text-[#10B981]' : 'text-[var(--text-primary)]'
									}`}
								>
									{member.status}
								</span>
							</div>
							{member.durationType && (
								<div>
									<span className="text-[var(--text-secondary)]">Duration Type:</span>{' '}
									<span className="font-medium text-[var(--text-primary)]">
										{member.durationType}
									</span>
								</div>
							)}
							{member.startDate && (
								<div>
									<span className="text-[var(--text-secondary)]">Start Date:</span>{' '}
									<span className="font-medium text-[var(--text-primary)]">
										{new Date(member.startDate).toLocaleDateString('en-US', {
											year: 'numeric',
											month: 'long',
											day: 'numeric',
										})}
									</span>
								</div>
							)}
							{member.endDate && (
								<div>
									<span className="text-[var(--text-secondary)]">End Date:</span>{' '}
									<span className="font-medium text-[var(--text-primary)]">
										{new Date(member.endDate).toLocaleDateString('en-US', {
											year: 'numeric',
											month: 'long',
											day: 'numeric',
										})}
									</span>
								</div>
							)}
							{member.daysLeft !== undefined && member.daysLeft > 0 && (
								<div>
									<span className="text-[var(--text-secondary)]">Days Left:</span>{' '}
									<span
										className={`font-medium ${
											member.daysLeft <= 7
												? 'text-[#EF4444]'
												: member.daysLeft <= 30
													? 'text-[var(--primary-yellow)]'
													: 'text-[#10B981]'
										}`}
									>
										{member.daysLeft} {member.daysLeft === 1 ? 'day' : 'days'}
									</span>
								</div>
							)}
						</div>
					</div>

					{/* Fitness Goals & Preferences */}
					<div>
						<h3 className="font-semibold mb-3 text-[var(--text-primary)]">
							Fitness Goals & Preferences
						</h3>
						<div className="space-y-2 text-sm">
							<div>
								<span className="text-[var(--text-secondary)]">Fitness Goals:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">
									{member.fitnessGoals || 'N/A'}
								</span>
							</div>
						</div>
					</div>

					{/* Account Information */}
					<div>
						<h3 className="font-semibold mb-3 text-[var(--text-primary)]">Account Information</h3>
						<div className="space-y-2 text-sm">
							<div>
								<span className="text-[var(--text-secondary)]">Member ID:</span>{' '}
								<span className="font-medium text-[var(--text-primary)] font-mono text-xs">
									{member.id}
								</span>
							</div>
							<div>
								<span className="text-[var(--text-secondary)]">Join Date:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">{member.joinDate}</span>
							</div>
							{member.transactionId && (
								<div>
									<span className="text-[var(--text-secondary)]">Transaction ID:</span>{' '}
									<span className="font-medium text-[var(--text-primary)] font-mono text-xs">
										{member.transactionId}
									</span>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
			<div className="modal-footer">
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
