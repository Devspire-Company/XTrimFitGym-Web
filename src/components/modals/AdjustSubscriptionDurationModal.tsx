import { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { X, Calendar, Loader2 } from 'lucide-react';
import { UPDATE_MEMBERSHIP_TRANSACTION_DURATION, GET_USERS } from '@/graphql/operations/index';
import { RoleType } from '@/graphql/generated/graphql';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';

interface AdjustSubscriptionDurationModalProps {
	isOpen: boolean;
	onClose: () => void;
	transactionId: string;
	memberName: string;
	currentMonthDuration: number;
	onSuccess?: () => void;
}

export function AdjustSubscriptionDurationModal({
	isOpen,
	onClose,
	transactionId,
	memberName,
	currentMonthDuration,
	onSuccess,
}: AdjustSubscriptionDurationModalProps) {
	const [months, setMonths] = useState(String(currentMonthDuration));
	const dispatch = useAppDispatch();

	useEffect(() => {
		if (isOpen) {
			setMonths(String(currentMonthDuration));
		}
	}, [isOpen, currentMonthDuration]);

	const [updateDuration, { loading }] = useMutation(UPDATE_MEMBERSHIP_TRANSACTION_DURATION, {
		refetchQueries: [{ query: GET_USERS, variables: { role: RoleType.Member } }],
		onCompleted: (data) => {
			const exp = data.updateMembershipTransactionDuration.expiresAt;
			const expStr = exp
				? new Date(exp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
				: '';
			dispatch(
				addToast({
					type: 'success',
					message: `Updated ${memberName}'s subscription (${data.updateMembershipTransactionDuration.monthDuration} mo${expStr ? `, expires ${expStr}` : ''})`,
				})
			);
			onSuccess?.();
			onClose();
		},
		onError: (error) => {
			dispatch(
				addToast({
					type: 'error',
					message: error.message || 'Failed to update subscription duration',
				})
			);
		},
	});

	const handleSubmit = () => {
		const n = parseInt(months, 10);
		if (!Number.isFinite(n) || n < 1) {
			dispatch(
				addToast({
					type: 'error',
					message: 'Enter a valid number of months (at least 1)',
				})
			);
			return;
		}
		updateDuration({
			variables: {
				input: {
					transactionId,
					monthDuration: n,
				},
			},
		}).catch(() => {});
	};

	if (!isOpen) return null;

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
							<Calendar size={48} style={{ color: 'white' }} />
						</div>
					</div>

					<h2 className="modal-title" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
						Edit subscription length
					</h2>

					<p className="modal-text" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
						Set total months from the subscription start date for <strong>{memberName}</strong>. Expiry
						will be recalculated from their original start date.
					</p>

					<label className="block text-sm text-[var(--text-secondary)] mb-2" htmlFor="sub-months">
						Total duration (months)
					</label>
					<input
						id="sub-months"
						type="number"
						min={1}
						value={months}
						onChange={(e) => setMonths(e.target.value)}
						className="w-full px-4 py-3 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-[var(--text-primary)] mb-6"
					/>

					<div className="modal-actions" style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
						<button
							type="button"
							className="btn-secondary"
							onClick={onClose}
							disabled={loading}
							style={{ flex: 1, padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: 600 }}
						>
							<X className="w-4 h-4 inline mr-1" />
							Cancel
						</button>
						<button
							type="button"
							className="btn-primary"
							onClick={handleSubmit}
							disabled={loading}
							style={{ flex: 1, padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: 600 }}
						>
							{loading ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin inline mr-1" />
									Saving…
								</>
							) : (
								'Save'
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
