import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { mockMembers, type MockMember } from '@/lib/mock/data';
import { Button } from '@/components/ui/button';
import { Search, Plus, Eye, Edit, Trash2, Users } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';

export function MembersPage() {
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
						<Users className="w-8 h-8" />
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
			<div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
				<div className="flex flex-col md:flex-row gap-4">
					<div className="flex-1 relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
						<input
							type="text"
							placeholder="Search members by name, email, or phone..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
						/>
					</div>
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary"
					>
						<option value="all">All Status</option>
						<option value="Active">Active</option>
						<option value="Inactive">Inactive</option>
						<option value="Suspended">Suspended</option>
					</select>
					<select
						value={membershipFilter}
						onChange={(e) => setMembershipFilter(e.target.value)}
						className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary"
					>
						<option value="all">All Memberships</option>
						<option value="Student">Student</option>
						<option value="PROMO Student">PROMO Student</option>
						<option value="Non student">Non student</option>
					</select>
				</div>
			</div>

			{/* Members Table */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-gray-50 dark:bg-gray-700">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									Member
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									Contact
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									Membership
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									Join Date
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									Progress
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
							{filteredMembers.length === 0 ? (
								<tr>
									<td colSpan={7} className="px-6 py-12 text-center text-gray-500">
										No members found
									</td>
								</tr>
							) : (
								filteredMembers.map((member) => (
									<tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
										<td className="px-6 py-4">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
													{member.avatar}
												</div>
												<div>
													<div className="font-medium">{member.name}</div>
													<div className="text-sm text-gray-500">ID: {member.id}</div>
												</div>
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="text-sm">
												<div>{member.email}</div>
												<div className="text-gray-500">{member.phone}</div>
											</div>
										</td>
										<td className="px-6 py-4">
											<span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
												{member.membership}
											</span>
										</td>
										<td className="px-6 py-4">
											<span
												className={`px-2 py-1 text-xs rounded-full ${
													member.status === 'Active'
														? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
														: member.status === 'Inactive'
															? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
															: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
												}`}
											>
												{member.status}
											</span>
										</td>
										<td className="px-6 py-4 text-sm">{member.joinDate}</td>
										<td className="px-6 py-4 text-sm">
											<div>
												<div>{member.progress.weightLost} lbs lost</div>
												<div className="text-gray-500">{member.progress.workoutsCompleted} workouts</div>
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="flex items-center gap-2">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleView(member)}
												>
													<Eye className="w-4 h-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleEdit(member)}
												>
													<Edit className="w-4 h-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleDelete(member)}
												>
													<Trash2 className="w-4 h-4 text-red-600" />
												</Button>
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
			{isViewModalOpen && selectedMember && (
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

			{/* Delete Modal */}
			{isDeleteModalOpen && selectedMember && (
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
		<div
			className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
			onClick={onClose}
		>
			<div
				className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-2xl font-bold">Member Details</h2>
					<button onClick={onClose} className="text-gray-400 hover:text-gray-600">
						×
					</button>
				</div>
				<div className="grid grid-cols-2 gap-6">
					<div>
						<h3 className="font-semibold mb-3">Personal Information</h3>
						<div className="space-y-2 text-sm">
							<div>
								<span className="text-gray-600 dark:text-gray-400">Name:</span>{' '}
								<span className="font-medium">{member.name}</span>
							</div>
							<div>
								<span className="text-gray-600 dark:text-gray-400">Email:</span>{' '}
								<span className="font-medium">{member.email}</span>
							</div>
							<div>
								<span className="text-gray-600 dark:text-gray-400">Phone:</span>{' '}
								<span className="font-medium">{member.phone}</span>
							</div>
							<div>
								<span className="text-gray-600 dark:text-gray-400">Gender:</span>{' '}
								<span className="font-medium">{member.gender || 'N/A'}</span>
							</div>
						</div>
					</div>
					<div>
						<h3 className="font-semibold mb-3">Membership & Status</h3>
						<div className="space-y-2 text-sm">
							<div>
								<span className="text-gray-600 dark:text-gray-400">Membership:</span>{' '}
								<span className="font-medium">{member.membership}</span>
							</div>
							<div>
								<span className="text-gray-600 dark:text-gray-400">Status:</span>{' '}
								<span className="font-medium">{member.status}</span>
							</div>
							<div>
								<span className="text-gray-600 dark:text-gray-400">Join Date:</span>{' '}
								<span className="font-medium">{member.joinDate}</span>
							</div>
						</div>
					</div>
				</div>
				<div className="mt-6 flex gap-3">
					<Button variant="outline" onClick={onClose}>
						Close
					</Button>
					<Button onClick={onEdit}>Edit Member</Button>
				</div>
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
		<div
			className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
			onClick={onCancel}
		>
			<div
				className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
				onClick={(e) => e.stopPropagation()}
			>
				<h3 className="text-xl font-semibold mb-2">{title}</h3>
				<p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
				<div className="flex gap-3">
					<Button variant="outline" onClick={onCancel} className="flex-1">
						Cancel
					</Button>
					<Button variant="destructive" onClick={onConfirm} className="flex-1">
						Delete
					</Button>
				</div>
			</div>
		</div>
	);
}

