import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import type { Membership } from '@/graphql/generated/types';

interface MembershipFormModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (data: MembershipFormData) => void;
	membership?: Membership | null;
	isLoading?: boolean;
}

export interface MembershipFormData {
	name: string;
	monthlyPrice: number;
	description: string;
	features: string[];
	status: 'Active' | 'Inactive' | 'Coming Soon';
	durationType: 'Monthly' | 'Quarterly' | 'Yearly' | 'Daily';
	monthDuration: number;
}

export function MembershipFormModal({
	isOpen,
	onClose,
	onSubmit,
	membership,
	isLoading = false,
}: MembershipFormModalProps) {
	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);

		const featuresText = formData.get('features') as string;
		const features = featuresText
			.split('\n')
			.map((f) => f.trim())
			.filter((f) => f.length > 0);

		const data: MembershipFormData = {
			name: formData.get('name') as string,
			monthlyPrice: Number(formData.get('monthlyPrice')),
			description: formData.get('description') as string,
			features,
			status: formData.get('status') as MembershipFormData['status'],
			durationType: formData.get('durationType') as MembershipFormData['durationType'],
			monthDuration: Number(formData.get('monthDuration')) || 1,
		};

		onSubmit(data);
	};

	const defaultFeatures = membership?.features?.join('\n') || '';

	// Map API status values to form values
	const statusMap: Record<string, string> = {
		ACTIVE: 'Active',
		INACTIVE: 'Inactive',
		COMING_SOON: 'Coming Soon',
	};

	// Map API durationType values to form values
	const durationMap: Record<string, string> = {
		MONTHLY: 'Monthly',
		QUARTERLY: 'Quarterly',
		YEARLY: 'Yearly',
		DAILY: 'Daily',
	};

	const defaultStatus = membership?.status ? statusMap[membership.status] || 'Active' : 'Active';
	const defaultDurationType = membership?.durationType
		? durationMap[membership.durationType] || 'Monthly'
		: 'Monthly';

	if (!isOpen) return null;

	return (
		<div className={`modal-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
			<div
				className="modal modal-large"
				onClick={(e) => e.stopPropagation()}
				style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}
			>
				<div className="modal-header" style={{ flexShrink: 0 }}>
					<h2 className="modal-title">
						{membership ? 'Edit Membership Plan' : 'Create Membership Plan'}
					</h2>
					<button className="modal-close" onClick={onClose} aria-label="Close">
						<X size={24} />
					</button>
				</div>

				<form
					onSubmit={handleSubmit}
					style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
				>
					<div className="modal-body" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
						<div className="form-grid">
							<div className="form-group">
								<label htmlFor="name">Plan Name *</label>
								<input
									type="text"
									id="name"
									name="name"
									defaultValue={membership?.name}
									required
									placeholder="e.g., Student, Premium"
								/>
							</div>

							<div className="form-group">
								<label htmlFor="monthlyPrice">Price (₱) *</label>
								<input
									type="number"
									id="monthlyPrice"
									name="monthlyPrice"
									defaultValue={membership?.monthlyPrice}
									required
									min="0"
									step="1"
									placeholder="e.g., 500"
								/>
							</div>

							<div className="form-group">
								<label htmlFor="durationType">Duration Type *</label>
								<select
									id="durationType"
									name="durationType"
									defaultValue={defaultDurationType}
									required
								>
									<option value="Monthly">Monthly</option>
									<option value="Quarterly">Quarterly</option>
									<option value="Yearly">Yearly</option>
									<option value="Daily">Daily (fixed days / promos)</option>
								</select>
							</div>

							<div className="form-group">
								<label htmlFor="monthDuration" id="monthDurationLabel">
									Plan length *
								</label>
								<input
									type="number"
									id="monthDuration"
									name="monthDuration"
									defaultValue={membership?.monthDuration || 1}
									required
									min="1"
									step="1"
									placeholder="e.g., 3 for 3 months, or 15 for 15-day promo"
								/>
								<small
									id="monthDurationHint"
									style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'block' }}
								>
									For Monthly / Quarterly / Yearly: length in months. For Daily: length in calendar days.
								</small>
							</div>

							<div className="form-group">
								<label htmlFor="status">Status *</label>
								<select id="status" name="status" defaultValue={defaultStatus} required>
									<option value="Active">Active</option>
									<option value="Inactive">Inactive</option>
									<option value="Coming Soon">Coming Soon</option>
								</select>
							</div>

							<div className="form-group" style={{ gridColumn: '1 / -1' }}>
								<label htmlFor="description">Description *</label>
								<textarea
									id="description"
									name="description"
									defaultValue={membership?.description ?? ''}
									required
									rows={3}
									placeholder="Brief description of the membership plan"
								/>
							</div>

							<div className="form-group" style={{ gridColumn: '1 / -1' }}>
								<label htmlFor="features">Features (one per line) *</label>
								<textarea
									id="features"
									name="features"
									defaultValue={defaultFeatures}
									required
									rows={6}
									placeholder="Gym access (6am-10pm)&#10;Basic equipment access&#10;Locker facilities"
								/>
								<small
									style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'block' }}
								>
									Enter each feature on a new line
								</small>
							</div>
						</div>
					</div>

					<div className="modal-footer" style={{ flexShrink: 0 }}>
						<button type="button" className="btn-secondary" onClick={onClose} disabled={isLoading}>
							Cancel
						</button>
						<button type="submit" className="btn-primary" disabled={isLoading}>
							{isLoading ? 'Saving...' : membership ? 'Update Plan' : 'Create Plan'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
