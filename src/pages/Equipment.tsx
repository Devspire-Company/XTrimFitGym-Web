import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Dumbbell } from 'lucide-react';
import { EquipmentFormModal, type EquipmentFormData } from '@/components/modals/EquipmentFormModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { SuccessModal } from '@/components/modals/SuccessModal';
import {
	GET_EQUIPMENTS,
	CREATE_EQUIPMENT,
	UPDATE_EQUIPMENT,
	DELETE_EQUIPMENT,
} from '@/graphql/operations/index';
import type { Equipment } from '@/graphql/generated/graphql';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import { uploadEquipmentImage } from '@/lib/uploadApi';
import { EquipmentStatus } from '@/graphql/generated/graphql';

function statusLabel(s: EquipmentStatus): string {
	switch (s) {
		case EquipmentStatus.Damaged:
			return 'Damaged';
		case EquipmentStatus.Undermaintenance:
			return 'Under maintenance';
		default:
			return 'Available';
	}
}

function statusBadgeClass(s: EquipmentStatus): string {
	switch (s) {
		case EquipmentStatus.Damaged:
			return 'bg-[rgba(239,68,68,0.15)] text-[#EF4444] border-[rgba(239,68,68,0.3)]';
		case EquipmentStatus.Undermaintenance:
			return 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border-[rgba(245,158,11,0.3)]';
		default:
			return 'bg-[rgba(16,185,129,0.15)] text-[#10B981] border-[rgba(16,185,129,0.3)]';
	}
}

