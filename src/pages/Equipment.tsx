import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Plus, Dumbbell, Download, AlertTriangle } from 'lucide-react';
import { EquipmentFormModal, type EquipmentFormData } from '@/components/modals/EquipmentFormModal';
import { EquipmentViewModal } from '@/components/modals/EquipmentViewModal';
import { SuccessModal } from '@/components/modals/SuccessModal';
import {
	GET_EQUIPMENTS,
	GET_EQUIPMENTS_LEGACY,
	CREATE_EQUIPMENT_LEGACY,
	UPDATE_EQUIPMENT_LEGACY,
	ARCHIVE_EQUIPMENT,
	UNARCHIVE_EQUIPMENT,
	LOG_REPORT_DOWNLOAD,
} from '@/graphql/operations/index';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import { uploadEquipmentImage } from '@/lib/uploadApi';
import { EquipmentStatus, ReportType } from '@/graphql/generated/graphql';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
	appendEquipmentActionLog,
	readEquipmentActionLogs,
	type EquipmentActionLog,
} from '@/lib/equipmentActionLogs';

const LEGACY_ARCHIVE_PREFIX = '__ARCHIVED__|';

function parseLegacyArchiveMeta(rawNotes: string | null | undefined) {
	if (!rawNotes) {
		return {
			isArchived: false,
			archiveReason: null as string | null,
			archivedAt: null as string | null,
			cleanNotes: null as string | null,
		};
	}
	const lines = rawNotes.split('\n');
	const first = lines[0] || '';
	if (!first.startsWith(LEGACY_ARCHIVE_PREFIX)) {
		return {
			isArchived: false,
			archiveReason: null as string | null,
			archivedAt: null as string | null,
			cleanNotes: rawNotes.trim() || null,
		};
	}
	const payload = first.slice(LEGACY_ARCHIVE_PREFIX.length);
	const [encodedReason = '', archivedAt = ''] = payload.split('|');
	const cleanNotes = lines.slice(1).join('\n').trim() || null;
	return {
		isArchived: true,
		archiveReason: decodeURIComponent(encodedReason || ''),
		archivedAt: archivedAt || null,
		cleanNotes,
	};
}

function buildLegacyArchivedNotes(reason: string, cleanNotes: string | null) {
	const marker = `${LEGACY_ARCHIVE_PREFIX}${encodeURIComponent(reason)}|${new Date().toISOString()}`;
	return cleanNotes && cleanNotes.trim().length > 0
		? `${marker}\n${cleanNotes.trim()}`
		: marker;
}

function formatDateManila(dateValue: string | null | undefined) {
	if (!dateValue) return 'N/A';
	try {
		return new Date(dateValue).toLocaleDateString('en-PH', {
			timeZone: 'Asia/Manila',
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	} catch {
		return 'N/A';
	}
}

async function loadImageAsDataUrl(path: string): Promise<string | null> {
	try {
		const response = await fetch(path);
		if (!response.ok) return null;
		const blob = await response.blob();
		return await new Promise((resolve) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
			reader.onerror = () => resolve(null);
			reader.readAsDataURL(blob);
		});
	} catch {
		return null;
	}
}

async function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number } | null> {
	return await new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			if (!img.naturalWidth || !img.naturalHeight) {
				resolve(null);
				return;
			}
			resolve({ width: img.naturalWidth, height: img.naturalHeight });
		};
		img.onerror = () => resolve(null);
		img.src = dataUrl;
	});
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
	let binary = '';
	const bytes = new Uint8Array(buffer);
	const chunkSize = 0x8000;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		const chunk = bytes.subarray(i, i + chunkSize);
		binary += String.fromCharCode(...chunk);
	}
	return btoa(binary);
}

async function tryRegisterInterFont(doc: jsPDF): Promise<boolean> {
	try {
		const regularUrl =
			'https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/Inter-Regular.ttf';
		const boldUrl =
			'https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/Inter-Bold.ttf';
		const [regularRes, boldRes] = await Promise.all([fetch(regularUrl), fetch(boldUrl)]);
		if (!regularRes.ok || !boldRes.ok) return false;
		const [regularBuf, boldBuf] = await Promise.all([
			regularRes.arrayBuffer(),
			boldRes.arrayBuffer(),
		]);
		const pdf = doc as any;
		pdf.addFileToVFS('Inter-Regular.ttf', arrayBufferToBase64(regularBuf));
		pdf.addFont('Inter-Regular.ttf', 'Inter', 'normal');
		pdf.addFileToVFS('Inter-Bold.ttf', arrayBufferToBase64(boldBuf));
		pdf.addFont('Inter-Bold.ttf', 'Inter', 'bold');
		return true;
	} catch {
		return false;
	}
}

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

function toStatusText(status: EquipmentStatus | string | null | undefined): string {
	if (!status) return 'N/A';
	switch (status) {
		case EquipmentStatus.Available:
			return 'Available';
		case EquipmentStatus.Damaged:
			return 'Damaged';
		case EquipmentStatus.Undermaintenance:
			return 'Under maintenance';
		default:
			return String(status);
	}
}

