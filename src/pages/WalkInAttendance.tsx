import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
	SEARCH_WALK_IN_CLIENTS,
	WALK_IN_ATTENDANCE_LOGS,
	WALK_IN_ACCOUNTS_OVERVIEW,
	WALK_IN_STATS,
	WALK_IN_LOGS_BY_CLIENT,
	CREATE_WALK_IN_CLIENT,
	UPDATE_WALK_IN_CLIENT,
	WALK_IN_TIME_IN,
	WALK_IN_PAYMENT_SETTINGS,
	UPDATE_WALK_IN_PAYMENT_SETTINGS,
} from '@/graphql/operations/index';
import { WalkInGender } from '@/graphql/generated/graphql';
import type { SearchWalkInClientsQuery } from '@/graphql/generated/graphql';
import { WalkInModalShell } from '@/components/modals/WalkInModalShell';

type WalkInClientRow = SearchWalkInClientsQuery['searchWalkInClients'][number];

type WalkInClientFields = {
	id: string;
	firstName: string;
	middleName?: string | null;
	lastName: string;
	phoneNumber?: string | null;
	email?: string | null;
	gender: WalkInGender;
	notes?: string | null;
};
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import {
	UserPlus,
	Search,
	Clock,
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	Loader2,
	CheckCircle2,
	History,
	X,
	Pencil,
	Users,
} from 'lucide-react';

const ACCOUNTS_PAGE_SIZE = 25;

const MANILA = 'Asia/Manila';

function manilaTodayYmd(): string {
	return new Date().toLocaleDateString('en-CA', { timeZone: MANILA });
}

function manilaYmdMinusOneDay(ymd: string): string {
	const [y, m, d] = ymd.split('-').map(Number);
	const anchor = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
	return subDays(anchor, 1).toLocaleDateString('en-CA', { timeZone: MANILA });
}

function manilaYmdPlusOneDay(ymd: string): string {
	const [y, m, d] = ymd.split('-').map(Number);
	const anchor = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
	return subDays(anchor, -1).toLocaleDateString('en-CA', { timeZone: MANILA });
}

