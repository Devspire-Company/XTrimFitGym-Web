import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router';
import { mockMembers, type MockMember } from '@/lib/mock/data';
import { Button } from '@/components/ui/button';
import { Search, Plus, Eye, Edit, Trash2, Users, X } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';

export function MembersPage() {
	useEffect(() => {
		document.title = 'Member Management - X-TRIM FIT GYM';
	}, []);
	const dispatch = useAppDispatch();
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [membershipFilter, setMembershipFilter] = useState<string>('all');
	const [selectedMember, setSelectedMember] = useState<MockMember | null>(null);
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

	const filteredMembers = useMemo(() => {
		return Object.values(mockMembers).filter((member) => {
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
	}, [searchTerm, statusFilter, membershipFilter]);

	const handleView = (member: MockMember) => {
		setSelectedMember(member);
		setIsViewModalOpen(true);
	};

	const handleEdit = (member: MockMember) => {
		setSelectedMember(member);
		setIsEditModalOpen(true);
	};

	const handleDelete = (member: MockMember) => {
		setSelectedMember(member);
		setIsDeleteModalOpen(true);
	};

	const confirmDelete = () => {
		if (selectedMember) {
			dispatch(addToast({ message: `Member ${selectedMember.name} deleted`, type: 'success' }));
			setIsDeleteModalOpen(false);
			setSelectedMember(null);
		}
	};

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
						Manage all gym members, view details, and update information
					</p>
				</div>
				<Button>
					<Plus className="w-4 h-4" />
					Add New Member
				</Button>
			</div>

			{/* Search and Filters */}
			<div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 backdrop-blur-[10px]">
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
			<div className="table-container bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden backdrop-blur-[10px]">
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
									Progress
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
											<div className="progress-info">
												<span className="text-[var(--text-secondary)]">
													{member.progress.weightLost} lbs lost
												</span>
												<span className="progress-value text-[var(--primary-yellow)] font-semibold">
													{member.progress.workoutsCompleted} workouts
												</span>
											</div>
										</td>
										<td className="px-4 py-5">
											<div className="action-buttons flex items-center gap-2">
												<button
													onClick={() => handleView(member)}
													className="btn-small btn-view px-3 py-1.5 rounded-lg text-xs font-semibold bg-[rgba(59,130,246,0.15)] text-[#3B82F6] border border-[rgba(59,130,246,0.3)]"
												>
													<Eye className="w-4 h-4" />
												</button>
												<button
													onClick={() => handleEdit(member)}
													className="btn-small btn-edit px-3 py-1.5 rounded-lg text-xs font-semibold bg-[rgba(249,197,19,0.15)] text-[var(--primary-yellow)] border border-[rgba(249,197,19,0.3)]"
												>
													<Edit className="w-4 h-4" />
												</button>
												<button
													onClick={() => handleDelete(member)}
													className="btn-small btn-delete px-3 py-1.5 rounded-lg text-xs font-semibold bg-[rgba(239,68,68,0.15)] text-[#EF4444] border border-[rgba(239,68,68,0.3)]"
												>
													<Trash2 className="w-4 h-4" />
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
						onEdit={() => {
							setIsViewModalOpen(false);
							setIsEditModalOpen(true);
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
		</div>
	);
}

function MemberViewModal({
	member,
	onClose,
	onEdit,
}: {
	member: MockMember;
	onClose: () => void;
	onEdit: () => void;
}) {
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
					<div>
						<h3 className="font-semibold mb-3 text-[var(--text-primary)]">Personal Information</h3>
						<div className="space-y-2 text-sm">
							<div>
								<span className="text-[var(--text-secondary)]">Name:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">{member.name}</span>
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
								<span className="text-[var(--text-secondary)]">Gender:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">
									{member.gender || 'N/A'}
								</span>
							</div>
						</div>
					</div>
					<div>
						<h3 className="font-semibold mb-3 text-[var(--text-primary)]">Membership & Status</h3>
						<div className="space-y-2 text-sm">
							<div>
								<span className="text-[var(--text-secondary)]">Membership:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">{member.membership}</span>
							</div>
							<div>
								<span className="text-[var(--text-secondary)]">Status:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">{member.status}</span>
							</div>
							<div>
								<span className="text-[var(--text-secondary)]">Join Date:</span>{' '}
								<span className="font-medium text-[var(--text-primary)]">{member.joinDate}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="modal-footer">
				<button type="button" className="btn-secondary" onClick={onClose}>
					<X className="w-4 h-4" />
					Close
				</button>
				<button type="button" className="btn-primary" onClick={onEdit}>
					<Edit className="w-4 h-4" />
					Edit Member
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
					<button type="button" className="btn-secondary" onClick={onCancel}>
						<X className="w-4 h-4" />
						Cancel
					</button>
					<button type="button" className="btn-danger" onClick={onConfirm}>
						<Trash2 className="w-4 h-4" />
						Delete
					</button>
				</div>
			</div>
		</div>
	);
}