export function EquipmentPage() {
	useEffect(() => {
		document.title = 'Equipment - X-TRIM FIT GYM';
	}, []);

	const dispatch = useAppDispatch();
	const token = useAppSelector((s) => s.auth.token);
	const [selected, setSelected] = useState<Equipment | null>(null);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [isSuccessOpen, setIsSuccessOpen] = useState(false);
	const [successMessage, setSuccessMessage] = useState('');
	const [isEdit, setIsEdit] = useState(false);
	const [uploading, setUploading] = useState(false);

	const { data, loading, error } = useQuery(GET_EQUIPMENTS, { errorPolicy: 'none' });
	const list: Equipment[] = data?.getEquipments ?? [];

	const [createEquipment, { loading: creating }] = useMutation(CREATE_EQUIPMENT, {
		refetchQueries: [{ query: GET_EQUIPMENTS }],
		onCompleted: () => {
			setSuccessMessage('Equipment created.');
			setIsSuccessOpen(true);
			setIsFormOpen(false);
			dispatch(addToast({ type: 'success', message: 'Equipment created.' }));
		},
		onError: (e) => dispatch(addToast({ type: 'error', message: e.message })),
	});

	const [updateEquipment, { loading: updating }] = useMutation(UPDATE_EQUIPMENT, {
		refetchQueries: [{ query: GET_EQUIPMENTS }],
		onCompleted: () => {
			setSuccessMessage('Equipment updated.');
			setIsSuccessOpen(true);
			setIsFormOpen(false);
			setSelected(null);
			dispatch(addToast({ type: 'success', message: 'Equipment updated.' }));
		},
		onError: (e) => dispatch(addToast({ type: 'error', message: e.message })),
	});

	const [deleteEquipment, { loading: deleting }] = useMutation(DELETE_EQUIPMENT, {
		refetchQueries: [{ query: GET_EQUIPMENTS }],
		onCompleted: () => {
			setSuccessMessage('Equipment deleted.');
			setIsSuccessOpen(true);
			setIsDeleteOpen(false);
			setSelected(null);
			dispatch(addToast({ type: 'success', message: 'Equipment deleted.' }));
		},
		onError: (e) => dispatch(addToast({ type: 'error', message: e.message })),
	});

	const handleCreate = () => {
		setIsEdit(false);
		setSelected(null);
		setIsFormOpen(true);
	};

	const handleEdit = (item: Equipment) => {
		setIsEdit(true);
		setSelected(item);
		setIsFormOpen(true);
	};

	const handleDelete = (item: Equipment) => {
		setSelected(item);
		setIsDeleteOpen(true);
	};

	const handleFormSubmit = async (formData: EquipmentFormData) => {
		let imageUrl = formData.imageUrl;
		if (formData.imageFile) {
			setUploading(true);
			try {
				imageUrl = await uploadEquipmentImage(formData.imageFile, token);
			} catch (e: unknown) {
				dispatch(addToast({ type: 'error', message: (e as Error).message }));
				setUploading(false);
				return;
			}
			setUploading(false);
		}
		if (!imageUrl) {
			dispatch(addToast({ type: 'error', message: 'Image is required.' }));
			return;
		}
		if (isEdit && selected) {
			updateEquipment({
				variables: {
					id: selected.id,
					input: {
						name: formData.name,
						imageUrl,
						description: formData.description || undefined,
						notes: formData.notes || undefined,
						status: formData.status,
					},
				},
			});
		} else {
			createEquipment({
				variables: {
					input: {
						name: formData.name,
						imageUrl,
						description: formData.description || undefined,
						notes: formData.notes || undefined,
						status: formData.status,
					},
				},
			});
		}
	};

	const handleConfirmDelete = () => {
		if (selected) {
			deleteEquipment({ variables: { id: selected.id } });
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-yellow)] mx-auto mb-4" />
					<p className="text-[var(--text-secondary)]">Loading equipment...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<p className="text-red-500 mb-4">{error.message}</p>
					<button onClick={() => window.location.reload()} className="btn-primary">
						Retry
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold flex items-center gap-2">
						<Dumbbell className="w-8 h-8" color="var(--primary-yellow)" />
						Equipment
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-1">
						Manage gym equipment shown in the app ({list.length} items)
					</p>
				</div>
				<Button onClick={handleCreate}>
					<Plus className="w-4 h-4" />
					Add Equipment
				</Button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{list.map((item) => (
					<div
						key={item.id}
						className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[20px] overflow-hidden backdrop-blur-md"
					>
						<div className="aspect-[4/3] bg-[var(--bg-darker)]">
							<img
								src={item.imageUrl}
								alt={item.name}
								className="w-full h-full object-cover"
							/>
						</div>
						<div className="p-5">
							<div className="flex items-start justify-between gap-2 mb-2">
								<h3 className="text-lg font-bold text-[var(--text-primary)] flex-1">
									{item.name}
								</h3>
								<span
									className={`shrink-0 px-2 py-1 rounded-lg text-xs font-semibold border ${statusBadgeClass(item.status)}`}
								>
									{statusLabel(item.status)}
								</span>
							</div>
							{(item.description || item.notes) && (
								<div className="mb-4 space-y-2">
									{item.description ? (
										<p className="text-sm text-[var(--text-secondary)] line-clamp-2">
											{item.description}
										</p>
									) : null}
									{item.notes ? (
										<p className="text-xs text-[var(--text-secondary)] line-clamp-3 italic border-l-2 border-[var(--primary-yellow)] pl-2">
											{item.notes}
										</p>
									) : null}
								</div>
							)}
							<div className="flex gap-3">
								<button
									type="button"
									onClick={() => handleEdit(item)}
									className="btn-small btn-edit flex-1 px-4 py-2 rounded-lg text-xs font-semibold bg-[rgba(249,197,19,0.15)] text-[var(--primary-yellow)] border border-[rgba(249,197,19,0.3)] flex items-center justify-center gap-2"
								>
									<Edit className="w-4 h-4" />
									Edit
								</button>
								<button
									type="button"
									onClick={() => handleDelete(item)}
									className="btn-small btn-delete flex-1 px-4 py-2 rounded-lg text-xs font-semibold bg-[rgba(239,68,68,0.15)] text-[#EF4444] border border-[rgba(239,68,68,0.3)] flex items-center justify-center gap-2"
								>
									<Trash2 className="w-4 h-4" />
									Delete
								</button>
							</div>
						</div>
					</div>
				))}
			</div>

			{list.length === 0 && (
				<div className="text-center py-12 border border-dashed border-[var(--card-border)] rounded-xl">
					<Dumbbell className="w-12 h-12 mx-auto text-[var(--text-secondary)] mb-3" />
					<p className="text-[var(--text-secondary)]">No equipment yet.</p>
					<Button onClick={handleCreate} className="mt-4">
						<Plus className="w-4 h-4" />
						Add Equipment
					</Button>
				</div>
			)}

			<EquipmentFormModal
				key={selected?.id ?? 'new'}
				isOpen={isFormOpen}
				onClose={() => {
					setIsFormOpen(false);
					setSelected(null);
				}}
				onSubmit={handleFormSubmit}
				equipment={isEdit ? selected : null}
				isLoading={creating || updating}
				uploading={uploading}
			/>

			<DeleteConfirmModal
				isOpen={isDeleteOpen}
				onClose={() => {
					setIsDeleteOpen(false);
					setSelected(null);
				}}
				onConfirm={handleConfirmDelete}
				title="Delete equipment?"
				message={
					selected
						? `Delete "${selected.name}"? This cannot be undone.`
						: ''
				}
				isDeleting={deleting}
			/>

			<SuccessModal
				isOpen={isSuccessOpen}
				onClose={() => setIsSuccessOpen(false)}
				title="Success"
				message={successMessage}
			/>
		</div>
	);
}
