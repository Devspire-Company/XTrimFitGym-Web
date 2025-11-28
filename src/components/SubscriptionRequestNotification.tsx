import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Bell, X, Check, XCircle, ChevronUp, ChevronDown, Clock } from 'lucide-react';
import {
	GET_PENDING_SUBSCRIPTION_REQUESTS,
	APPROVE_SUBSCRIPTION_REQUEST,
	REJECT_SUBSCRIPTION_REQUEST,
	GET_USERS,
} from '@/graphql/operations/index';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';

interface SubscriptionRequest {
	id: string;
	memberId: string;
	member: {
		id: string;
		firstName: string;
		lastName: string;
		email: string;
	};
	membershipId: string;
	membership: {
		id: string;
		name: string;
		monthlyPrice: number;
	};
	status: string;
	requestedAt: string;
	expiresAt: string;
}

export function SubscriptionRequestNotification() {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isMinimized, setIsMinimized] = useState(false);
	const dispatch = useAppDispatch();

	const { data, loading, error, refetch } = useQuery<{
		getPendingSubscriptionRequests: SubscriptionRequest[];
	}>(GET_PENDING_SUBSCRIPTION_REQUESTS, {
		pollInterval: 2000, // Poll every 2 seconds for real-time updates
		fetchPolicy: 'network-only',
		errorPolicy: 'all', // Continue even if there are errors
		skip: false, // Always fetch
		onError: (err) => {
			console.error('Error fetching subscription requests:', err);
			// Don't crash the app, just log the error
		},
	});

	const [approveRequest] = useMutation(APPROVE_SUBSCRIPTION_REQUEST, {
		refetchQueries: [
			{ query: GET_USERS, variables: { role: 'member' } },
			{ query: GET_USERS, variables: { role: 'coach' } },
		],
		onCompleted: (data) => {
			const membershipName =
				data.approveSubscriptionRequest.membership?.name || 'the selected plan';
			dispatch(
				addToast({
					type: 'success',
					message: `Successfully subscribed member to ${membershipName}`,
				})
			);
			refetch();
		},
		onError: (error) => {
			console.error('Error approving subscription request:', error);
			dispatch(
				addToast({
					type: 'error',
					message: error.message || 'Failed to approve subscription request',
				})
			);
		},
	});

	const [rejectRequest] = useMutation(REJECT_SUBSCRIPTION_REQUEST, {
		refetchQueries: [
			{ query: GET_USERS, variables: { role: 'member' } },
			{ query: GET_USERS, variables: { role: 'coach' } },
		],
		onCompleted: () => {
			dispatch(
				addToast({
					type: 'success',
					message: 'Subscription request rejected',
				})
			);
			refetch();
		},
		onError: (error) => {
			dispatch(
				addToast({
					type: 'error',
					message: error.message || 'Failed to reject subscription request',
				})
			);
		},
	});

	const pendingRequests = (data?.getPendingSubscriptionRequests || []).filter(
		(request) => request && request.member && request.membership && request.membership.id
	);

	// Calculate time remaining for each request
	const getTimeRemaining = (expiresAt: string) => {
		const now = new Date();
		const expires = new Date(expiresAt);
		const diff = expires.getTime() - now.getTime();

		if (diff <= 0) return 'Expired';

		const seconds = Math.floor(diff / 1000);
		return `${seconds}s`;
	};

	const handleApprove = async (requestId: string) => {
		try {
			await approveRequest({
				variables: {
					input: { requestId },
				},
			});
		} catch (error) {
			// Error handled in onError
		}
	};

	const handleReject = async (requestId: string) => {
		try {
			await rejectRequest({
				variables: {
					input: { requestId },
				},
			});
		} catch (error) {
			// Error handled in onError
		}
	};

	// Auto-expand if there are pending requests
	useEffect(() => {
		if (pendingRequests.length > 0 && !isMinimized) {
			setIsExpanded(true);
		}
	}, [pendingRequests.length, isMinimized]);

	if (pendingRequests.length === 0 && !isExpanded) {
		return null;
	}

	return (
		<div className="fixed bottom-6 right-6 z-50">
			{/* Notification Badge/Button */}
			{!isExpanded && (
				<button
					onClick={() => {
						setIsExpanded(true);
						setIsMinimized(false);
					}}
					className="relative bg-gradient-to-br from-[var(--primary-red)] to-[var(--primary-yellow)] rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
				>
					<Bell className="w-6 h-6 text-white" />
					{pendingRequests.length > 0 && (
						<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
							{pendingRequests.length}
						</span>
					)}
				</button>
			)}

			{/* Expanded Notification Panel */}
			{isExpanded && (
				<div className="bg-[var(--bg-darker)] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl w-96 max-h-[600px] flex flex-col">
					{/* Header */}
					<div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.1)]">
						<div className="flex items-center gap-3">
							<Bell className="w-5 h-5 text-[var(--primary-yellow)]" />
							<h3 className="text-lg font-semibold text-[var(--text-primary)]">
								Subscription Requests
							</h3>
							{pendingRequests.length > 0 && (
								<span className="bg-[var(--primary-red)] text-white text-xs font-bold rounded-full px-2 py-1">
									{pendingRequests.length}
								</span>
							)}
						</div>
						<button
							onClick={() => {
								setIsExpanded(false);
								setIsMinimized(true);
							}}
							className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
						>
							{isMinimized ? (
								<ChevronUp className="w-5 h-5" />
							) : (
								<ChevronDown className="w-5 h-5" />
							)}
						</button>
					</div>

					{/* Content */}
					{!isMinimized && (
						<div className="overflow-y-auto flex-1 p-4">
							{error && (
								<div className="text-center py-4 text-red-400 text-sm">
									Error loading requests: {error.message}
								</div>
							)}
							{loading ? (
								<div className="text-center py-8 text-[var(--text-secondary)]">
									Loading requests...
								</div>
							) : pendingRequests.length === 0 ? (
								<div className="text-center py-8 text-[var(--text-secondary)]">
									<Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
									<p>No pending subscription requests</p>
								</div>
							) : (
								<div className="space-y-3">
									{pendingRequests.map((request) => {
										if (
											!request ||
											!request.member ||
											!request.membership ||
											!request.membership.id
										) {
											return null; // Skip invalid requests
										}

										const timeRemaining = getTimeRemaining(request.expiresAt);
										const isExpiring = timeRemaining !== 'Expired' && parseInt(timeRemaining) < 10;

										return (
											<div
												key={request.id}
												className={`bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg p-4 ${
													isExpiring ? 'border-red-500/50 bg-red-500/10' : ''
												}`}
											>
												<div className="flex items-start justify-between mb-3">
													<div className="flex-1">
														<h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
															{request.member?.firstName || 'Unknown'}{' '}
															{request.member?.lastName || ''}
														</h4>
														<p className="text-xs text-[var(--text-secondary)] mb-2">
															{request.member?.email || 'No email'}
														</p>
														<div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
															<span className="font-medium text-[var(--primary-yellow)]">
																{request.membership?.name || 'Unknown Plan'}
															</span>
															{request.membership?.monthlyPrice && (
																<>
																	<span>•</span>
																	<span>₱{request.membership.monthlyPrice.toLocaleString()}</span>
																</>
															)}
														</div>
													</div>
													<button
														onClick={() => {
															setIsExpanded(false);
															setIsMinimized(true);
														}}
														className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors ml-2"
													>
														<X className="w-4 h-4" />
													</button>
												</div>

												{/* Time Remaining */}
												<div
													className={`flex items-center gap-2 mb-3 text-xs ${
														isExpiring ? 'text-red-400' : 'text-[var(--text-secondary)]'
													}`}
												>
													<Clock className="w-3 h-3" />
													<span>
														{timeRemaining === 'Expired'
															? 'Request expired'
															: `Expires in ${timeRemaining}`}
													</span>
												</div>

												{/* Actions */}
												{timeRemaining !== 'Expired' && (
													<div className="flex gap-2">
														<button
															onClick={() => handleApprove(request.id)}
															className="flex-1 flex items-center justify-center gap-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
														>
															<Check className="w-4 h-4" />
															Approve
														</button>
														<button
															onClick={() => handleReject(request.id)}
															className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
														>
															<XCircle className="w-4 h-4" />
															Reject
														</button>
													</div>
												)}
											</div>
										);
									})}
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
