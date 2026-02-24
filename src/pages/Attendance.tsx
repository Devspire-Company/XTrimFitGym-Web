import { useState, useMemo, useEffect } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import {
	Search,
	Filter,
	Calendar,
	Clock,
	User,
	LogIn,
	LogOut,
	RefreshCw,
	Fingerprint,
} from 'lucide-react';
import {
	GET_ATTENDANCE_RECORDS,
	ATTENDANCE_RECORD_ADDED,
	ATTENDANCE_UPDATED,
} from '@/graphql/operations/index';
import type { AttendanceRecord } from '@/graphql/generated/types';

export function AttendancePage() {
	useEffect(() => {
		document.title = 'Attendance Logs - X-TRIM FIT GYM';
	}, []);

	const [searchTerm, setSearchTerm] = useState('');
	const [directionFilter, setDirectionFilter] = useState<string>('all');
	const [dateFilter, setDateFilter] = useState<string>('');
	const [currentPage, setCurrentPage] = useState(1);
	const [subscriptionConnected, setSubscriptionConnected] = useState(false);
	const [, setLastUpdateTime] = useState<Date | null>(null);
	const recordsPerPage = 50;

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
	const [pollIntervalMs, setPollIntervalMs] = useState(5000);
	useEffect(() => {
		const handleVisibility = () => {
			setPollIntervalMs((prev) => (document.hidden ? 0 : 5000));
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
	const { data: subscriptionData, error: subscriptionError, loading: subscriptionLoading } = useSubscription(
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
	const { data: batchSubscriptionData, error: batchError } = useSubscription(ATTENDANCE_UPDATED, {
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

	// Format date for display (Philippine format)
	const formatDateTime = (dateTime: string) => {
		if (!dateTime) return 'N/A';
		const date = new Date(dateTime);
		// Format in Philippine timezone and locale
		return date.toLocaleString('en-PH', {
			timeZone: 'Asia/Manila',
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: true,
		});
	};

	// Format secondary date display (Philippine format)
	const formatAuthDate = (authDate: string) => {
		if (!authDate) return '';
		try {
			const date = new Date(authDate);
			// Check if date is valid
			if (isNaN(date.getTime())) return authDate;
			// Format in Philippine timezone and locale
			return date.toLocaleString('en-PH', {
				timeZone: 'Asia/Manila',
				weekday: 'short',
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				hour12: false,
				timeZoneName: 'short',
			});
		} catch {
			return authDate;
		}
	};

	// Display records exactly as fetched from the database (no client-side direction manipulation)
	const sortedRecords = useMemo(() => {
		return [...records].sort((a, b) => {
			const dateA = new Date(a.authDateTime).getTime();
			const dateB = new Date(b.authDateTime).getTime();
			return dateB - dateA;
		});
	}, [records]);

	// Filter records by search term and direction only; date filtering is done by the API (authDateTime)
	const filteredRecords = useMemo(() => {
		let filtered = sortedRecords;

		// Apply search filter
		if (searchTerm) {
			filtered = filtered.filter((record) =>
				record.personName?.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		// Apply direction filter
		if (directionFilter !== 'all') {
			filtered = filtered.filter((record) => record.direction === directionFilter);
		}

		return filtered;
	}, [sortedRecords, searchTerm, directionFilter]);

	// Today's records count: always current day from API, not affected by list date filter
	const todaysRecordsCount = dataToday?.getAttendanceRecords?.totalCount ?? 0;

	const totalPages = Math.ceil(totalCount / recordsPerPage);

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

	if (error && !data) {
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
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
						<Fingerprint className="w-6 h-6" />
						Attendance Logs
					</h1>
					<p className="text-[var(--text-secondary)] mt-1">
						Real-time attendance monitoring from iVMS-4200
					</p>
				</div>
				<button
					onClick={() => refetch()}
					disabled={loading}
					className="flex items-center gap-2 px-4 py-2 bg-[var(--primary-yellow)] text-black rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
				>
					<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
					Refresh
				</button>
			</div>

			{/* Filters */}
			<div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-4">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{/* Search */}
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)] w-5 h-5" />
						<input
							type="text"
							placeholder="Search by name..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-yellow)]"
						/>
					</div>

					{/* Direction Filter */}
					<div className="relative">
						<Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)] w-5 h-5" />
						<select
							value={directionFilter}
							onChange={(e) => setDirectionFilter(e.target.value)}
							className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-yellow)] appearance-none"
						>
							<option value="all">All Directions</option>
							<option value="IN">Entry (IN)</option>
							<option value="OUT">Exit (OUT)</option>
						</select>
					</div>

					{/* Date Filter */}
					<div className="relative">
						<Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)] w-5 h-5" />
						<input
							type="date"
							value={dateFilter}
							onChange={(e) => setDateFilter(e.target.value)}
							className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-yellow)]"
						/>
					</div>
				</div>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="bg-[var(--bg-secondary)] rounded-lg p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-[var(--text-secondary)]">Total Records</p>
							<p className="text-2xl font-bold text-[var(--text-primary)]">{totalCount}</p>
						</div>
						<Fingerprint className="w-8 h-8 text-[var(--primary-yellow)]" />
					</div>
				</div>
				<div className="bg-[var(--bg-secondary)] rounded-lg p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-[var(--text-secondary)]">Today's Records</p>
							<p className="text-2xl font-bold text-[var(--text-primary)]">
								{todaysRecordsCount}
							</p>
						</div>
						<Calendar className="w-8 h-8 text-[var(--primary-yellow)]" />
					</div>
				</div>
			</div>

			{/* Records Table */}
			<div className="bg-[var(--bg-secondary)] rounded-lg overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
									Person
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
									Date & Time
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
									Direction
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
									Device
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--border-color)]">
							{filteredRecords.length === 0 ? (
								<tr>
									<td colSpan={4} className="px-6 py-12 text-center">
										<p className="text-[var(--text-secondary)]">No attendance records found</p>
									</td>
								</tr>
							) : (
								filteredRecords.map((record, index) => (
									<tr
										key={`${record.id}-${record.authDateTime}-${index}`}
										className="hover:bg-[var(--bg-primary)] transition-colors"
									>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="flex items-center gap-2">
												<User className="w-4 h-4 text-[var(--text-secondary)]" />
												<span className="text-sm font-medium text-[var(--text-primary)]">
													{record.personName || 'Unknown'}
												</span>
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="flex items-center gap-2">
												<Clock className="w-4 h-4 text-[var(--text-secondary)]" />
												<div>
													<div className="text-sm text-[var(--text-primary)]">
														{formatDateTime(record.authDateTime)}
													</div>
													<div className="text-xs text-[var(--text-secondary)]">
														{formatAuthDate(record.authDate)}
													</div>
												</div>
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div
												className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
													record.direction === 'IN'
														? 'bg-green-100 text-green-800'
														: record.direction === 'OUT'
															? 'bg-red-100 text-red-800'
															: 'bg-gray-100 text-gray-700'
												}`}
											>
												{record.direction === 'IN' ? (
													<LogIn className="w-3 h-3" />
												) : record.direction === 'OUT' ? (
													<LogOut className="w-3 h-3" />
												) : null}
												{record.direction || '—'}
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="text-sm text-[var(--text-primary)]">
												{record.deviceName || 'N/A'}
											</div>
											<div className="text-xs text-[var(--text-secondary)]">
												{record.deviceSerNum || ''}
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="px-6 py-4 border-t border-[var(--border-color)] flex items-center justify-between">
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