function actionTypeText(actionType: EquipmentActionLog['actionType']): string {
	switch (actionType) {
		case 'SET_UNDER_MAINTENANCE':
			return 'Set under maintenance';
		case 'STATUS_CHANGED':
			return 'Status changed';
		case 'ARCHIVED':
			return 'Archived';
		case 'RESTORED':
			return 'Restored';
		case 'CREATED':
			return 'Created';
		case 'UPDATED':
			return 'Updated';
		default:
			return actionType;
	}
}

function toEpoch(dateValue: string | null | undefined): number {
	if (!dateValue) return 0;
	const t = new Date(dateValue).getTime();
	return Number.isFinite(t) ? t : 0;
}

const ARCHIVE_REASON_OPTIONS = [
	'Damaged beyond repair',
	'Replaced by a new unit',
	'Safety concern',
	'Not in use / obsolete',
	'Sent for long-term repair',
	'Other',
] as const;

export function EquipmentPage() {
	useEffect(() => {
		document.title = 'Equipment - X-TRIM FIT GYM';
	}, []);

	const dispatch = useAppDispatch();
	const token = useAppSelector((s) => s.auth.token);
	const currentUser = useAppSelector((s) => s.auth.user);
	const [selected, setSelected] = useState<any | null>(null);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [isSuccessOpen, setIsSuccessOpen] = useState(false);
	const [isViewOpen, setIsViewOpen] = useState(false);
	const [viewingEquipment, setViewingEquipment] = useState<any | null>(null);
	const [successMessage, setSuccessMessage] = useState('');
	const [isEdit, setIsEdit] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [viewTab, setViewTab] = useState<'CURRENT' | 'ARCHIVED'>('CURRENT');
	const [statusFilter, setStatusFilter] = useState<'ALL' | EquipmentStatus>('ALL');
	const [searchTerm, setSearchTerm] = useState('');
	const [useLegacyApi, setUseLegacyApi] = useState(
		import.meta.env.VITE_ENABLE_MODERN_ARCHIVE_API !== 'true'
	);
	const [archiveReasonOption, setArchiveReasonOption] = useState<(typeof ARCHIVE_REASON_OPTIONS)[number]>(
		'Damaged beyond repair'
	);
	const [archiveReasonOther, setArchiveReasonOther] = useState('');
	const [equipmentActionLogs, setEquipmentActionLogs] = useState<EquipmentActionLog[]>(() =>
		typeof window === 'undefined' ? [] : readEquipmentActionLogs()
	);
	const pendingCreateActionRef = useRef<{ equipmentName: string; status: EquipmentStatus } | null>(null);
	const pendingUpdateActionRef = useRef<{
		equipmentId: string;
		equipmentName: string;
		fromStatus: EquipmentStatus;
		toStatus: EquipmentStatus;
	} | null>(null);
	const pendingArchiveActionRef = useRef<{ equipmentId: string; equipmentName: string; reason: string } | null>(
		null
	);
	const pendingRestoreActionRef = useRef<{ equipmentId: string; equipmentName: string } | null>(null);
	const actorLabel =
		[currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ').trim() ||
		currentUser?.email ||
		'Admin';
	const recordEquipmentAction = (payload: Omit<EquipmentActionLog, 'id' | 'createdAt' | 'actionBy'>) => {
		const updated = appendEquipmentActionLog({
			...payload,
			actionBy: actorLabel,
		});
		setEquipmentActionLogs(updated);
	};
	const appendLocalExportLog = (fileName: string) => {
		try {
			const key = 'xtrimfit-report-export-logs';
			const raw = localStorage.getItem(key);
			const prev = raw ? (JSON.parse(raw) as any[]) : [];
			const next = {
				id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				reportType: String(ReportType.Equipment),
				fileName,
				downloadedById: currentUser?.id || 'unknown',
				downloadedByRole: currentUser?.role || 'admin',
				downloadedBy: {
					firstName: currentUser?.firstName,
					lastName: currentUser?.lastName,
					email: currentUser?.email,
				},
				createdAt: new Date().toISOString(),
			};
			localStorage.setItem(key, JSON.stringify([next, ...prev].slice(0, 50)));
		} catch {
			// Non-blocking local history write
		}
	};

	const modernQuery = useQuery(GET_EQUIPMENTS, {
		variables: { includeArchived: true },
		errorPolicy: 'none',
		skip: useLegacyApi,
	});
	const legacyQuery = useQuery(GET_EQUIPMENTS_LEGACY, {
		errorPolicy: 'none',
		skip: !useLegacyApi,
	});
	useEffect(() => {
		if (!modernQuery.error) return;
		const msg = modernQuery.error.message || '';
		if (
			msg.includes('includeArchived') ||
			msg.includes('isArchived') ||
			msg.includes('archiveEquipment') ||
			msg.includes('Cannot query field') ||
			msg.includes('Unknown argument')
		) {
			setUseLegacyApi(true);
		}
	}, [modernQuery.error]);
	const data = useLegacyApi ? legacyQuery.data : modernQuery.data;
	const loading = useLegacyApi ? legacyQuery.loading : modernQuery.loading;
	const error = useLegacyApi ? legacyQuery.error : modernQuery.error;
	const list = (data?.getEquipments ?? []) as any[];
	const normalizedList = useLegacyApi
		? list.map((item) => {
				const legacyMeta = parseLegacyArchiveMeta(item.notes);
				return {
					...item,
					isArchived: legacyMeta.isArchived,
					archiveReason: legacyMeta.archiveReason,
					archivedAt: legacyMeta.archivedAt,
					notes: legacyMeta.cleanNotes,
					legacyRawNotes: item.notes ?? null,
				};
			})
		: list;
	const refreshEquipmentList = async () => {
		if (useLegacyApi) {
			await legacyQuery.refetch();
			return;
		}
		await modernQuery.refetch({ includeArchived: true });
	};
	const archiveFiltered =
		viewTab === 'ARCHIVED'
			? normalizedList.filter((item) => item.isArchived === true)
			: normalizedList.filter((item) => item.isArchived !== true);
	const normalizedSearch = searchTerm.trim().toLowerCase();
	const statusFilteredList =
		statusFilter === 'ALL'
			? archiveFiltered
			: archiveFiltered.filter((item) => item.status === statusFilter);
	const visibleList = statusFilteredList
		.filter((item) => {
			if (!normalizedSearch) return true;
			const searchable = [item.name, item.description, item.notes, statusLabel(item.status)]
				.filter(Boolean)
				.join(' ')
				.toLowerCase();
			return searchable.includes(normalizedSearch);
		})
		.sort((a, b) => {
			const aTime = toEpoch(a.createdAt || a.updatedAt);
			const bTime = toEpoch(b.createdAt || b.updatedAt);
			return bTime - aTime;
		});
	const maintenanceSetAtByEquipmentId = useMemo(() => {
		const map: Record<string, string> = {};
		normalizedList.forEach((item) => {
			let latestIso = '';
			const lifecycleLogs = Array.isArray(item.lifecycleLogs) ? item.lifecycleLogs : [];
			lifecycleLogs.forEach((entry: any) => {
				const changedAt = entry?.changedAt;
				if (!changedAt) return;
				if (entry?.status !== EquipmentStatus.Undermaintenance) return;
				if (!latestIso || new Date(changedAt).getTime() > new Date(latestIso).getTime()) {
					latestIso = changedAt;
				}
			});
			equipmentActionLogs.forEach((entry) => {
				if (entry.equipmentId !== item.id) return;
				const underMaintenanceAction =
					entry.actionType === 'SET_UNDER_MAINTENANCE' ||
					entry.toStatus === EquipmentStatus.Undermaintenance;
				if (!underMaintenanceAction) return;
				if (!latestIso || new Date(entry.createdAt).getTime() > new Date(latestIso).getTime()) {
					latestIso = entry.createdAt;
				}
			});
			if (latestIso) {
				map[item.id] = latestIso;
			}
		});
		return map;
	}, [normalizedList, equipmentActionLogs]);
	const conditionSetAtByEquipmentId = useMemo(() => {
		const map: Record<string, Record<EquipmentStatus, string>> = {};
		normalizedList.forEach((item) => {
			const byStatus: Record<EquipmentStatus, string> = {
				[EquipmentStatus.Available]: '',
				[EquipmentStatus.Damaged]: '',
				[EquipmentStatus.Undermaintenance]: '',
			};
			const lifecycleLogs = Array.isArray(item.lifecycleLogs) ? item.lifecycleLogs : [];
			lifecycleLogs.forEach((entry: any) => {
				const status = entry?.status as EquipmentStatus | undefined;
				if (!status || !(status in byStatus)) return;
				const changedAt = entry?.changedAt as string | undefined;
				if (!changedAt) return;
				if (!byStatus[status] || toEpoch(changedAt) > toEpoch(byStatus[status])) {
					byStatus[status] = changedAt;
				}
			});
			equipmentActionLogs.forEach((entry) => {
				if (entry.equipmentId !== item.id) return;
				const status = entry.toStatus;
				if (!status || !(status in byStatus)) return;
				if (!byStatus[status] || toEpoch(entry.createdAt) > toEpoch(byStatus[status])) {
					byStatus[status] = entry.createdAt;
				}
			});
			const currentStatus = item.status as EquipmentStatus;
			if (currentStatus && !byStatus[currentStatus]) {
				byStatus[currentStatus] = item.updatedAt || item.createdAt || '';
			}
			map[item.id] = byStatus;
		});
		return map;
	}, [normalizedList, equipmentActionLogs]);

	const [createEquipment, { loading: creating }] = useMutation(CREATE_EQUIPMENT_LEGACY, {
		onCompleted: (result) => {
			const pending = pendingCreateActionRef.current;
			if (pending) {
				const createdEquipment = (result as any)?.createEquipment;
				const createdId = createdEquipment?.id || '';
				recordEquipmentAction({
					equipmentId: createdId,
					equipmentName: pending.equipmentName,
					actionType: 'CREATED',
					toStatus: pending.status,
				});
				if (pending.status === EquipmentStatus.Undermaintenance) {
					recordEquipmentAction({
						equipmentId: createdId,
						equipmentName: pending.equipmentName,
						actionType: 'SET_UNDER_MAINTENANCE',
						toStatus: pending.status,
						reason: 'Set during creation',
					});
				}
				pendingCreateActionRef.current = null;
			}
			refreshEquipmentList().catch(() => {});
			setSuccessMessage('Equipment created.');
			setIsSuccessOpen(true);
			setIsFormOpen(false);
			dispatch(addToast({ type: 'success', message: 'Equipment created.' }));
		},
		onError: (e) => {
			pendingCreateActionRef.current = null;
			dispatch(addToast({ type: 'error', message: e.message }));
		},
	});

	const [updateEquipment, { loading: updating }] = useMutation(UPDATE_EQUIPMENT_LEGACY, {
		onCompleted: () => {
			const pending = pendingUpdateActionRef.current;
			if (pending) {
				recordEquipmentAction({
					equipmentId: pending.equipmentId,
					equipmentName: pending.equipmentName,
					actionType: 'UPDATED',
					fromStatus: pending.fromStatus,
					toStatus: pending.toStatus,
				});
				if (pending.fromStatus !== pending.toStatus) {
					recordEquipmentAction({
						equipmentId: pending.equipmentId,
						equipmentName: pending.equipmentName,
						actionType: 'STATUS_CHANGED',
						fromStatus: pending.fromStatus,
						toStatus: pending.toStatus,
					});
				}
				if (
					pending.fromStatus !== EquipmentStatus.Undermaintenance &&
					pending.toStatus === EquipmentStatus.Undermaintenance
				) {
					recordEquipmentAction({
						equipmentId: pending.equipmentId,
						equipmentName: pending.equipmentName,
						actionType: 'SET_UNDER_MAINTENANCE',
						fromStatus: pending.fromStatus,
						toStatus: pending.toStatus,
					});
				}
				pendingUpdateActionRef.current = null;
			}
			refreshEquipmentList().catch(() => {});
			setSuccessMessage('Equipment updated.');
			setIsSuccessOpen(true);
			setIsFormOpen(false);
			setSelected(null);
			dispatch(addToast({ type: 'success', message: 'Equipment updated.' }));
		},
		onError: (e) => {
			pendingUpdateActionRef.current = null;
			dispatch(addToast({ type: 'error', message: e.message }));
		},
	});
	const [archiveEquipment, { loading: archiving }] = useMutation(ARCHIVE_EQUIPMENT, {
		refetchQueries: [{ query: GET_EQUIPMENTS, variables: { includeArchived: true } }],
		onCompleted: () => {
			const pending = pendingArchiveActionRef.current;
			if (pending) {
				recordEquipmentAction({
					equipmentId: pending.equipmentId,
					equipmentName: pending.equipmentName,
					actionType: 'ARCHIVED',
					reason: pending.reason,
				});
				pendingArchiveActionRef.current = null;
			}
			setSuccessMessage('Equipment archived.');
			setIsSuccessOpen(true);
			setIsDeleteOpen(false);
			setSelected(null);
			dispatch(addToast({ type: 'success', message: 'Equipment archived.' }));
		},
		onError: (e) => {
			pendingArchiveActionRef.current = null;
			dispatch(addToast({ type: 'error', message: e.message }));
		},
	});
	const [updateEquipmentLegacyMeta, { loading: updatingLegacyMeta }] = useMutation(
		UPDATE_EQUIPMENT_LEGACY,
		{
			onCompleted: () => {
				refreshEquipmentList().catch(() => {});
			},
			onError: (e) => dispatch(addToast({ type: 'error', message: e.message })),
		}
	);
	const [unarchiveEquipment, { loading: restoring }] = useMutation(UNARCHIVE_EQUIPMENT, {
		refetchQueries: [{ query: GET_EQUIPMENTS, variables: { includeArchived: true } }],
		onCompleted: () => {
			const pending = pendingRestoreActionRef.current;
			if (pending) {
				recordEquipmentAction({
					equipmentId: pending.equipmentId,
					equipmentName: pending.equipmentName,
					actionType: 'RESTORED',
				});
				pendingRestoreActionRef.current = null;
			}
			setSuccessMessage('Equipment restored to current list.');
			setIsSuccessOpen(true);
			dispatch(addToast({ type: 'success', message: 'Equipment restored.' }));
		},
		onError: (e) => {
			pendingRestoreActionRef.current = null;
			dispatch(addToast({ type: 'error', message: e.message }));
		},
	});
	const [logReportDownload] = useMutation(LOG_REPORT_DOWNLOAD);

	const handleCreate = () => {
		setIsEdit(false);
		setSelected(null);
		setIsFormOpen(true);
	};

	const handleEdit = (item: any) => {
		setIsEdit(true);
		setSelected(item);
		setIsFormOpen(true);
	};

	const handleView = (item: any) => {
		setViewingEquipment(item);
		setIsViewOpen(true);
	};

	const handleDelete = (item: any) => {
		setSelected(item);
		setArchiveReasonOption('Damaged beyond repair');
		setArchiveReasonOther('');
		setIsDeleteOpen(true);
	};

	const handleRestore = async (item: any) => {
		if (useLegacyApi) {
			const legacyMeta = parseLegacyArchiveMeta(item.legacyRawNotes ?? item.notes);
			await updateEquipmentLegacyMeta({
				variables: {
					id: item.id,
					input: { notes: legacyMeta.cleanNotes ?? '' },
				},
			});
			recordEquipmentAction({
				equipmentId: item.id,
				equipmentName: item.name,
				actionType: 'RESTORED',
			});
			setSuccessMessage('Equipment restored to current list.');
			setIsSuccessOpen(true);
			dispatch(addToast({ type: 'success', message: 'Equipment restored.' }));
			return;
		}
		pendingRestoreActionRef.current = { equipmentId: item.id, equipmentName: item.name };
		await unarchiveEquipment({ variables: { id: item.id } });
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
			pendingUpdateActionRef.current = {
				equipmentId: selected.id,
				equipmentName: formData.name,
				fromStatus: (selected.status as EquipmentStatus) ?? EquipmentStatus.Available,
				toStatus: formData.status,
			};
			updateEquipment({
				variables: {
					id: selected.id,
					input: {
						name: formData.name,
						imageUrl,
						description: formData.description || undefined,
						notes: formData.notes || undefined,
						acquiredAt: formData.acquiredAt || undefined,
						status: formData.status,
					},
				},
			});
		} else {
			pendingCreateActionRef.current = {
				equipmentName: formData.name,
				status: formData.status,
			};
			createEquipment({
				variables: {
					input: {
						name: formData.name,
						imageUrl,
						description: formData.description || undefined,
						notes: formData.notes || undefined,
						acquiredAt: formData.acquiredAt || undefined,
						status: formData.status,
					},
				},
			});
		}
	};

	const handleConfirmDelete = async () => {
		if (!selected) return;
		const finalReason =
			archiveReasonOption === 'Other' ? archiveReasonOther.trim() : archiveReasonOption;
		if (!finalReason) {
			dispatch(addToast({ type: 'error', message: 'Archive reason is required.' }));
			return;
		}
		try {
			if (useLegacyApi) {
				const legacyMeta = parseLegacyArchiveMeta(selected.legacyRawNotes ?? selected.notes);
				const archivedNotes = buildLegacyArchivedNotes(finalReason, legacyMeta.cleanNotes);
				await updateEquipmentLegacyMeta({
					variables: {
						id: selected.id,
						input: { notes: archivedNotes },
					},
				});
				recordEquipmentAction({
					equipmentId: selected.id,
					equipmentName: selected.name,
					actionType: 'ARCHIVED',
					reason: finalReason,
				});
				setSuccessMessage('Equipment archived.');
				setIsSuccessOpen(true);
				setIsDeleteOpen(false);
				setSelected(null);
				dispatch(addToast({ type: 'success', message: 'Equipment archived.' }));
			} else {
				pendingArchiveActionRef.current = {
					equipmentId: selected.id,
					equipmentName: selected.name,
					reason: finalReason,
				};
				await archiveEquipment({
					variables: { id: selected.id, reason: finalReason },
				});
			}
		} catch (err) {
			console.error('Archive failed:', err);
		}
	};

	const handleExportPdf = async () => {
		const now = new Date();
		const filename = `equipment-master-report-${now
			.toISOString()
			.replace(/[:.]/g, '-')
			.slice(0, 19)}.pdf`;
		const reportRows = normalizedList;
		const totalCount = reportRows.length;
		const currentCount = reportRows.filter((eq) => !eq.isArchived).length;
		const archivedCount = reportRows.filter((eq) => !!eq.isArchived).length;
		const availableCount = reportRows.filter((eq) => eq.status === EquipmentStatus.Available).length;
		const damagedCount = reportRows.filter((eq) => eq.status === EquipmentStatus.Damaged).length;
		const maintenanceCount = reportRows.filter(
			(eq) => eq.status === EquipmentStatus.Undermaintenance
		).length;
		const timelineEntries: Array<{
			equipmentName: string;
			action: string;
			fromStatus: string;
			toStatus: string;
			reason: string;
			changedBy: string;
			changedAt: string;
		}> = [];
		reportRows.forEach((eq) => {
			const lifecycleLogs = Array.isArray(eq.lifecycleLogs) ? eq.lifecycleLogs : [];
			lifecycleLogs.forEach((log: any) => {
				timelineEntries.push({
					equipmentName: eq.name || 'Unknown',
					action: log?.action || 'Lifecycle update',
					fromStatus: '-',
					toStatus: toStatusText(log?.status as EquipmentStatus | undefined),
					reason: log?.notes || '-',
					changedBy: log?.changedById || '-',
					changedAt: log?.changedAt || '',
				});
			});
		});
		equipmentActionLogs.forEach((log) => {
			timelineEntries.push({
				equipmentName: log.equipmentName || 'Unknown',
				action: actionTypeText(log.actionType),
				fromStatus: toStatusText(log.fromStatus),
				toStatus: toStatusText(log.toStatus),
				reason: log.reason || '-',
				changedBy: log.actionBy || '-',
				changedAt: log.createdAt,
			});
		});
		timelineEntries.sort((a, b) => {
			const timeA = new Date(a.changedAt || '').getTime();
			const timeB = new Date(b.changedAt || '').getTime();
			return (Number.isFinite(timeB) ? timeB : 0) - (Number.isFinite(timeA) ? timeA : 0);
		});
		const exportedByLabel = [currentUser?.firstName, currentUser?.lastName]
			.filter(Boolean)
			.join(' ')
			.trim() || currentUser?.email || 'System';

		const doc = new jsPDF({ orientation: 'landscape' });
		const interReady = await tryRegisterInterFont(doc);
		doc.setFont(interReady ? 'Inter' : 'helvetica', 'normal');
		const logoDataUrl = await loadImageAsDataUrl('/logo.png');
		let headerTextX = 14;
		if (logoDataUrl) {
			const logoSize = await getImageDimensions(logoDataUrl);
			const maxLogoWidth = 32;
			const maxLogoHeight = 24;
			let logoWidth = maxLogoWidth;
			let logoHeight = maxLogoHeight;
			if (logoSize) {
				const ratio = logoSize.width / logoSize.height;
				if (ratio >= 1) {
					logoWidth = maxLogoWidth;
					logoHeight = maxLogoWidth / ratio;
					if (logoHeight > maxLogoHeight) {
						logoHeight = maxLogoHeight;
						logoWidth = maxLogoHeight * ratio;
					}
				} else {
					logoHeight = maxLogoHeight;
					logoWidth = maxLogoHeight * ratio;
				}
			}
			doc.addImage(logoDataUrl, 'PNG', 14, 10, logoWidth, logoHeight);
			headerTextX = 14 + logoWidth + 6;
		}
		doc.setFontSize(16);
		doc.setFont(interReady ? 'Inter' : 'helvetica', 'bold');
		doc.text('X-TRIM FIT GYM', headerTextX, 18);
		doc.setFontSize(13);
		doc.setFont(interReady ? 'Inter' : 'helvetica', 'bold');
		doc.text('Equipment Master Report', headerTextX, 26);
		doc.setFontSize(10);
		doc.setFont(interReady ? 'Inter' : 'helvetica', 'normal');
		doc.text(
			`Generated: ${now.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Asia/Manila)`,
			14,
			34
		);
		doc.text(
			`Total: ${totalCount} | Current: ${currentCount} | Archived: ${archivedCount} | Available: ${availableCount} | Damaged: ${damagedCount} | Under maintenance: ${maintenanceCount}`,
			14,
			40
		);
		doc.text(`Exported by: ${exportedByLabel}`, 14, 46);
		const renderConditionTable = (
			title: string,
			conditionStatus: EquipmentStatus,
			conditionDateLabel: string
		) => {
			const rows = reportRows.filter((eq) => eq.status === conditionStatus);
			const startY = ((doc as any).lastAutoTable?.finalY ?? 52) + 10;
			doc.setFontSize(11);
			doc.setFont(interReady ? 'Inter' : 'helvetica', 'bold');
			doc.text(title, 14, startY - 3);
			autoTable(doc, {
				startY,
				head: [[
					'Name',
					'Record State',
					'Added Date',
					conditionDateLabel,
					'Archived Date',
					'Archive Reason',
					'Acquired Date',
					'Notes',
				]],
				body:
					rows.length > 0
						? rows.map((eq) => [
								eq.name,
								eq.isArchived ? 'Archived' : 'Current',
								formatDateManila(eq.createdAt),
								formatDateManila(conditionSetAtByEquipmentId[eq.id]?.[conditionStatus]),
								formatDateManila(eq.archivedAt),
								eq.archiveReason || '-',
								formatDateManila(eq.acquiredAt),
								eq.notes || '-',
						  ])
						: [['-', '-', '-', '-', '-', '-', '-', 'No equipment in this condition']],
				styles: { fontSize: 8 },
				headStyles: { fillColor: [249, 197, 19], textColor: [20, 20, 20] },
				alternateRowStyles: { fillColor: [245, 245, 248] },
				margin: { left: 14, right: 14 },
			});
		};
		renderConditionTable('Available Equipment', EquipmentStatus.Available, 'Available since');
		renderConditionTable(
			'Under Maintenance Equipment',
			EquipmentStatus.Undermaintenance,
			'Under maintenance since'
		);
		renderConditionTable('Damaged Equipment', EquipmentStatus.Damaged, 'Damaged since');
		autoTable(doc, {
			startY: ((doc as any).lastAutoTable?.finalY ?? 52) + 10,
			head: [['Equipment', 'Action', 'From status', 'To status', 'Reason/Notes', 'Changed by', 'Date']],
			body:
				timelineEntries.length > 0
					? timelineEntries.map((entry) => [
							entry.equipmentName,
							entry.action,
							entry.fromStatus,
							entry.toStatus,
							entry.reason,
							entry.changedBy,
							formatDateManila(entry.changedAt),
					  ])
					: [['-', 'No action history recorded yet', '-', '-', '-', '-', '-']],
			styles: { fontSize: 8 },
			headStyles: { fillColor: [249, 197, 19], textColor: [20, 20, 20] },
			alternateRowStyles: { fillColor: [245, 245, 248] },
			margin: { left: 14, right: 14 },
		});
		doc.save(filename);
		appendLocalExportLog(filename);
		await logReportDownload({
			variables: {
				input: {
					reportType: ReportType.Equipment,
					fileName: filename,
					filterSummary: `scope:all-records;tab:${viewTab};condition:${statusFilter}`,
				},
			},
		}).catch(() => {
			// Non-blocking audit log failure; export is already completed
		});
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
						Manage gym equipment shown in the app ({visibleList.length} shown)
					</p>
				</div>
				<div className="flex items-center gap-2">
					<div className="inline-flex items-center rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-1">
						<button
							type="button"
							onClick={() => setViewTab('CURRENT')}
							className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
								viewTab === 'CURRENT'
									? 'bg-[rgba(249,197,19,0.2)] text-[var(--primary-yellow)]'
									: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
							}`}
						>
							Current
						</button>
						<button
							type="button"
							onClick={() => setViewTab('ARCHIVED')}
							className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
								viewTab === 'ARCHIVED'
									? 'bg-[rgba(249,197,19,0.2)] text-[var(--primary-yellow)]'
									: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
							}`}
						>
							Archived
						</button>
					</div>
					<select
						aria-label="Filter equipment by condition"
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value as 'ALL' | EquipmentStatus)}
						className="px-3 py-2 text-xs font-semibold bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-yellow)]"
					>
						<option value="ALL">All Conditions</option>
						<option value={EquipmentStatus.Available}>Available</option>
						<option value={EquipmentStatus.Damaged}>Damaged</option>
						<option value={EquipmentStatus.Undermaintenance}>Under maintenance</option>
					</select>
					<input
						type="text"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						placeholder="Search equipment..."
						className="w-52 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary-yellow)] focus:outline-none"
					/>
					<Button onClick={handleCreate}>
						<Plus className="w-4 h-4" />
						Add Equipment
					</Button>
					<Button onClick={handleExportPdf} className="btn-export-pdf">
						<Download className="w-4 h-4" />
						Export PDF
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{visibleList.map((item) => (
					<div
						key={item.id}
						className="flex h-full min-h-[31rem] flex-col overflow-hidden rounded-[20px] border border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-md transition hover:border-[rgba(249,197,19,0.35)]"
					>
						<div
							className="h-52 cursor-pointer bg-[var(--bg-darker)] md:h-56"
							onClick={() => handleView(item)}
						>
							<img
								src={item.imageUrl}
								alt={item.name}
								className="w-full h-full object-cover"
							/>
						</div>
						<div className="flex h-full flex-col p-5">
							<div
								className="mb-2 cursor-pointer"
								onClick={() => handleView(item)}
							>
								<div className="flex items-start justify-between gap-2">
								<h3 className="text-lg font-bold text-[var(--text-primary)] flex-1">
									{item.name}
								</h3>
								<span
									className={`shrink-0 px-2 py-1 rounded-lg text-xs font-semibold border ${statusBadgeClass(item.status)}`}
								>
									{statusLabel(item.status)}
								</span>
								</div>
							</div>
							{(item.description || item.notes) && (
								<div className="mb-4 cursor-pointer space-y-2" onClick={() => handleView(item)}>
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
							<div className="mb-4 cursor-pointer space-y-1 text-xs text-[var(--text-secondary)]" onClick={() => handleView(item)}>
								<div>
									Added:{' '}
									{item.createdAt
										? new Date(item.createdAt).toLocaleDateString('en-PH', {
												timeZone: 'Asia/Manila',
											})
										: 'N/A'}
								</div>
								{item.status === EquipmentStatus.Undermaintenance ? (
									<div>
										Under maintenance since:{' '}
										{formatDateManila(maintenanceSetAtByEquipmentId[item.id])}
									</div>
								) : null}
								{item.isArchived ? (
									<>
										<div>
											Archived:{' '}
											{item.archivedAt
												? new Date(item.archivedAt).toLocaleDateString('en-PH', {
														timeZone: 'Asia/Manila',
													})
												: 'N/A'}
										</div>
										<div>Reason: {item.archiveReason || 'N/A'}</div>
									</>
								) : null}
							</div>
							<div className="mt-auto flex gap-3 pt-2">
								{item.isArchived ? (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											handleRestore(item);
										}}
										disabled={restoring}
										className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.14)] px-4 text-sm font-semibold text-[#34D399] transition hover:bg-[rgba(16,185,129,0.2)] disabled:opacity-60"
									>
										{restoring ? 'Restoring...' : 'Restore'}
									</button>
								) : (
									<>
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												handleEdit(item);
											}}
											className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[rgba(249,197,19,0.35)] bg-[rgba(249,197,19,0.14)] px-4 text-sm font-semibold text-[var(--primary-yellow)] transition hover:bg-[rgba(249,197,19,0.22)]"
										>
											Edit
										</button>
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												handleDelete(item);
											}}
											className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.14)] px-4 text-sm font-semibold text-[#F87171] transition hover:bg-[rgba(239,68,68,0.22)]"
										>
											Archive
										</button>
									</>
								)}
							</div>
						</div>
					</div>
				))}
			</div>

			{viewTab === 'ARCHIVED' && (
				<div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
					<p className="text-sm text-[var(--text-secondary)]">
						{useLegacyApi
							? 'Archived records are tracked in compatibility mode for the current API.'
							: 'Archived equipment records include archive date and reason for full audit visibility.'}
					</p>
				</div>
			)}

			{visibleList.length === 0 && (
				<div className="text-center py-12 border border-dashed border-[var(--card-border)] rounded-xl">
					<Dumbbell className="w-12 h-12 mx-auto text-[var(--text-secondary)] mb-3" />
					<p className="text-[var(--text-secondary)]">
						{viewTab === 'ARCHIVED'
							? 'No archived equipment.'
							: statusFilter === 'ALL'
								? 'No equipment yet.'
								: 'No equipment matches the selected condition.'}
					</p>
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

			<EquipmentViewModal
				isOpen={isViewOpen}
				onClose={() => {
					setIsViewOpen(false);
					setViewingEquipment(null);
				}}
				equipment={viewingEquipment}
				maintenanceSince={
					viewingEquipment ? maintenanceSetAtByEquipmentId[viewingEquipment.id] : undefined
				}
			/>

			{isDeleteOpen && (
				<div
					className="modal-overlay active"
					onClick={() => {
						if (archiving || updatingLegacyMeta) return;
						setIsDeleteOpen(false);
						setSelected(null);
					}}
				>
					<div className="modal modal-center" onClick={(e) => e.stopPropagation()}>
						<div className="modal-body">
							<div className="modal-delete-icon">
								<AlertTriangle size={48} />
							</div>
							<h2 className="modal-delete-title">Archive equipment?</h2>
							<p className="modal-delete-text">
								{selected
									? `Archive "${selected.name}"? It will be hidden from current view but history is preserved.`
									: ''}
							</p>
							<div className="mb-4 text-left">
								<label className="block text-sm text-[var(--text-secondary)] mb-2">
									Reason for archiving <span className="text-[#EF4444]">*</span>
								</label>
								<select
									value={archiveReasonOption}
									onChange={(e) =>
										setArchiveReasonOption(
											e.target.value as (typeof ARCHIVE_REASON_OPTIONS)[number]
										)
									}
									aria-label="Select archive reason"
									className="w-full px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-yellow)]"
									disabled={archiving || updatingLegacyMeta}
								>
									{ARCHIVE_REASON_OPTIONS.map((reason) => (
										<option key={reason} value={reason}>
											{reason}
										</option>
									))}
								</select>
							</div>
							{archiveReasonOption === 'Other' && (
								<div className="mb-4 text-left">
									<label className="block text-sm text-[var(--text-secondary)] mb-2">
										Specify reason <span className="text-[#EF4444]">*</span>
									</label>
									<textarea
										value={archiveReasonOther}
										onChange={(e) => setArchiveReasonOther(e.target.value)}
										placeholder="Type the specific reason here..."
										rows={3}
										className="w-full px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-yellow)] resize-none"
										disabled={archiving || updatingLegacyMeta}
									/>
								</div>
							)}
							<div className="modal-delete-actions flex items-center gap-3">
								<button
									type="button"
									className="btn-secondary flex-1 h-12 rounded-xl text-base font-semibold inline-flex items-center justify-center"
									onClick={() => {
										if (archiving || updatingLegacyMeta) return;
										setIsDeleteOpen(false);
										setSelected(null);
									}}
									disabled={archiving || updatingLegacyMeta}
								>
									Cancel
								</button>
								<button
									type="button"
									className="btn-danger flex-1 h-12 rounded-xl text-base font-semibold inline-flex items-center justify-center"
									onClick={handleConfirmDelete}
									disabled={archiving || updatingLegacyMeta}
								>
									{archiving || updatingLegacyMeta ? 'Archiving...' : 'Archive'}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			<SuccessModal
				isOpen={isSuccessOpen}
				onClose={() => setIsSuccessOpen(false)}
				title="Success"
				message={successMessage}
			/>
		</div>
	);
}