function formatWalkInName(c: {
	firstName: string;
	middleName?: string | null;
	lastName: string;
}): string {
	return [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ');
}

function genderLabel(g: WalkInGender): string {
	switch (g) {
		case WalkInGender.Male:
			return 'Male';
		case WalkInGender.Female:
			return 'Female';
		case WalkInGender.NonBinary:
			return 'Non-binary';
		case WalkInGender.PreferNotToSay:
			return 'Prefer not to say';
		default:
			return g;
	}
}

function formatTimeManila(iso: string): string {
	try {
		return new Date(iso).toLocaleString('en-PH', {
			timeZone: MANILA,
			dateStyle: 'medium',
			timeStyle: 'short',
		});
	} catch {
		return iso;
	}
}

export function WalkInAttendancePage() {
	useEffect(() => {
		document.title = 'Walk-in Attendance - X-TRIM FIT GYM';
	}, []);

	const dispatch = useAppDispatch();
	const [logDate, setLogDate] = useState(() => manilaTodayYmd());
	const [todayYmd, setTodayYmd] = useState(manilaTodayYmd);
	useEffect(() => {
		const t = setInterval(() => {
			const n = manilaTodayYmd();
			setTodayYmd((p) => (p !== n ? n : p));
		}, 60_000);
		return () => clearInterval(t);
	}, []);

	const isToday = logDate === todayYmd;

	const [firstName, setFirstName] = useState('');
	const [middleName, setMiddleName] = useState('');
	const [lastName, setLastName] = useState('');
	const [phone, setPhone] = useState('');
	const [email, setEmail] = useState('');
	const [gender, setGender] = useState<WalkInGender>(WalkInGender.Male);
	const [notes, setNotes] = useState('');
	const [timeInNow, setTimeInNow] = useState(true);

	const [searchRaw, setSearchRaw] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	useEffect(() => {
		const t = setTimeout(() => setDebouncedSearch(searchRaw.trim()), 350);
		return () => clearTimeout(t);
	}, [searchRaw]);

	const [selectedReturningId, setSelectedReturningId] = useState<string | null>(null);

	const [historySearchRaw, setHistorySearchRaw] = useState('');
	const [historyDebounced, setHistoryDebounced] = useState('');
	useEffect(() => {
		const t = setTimeout(() => setHistoryDebounced(historySearchRaw.trim()), 350);
		return () => clearTimeout(t);
	}, [historySearchRaw]);

	const [historyClientId, setHistoryClientId] = useState<string | null>(null);
	const [historyClientPick, setHistoryClientPick] = useState<WalkInClientRow | null>(null);

	const [newModalOpen, setNewModalOpen] = useState(false);
	const [returningModalOpen, setReturningModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [editClientId, setEditClientId] = useState('');
	const [editFirstName, setEditFirstName] = useState('');
	const [editMiddleName, setEditMiddleName] = useState('');
	const [editLastName, setEditLastName] = useState('');
	const [editPhone, setEditPhone] = useState('');
	const [editEmail, setEditEmail] = useState('');
	const [editGender, setEditGender] = useState<WalkInGender>(WalkInGender.Male);
	const [editNotes, setEditNotes] = useState('');

	const [accountsPage, setAccountsPage] = useState(0);
	const [feeDraft, setFeeDraft] = useState('60');

	const { data: paymentSettingsData, refetch: refetchPaymentSettings } = useQuery(
		WALK_IN_PAYMENT_SETTINGS,
		{ fetchPolicy: 'cache-and-network' },
	);
	const [updateWalkInFee, { loading: savingFee }] = useMutation(UPDATE_WALK_IN_PAYMENT_SETTINGS, {
		onCompleted: () => {
			dispatch(addToast({ type: 'success', message: 'Default walk-in fee updated.' }));
			refetchPaymentSettings();
		},
		onError: (e) => dispatch(addToast({ type: 'error', message: e.message })),
	});

	useEffect(() => {
		const v = paymentSettingsData?.walkInPaymentSettings?.defaultPaymentPesos;
		if (v != null) setFeeDraft(String(v));
	}, [paymentSettingsData?.walkInPaymentSettings?.defaultPaymentPesos]);

	const {
		data: logsData,
		loading: logsLoading,
		refetch: refetchLogs,
	} = useQuery(WALK_IN_ATTENDANCE_LOGS, {
		variables: {
			filter: { date: logDate },
			pagination: { limit: 200, offset: 0 },
		},
		fetchPolicy: 'cache-and-network',
	});

	const accountsOffset = accountsPage * ACCOUNTS_PAGE_SIZE;
	const {
		data: accountsOverviewData,
		loading: accountsOverviewLoading,
		error: accountsOverviewError,
		refetch: refetchAccountsOverview,
	} = useQuery(WALK_IN_ACCOUNTS_OVERVIEW, {
		variables: {
			pagination: { limit: ACCOUNTS_PAGE_SIZE, offset: accountsOffset },
		},
		fetchPolicy: 'cache-and-network',
	});

	const useAccountsFallback = Boolean(accountsOverviewError);

	const {
		data: walkInStatsFallbackData,
		loading: walkInStatsFallbackLoading,
		refetch: refetchWalkInStats,
	} = useQuery(WALK_IN_STATS, {
		skip: !useAccountsFallback,
		fetchPolicy: 'cache-and-network',
	});

	const {
		data: walkInListFallbackData,
		loading: walkInListFallbackLoading,
		refetch: refetchWalkInListFallback,
	} = useQuery(SEARCH_WALK_IN_CLIENTS, {
		variables: {
			query: '',
			limit: ACCOUNTS_PAGE_SIZE,
			offset: accountsOffset,
		},
		skip: !useAccountsFallback,
		fetchPolicy: 'cache-and-network',
	});

	const accountsSectionLoading = useAccountsFallback
		? walkInStatsFallbackLoading || walkInListFallbackLoading
		: accountsOverviewLoading;

	const searchOk = debouncedSearch.length >= 2;
	const { data: searchData, loading: searchLoading } = useQuery(SEARCH_WALK_IN_CLIENTS, {
		variables: { query: debouncedSearch, limit: 25 },
		skip: !searchOk,
		fetchPolicy: 'network-only',
	});

	const historySearchOk = historyDebounced.length >= 2;
	const { data: historySearchData, loading: historySearchLoading } = useQuery(
		SEARCH_WALK_IN_CLIENTS,
		{
			variables: { query: historyDebounced, limit: 25 },
			skip: !historySearchOk,
			fetchPolicy: 'network-only',
		}
	);
	const historySearchResults = historySearchData?.searchWalkInClients ?? [];

	const {
		data: personHistoryData,
		loading: personHistoryLoading,
		refetch: refetchPersonHistory,
	} = useQuery(WALK_IN_LOGS_BY_CLIENT, {
		variables: { walkInClientId: historyClientId!, pagination: { limit: 500, offset: 0 } },
		skip: !historyClientId,
		fetchPolicy: 'cache-and-network',
	});

	const personHistoryLogs = personHistoryData?.walkInLogsByClient?.logs ?? [];
	const personHistoryTotal = personHistoryData?.walkInLogsByClient?.totalCount ?? 0;

	const searchResults = searchData?.searchWalkInClients ?? [];
	const selectedReturning = selectedReturningId
		? (searchResults.find((c) => c.id === selectedReturningId) ?? null)
		: null;

	const [createWalkIn, { loading: creating }] = useMutation(CREATE_WALK_IN_CLIENT, {
		onCompleted: (res) => {
			const msg = res.createWalkInClient.log
				? 'Walk-in registered and timed in.'
				: 'Walk-in profile saved (no time-in for today).';
			dispatch(addToast({ type: 'success', message: msg }));
			setFirstName('');
			setMiddleName('');
			setLastName('');
			setPhone('');
			setEmail('');
			setNotes('');
			setGender(WalkInGender.Male);
			setTimeInNow(true);
			setNewModalOpen(false);
			refetchLogs();
			void refetchAccountsOverview();
			void refetchWalkInStats();
			void refetchWalkInListFallback();
			const cid = res.createWalkInClient.client.id;
			if (historyClientId && cid === historyClientId && res.createWalkInClient.log) {
				void refetchPersonHistory();
			}
		},
		onError: (e) => dispatch(addToast({ type: 'error', message: e.message })),
	});

	const [walkInTimeIn, { loading: timingIn }] = useMutation(WALK_IN_TIME_IN, {
		onCompleted: (data) => {
			dispatch(addToast({ type: 'success', message: 'Time-in recorded.' }));
			const cid = data.walkInTimeIn.walkInClient.id;
			setSelectedReturningId(null);
			setSearchRaw('');
			setDebouncedSearch('');
			setReturningModalOpen(false);
			refetchLogs();
			void refetchAccountsOverview();
			void refetchWalkInStats();
			void refetchWalkInListFallback();
			if (historyClientId && cid === historyClientId) {
				void refetchPersonHistory();
			}
		},
		onError: (e) => dispatch(addToast({ type: 'error', message: e.message })),
	});

	const openEditWalkIn = useCallback((c: WalkInClientFields) => {
		setEditClientId(c.id);
		setEditFirstName(c.firstName);
		setEditMiddleName(c.middleName ?? '');
		setEditLastName(c.lastName);
		setEditPhone(c.phoneNumber ?? '');
		setEditEmail(c.email ?? '');
		setEditGender(c.gender);
		setEditNotes(c.notes ?? '');
		setEditModalOpen(true);
	}, []);

	const [updateWalkInClient, { loading: updatingWalkIn }] = useMutation(UPDATE_WALK_IN_CLIENT, {
		onCompleted: (res) => {
			dispatch(addToast({ type: 'success', message: 'Walk-in profile updated.' }));
			setEditModalOpen(false);
			refetchLogs();
			void refetchAccountsOverview();
			void refetchWalkInStats();
			void refetchWalkInListFallback();
			const u = res.updateWalkInClient;
			if (historyClientId === u.id) {
				setHistoryClientPick({
					id: u.id,
					firstName: u.firstName,
					middleName: u.middleName,
					lastName: u.lastName,
					phoneNumber: u.phoneNumber,
					email: u.email,
					gender: u.gender,
					notes: u.notes,
					createdAt: u.createdAt,
					updatedAt: u.updatedAt,
				});
				void refetchPersonHistory();
			}
		},
		onError: (e) => dispatch(addToast({ type: 'error', message: e.message })),
	});

	const handleSubmitEdit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			if (!editFirstName.trim() || !editLastName.trim()) {
				dispatch(addToast({ type: 'error', message: 'First and last name are required.' }));
				return;
			}
			updateWalkInClient({
				variables: {
					walkInClientId: editClientId,
					input: {
						firstName: editFirstName.trim(),
						middleName: editMiddleName.trim() || undefined,
						lastName: editLastName.trim(),
						phoneNumber: editPhone.trim() || undefined,
						email: editEmail.trim() || undefined,
						gender: editGender,
						notes: editNotes.trim() || undefined,
					},
				},
			});
		},
		[
			dispatch,
			editClientId,
			editFirstName,
			editLastName,
			editMiddleName,
			editPhone,
			editEmail,
			editGender,
			editNotes,
			updateWalkInClient,
		]
	);

	const handleSubmitNew = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			if (!firstName.trim() || !lastName.trim()) {
				dispatch(addToast({ type: 'error', message: 'First and last name are required.' }));
				return;
			}
			createWalkIn({
				variables: {
					input: {
						firstName: firstName.trim(),
						middleName: middleName.trim() || undefined,
						lastName: lastName.trim(),
						phoneNumber: phone.trim() || undefined,
						email: email.trim() || undefined,
						gender,
						notes: notes.trim() || undefined,
					},
					timeInNow,
				},
			});
		},
		[
			createWalkIn,
			firstName,
			lastName,
			middleName,
			phone,
			email,
			gender,
			notes,
			timeInNow,
			dispatch,
		]
	);

	const handleTimeInReturning = () => {
		if (!selectedReturningId) {
			dispatch(addToast({ type: 'error', message: 'Select a person from search results.' }));
			return;
		}
		walkInTimeIn({ variables: { walkInClientId: selectedReturningId } });
	};

	const logs = logsData?.walkInAttendanceLogs?.logs ?? [];
	const totalCount = logsData?.walkInAttendanceLogs?.totalCount ?? 0;

	const accountsOv = accountsOverviewData?.walkInAccountsOverview;
	const statsFb = walkInStatsFallbackData?.walkInStats;
	const totalWalkInAccounts = useAccountsFallback
		? (statsFb?.totalWalkInAccounts ?? 0)
		: (accountsOv?.totalWalkInAccounts ?? 0);
	const totalTimeInRecords = useAccountsFallback
		? (statsFb?.totalTimeInRecords ?? 0)
		: (accountsOv?.totalTimeInRecords ?? 0);
	const listFb = walkInListFallbackData?.searchWalkInClients ?? [];
	const accountRows = useAccountsFallback
		? listFb.map((c) => ({ client: c, timeInCount: null as number | null }))
		: (accountsOv?.rows ?? []).map((r) => ({ client: r.client, timeInCount: r.timeInCount }));
	const accountsRangeStart = totalWalkInAccounts === 0 ? 0 : accountsOffset + 1;
	const accountsRangeEnd = accountsOffset + accountRows.length;
	const hasPrevAccounts = accountsPage > 0;
	const hasNextAccounts = accountsOffset + accountRows.length < totalWalkInAccounts;

	return (
		<div className="p-6 md:p-10 max-w-[1400px] mx-auto space-y-8">
			<div>
				<h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
					<UserPlus className="w-8 h-8 text-[var(--primary-yellow)]" />
					Walk-in attendance
				</h1>
				<p className="text-[var(--text-secondary)] mt-2 max-w-3xl">
					Register first-time walk-ins, record time-in for returning guests, look up anyone&apos;s
					full visit history, and review daily logs. Times use{' '}
					<strong className="text-[var(--text-primary)]">Asia/Manila</strong>.
				</p>
			</div>

			<div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-end gap-4">
				<div className="flex-1 min-w-0">
					<h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
						Default time-in payment (₱)
					</h2>
					<p className="text-xs text-[var(--text-secondary)] mb-2">
						Applied to each new time-in. Change anytime; existing log amounts stay as recorded.
					</p>
					<input
						type="number"
						min={0}
						step={1}
						value={feeDraft}
						onChange={(e) => setFeeDraft(e.target.value)}
						className="w-full max-w-[200px] bg-[rgba(255,255,255,0.04)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm"
					/>
				</div>
				<Button
					type="button"
					className="btn-primary shrink-0"
					disabled={savingFee}
					onClick={() => {
						const n = Number(feeDraft);
						if (!Number.isFinite(n) || n < 0) {
							dispatch(addToast({ type: 'error', message: 'Enter a valid amount (≥ 0).' }));
							return;
						}
						updateWalkInFee({ variables: { paymentPesos: n } });
					}}
				>
					{savingFee ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
					Save default
				</Button>
			</div>

			{/* Date toolbar */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 md:p-5">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-sm text-[var(--text-secondary)] mr-2">View logs for</span>
					<Button
						type="button"
						variant={isToday ? 'default' : 'outline'}
						className={isToday ? 'btn-primary' : 'btn-secondary'}
						onClick={() => setLogDate(todayYmd)}
					>
						<Clock className="w-4 h-4" />
						Today
					</Button>
					<Button
						type="button"
						variant="outline"
						className="btn-secondary"
						onClick={() => setLogDate(manilaYmdMinusOneDay(todayYmd))}
					>
						Yesterday
					</Button>
					<div className="flex items-center gap-2 ml-1">
						<button
							type="button"
							aria-label="Previous day"
							className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--primary-yellow)] hover:bg-[rgba(255,255,255,0.05)]"
							onClick={() => setLogDate((d) => manilaYmdMinusOneDay(d))}
						>
							<ChevronLeft className="w-5 h-5" />
						</button>
						<label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
							<CalendarDays className="w-4 h-4" />
							<input
								type="date"
								value={logDate}
								onChange={(e) => e.target.value && setLogDate(e.target.value)}
								className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm"
							/>
						</label>
						<button
							type="button"
							aria-label="Next day"
							className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--primary-yellow)] hover:bg-[rgba(255,255,255,0.05)]"
							onClick={() => setLogDate((d) => manilaYmdPlusOneDay(d))}
						>
							<ChevronRight className="w-5 h-5" />
						</button>
					</div>
				</div>
				<div className="flex flex-wrap items-center justify-end gap-2 text-sm">
					<span className="text-[var(--text-secondary)]">Entries</span>
					<span className="px-3 py-1 rounded-lg bg-[rgba(249,197,19,0.12)] text-[var(--primary-yellow)] font-semibold border border-[rgba(249,197,19,0.25)]">
						{logsLoading ? '…' : totalCount}
					</span>
					<Button type="button" className="btn-primary gap-2" onClick={() => setNewModalOpen(true)}>
						<UserPlus className="w-4 h-4" />
						New walk-in
					</Button>
					<Button
						type="button"
						variant="outline"
						className="btn-secondary gap-2"
						onClick={() => setReturningModalOpen(true)}
					>
						<Search className="w-4 h-4" />
						Returning walk-in
					</Button>
				</div>
			</div>

			{/* Logs table */}
			<div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden">
				<div className="px-6 py-4 border-b border-[var(--card-border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
					<h2 className="text-lg font-semibold text-[var(--text-primary)]">
						Logs for {logDate}
						{isToday && (
							<span className="ml-2 text-xs font-normal text-[var(--primary-yellow)]">(today)</span>
						)}
					</h2>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-[var(--text-secondary)] border-b border-[var(--card-border)] bg-[rgba(255,255,255,0.02)]">
								<th className="px-4 py-3 font-medium">Time in</th>
								<th className="px-4 py-3 font-medium">Payment</th>
								<th className="px-4 py-3 font-medium">Name</th>
								<th className="px-4 py-3 font-medium">Gender</th>
								<th className="px-4 py-3 font-medium">Contact</th>
								<th className="px-4 py-3 font-medium">Email</th>
								<th className="px-4 py-3 font-medium">Notes</th>
								<th className="px-4 py-3 font-medium w-[1%] whitespace-nowrap"> </th>
							</tr>
						</thead>
						<tbody>
							{logsLoading ? (
								<tr>
									<td colSpan={8} className="px-4 py-12 text-center text-[var(--text-secondary)]">
										<Loader2 className="w-8 h-8 animate-spin mx-auto" />
									</td>
								</tr>
							) : logs.length === 0 ? (
								<tr>
									<td colSpan={8} className="px-4 py-10 text-center text-[var(--text-secondary)]">
										No time-ins for this date.
									</td>
								</tr>
							) : (
								logs.map((row) => (
									<tr
										key={row.id}
										className="border-b border-[var(--card-border)] hover:bg-[rgba(255,255,255,0.03)]"
									>
										<td className="px-4 py-3 text-[var(--text-primary)] whitespace-nowrap">
											{formatTimeManila(row.timedInAt)}
										</td>
										<td className="px-4 py-3 text-[var(--text-primary)] whitespace-nowrap tabular-nums">
											₱{Number(row.payment ?? 0).toLocaleString()}
										</td>
										<td className="px-4 py-3 font-medium text-[var(--text-primary)]">
											{formatWalkInName(row.walkInClient)}
										</td>
										<td className="px-4 py-3 text-[var(--text-secondary)]">
											{genderLabel(row.walkInClient.gender)}
										</td>
										<td className="px-4 py-3 text-[var(--text-secondary)]">
											{row.walkInClient.phoneNumber ?? '—'}
										</td>
										<td className="px-4 py-3 text-[var(--text-secondary)] max-w-[180px] truncate">
											{row.walkInClient.email ?? '—'}
										</td>
										<td className="px-4 py-3 text-[var(--text-secondary)] max-w-[220px]">
											{row.walkInClient.notes ?? '—'}
										</td>
										<td className="px-4 py-3 text-right">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="gap-1 text-[var(--primary-yellow)] hover:text-[var(--text-primary)]"
												onClick={() => openEditWalkIn(row.walkInClient)}
											>
												<Pencil className="w-4 h-4" />
												Edit
											</Button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Person full history */}
			<div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 md:p-8">
				<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
					<div>
						<h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
							<History className="w-5 h-5 text-[var(--primary-yellow)]" />
							Search a walk-in & view all their time-ins
						</h2>
						<p className="text-sm text-[var(--text-secondary)] mt-1">
							Find someone by name, phone, or email, select them, then see every visit on record
							(newest first).
						</p>
					</div>
					{historyClientId && (
						<div className="flex flex-wrap gap-2 items-center shrink-0">
							{historyClientPick && (
								<Button
									type="button"
									variant="outline"
									className="btn-secondary gap-2"
									onClick={() => openEditWalkIn(historyClientPick)}
								>
									<Pencil className="w-4 h-4" />
									Edit profile
								</Button>
							)}
							<button
								type="button"
								onClick={() => {
									setHistoryClientId(null);
									setHistoryClientPick(null);
									setHistorySearchRaw('');
								}}
								className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--primary-yellow)]"
							>
								<X className="w-4 h-4" />
								Clear selection
							</button>
						</div>
					)}
				</div>

				<div className="relative mb-4 max-w-xl">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
					<input
						value={historySearchRaw}
						onChange={(e) => setHistorySearchRaw(e.target.value)}
						placeholder="Search to pick a person…"
						className="w-full pl-11 pr-4 py-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--card-border)] text-[var(--text-primary)] text-sm"
					/>
				</div>

				{historySearchOk && (
					<div className="mb-6 max-w-xl rounded-xl border border-[var(--card-border)] bg-[rgba(0,0,0,0.2)] max-h-[200px] overflow-y-auto">
						{historySearchLoading ? (
							<div className="flex justify-center p-6">
								<Loader2 className="w-6 h-6 animate-spin text-[var(--text-secondary)]" />
							</div>
						) : historySearchResults.length === 0 ? (
							<p className="p-4 text-sm text-[var(--text-secondary)]">No matches.</p>
						) : (
							<ul className="divide-y divide-[var(--card-border)]">
								{historySearchResults.map((c) => (
									<li key={c.id}>
										<button
											type="button"
											onClick={() => {
												setHistoryClientId(c.id);
												setHistoryClientPick(c);
											}}
											className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-[rgba(255,255,255,0.05)] ${
												historyClientId === c.id ? 'bg-[rgba(249,197,19,0.1)]' : ''
											}`}
										>
											<span className="font-medium text-[var(--text-primary)]">
												{formatWalkInName(c)}
											</span>
											<span className="block text-xs text-[var(--text-secondary)] mt-0.5">
												{genderLabel(c.gender)}
												{c.phoneNumber ? ` · ${c.phoneNumber}` : ''}
												{c.email ? ` · ${c.email}` : ''}
											</span>
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				)}

				{historyClientId && historyClientPick && (
					<div>
						<div className="mb-4 flex flex-wrap items-baseline gap-2">
							<span className="text-sm text-[var(--text-secondary)]">Showing history for</span>
							<span className="text-lg font-semibold text-[var(--text-primary)]">
								{formatWalkInName(historyClientPick)}
							</span>
							<span className="text-sm text-[var(--text-secondary)]">
								· {personHistoryTotal} visit{personHistoryTotal === 1 ? '' : 's'}
							</span>
						</div>
						<div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-left text-[var(--text-secondary)] border-b border-[var(--card-border)] bg-[rgba(255,255,255,0.02)]">
										<th className="px-4 py-3 font-medium">Date (Manila)</th>
										<th className="px-4 py-3 font-medium">Time in</th>
										<th className="px-4 py-3 font-medium">Payment</th>
										<th className="px-4 py-3 font-medium">Contact</th>
										<th className="px-4 py-3 font-medium">Email</th>
										<th className="px-4 py-3 font-medium">Profile notes</th>
									</tr>
								</thead>
								<tbody>
									{personHistoryLoading ? (
										<tr>
											<td colSpan={6} className="px-4 py-12 text-center">
												<Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--text-secondary)]" />
											</td>
										</tr>
									) : personHistoryLogs.length === 0 ? (
										<tr>
											<td
												colSpan={6}
												className="px-4 py-8 text-center text-[var(--text-secondary)]"
											>
												No time-in visits recorded yet for this person.
											</td>
										</tr>
									) : (
										personHistoryLogs.map((row) => (
											<tr
												key={row.id}
												className="border-b border-[var(--card-border)] hover:bg-[rgba(255,255,255,0.03)]"
											>
												<td className="px-4 py-3 text-[var(--text-primary)] whitespace-nowrap">
													{row.localDate}
												</td>
												<td className="px-4 py-3 text-[var(--text-primary)] whitespace-nowrap">
													{formatTimeManila(row.timedInAt)}
												</td>
												<td className="px-4 py-3 text-[var(--text-primary)] whitespace-nowrap tabular-nums">
													₱{Number(row.payment ?? 0).toLocaleString()}
												</td>
												<td className="px-4 py-3 text-[var(--text-secondary)]">
													{row.walkInClient.phoneNumber ?? '—'}
												</td>
												<td className="px-4 py-3 text-[var(--text-secondary)] max-w-[160px] truncate">
													{row.walkInClient.email ?? '—'}
												</td>
												<td className="px-4 py-3 text-[var(--text-secondary)] max-w-[240px]">
													{row.walkInClient.notes ?? '—'}
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{!historyClientId && (
					<p className="text-sm text-[var(--text-secondary)]">
						Select a person from the search results above to load their full visit history.
					</p>
				)}
			</div>

			{/* All walk-in accounts */}
			<div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 md:p-8">
				<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
					<div>
						<h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
							<Users className="w-5 h-5 text-[var(--primary-yellow)]" />
							All walk-in accounts
						</h2>
						<p className="text-sm text-[var(--text-secondary)] mt-1">
							Every saved walk-in profile and how many time-ins are on record (system-wide).
						</p>
						{useAccountsFallback && (
							<p className="text-xs text-[var(--text-secondary)] mt-2">
								Showing list via search fallback. Deploy the latest API for per-row time-in counts from
								the overview query.
							</p>
						)}
					</div>
					<div className="flex flex-wrap gap-3">
						<div className="flex items-center gap-2 text-sm">
							<span className="text-[var(--text-secondary)]">Profiles</span>
							<span className="px-3 py-1 rounded-lg bg-[rgba(249,197,19,0.12)] text-[var(--primary-yellow)] font-semibold border border-[rgba(249,197,19,0.25)]">
								{accountsSectionLoading ? '…' : totalWalkInAccounts}
							</span>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<span className="text-[var(--text-secondary)]">Total time-ins</span>
							<span className="px-3 py-1 rounded-lg bg-[rgba(249,197,19,0.12)] text-[var(--primary-yellow)] font-semibold border border-[rgba(249,197,19,0.25)]">
								{accountsSectionLoading ? '…' : totalTimeInRecords}
							</span>
						</div>
					</div>
				</div>

				{accountsOverviewError && (
					<div className="mb-4 rounded-xl border border-[rgba(249,197,19,0.35)] bg-[rgba(249,197,19,0.08)] px-4 py-3 text-sm text-[var(--text-secondary)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<span>
							Overview query failed ({accountsOverviewError.message}). Using list + stats fallback if
							available.
						</span>
						<Button
							type="button"
							variant="outline"
							className="btn-secondary shrink-0"
							onClick={() => void refetchAccountsOverview()}
						>
							Retry overview
						</Button>
					</div>
				)}

				<div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-[var(--text-secondary)] border-b border-[var(--card-border)] bg-[rgba(255,255,255,0.02)]">
								<th className="px-4 py-3 font-medium">Name</th>
								<th className="px-4 py-3 font-medium">Contact</th>
								<th className="px-4 py-3 font-medium">Email</th>
								<th className="px-4 py-3 font-medium">Gender</th>
								<th className="px-4 py-3 font-medium whitespace-nowrap">Time-ins</th>
								<th className="px-4 py-3 font-medium w-[1%] whitespace-nowrap"> </th>
							</tr>
						</thead>
						<tbody>
							{accountsSectionLoading ? (
								<tr>
									<td colSpan={6} className="px-4 py-12 text-center text-[var(--text-secondary)]">
										<Loader2 className="w-8 h-8 animate-spin mx-auto" />
									</td>
								</tr>
							) : accountRows.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-4 py-10 text-center text-[var(--text-secondary)]">
										No walk-in profiles yet.
									</td>
								</tr>
							) : (
								accountRows.map((row) => (
									<tr
										key={row.client.id}
										className="border-b border-[var(--card-border)] hover:bg-[rgba(255,255,255,0.03)]"
									>
										<td className="px-4 py-3 font-medium text-[var(--text-primary)]">
											{formatWalkInName(row.client)}
										</td>
										<td className="px-4 py-3 text-[var(--text-secondary)]">
											{row.client.phoneNumber ?? '—'}
										</td>
										<td className="px-4 py-3 text-[var(--text-secondary)] max-w-[180px] truncate">
											{row.client.email ?? '—'}
										</td>
										<td className="px-4 py-3 text-[var(--text-secondary)]">
											{genderLabel(row.client.gender)}
										</td>
										<td className="px-4 py-3 text-[var(--text-primary)] font-semibold tabular-nums">
											{row.timeInCount == null ? '—' : row.timeInCount}
										</td>
										<td className="px-4 py-3 text-right">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="gap-1 text-[var(--primary-yellow)] hover:text-[var(--text-primary)]"
												onClick={() => openEditWalkIn(row.client)}
											>
												<Pencil className="w-4 h-4" />
												Edit
											</Button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{totalWalkInAccounts > 0 && (
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 pt-4 border-t border-[var(--card-border)]">
						<p className="text-sm text-[var(--text-secondary)]">
							Showing{' '}
							<span className="text-[var(--text-primary)] font-medium">
								{accountsRangeStart}–{accountsRangeEnd}
							</span>{' '}
							of <span className="text-[var(--text-primary)] font-medium">{totalWalkInAccounts}</span>
						</p>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								className="btn-secondary gap-1"
								disabled={!hasPrevAccounts || accountsSectionLoading}
								onClick={() => setAccountsPage((p) => Math.max(0, p - 1))}
							>
								<ChevronLeft className="w-4 h-4" />
								Previous
							</Button>
							<Button
								type="button"
								variant="outline"
								className="btn-secondary gap-1"
								disabled={!hasNextAccounts || accountsSectionLoading}
								onClick={() => setAccountsPage((p) => p + 1)}
							>
								Next
								<ChevronRight className="w-4 h-4" />
							</Button>
						</div>
					</div>
				)}
			</div>

			<WalkInModalShell
				open={newModalOpen}
				onClose={() => setNewModalOpen(false)}
				title="New walk-in"
				subtitle="Add their details. You can save the profile only, or also record today's time-in."
			>
				<form onSubmit={handleSubmitNew} className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
								First name <span className="text-red-400">*</span>
							</label>
							<input
								required
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
								className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--card-border)] text-[var(--text-primary)] text-sm"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
								Middle name
							</label>
							<input
								value={middleName}
								onChange={(e) => setMiddleName(e.target.value)}
								className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--card-border)] text-[var(--text-primary)] text-sm"
							/>
						</div>
						<div className="sm:col-span-2">
							<label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
								Last name <span className="text-red-400">*</span>
							</label>
							<input
								required
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
								className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--card-border)] text-[var(--text-primary)] text-sm"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
								Contact number
							</label>
							<input
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--card-border)] text-[var(--text-primary)] text-sm"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
								Email
							</label>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--card-border)] text-[var(--text-primary)] text-sm"
							/>
						</div>
						<div className="sm:col-span-2">
							<label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
								Gender <span className="text-red-400">*</span>
							</label>
							<select
								value={gender}
								onChange={(e) => setGender(e.target.value as WalkInGender)}
								className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--card-border)] text-[var(--text-primary)] text-sm"
							>
								<option value={WalkInGender.Male}>Male</option>
								<option value={WalkInGender.Female}>Female</option>
								<option value={WalkInGender.NonBinary}>Non-binary</option>
								<option value={WalkInGender.PreferNotToSay}>Prefer not to say</option>
							</select>
						</div>
						<div className="sm:col-span-2">
							<label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
								Notes
							</label>
							<textarea
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								rows={2}
								placeholder="Optional — e.g. purpose of visit, referral"
								className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--card-border)] text-[var(--text-primary)] text-sm resize-none"
							/>
						</div>
					</div>

					<label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl bg-[rgba(249,197,19,0.06)] border border-[rgba(249,197,19,0.15)]">
						<input
							type="checkbox"
							checked={timeInNow}
							onChange={(e) => setTimeInNow(e.target.checked)}
							className="mt-1 w-4 h-4 rounded border-[var(--card-border)]"
						/>
						<div>
							<span className="font-medium text-[var(--text-primary)]">
								Record time-in for today
							</span>
							<p className="text-xs text-[var(--text-secondary)] mt-1">
								{timeInNow
									? 'Saves the profile and logs their entry for the selected calendar day (Manila).'
									: 'Saves only the walk-in profile — no attendance entry for today.'}
							</p>
						</div>
					</label>

					<Button type="submit" className="btn-primary w-full gap-2" disabled={creating}>
						{creating ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<CheckCircle2 className="w-4 h-4" />
						)}
						{timeInNow ? 'Save & time in' : 'Save profile only'}
					</Button>
				</form>
			</WalkInModalShell>

			<WalkInModalShell
				open={returningModalOpen}
				onClose={() => setReturningModalOpen(false)}
				title="Returning walk-in"
				subtitle="Search by name, email, or phone (min. 2 characters), then record time-in for today."
			>
				<div className="flex flex-col gap-4">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
						<input
							value={searchRaw}
							onChange={(e) => {
								setSearchRaw(e.target.value);
								setSelectedReturningId(null);
							}}
							placeholder="Search walk-in clients…"
							className="w-full pl-11 pr-4 py-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--card-border)] text-[var(--text-primary)] text-sm"
						/>
					</div>

					<div className="min-h-[200px] max-h-[280px] overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[rgba(0,0,0,0.2)]">
						{!searchOk ? (
							<p className="p-4 text-sm text-[var(--text-secondary)]">
								Type at least 2 characters to search.
							</p>
						) : searchLoading ? (
							<div className="flex items-center justify-center p-8 text-[var(--text-secondary)]">
								<Loader2 className="w-6 h-6 animate-spin" />
							</div>
						) : searchResults.length === 0 ? (
							<p className="p-4 text-sm text-[var(--text-secondary)]">No matches.</p>
						) : (
							<ul className="divide-y divide-[var(--card-border)]">
								{searchResults.map((c) => (
									<li key={c.id}>
										<button
											type="button"
											onClick={() => setSelectedReturningId(c.id)}
											className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-[rgba(255,255,255,0.05)] ${
												selectedReturningId === c.id ? 'bg-[rgba(249,197,19,0.1)]' : ''
											}`}
										>
											<span className="font-medium text-[var(--text-primary)]">
												{formatWalkInName(c)}
											</span>
											<span className="block text-xs text-[var(--text-secondary)] mt-0.5">
												{genderLabel(c.gender)}
												{c.phoneNumber ? ` · ${c.phoneNumber}` : ''}
												{c.email ? ` · ${c.email}` : ''}
											</span>
										</button>
									</li>
								))}
							</ul>
						)}
					</div>

					{selectedReturning && (
						<div className="p-4 rounded-xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.25)] text-sm">
							<span className="text-[var(--text-secondary)]">Selected:</span>{' '}
							<strong className="text-[var(--text-primary)]">
								{formatWalkInName(selectedReturning)}
							</strong>
						</div>
					)}

					<div className="space-y-2">
						<Button
							type="button"
							className="btn-primary w-full gap-2"
							disabled={!selectedReturningId || timingIn}
							onClick={handleTimeInReturning}
						>
							{timingIn ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<Clock className="w-4 h-4" />
							)}
							Time in now
						</Button>
						<Button
							type="button"
							variant="outline"
							className="btn-secondary w-full gap-2"
							disabled={!selectedReturning}
							onClick={() => {
								if (!selectedReturning) return;
								openEditWalkIn(selectedReturning);
								setReturningModalOpen(false);
							}}
						>
							<Pencil className="w-4 h-4" />
							Edit profile
						</Button>
						<Button
							type="button"
							variant="outline"
							className="btn-secondary w-full gap-2"
							disabled={!selectedReturning}
							onClick={() => {
								if (!selectedReturning) return;
								setHistoryClientId(selectedReturning.id);
								setHistoryClientPick(selectedReturning);
								setReturningModalOpen(false);
							}}
						>
							<History className="w-4 h-4" />
							View all their logs
						</Button>
					</div>
				</div>
			</WalkInModalShell>

			<WalkInModalShell
				open={editModalOpen}
				onClose={() => setEditModalOpen(false)}
				title="Edit walk-in profile"
				subtitle="Update name, contact, gender, and notes. Past attendance rows stay linked to this profile."
			>
				<form onSubmit={handleSubmitEdit} className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
								First name <span className="text-red-400">*</span>
							</label>
							<input
								required
								value={editFirstName}
								onChange={(e) => setEditFirstName(e.target.value)}
								className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--card-border)] text-[var(--text-primary)] text-sm"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
								Middle name
							</label>
							<input
								value={editMiddleName}
								onChange={(e) => setEditMiddleName(e.target.value)}
								className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--card-border)] text-[var(--text-primary)] text-sm"
							/>
						</div>
						<div className="sm:col-span-2">
							<label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
								Last name <span className="text-red-400">*</span>
							</label>
							<input
								required
								value={editLastName}
								onChange={(e) => setEditLastName(e.target.value)}
								className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--card-border)] text-[var(--text-primary)] text-sm"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
								Contact number
							</label>
							<input
								value={editPhone}
								onChange={(e) => setEditPhone(e.target.value)}
								className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--card-border)] text-[var(--text-primary)] text-sm"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
								Email
							</label>
							<input
								type="email"
								value={editEmail}
								onChange={(e) => setEditEmail(e.target.value)}
								className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--card-border)] text-[var(--text-primary)] text-sm"
							/>
						</div>
						<div className="sm:col-span-2">
							<label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
								Gender <span className="text-red-400">*</span>
							</label>
							<select
								value={editGender}
								onChange={(e) => setEditGender(e.target.value as WalkInGender)}
								className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--card-border)] text-[var(--text-primary)] text-sm"
							>
								<option value={WalkInGender.Male}>Male</option>
								<option value={WalkInGender.Female}>Female</option>
								<option value={WalkInGender.NonBinary}>Non-binary</option>
								<option value={WalkInGender.PreferNotToSay}>Prefer not to say</option>
							</select>
						</div>
						<div className="sm:col-span-2">
							<label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
								Notes
							</label>
							<textarea
								value={editNotes}
								onChange={(e) => setEditNotes(e.target.value)}
								rows={2}
								placeholder="Optional — e.g. purpose of visit, referral"
								className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--card-border)] text-[var(--text-primary)] text-sm resize-none"
							/>
						</div>
					</div>

					<Button type="submit" className="btn-primary w-full gap-2" disabled={updatingWalkIn}>
						{updatingWalkIn ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<CheckCircle2 className="w-4 h-4" />
						)}
						Save changes
					</Button>
				</form>
			</WalkInModalShell>
		</div>
	);
}
