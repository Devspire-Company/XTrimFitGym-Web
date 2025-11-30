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
		<div className={`modal-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
			<div className="modal modal-center" onClick={(e) => e.stopPropagation()}>
				<div className="modal-body">
					<div className="modal-delete-icon">
						<AlertTriangle size={48} />
					</div>
					<h2 className="modal-delete-title">{title}</h2>
					<p className="modal-delete-text">{message}</p>
					<div className="modal-delete-actions">
						<button
							type="button"
							className="btn-secondary"
							onClick={onClose}
							disabled={isDeleting}
							style={{
								padding: '0.9rem 2rem',
								borderRadius: '12px',
								fontSize: '0.95rem',
								fontWeight: '600',
								cursor: isDeleting ? 'not-allowed' : 'pointer',
								transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
								display: 'inline-flex',
								alignItems: 'center',
								gap: '0.75rem',
								fontFamily: "'Inter', sans-serif",
								background: 'rgba(255, 255, 255, 0.05)',
								color: 'var(--text-secondary)',
								border: '1px solid rgba(255, 255, 255, 0.1)',
								opacity: isDeleting ? 0.5 : 1,
							}}
							onMouseEnter={(e) => {
								if (!isDeleting) {
									e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
									e.currentTarget.style.color = 'var(--text-primary)';
									e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
									e.currentTarget.style.transform = 'translateY(-2px)';
									e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
								}
							}}
							onMouseLeave={(e) => {
								if (!isDeleting) {
									e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
									e.currentTarget.style.color = 'var(--text-secondary)';
									e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
									e.currentTarget.style.transform = 'translateY(0)';
									e.currentTarget.style.boxShadow = 'none';
								}
							}}
						>
							Cancel
						</button>
						<button
							type="button"
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

