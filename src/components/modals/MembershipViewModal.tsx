import { X, Edit2, Check } from 'lucide-react';
import type { Membership } from '@/graphql/generated/types';

interface MembershipViewModalProps {
	isOpen: boolean;
	onClose: () => void;
	membership: Membership | null;
	onEdit?: () => void;
}

export function MembershipViewModal({
	isOpen,
	onClose,
	membership,
	onEdit,
}: MembershipViewModalProps) {
	if (!isOpen || !membership) return null;

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h2 className="modal-title">Membership Plan Details</h2>
					<button className="modal-close" onClick={onClose} aria-label="Close">
						<X size={24} />
					</button>
				</div>

				<div className="modal-body">
					<div className="membership-details">
						<div className="detail-section">
							<h3>Plan Information</h3>
							<div className="detail-grid">
								<div className="detail-item">
									<label>Plan Name</label>
									<p>{membership.name}</p>
								</div>
								<div className="detail-item">
									<label>Price</label>
									<p className="price-value">₱{membership.monthlyPrice.toLocaleString()}</p>
								</div>
								<div className="detail-item">
									<label>Duration</label>
									<p>{membership.durationType}</p>
								</div>
								<div className="detail-item">
									<label>Status</label>
									<span
										className={`status-badge ${
											membership.status === 'Active'
												? 'status-active'
												: membership.status === 'Inactive'
												? 'status-inactive'
												: 'status-pending'
										}`}
									>
										{membership.status}
									</span>
								</div>
								<div className="detail-item" style={{ gridColumn: '1 / -1' }}>
									<label>Description</label>
									<p>{membership.description}</p>
								</div>
							</div>
						</div>

						<div className="detail-section">
							<h3>Features</h3>
							<ul className="features-list">
								{membership.features?.map((feature, index) => (
									<li key={index}>
										<Check size={18} style={{ color: 'var(--primary-yellow)' }} />
										<span>{feature}</span>
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>

				<div className="modal-footer">
					<button className="btn-secondary" onClick={onClose}>
						Close
					</button>
					{onEdit && (
						<button className="btn-primary" onClick={onEdit}>
							<Edit2 size={18} />
							Edit Plan
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

