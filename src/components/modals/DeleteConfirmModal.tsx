import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: string;
	isDeleting?: boolean;
}

export function DeleteConfirmModal({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	isDeleting = false,
}: DeleteConfirmModalProps) {
	if (!isOpen) return null;

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal modal-center" onClick={(e) => e.stopPropagation()}>
				<div className="modal-body">
					<div className="modal-delete-icon">
						<AlertTriangle size={48} />
					</div>
					<h2 className="modal-delete-title">{title}</h2>
					<p className="modal-delete-text">{message}</p>
					<div className="modal-delete-actions">
						<button
							className="btn-secondary"
							onClick={onClose}
							disabled={isDeleting}
						>
							Cancel
						</button>
						<button
							className="btn-danger"
							onClick={onConfirm}
							disabled={isDeleting}
						>
							{isDeleting ? 'Deleting...' : 'Delete'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

