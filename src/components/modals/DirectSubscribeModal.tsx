import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { X, Check, Calendar, CreditCard, Loader2 } from 'lucide-react';
import { GET_ACTIVE_MEMBERSHIPS, DIRECT_SUBSCRIBE_MEMBER, GET_USERS } from '@/graphql/operations/index';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';

interface DirectSubscribeModalProps {
	isOpen: boolean;
	onClose: () => void;
	memberId: string;
	memberName: string;
	onSuccess?: () => void;
}

export function DirectSubscribeModal({
	isOpen,
	onClose,
	memberId,
	memberName,
	onSuccess,
}: DirectSubscribeModalProps) {
	const [selectedMembershipId, setSelectedMembershipId] = useState<string>('');
	const dispatch = useAppDispatch();

	const { data: membershipsData, loading: membershipsLoading } = useQuery(GET_ACTIVE_MEMBERSHIPS, {
		skip: !isOpen,
	});

	const [directSubscribe, { loading: subscribing }] = useMutation(DIRECT_SUBSCRIBE_MEMBER, {
		refetchQueries: [
			{ query: GET_USERS, variables: { role: 'member' } },
			{ query: GET_USERS, variables: { role: 'coach' } },
		],
		onCompleted: (data) => {
			console.log('✅ Subscription successful:', data);
			const membershipName = data.directSubscribeMember.membership?.name || 'the selected plan';
			dispatch(
				addToast({
					type: 'success',
					message: `Successfully subscribed ${memberName} to ${membershipName}`,
				})
			);
			onSuccess?.();
			onClose();
			setSelectedMembershipId('');
		},
		onError: (error) => {
			console.error('❌ Subscription mutation error:', error);
			dispatch(
				addToast({
					type: 'error',
					message: error.message || 'Failed to subscribe member',
				})
			);
		},
	});

	const memberships = membershipsData?.getMemberships || [];

	const handleSubscribe = () => {
		console.log('🔔 Subscribe button clicked', {
			selectedMembershipId,
			memberId,
			memberName,
		});

		if (!selectedMembershipId) {
			dispatch(
				addToast({
					type: 'error',
					message: 'Please select a membership plan',
				})
			);
			return;
		}

		if (!memberId) {
			dispatch(
				addToast({
					type: 'error',
					message: 'Member ID is missing',
				})
			);
			return;
		}

		console.log('📤 Sending subscription request...', {
			memberId,
			membershipId: selectedMembershipId,
		});

		directSubscribe({
			variables: {
				input: {
					memberId,
					membershipId: selectedMembershipId,
				},
			},
		}).catch((error) => {
			console.error('❌ Subscription error:', error);
		});
	};

	const calculateEndDate = (durationType: string) => {
		const today = new Date();
		let months = 1;

		if (durationType === 'QUARTERLY') months = 3;
		else if (durationType === 'YEARLY') months = 12;

		const endDate = new Date(today.setMonth(today.getMonth() + months));
		return endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
	};

	console.log('🔍 DirectSubscribeModal render:', {
		isOpen,
		memberId,
		memberName,
	});

	if (!isOpen) {
		console.log('⚠️ Modal is not open, returning null');
		return null;
	}

	return (
		<div className="modal-overlay active" onClick={onClose}>
			<div className="modal modal-center" onClick={(e) => e.stopPropagation()}>
				<div className="modal-body">
					<div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
						<div
							className="modal-success-icon-large"
							style={{
								background: 'linear-gradient(135deg, var(--primary-red), var(--primary-yellow))',
							}}
						>
							<CreditCard size={48} style={{ color: 'white' }} />
						</div>
					</div>

					<h2 className="modal-title" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
						Subscribe {memberName}
					</h2>

					<p className="modal-text" style={{ textAlign: 'center', marginBottom: '2rem' }}>
						Select a membership plan to subscribe this member
					</p>

					{membershipsLoading ? (
						<div className="text-center py-8">
							<Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--primary-yellow)]" />
							<p className="text-[var(--text-secondary)] mt-2">Loading memberships...</p>
						</div>
					) : memberships.length === 0 ? (
						<div className="text-center py-8">
							<p className="text-[var(--text-secondary)]">No active membership plans available</p>
						</div>
					) : (
						<div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
							{memberships.map((membership: any) => (
								<button
									key={membership.id}
									onClick={() => setSelectedMembershipId(membership.id)}
									className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
										selectedMembershipId === membership.id
											? 'border-[var(--primary-yellow)] bg-[rgba(249,197,19,0.1)]'
											: 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(249,197,19,0.3)]'
									}`}
								>
									<div className="flex items-start justify-between mb-2">
										<div className="flex-1">
											<h4 className="font-semibold text-[var(--text-primary)] mb-1">
												{membership.name}
											</h4>
											<p className="text-sm text-[var(--text-secondary)] mb-2">
												{membership.description || 'No description'}
											</p>
										</div>
										{selectedMembershipId === membership.id && (
											<Check className="w-5 h-5 text-[var(--primary-yellow)] flex-shrink-0 ml-2" />
										)}
									</div>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-4 text-sm">
											<span className="text-[var(--text-secondary)]">
												Duration: <strong>{membership.durationType}</strong>
											</span>
											<span className="text-[var(--text-secondary)]">
												<Calendar size={14} className="inline mr-1" />
												Valid until: {calculateEndDate(membership.durationType)}
											</span>
										</div>
										<span className="text-lg font-bold" style={{ color: 'var(--primary-yellow)' }}>
											₱{membership.monthlyPrice.toLocaleString()}
										</span>
									</div>
									{membership.features && membership.features.length > 0 && (
										<div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.1)]">
											<p className="text-xs text-[var(--text-secondary)] mb-2">Features:</p>
											<ul className="space-y-1">
												{membership.features.slice(0, 3).map((feature: string, idx: number) => (
													<li
														key={idx}
														className="text-xs text-[var(--text-secondary)] flex items-center gap-2"
													>
														<Check size={12} className="text-[var(--primary-yellow)]" />
														{feature}
													</li>
												))}
												{membership.features.length > 3 && (
													<li className="text-xs text-[var(--text-secondary)] italic">
														+{membership.features.length - 3} more features
													</li>
												)}
											</ul>
										</div>
									)}
								</button>
							))}
						</div>
					)}

					<div
						className="modal-actions"
						style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}
					>
						<button
							type="button"
							className="btn-secondary"
							onClick={onClose}
							disabled={subscribing}
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
								cursor: subscribing ? 'not-allowed' : 'pointer',
								opacity: subscribing ? 0.6 : 1,
							}}
						>
							<X className="w-4 h-4" />
							Cancel
						</button>
						<button
							type="button"
							className="btn-primary"
							onClick={handleSubscribe}
							disabled={subscribing || !selectedMembershipId || membershipsLoading}
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
								cursor:
									subscribing || !selectedMembershipId || membershipsLoading
										? 'not-allowed'
										: 'pointer',
								opacity: subscribing || !selectedMembershipId || membershipsLoading ? 0.6 : 1,
							}}
						>
							{subscribing ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									Processing...
								</>
							) : (
								<>
									<Check className="w-4 h-4" />
									Subscribe
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
