import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Check, X as XIcon, Clock, CheckCircle2, XCircle, Trash2, Search } from 'lucide-react';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { SuccessModal } from '@/components/modals/SuccessModal';
import {
	GET_ALL_SUBSCRIPTION_REQUESTS,
	APPROVE_SUBSCRIPTION_REQUEST,
	REJECT_SUBSCRIPTION_REQUEST,
	DELETE_SUBSCRIPTION_REQUEST,
} from '@/graphql/operations/index';
import type { GetAllSubscriptionRequestsQuery } from '@/graphql/generated/types';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';

export function SubscriptionRequestsPage() {
	useEffect(() => {
		document.title = 'Subscription Requests - X-TRIM FIT GYM';
	}, []);

	const dispatch = useAppDispatch();
	type SubscriptionRequestItem = GetAllSubscriptionRequestsQuery['getAllSubscriptionRequests'][number];
	const [selectedRequest, setSelectedRequest] = useState<SubscriptionRequestItem | null>(null);
	const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
	const [successMessage, setSuccessMessage] = useState('');
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('all');

	// Fetch all subscription requests
	const { data, loading, error, refetch } = useQuery(GET_ALL_SUBSCRIPTION_REQUESTS, {
		errorPolicy: 'none',
		fetchPolicy: 'cache-and-network',
	});

	const [approveRequest, { loading: approving }] = useMutation(APPROVE_SUBSCRIPTION_REQUEST, {
		onCompleted: () => {
			setSuccessMessage('Subscription request approved successfully!');
			setIsSuccessModalOpen(true);
			refetch();
			dispatch(addToast({ type: 'success', message: 'Subscription request approved!' }));
		},
		onError: (error) => {
			dispatch(addToast({ type: 'error', message: error.message }));
		},
	});

	const [rejectRequest, { loading: rejecting }] = useMutation(REJECT_SUBSCRIPTION_REQUEST, {
		onCompleted: () => {
			setSuccessMessage('Subscription request rejected successfully!');
			setIsSuccessModalOpen(true);
			setIsRejectModalOpen(false);
			setSelectedRequest(null);
			refetch();
			dispatch(addToast({ type: 'success', message: 'Subscription request rejected!' }));
		},
		onError: (error) => {
			dispatch(addToast({ type: 'error', message: error.message }));
		},
	});

	const [deleteRequest, { loading: deleting }] = useMutation(DELETE_SUBSCRIPTION_REQUEST, {
		onCompleted: () => {
			setSuccessMessage('Subscription request deleted successfully!');
			setIsSuccessModalOpen(true);
			setIsDeleteModalOpen(false);
			setSelectedRequest(null);
			refetch();
			dispatch(addToast({ type: 'success', message: 'Subscription request deleted!' }));
		},
		onError: (error) => {
			dispatch(addToast({ type: 'error', message: error.message }));
		},
	});

	const handleApprove = (request: SubscriptionRequestItem) => {
		approveRequest({
			variables: {
				input: {
					requestId: request.id,
				},
			},
		});
	};

	const handleReject = (request: SubscriptionRequestItem) => {
		setSelectedRequest(request);
		setIsRejectModalOpen(true);
	};

	const handleConfirmReject = () => {
		if (selectedRequest) {
			rejectRequest({
				variables: {
					input: {
						requestId: selectedRequest.id,
					},
				},
			});
		}
	};

	const handleDelete = (request: SubscriptionRequestItem) => {
		setSelectedRequest(request);
		setIsDeleteModalOpen(true);
	};

	const handleConfirmDelete = () => {
		if (selectedRequest) {
			deleteRequest({
				variables: {
					id: selectedRequest.id,
				},
			});
		}
	};

	// Process data - must be before conditional returns to follow Rules of Hooks
	const requests: SubscriptionRequestItem[] = data?.getAllSubscriptionRequests || [];

	// Filter requests based on search term and status
	const filteredRequests = useMemo(() => {
		return requests.filter((request) => {
			// Search filter - search in member name, email, and plan name
			const matchesSearch =
				!searchTerm ||
				`${request.member?.firstName || ''} ${request.member?.lastName || ''}`
					.toLowerCase()
					.includes(searchTerm.toLowerCase()) ||
				request.member?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				request.membership?.name?.toLowerCase().includes(searchTerm.toLowerCase());

			// Status filter
			const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

			return matchesSearch && matchesStatus;
		});
	}, [requests, searchTerm, statusFilter]);

	// Group filtered requests by status for statistics
	const pendingRequests = filteredRequests.filter((r) => r.status === 'PENDING');
	const approvedRequests = filteredRequests.filter((r) => r.status === 'APPROVED');
	const rejectedRequests = filteredRequests.filter((r) => r.status === 'REJECTED');

	// Show loading state
	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-yellow)] mx-auto mb-4"></div>
					<p className="text-[var(--text-secondary)]">Loading subscription requests...</p>
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
					<h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Unable to Load Subscription Requests</h2>
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

	const getStatusBadge = (status: string) => {
		const statusMap: Record<string, { label: string; className: string; icon: any }> = {
			PENDING: {
				label: 'Pending',
				className: 'bg-[rgba(249,197,19,0.15)] text-[var(--primary-yellow)] border-[rgba(249,197,19,0.3)]',
				icon: Clock,
			},
			APPROVED: {
				label: 'Approved',
				className: 'bg-[rgba(16,185,129,0.15)] text-[#10B981] border-[rgba(16,185,129,0.3)]',
				icon: CheckCircle2,
			},
			REJECTED: {
				label: 'Rejected',
				className: 'bg-[rgba(239,68,68,0.15)] text-[#EF4444] border-[rgba(239,68,68,0.3)]',
				icon: XCircle,
			},
		};

		const statusInfo = statusMap[status] || statusMap.PENDING;
		const Icon = statusInfo.icon;

		return (
			<span
				className={`inline-flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg font-semibold border ${statusInfo.className}`}
			>
				<Icon className="w-3 h-3" />
				{statusInfo.label}
			</span>
		);
	};

	const formatDate = (dateString: string | null | undefined) => {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold flex items-center gap-2">
						<Clock className="w-8 h-8" color="var(--primary-yellow)" />
						Subscription Requests
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-1">
						Manage all subscription requests from members ({filteredRequests.length} of {requests.length} shown)
					</p>
				</div>
			</div>

			{/* Search and Filter Bar */}
			<div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
				<div className="flex flex-col md:flex-row gap-4">
					{/* Search Input */}
					<div className="flex-1 relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
						<input
							type="text"
							placeholder="Search by member name, email, or plan name..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-darker)] border border-[rgba(255,255,255,0.08)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-yellow)] focus:border-transparent"
						/>
					</div>

					{/* Status Filter */}
					<div className="md:w-48">
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							className="w-full px-4 py-2.5 bg-[var(--bg-darker)] border border-[rgba(255,255,255,0.08)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-yellow)] focus:border-transparent"
						>
							<option value="all">All Status</option>
							<option value="PENDING">Pending</option>
							<option value="APPROVED">Approved</option>
							<option value="REJECTED">Rejected</option>
						</select>
					</div>

					{/* Clear Filters Button */}
					{(searchTerm || statusFilter !== 'all') && (
						<Button
							onClick={() => {
								setSearchTerm('');
								setStatusFilter('all');
							}}
							className="btn-secondary"
						>
							<XIcon className="w-4 h-4" />
							Clear
						</Button>
					)}
				</div>
			</div>

			{/* Statistics Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-[var(--text-secondary)] mb-1">Pending Requests</p>
							<p className="text-2xl font-bold text-[var(--text-primary)]">{pendingRequests.length}</p>
						</div>
						<Clock className="w-8 h-8 text-[var(--primary-yellow)]" />
					</div>
				</div>
				<div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-[var(--text-secondary)] mb-1">Approved</p>
							<p className="text-2xl font-bold text-[var(--text-primary)]">{approvedRequests.length}</p>
						</div>
						<CheckCircle2 className="w-8 h-8 text-[#10B981]" />
					</div>
				</div>
				<div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-[var(--text-secondary)] mb-1">Rejected</p>
							<p className="text-2xl font-bold text-[var(--text-primary)]">{rejectedRequests.length}</p>
						</div>
						<XCircle className="w-8 h-8 text-[#EF4444]" />
					</div>
				</div>
			</div>

			{/* Requests Table */}
			<div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-[rgba(255,255,255,0.03)] border-b border-[rgba(255,255,255,0.08)]">
							<tr>
								<th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
									Member
								</th>
								<th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
									Plan
								</th>
								<th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
									Requested
								</th>
								<th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
									Status
								</th>
								<th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
									Processed By
								</th>
								<th className="px-6 py-4 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[rgba(255,255,255,0.08)]">
							{filteredRequests.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-6 py-12 text-center">
										<p className="text-[var(--text-secondary)]">
											{requests.length === 0
												? 'No subscription requests found'
												: 'No subscription requests match your search criteria'}
										</p>
									</td>
								</tr>
							) : (
								filteredRequests.map((request) => (
									<tr key={request.id} className="hover:bg-[rgba(255,255,255,0.02)]">
										<td className="px-6 py-4 whitespace-nowrap">
											<div>
												<p className="text-sm font-medium text-[var(--text-primary)]">
													{request.member?.firstName} {request.member?.lastName}
												</p>
												<p className="text-xs text-[var(--text-secondary)]">{request.member?.email}</p>
											</div>
										</td>
										<td className="px-6 py-4">
											<div>
												<p className="text-sm font-medium text-[var(--text-primary)]">
													{request.membership?.name}
												</p>
												<p className="text-xs text-[var(--text-secondary)]">
													₱{request.membership?.monthlyPrice?.toLocaleString()} / {request.membership?.monthDuration || 1} month{request.membership?.monthDuration !== 1 ? 's' : ''}
												</p>
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<p className="text-sm text-[var(--text-primary)]">{formatDate(request.requestedAt)}</p>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(request.status)}</td>
										<td className="px-6 py-4 whitespace-nowrap">
											{request.status === 'APPROVED' && request.approvedBy ? (
												<div>
													<p className="text-sm text-[var(--text-primary)]">
														{request.approvedBy.firstName} {request.approvedBy.lastName}
													</p>
													<p className="text-xs text-[var(--text-secondary)]">{formatDate(request.approvedAt)}</p>
												</div>
											) : request.status === 'REJECTED' && request.rejectedBy ? (
												<div>
													<p className="text-sm text-[var(--text-primary)]">
														{request.rejectedBy.firstName} {request.rejectedBy.lastName}
													</p>
													<p className="text-xs text-[var(--text-secondary)]">{formatDate(request.rejectedAt)}</p>
												</div>
											) : (
												<p className="text-sm text-[var(--text-secondary)]">-</p>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											{request.status === 'PENDING' ? (
												<div className="flex items-center justify-end gap-2">
													<Button
														onClick={() => handleApprove(request)}
														disabled={approving || deleting}
														className="btn-small btn-success"
													>
														<Check className="w-4 h-4" />
														Approve
													</Button>
													<Button
														onClick={() => handleReject(request)}
														disabled={rejecting || deleting}
														className="btn-small btn-danger"
													>
														<XIcon className="w-4 h-4" />
														Reject
													</Button>
													<Button
														onClick={() => handleDelete(request)}
														disabled={approving || rejecting || deleting}
														className="btn-small btn-danger"
														title="Delete request"
													>
														<Trash2 className="w-4 h-4" />
													</Button>
												</div>
											) : request.status === 'REJECTED' ? (
												<div className="flex items-center justify-end gap-2">
													<Button
														onClick={() => handleDelete(request)}
														disabled={deleting}
														className="btn-small btn-danger"
														title="Delete request"
													>
														<Trash2 className="w-4 h-4" />
														Delete
													</Button>
												</div>
											) : (
												<p className="text-sm text-[var(--text-secondary)]">-</p>
											)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Modals */}
			<DeleteConfirmModal
				isOpen={isRejectModalOpen}
				onClose={() => {
					setIsRejectModalOpen(false);
					setSelectedRequest(null);
				}}
				onConfirm={handleConfirmReject}
				title="Reject Subscription Request?"
				message={`Are you sure you want to reject the subscription request from ${selectedRequest?.member?.firstName} ${selectedRequest?.member?.lastName} for the ${selectedRequest?.membership?.name} plan?`}
				isDeleting={rejecting}
			/>

			<DeleteConfirmModal
				isOpen={isDeleteModalOpen}
				onClose={() => {
					setIsDeleteModalOpen(false);
					setSelectedRequest(null);
				}}
				onConfirm={handleConfirmDelete}
				title="Delete Subscription Request?"
				message={`Are you sure you want to delete the subscription request from ${selectedRequest?.member?.firstName} ${selectedRequest?.member?.lastName} for the ${selectedRequest?.membership?.name} plan? This action cannot be undone.`}
				isDeleting={deleting}
			/>

			<SuccessModal
				isOpen={isSuccessModalOpen}
				onClose={() => setIsSuccessModalOpen(false)}
				title="Success!"
				message={successMessage}
			/>
		</div>
	);
}

