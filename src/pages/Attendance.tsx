import { useState, useMemo, useEffect } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import {
	Search,
	Filter,
	User,
	UserCog,
	Fingerprint,
	Download,
} from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import {
	GET_ATTENDANCE_RECORDS,
	ATTENDANCE_RECORD_ADDED,
	ATTENDANCE_UPDATED,
	GET_USERS,
	LOG_REPORT_DOWNLOAD,
} from '@/graphql/operations/index';
import { RoleType, ReportType } from '@/graphql/generated/graphql';
import type { AttendanceRecord } from '@/graphql/generated/types';
import { useAppSelector } from '@/store/hooks';
import { useMutation } from '@apollo/client';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

function formatManilaDate(iso: string): string {
	return new Date(iso).toLocaleDateString('en-PH', {
		timeZone: 'Asia/Manila',
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

function formatManilaTime(iso: string): string {
	return new Date(iso).toLocaleTimeString('en-PH', {
		timeZone: 'Asia/Manila',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: true,
	});
}

function parseYmdToDate(ymd: string): Date | undefined {
	if (!ymd) return undefined;
	const [year, month, day] = ymd.split('-').map(Number);
	if (!year || !month || !day) return undefined;
	return new Date(year, month - 1, day);
}

function formatDateToYmd(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function normalizePersonName(value: string | null | undefined): string {
	return (value || '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();
}

function buildUserNameCandidates(
	user: { firstName?: string | null; middleName?: string | null; lastName?: string | null } | null | undefined
): string[] {
	if (!user) return [];
	const first = (user.firstName || '').trim();
	const middle = (user.middleName || '').trim();
	const last = (user.lastName || '').trim();
	const candidates = [
		[first, last].filter(Boolean).join(' '),
		[first, middle, last].filter(Boolean).join(' '),
		[last, first].filter(Boolean).join(', '),
	];
	return candidates.map(normalizePersonName).filter(Boolean);
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

export function AttendancePage() {
	useEffect(() => {
		document.title = 'Attendance Logs - X-TRIM FIT GYM';
	}, []);

	const [searchTerm, setSearchTerm] = useState('');
	const [roleFilter, setRoleFilter] = useState<'all' | 'coach' | 'client'>('all');
	const [dateFilter, setDateFilter] = useState<string>('');
	const [currentPage, setCurrentPage] = useState(1);
	const [subscriptionConnected, setSubscriptionConnected] = useState(false);
	const [, setLastUpdateTime] = useState<Date | null>(null);
	const recordsPerPage = 50;
	const currentUser = useAppSelector((s) => s.auth.user);
	const [logReportDownload] = useMutation(LOG_REPORT_DOWNLOAD);
	const appendLocalExportLog = (fileName: string) => {
		try {
			const key = 'xtrimfit-report-export-logs';
			const raw = localStorage.getItem(key);
			const prev = raw ? (JSON.parse(raw) as any[]) : [];
			const next = {
				id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				reportType: String(ReportType.Attendance),
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

	// Build filter object (date filter sent to API; API filters by authDateTime for correct results)
	const filter = useMemo(() => {
		const f: Record<string, string> = {};
		if (dateFilter) {
			f.startDate = dateFilter;
			f.endDate = dateFilter;
		}
		return Object.keys(f).length > 0 ? f : undefined;
	}, [dateFilter]);

	// Reset to page 1 when date filter changes so we don't request offset 50 for a single day
	useEffect(() => {
		setCurrentPage(1);
	}, [dateFilter]);

	// Today's date (Asia/Manila) for the "Today's Records" stat - never affected by date filter; updates past midnight
	const [todayStr, setTodayStr] = useState(() =>
		new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
	);
	useEffect(() => {
		const interval = setInterval(() => {
			const next = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
			setTodayStr((prev) => (next !== prev ? next : prev));
		}, 60_000);
		return () => clearInterval(interval);
	}, []);
	const todayFilter = useMemo(
		() => ({ startDate: todayStr, endDate: todayStr }),
		[todayStr]
	);

	// Poll only when tab is visible so we don't refetch in background
	// Slightly slower than 5s to ease Render free-tier + Railway MySQL load; subscriptions still push updates.
	const attendancePollMs = 7500;
	const [pollIntervalMs, setPollIntervalMs] = useState(attendancePollMs);
	useEffect(() => {
		const handleVisibility = () => {
			setPollIntervalMs(() => (document.hidden ? 0 : attendancePollMs));
		};
		handleVisibility();
		document.addEventListener('visibilitychange', handleVisibility);
		return () => document.removeEventListener('visibilitychange', handleVisibility);
	}, []);

	// Always fetch today's count for the stat; independent of the list date filter
	const { data: dataToday } = useQuery(GET_ATTENDANCE_RECORDS, {
		variables: {
			filter: todayFilter,
			pagination: { limit: 1, offset: 0 },
		},
		fetchPolicy: 'cache-and-network',
		pollInterval: pollIntervalMs,
	});

	const { data: coachesUsersData } = useQuery(GET_USERS, {
		variables: { role: RoleType.Coach },
		fetchPolicy: 'cache-first',
	});
	const { data: membersUsersData } = useQuery(GET_USERS, {
		variables: { role: RoleType.Member },
		fetchPolicy: 'cache-first',
	});

	// Initial data fetch; poll so list updates automatically without pressing Refresh
	const { data, loading, error, refetch } = useQuery(GET_ATTENDANCE_RECORDS, {
		variables: {
			filter,
			pagination: {
				limit: recordsPerPage,
				offset: (currentPage - 1) * recordsPerPage,
			},
		},
		errorPolicy: 'all',
		fetchPolicy: 'cache-and-network',
		pollInterval: pollIntervalMs, // 5s when visible, 0 when tab hidden
	});

	// State to hold records with real-time updates
	const [records, setRecords] = useState<AttendanceRecord[]>([]);
	const [totalCount, setTotalCount] = useState(0);

	// Update records when query data arrives. With date filter: use query result only. Without: merge so subscription updates aren't lost.
	useEffect(() => {
		if (!data?.getAttendanceRecords) return;
		const fromQuery = data.getAttendanceRecords.records;
		const queryTotal = data.getAttendanceRecords.totalCount;
		if (dateFilter) {
			// Date filter is active: show only what the API returned for that date (no merge)
			setRecords(fromQuery);
		} else {
			setRecords((prev) => {
				const byKey = new Set(fromQuery.map((r) => `${r.id}-${r.authDateTime}`));
				const fromSubscription = prev.filter((r) => !byKey.has(`${r.id}-${r.authDateTime}`));
				const merged = [...fromQuery, ...fromSubscription].sort(
					(a, b) => new Date(b.authDateTime).getTime() - new Date(a.authDateTime).getTime()
				);
				return merged;
			});
		}
		setTotalCount(queryTotal);
	}, [data, dateFilter]);

	// Real-time subscription for new records
	const { error: subscriptionError, loading: subscriptionLoading } = useSubscription(
		ATTENDANCE_RECORD_ADDED,
		{
			skip: false, // Always subscribe, don't wait for initial data
			onData: ({ data: subData, error: subError }: { data?: unknown; error?: Error }) => {
				if (subError) {
					setSubscriptionConnected(false);
					return;
				}
				setSubscriptionConnected(true);
				const raw = (subData as { data?: { attendanceRecordAdded?: AttendanceRecord }; attendanceRecordAdded?: AttendanceRecord })?.data?.attendanceRecordAdded ?? (subData as { attendanceRecordAdded?: AttendanceRecord })?.attendanceRecordAdded;
				const newRecord = raw as AttendanceRecord | undefined;
				if (newRecord) {
					setLastUpdateTime(new Date());
					setRecords((prevRecords) => {
						const exists = prevRecords.some(
							(r) => r.id === newRecord.id && r.authDateTime === newRecord.authDateTime
						);
						if (exists) return prevRecords;
						setTotalCount((prev) => prev + 1);
						return [newRecord, ...prevRecords];
					});
				}
			},
			onError: () => {
				setSubscriptionConnected(false);
			},
			onComplete: () => {
				setSubscriptionConnected(false);
			},
		}
	);

	// Also subscribe to batch updates
	const { error: batchError } = useSubscription(ATTENDANCE_UPDATED, {
		skip: false, // Always subscribe
		onData: ({ data: subData, error: subError }: { data?: { data?: { attendanceUpdated?: AttendanceRecord[] } }; error?: Error }) => {
			if (subError) {
				setSubscriptionConnected(false);
				return;
			}
			setSubscriptionConnected(true);
			const batchData = subData?.data?.attendanceUpdated;
			if (batchData && batchData.length > 0) {
				const newRecords = batchData;
				setLastUpdateTime(new Date());
				setRecords((prevRecords) => {
					const existingIds = new Set(
						prevRecords.map((r) => `${r.id}-${r.authDateTime}`)
					);
					const uniqueNewRecords = newRecords.filter(
						(r: AttendanceRecord) => !existingIds.has(`${r.id}-${r.authDateTime}`)
					);
					if (uniqueNewRecords.length > 0) {
						setTotalCount((prev) => prev + uniqueNewRecords.length);
						return [...uniqueNewRecords, ...prevRecords];
					}
					return prevRecords;
				});
			}
		},
		onError: () => {
			setSubscriptionConnected(false);
		},
	});

	// Update subscription status based on actual connection state
	useEffect(() => {
		// Check if subscription is actually connected (not loading and no errors)
		const isConnected = !subscriptionLoading && !subscriptionError && !batchError;
		if (isConnected !== subscriptionConnected) {
			setSubscriptionConnected(isConnected);
		}
	}, [subscriptionLoading, subscriptionError, batchError, subscriptionConnected]);

	// Display records exactly as fetched from the database (no client-side direction manipulation)
	const sortedRecords = useMemo(() => {
		return [...records].sort((a, b) => {
			const dateA = new Date(a.authDateTime).getTime();
			const dateB = new Date(b.authDateTime).getTime();
			return dateB - dateA;
		});
	}, [records]);

	// Filter records by search term only; date filtering is done by the API (authDateTime)
	const filteredRecords = useMemo(() => {
		let filtered = sortedRecords;

		// Apply search filter
		if (searchTerm) {
			filtered = filtered.filter((record) =>
				record.personName?.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		return filtered;
	}, [sortedRecords, searchTerm]);

	const coachAttendanceIds = useMemo(() => {
		const s = new Set<string>();
		const list = coachesUsersData?.getUsers;
		if (!list) return s;
		for (const u of list) {
			if (u?.attendanceId != null && String(u.attendanceId).trim() !== '') {
				s.add(String(u.attendanceId).trim());
			}
		}
		return s;
	}, [coachesUsersData]);

	const memberAttendanceIds = useMemo(() => {
		const s = new Set<string>();
		const list = membersUsersData?.getUsers;
		if (!list) return s;
		for (const u of list) {
			if (u?.attendanceId != null && String(u.attendanceId).trim() !== '') {
				s.add(String(u.attendanceId).trim());
			}
		}
		return s;
	}, [membersUsersData]);

	const coachNameCandidates = useMemo(() => {
		const s = new Set<string>();
		const list = coachesUsersData?.getUsers;
		if (!list) return s;
		for (const u of list) {
			for (const name of buildUserNameCandidates(u)) s.add(name);
		}
		return s;
	}, [coachesUsersData]);

	const memberNameCandidates = useMemo(() => {
		const s = new Set<string>();
		const list = membersUsersData?.getUsers;
		if (!list) return s;
		for (const u of list) {
			for (const name of buildUserNameCandidates(u)) s.add(name);
		}
		return s;
	}, [membersUsersData]);

	const summarizedRecords = useMemo(() => {
		type AttendanceEvent = {
			authDateTime: string;
			direction: string;
		};
		type Group = {
			personName: string;
			cardNo: string;
			events: AttendanceEvent[];
			latestAuthMs: number;
		};
		type SummaryRow = {
			key: string;
			personName: string;
			cardNo: string;
			date: string;
			timeIn: string;
			timeOut: string;
			logType: string;
			latestAuthMs: number;
		};

		const groups = new Map<string, Group>();
		for (const record of filteredRecords) {
			const personName = record.personName || 'Unknown';
			const cardNo =
				record.cardNo != null && String(record.cardNo).trim() !== ''
					? String(record.cardNo).trim()
					: '';
			const groupKey = `${personName}__${cardNo || 'no-card'}`;
			const existing = groups.get(groupKey) ?? {
				personName,
				cardNo,
				events: [],
				latestAuthMs: 0,
			};
			existing.events.push({
				authDateTime: record.authDateTime,
				direction: record.direction || '',
			});
			const authMs = new Date(record.authDateTime).getTime();
			if (authMs > existing.latestAuthMs) existing.latestAuthMs = authMs;
			groups.set(groupKey, existing);
		}

		const rows: SummaryRow[] = Array.from(groups.entries()).map(([groupKey, group]) => {
			const latestDateKey = new Date(group.latestAuthMs).toLocaleDateString('en-CA', {
				timeZone: 'Asia/Manila',
			});
			const latestDateEvents = group.events
				.filter(
					(event) =>
						new Date(event.authDateTime).toLocaleDateString('en-CA', {
							timeZone: 'Asia/Manila',
						}) === latestDateKey
				)
				.sort(
					(a, b) =>
						new Date(a.authDateTime).getTime() - new Date(b.authDateTime).getTime()
				);
			const inTimes = latestDateEvents
				.filter((event) => event.direction === 'IN')
				.map((event) => formatManilaTime(event.authDateTime));
			const outTimes = latestDateEvents
				.filter((event) => event.direction === 'OUT')
				.map((event) => formatManilaTime(event.authDateTime));

			const timeIn = inTimes.length > 0 ? inTimes[0] : '—';
			const timeOut = outTimes.length > 0 ? outTimes[outTimes.length - 1] : '—';
			const hasIn = timeIn !== '—';
			const hasOut = timeOut !== '—';
			const logType = hasIn && hasOut ? 'Time In / Time Out' : hasIn ? 'Time In only' : hasOut ? 'Time Out only' : '—';
			return {
				key: groupKey,
				personName: group.personName,
				cardNo: group.cardNo,
				date: formatManilaDate(new Date(group.latestAuthMs).toISOString()),
				timeIn,
				timeOut,
				logType,
				latestAuthMs: group.latestAuthMs,
			};
		});

		rows.sort((a, b) => {
			if (b.latestAuthMs !== a.latestAuthMs) return b.latestAuthMs - a.latestAuthMs;
			return a.personName.localeCompare(b.personName);
		});
		return rows;
	}, [filteredRecords]);

	const { coachRecords, clientRecords } = useMemo(() => {
		const categorize = (row: { cardNo: string; personName: string }): 'coach' | 'client' | 'other' => {
			const normalizedName = normalizePersonName(row.personName);
			// Priority: coach match first so coach scans never fall into clients.
			if (row.cardNo && coachAttendanceIds.has(row.cardNo)) return 'coach';
			if (normalizedName && coachNameCandidates.has(normalizedName)) return 'coach';
			if (row.cardNo && memberAttendanceIds.has(row.cardNo)) return 'client';
			if (normalizedName && memberNameCandidates.has(normalizedName)) return 'client';
			return 'other';
		};
		const coach = [];
		const client = [];
		for (const row of summarizedRecords) {
			if (categorize(row) === 'coach') coach.push(row);
			else client.push(row);
		}
		return { coachRecords: coach, clientRecords: client };
	}, [summarizedRecords, coachAttendanceIds, memberAttendanceIds, coachNameCandidates, memberNameCandidates]);
	const showCoachSection = roleFilter !== 'client';
	const showClientSection = roleFilter !== 'coach';

	// Today's records count: always current day from API, not affected by list date filter
	const todaysRecordsCount = dataToday?.getAttendanceRecords?.totalCount ?? 0;

	const totalPages = Math.ceil(totalCount / recordsPerPage);

	const handleExportPdf = async () => {
		const now = new Date();
		const doc = new jsPDF({ orientation: 'landscape' });
		const fileDate = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
		const filename = `attendance-logs-${fileDate}.pdf`;
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

		const inCount = filteredRecords.filter((r) => r.direction === 'IN').length;
		const outCount = filteredRecords.filter((r) => r.direction === 'OUT').length;

		type ExportRow = {
			member: string;
			date: string;
			timeIn: string;
			timeOut: string;
			logType: string;
		};

		const exportSourceRows =
			roleFilter === 'coach'
				? coachRecords
				: roleFilter === 'client'
					? clientRecords
					: summarizedRecords;
		const exportRows: ExportRow[] = exportSourceRows.map((row) => ({
			member: row.personName,
			date: row.date,
			timeIn: row.timeIn === '—' ? '-' : row.timeIn,
			timeOut: row.timeOut === '—' ? '-' : row.timeOut,
			logType: row.logType,
		}));
		const exportedByLabel = [currentUser?.firstName, currentUser?.lastName]
			.filter(Boolean)
			.join(' ')
			.trim() || currentUser?.email || 'System';

		doc.setFontSize(16);
		doc.setFont(interReady ? 'Inter' : 'helvetica', 'bold');
		doc.text('X-TRIM FIT GYM', headerTextX, 18);
		doc.setFontSize(13);
		doc.text('Attendance Logs Report', headerTextX, 26);
		doc.setFontSize(10);
		doc.setFont(interReady ? 'Inter' : 'helvetica', 'normal');
		doc.text(
			`Generated: ${now.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Asia/Manila)`,
			14,
			34
		);
		doc.text(
			`Raw logs: ${filteredRecords.length} | Consolidated rows: ${exportRows.length} | Time In logs: ${inCount} | Time Out logs: ${outCount} | Role filter: ${roleFilter}`,
			14,
			40
		);
		doc.text(`Exported by: ${exportedByLabel}`, 14, 46);

		autoTable(doc, {
			startY: 52,
			head: [['Member', 'Date', 'Time In', 'Time Out', 'Log Type']],
			body: exportRows.map((r) => [
				r.member,
				r.date,
				r.timeIn,
				r.timeOut,
				r.logType,
			]),
			styles: { fontSize: 8 },
			headStyles: { fillColor: [249, 197, 19], textColor: [20, 20, 20] },
			alternateRowStyles: { fillColor: [245, 245, 248] },
			margin: { left: 14, right: 14 },
		});
		doc.save(filename);
		appendLocalExportLog(filename);
		try {
			await logReportDownload({
				variables: {
					input: {
						reportType: ReportType.Attendance,
						fileName: filename,
						filterSummary: `date=${dateFilter || 'all'}; role=${roleFilter}; search=${searchTerm || 'none'}`,
						dateRange: dateFilter
							? { startDate: `${dateFilter}T00:00:00.000Z`, endDate: `${dateFilter}T23:59:59.999Z` }
							: undefined,
					},
				},
			});
		} catch {
			// Non-blocking audit log failure; export is already completed
		}
	};

	if (loading && !data) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-yellow)] mx-auto mb-4"></div>
					<p className="text-[var(--text-secondary)]">Loading attendance records...</p>
				</div>
			</div>
		);
	}

	// With errorPolicy: 'all', GraphQL field errors still set `error` but `data` may be a non-empty object
	// (e.g. { getAttendanceRecords: null }). `error && !data` would miss that and show an empty page.
	if (error && !loading && !data?.getAttendanceRecords) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="text-red-500 mb-4">
						<svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
						Unable to Load Attendance Records
					</h2>
					<p className="text-[var(--text-secondary)] mb-4">{error.message}</p>
					<button
						onClick={() => refetch()}
						className="px-4 py-2 bg-[var(--primary-yellow)] text-black rounded-lg hover:opacity-90 transition-opacity"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
						<Fingerprint className="w-6 h-6" />
						Attendance Logs
					</h1>
					<p className="text-[var(--text-secondary)] mt-1">
						Real-time attendance monitoring
					</p>
				</div>

				<div className="grid grid-cols-2 gap-3 xl:w-[560px] xl:ml-auto xl:mr-3">
					<div className="bg-[var(--bg-secondary)] rounded-lg px-4 py-3">
						<p className="text-xs text-[var(--text-secondary)]">Total Records</p>
						<p className="text-2xl font-bold text-[var(--text-primary)] leading-tight">{totalCount}</p>
					</div>
					<div className="bg-[var(--bg-secondary)] rounded-lg px-4 py-3">
						<p className="text-xs text-[var(--text-secondary)]">Today's Records</p>
						<p className="text-2xl font-bold text-[var(--text-primary)] leading-tight">
							{todaysRecordsCount}
						</p>
					</div>
				</div>

				<button
					onClick={handleExportPdf}
					className="btn-export-pdf self-start"
				>
					<Download className="w-4 h-4" />
					Export PDF
				</button>
			</div>

			{/* Filters */}
			<div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-4">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{/* Search */}
					<div className="w-full flex items-center gap-2 px-4 py-[0.9rem] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[12px] text-[var(--text-primary)] text-sm transition-all duration-300 focus-within:border-[var(--primary-yellow)] focus-within:ring-2 focus-within:ring-[rgba(249,197,19,0.1)]">
						<Search className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
						<input
							type="text"
							placeholder="Search by name..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full bg-transparent border-0 p-0 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none"
						/>
					</div>

					{/* Role Filter */}
					<div className="w-full flex items-center gap-2 px-4 py-[0.9rem] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[12px] text-[var(--text-primary)] text-sm transition-all duration-300 focus-within:border-[var(--primary-yellow)] focus-within:ring-2 focus-within:ring-[rgba(249,197,19,0.1)]">
						<Filter className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
						<select
							value={roleFilter}
							onChange={(e) => setRoleFilter(e.target.value as 'all' | 'coach' | 'client')}
							aria-label="Filter attendance by role"
							className="w-full bg-transparent border-0 p-0 text-[var(--text-primary)] focus:outline-none"
						>
							<option value="all">All Roles</option>
							<option value="coach">Coaches</option>
							<option value="client">Clients</option>
						</select>
					</div>

					{/* Date Filter */}
					<div className="flex items-center gap-2">
						<DatePicker
							date={parseYmdToDate(dateFilter)}
							onDateChange={(date) => setDateFilter(date ? formatDateToYmd(date) : '')}
							placeholder="Select date"
							className="w-full"
						/>
						{dateFilter && (
							<button
								type="button"
								onClick={() => setDateFilter('')}
								className="px-3 py-2 text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-color)] rounded-lg hover:text-[var(--text-primary)] hover:border-[var(--primary-yellow)] transition-colors"
							>
								Clear
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Records: coaches vs clients (same filters; split by linked attendance ID) */}
			<div className="space-y-6">
				{showCoachSection && (
					<div className="bg-[var(--bg-secondary)] rounded-lg overflow-hidden">
					<div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center gap-2 bg-[var(--bg-primary)]">
						<UserCog className="w-5 h-5 text-[var(--primary-yellow)] shrink-0" aria-hidden />
						<h2 className="text-base font-semibold text-[var(--text-primary)]">Coaches</h2>
						<span className="text-sm text-[var(--text-secondary)]">
							({coachRecords.length} rows on this page)
						</span>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
										Person
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
										Date
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
										Time In
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
										Time Out
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
										Log Type
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--border-color)]">
								{summarizedRecords.length === 0 ? (
									<tr>
										<td colSpan={5} className="px-6 py-12 text-center">
											<p className="text-[var(--text-secondary)]">No attendance records found</p>
										</td>
									</tr>
								) : coachRecords.length === 0 ? (
									<tr>
										<td colSpan={5} className="px-6 py-8 text-center">
											<p className="text-[var(--text-secondary)]">No coach records on this page</p>
										</td>
									</tr>
								) : (
									coachRecords.map((record) => (
										<tr
											key={`coach-${record.key}`}
											className="hover:bg-[var(--bg-primary)] transition-colors"
										>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="flex items-center gap-2">
													<UserCog className="w-4 h-4 text-[var(--text-secondary)]" />
													<span className="text-sm font-medium text-[var(--text-primary)]">
														{record.personName}
													</span>
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="text-sm text-[var(--text-primary)]">
													{record.date}
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span className="text-sm text-[var(--text-primary)]">
													{record.timeIn}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span className="text-sm text-[var(--text-primary)]">
													{record.timeOut}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span className="text-sm text-[var(--text-secondary)]">
													{record.logType}
												</span>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
					</div>
				)}

				{showClientSection && (
					<div className="bg-[var(--bg-secondary)] rounded-lg overflow-hidden">
					<div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center gap-2 bg-[var(--bg-primary)]">
						<User className="w-5 h-5 text-[var(--primary-yellow)] shrink-0" aria-hidden />
						<h2 className="text-base font-semibold text-[var(--text-primary)]">Clients</h2>
						<span className="text-sm text-[var(--text-secondary)]">
							({clientRecords.length} rows on this page)
						</span>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
										Person
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
										Date
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
										Time In
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
										Time Out
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
										Log Type
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--border-color)]">
								{summarizedRecords.length === 0 ? (
									<tr>
										<td colSpan={5} className="px-6 py-12 text-center">
											<p className="text-[var(--text-secondary)]">No attendance records found</p>
										</td>
									</tr>
								) : clientRecords.length === 0 ? (
									<tr>
										<td colSpan={5} className="px-6 py-8 text-center">
											<p className="text-[var(--text-secondary)]">No client records on this page</p>
										</td>
									</tr>
								) : (
									clientRecords.map((record) => (
										<tr
											key={`client-${record.key}`}
											className="hover:bg-[var(--bg-primary)] transition-colors"
										>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="flex items-center gap-2">
													<User className="w-4 h-4 text-[var(--text-secondary)]" />
													<span className="text-sm font-medium text-[var(--text-primary)]">
														{record.personName}
													</span>
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="text-sm text-[var(--text-primary)]">
													{record.date}
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span className="text-sm text-[var(--text-primary)]">
													{record.timeIn}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span className="text-sm text-[var(--text-primary)]">
													{record.timeOut}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span className="text-sm text-[var(--text-secondary)]">
													{record.logType}
												</span>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
					</div>
				)}

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="bg-[var(--bg-secondary)] rounded-lg px-6 py-4 border border-[var(--border-color)] flex items-center justify-between">
						<div className="text-sm text-[var(--text-secondary)]">
							Showing {((currentPage - 1) * recordsPerPage) + 1} to{' '}
							{Math.min(currentPage * recordsPerPage, totalCount)} of {totalCount} records
						</div>
						<div className="flex gap-2">
							<button
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								disabled={currentPage === 1}
								className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Previous
							</button>
							<button
								onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
								disabled={currentPage === totalPages}
								className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Next
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
