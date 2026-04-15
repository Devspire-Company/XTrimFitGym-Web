import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { EquipmentStatus, type Equipment } from '@/graphql/generated/graphql';

export interface EquipmentFormData {
	name: string;
	description: string;
	notes: string;
	acquiredAt: string;
	imageUrl: string;
	imageFile?: File | null;
	status: EquipmentStatus;
}

interface EquipmentFormModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (data: EquipmentFormData) => void;
	equipment?: Equipment | null;
	isLoading?: boolean;
	uploading?: boolean;
}

export function EquipmentFormModal({
	isOpen,
	onClose,
	onSubmit,
	equipment,
	isLoading = false,
	uploading = false,
}: EquipmentFormModalProps) {
	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const name = (formData.get('name') as string)?.trim() || '';
		const description = (formData.get('description') as string)?.trim() || '';
		const notes = (formData.get('notes') as string)?.trim() || '';
		const acquiredAt = (formData.get('acquiredAt') as string)?.trim() || '';
		const imageUrl = (formData.get('imageUrl') as string)?.trim() || '';
		const imageFile = formData.get('imageFile') as File | null;
		const statusRaw = (formData.get('status') as string) || EquipmentStatus.Available;
		if (!name) return;
		onSubmit({
			name,
			description,
			notes,
			acquiredAt,
			imageUrl,
			imageFile: imageFile && imageFile.size > 0 ? imageFile : null,
			status: statusRaw as EquipmentStatus,
		});
	};

	if (!isOpen) return null;

	const defaultStatus = equipment?.status ?? EquipmentStatus.Available;

	return (
		<div className={`modal-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
			<div
				className="modal modal-large"
				onClick={(e) => e.stopPropagation()}
				style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}
			>
				<div className="modal-header" style={{ flexShrink: 0 }}>
					<h2 className="modal-title">
						{equipment ? 'Edit Equipment' : 'Add Equipment'}
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
								<label htmlFor="name">Name *</label>
								<input
									id="name"
									name="name"
									type="text"
									required
									defaultValue={equipment?.name ?? ''}
									placeholder="e.g. Treadmill"
								/>
							</div>
							<div className="form-group">
								<label htmlFor="status">Status *</label>
								<select
									id="status"
									name="status"
									required
									defaultValue={defaultStatus}
									className="w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[var(--bg-darker)] px-3 py-2 text-[var(--text-primary)]"
								>
									<option value={EquipmentStatus.Available}>Available</option>
									<option value={EquipmentStatus.Damaged}>Damaged</option>
									<option value={EquipmentStatus.Undermaintenance}>Under maintenance</option>
								</select>
							</div>
							<div className="form-group">
								<label htmlFor="acquiredAt">Acquired date</label>
								<input
									id="acquiredAt"
									name="acquiredAt"
									type="date"
									defaultValue={
										equipment?.acquiredAt
											? new Date(equipment.acquiredAt).toISOString().slice(0, 10)
											: ''
									}
								/>
							</div>
							<div className="form-group" style={{ gridColumn: '1 / -1' }}>
								<label htmlFor="description">Description</label>
								<textarea
									id="description"
									name="description"
									rows={2}
									defaultValue={equipment?.description ?? ''}
									placeholder="Optional description"
								/>
							</div>
							<div className="form-group" style={{ gridColumn: '1 / -1' }}>
								<label htmlFor="notes">Notes (optional)</label>
								<textarea
									id="notes"
									name="notes"
									rows={3}
									defaultValue={equipment?.notes ?? ''}
									placeholder="e.g. Back in service next week, maintenance scheduled…"
								/>
								<small className="text-[var(--text-secondary)] mt-1 block text-xs">
									Internal messages for members (availability, maintenance timeline, etc.)
								</small>
							</div>
							<div className="form-group" style={{ gridColumn: '1 / -1' }}>
								<label>Image *</label>
								{equipment?.imageUrl && (
									<div className="mb-3">
										<img
											src={equipment.imageUrl}
											alt={equipment.name}
											className="rounded-lg border border-[var(--card-border)] max-h-40 object-cover"
										/>
										<p className="text-sm text-[var(--text-secondary)] mt-1">
											Current image. Upload a new file to replace.
										</p>
									</div>
								)}
								<input
									type="hidden"
									name="imageUrl"
									defaultValue={equipment?.imageUrl ?? ''}
								/>
								<input
									id="imageFile"
									name="imageFile"
									type="file"
									accept="image/*"
									className="block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[var(--primary-yellow)] file:text-black file:font-semibold"
								/>
							</div>
						</div>
					</div>
					<div className="modal-footer" style={{ flexShrink: 0 }}>
						<button type="button" className="btn-secondary" onClick={onClose}>
							Cancel
						</button>
						<button
							type="submit"
							className="btn-primary"
							disabled={isLoading || uploading}
						>
							{uploading ? 'Uploading image...' : isLoading ? 'Saving...' : equipment ? 'Update' : 'Create'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
