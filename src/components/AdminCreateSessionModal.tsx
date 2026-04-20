import { useMemo, useEffect, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	CREATE_SESSION,
	GET_GOALS_FOR_CLIENT,
	GET_USERS,
} from '@/graphql/operations/index';
import type { GetUsersQuery } from '@/graphql/generated/graphql';
import {
	GoalStatus,
	RoleType,
	SessionKind,
	TransactionStatus,
} from '@/graphql/generated/graphql';
const GYM_AREAS = [
	{ label: 'Main Training Area', value: 'Main Training Area' },
	{ label: 'Cardio Zone', value: 'Cardio Zone' },
	{ label: 'Free Weights Area', value: 'Free Weights Area' },
];

function sessionCalendarDateToIso(d: Date): string {
	const y = d.getFullYear();
	const m = d.getMonth();
	const day = d.getDate();
	return new Date(Date.UTC(y, m, day, 12, 0, 0, 0)).toISOString();
}

function formatTimeToString(time: Date): string {
	const hours = time.getHours();
	const minutes = time.getMinutes();
	const ampm = hours >= 12 ? 'PM' : 'AM';
	const displayHours = hours % 12 || 12;
	const displayMinutes = minutes.toString().padStart(2, '0');
	return `${displayHours}:${displayMinutes} ${ampm}`;
}

function parseTimeInputToDate(timeVal: string): Date | undefined {
	if (!timeVal || !timeVal.includes(':')) return undefined;
	const [h, m] = timeVal.split(':').map((x) => parseInt(x, 10));
	if (Number.isNaN(h) || Number.isNaN(m)) return undefined;
	return new Date(2000, 0, 1, h, m, 0, 0);
}

function memberHasActiveSubscription(
	u: NonNullable<NonNullable<GetUsersQuery['getUsers']>[number]>
): boolean {
	const cm = u.currentMembership;
	if (!cm) return false;
	if (cm.status !== TransactionStatus.Active) return false;
	const exp = new Date(cm.expiresAt);
	return Number.isFinite(exp.getTime()) && exp > new Date();
}

export type AdminCoachOption = { id: string; name: string };

type Props = {
	isOpen: boolean;
	onClose: () => void;
	coaches: AdminCoachOption[];
	onCreated?: () => void;
};

export function AdminCreateSessionModal({
	isOpen,
	onClose,
	coaches,
	onCreated,
}: Props) {
	const [coachId, setCoachId] = useState('');
	const [memberSearch, setMemberSearch] = useState('');
	const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
	const [sessionName, setSessionName] = useState('');
	const [date, setDate] = useState<Date | undefined>();
	const [startTimeStr, setStartTimeStr] = useState('09:00');
	const [endTimeStr, setEndTimeStr] = useState('');
	const [gymArea, setGymArea] = useState('');
	const [note, setNote] = useState('');
	const [isGroupClass, setIsGroupClass] = useState(false);
	const [maxParticipants, setMaxParticipants] = useState('20');
	const [goalId, setGoalId] = useState('');
	const [formError, setFormError] = useState('');

	const apollo = useApolloClient();

	const { data: membersData } = useQuery(GET_USERS, {
		variables: { role: RoleType.Member, includeDisabled: false },
		skip: !isOpen,
	});

	const [fetchedGoals, setFetchedGoals] = useState<
		Array<{ id: string; clientId: string; title: string }>
	>([]);

	const resetForm = () => {
		setCoachId('');
		setMemberSearch('');
		setSelectedMemberIds([]);
		setSessionName('');
		setDate(undefined);
		setStartTimeStr('09:00');
		setEndTimeStr('');
		setGymArea('');
		setNote('');
		setIsGroupClass(false);
		setMaxParticipants('20');
		setGoalId('');
		setFormError('');
	};

	const [createSession, { loading: submitting }] = useMutation(CREATE_SESSION, {
		onCompleted: () => {
			onCreated?.();
			resetForm();
			onClose();
		},
		onError: (e) => {
			setFormError(e.message || 'Failed to create session');
		},
	});

	const membersWithMembership = useMemo(() => {
		const list = membersData?.getUsers ?? [];
		return list.filter(
			(u): u is NonNullable<typeof u> =>
				u != null && memberHasActiveSubscription(u)
		);
	}, [membersData?.getUsers]);

	const filteredMembers = useMemo(() => {
		const q = memberSearch.trim().toLowerCase();
		if (!q) return membersWithMembership;
		return membersWithMembership.filter((u) => {
			const name = [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ').toLowerCase();
			return (
				name.includes(q) ||
				u.email.toLowerCase().includes(q) ||
				u.id.toLowerCase().includes(q)
			);
		});
	}, [memberSearch, membersWithMembership]);

	const selectedMemberIdsKey = useMemo(
		() => [...selectedMemberIds].sort().join(','),
		[selectedMemberIds]
	);

	useEffect(() => {
		if (!isOpen || isGroupClass || !selectedMemberIdsKey) {
			setFetchedGoals([]);
			return;
		}
		const ids = selectedMemberIdsKey.split(',').filter(Boolean);
		let cancelled = false;
		(async () => {
			try {
				const results = await Promise.all(
					ids.map((clientId) =>
						apollo.query({
							query: GET_GOALS_FOR_CLIENT,
							variables: { clientId, status: GoalStatus.Active },
							fetchPolicy: 'network-only',
						})
					)
				);
				if (cancelled) return;
				const merged: Array<{ id: string; clientId: string; title: string }> = [];
				const seen = new Set<string>();
				for (const r of results) {
					for (const g of r.data?.getGoals ?? []) {
						if (seen.has(g.id)) continue;
						seen.add(g.id);
						merged.push({
							id: g.id,
							clientId: g.clientId,
							title: g.title,
						});
					}
				}
				setFetchedGoals(merged);
			} catch {
				if (!cancelled) setFetchedGoals([]);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [apollo, isOpen, isGroupClass, selectedMemberIdsKey]);

	const goalOptions = useMemo(() => {
		const rows: { id: string; label: string; clientId: string }[] = [];
		for (const g of fetchedGoals) {
			if (!selectedMemberIds.includes(g.clientId)) continue;
			const m = membersWithMembership.find((u) => u.id === g.clientId);
			const memberLabel = m
				? [m.firstName, m.lastName].filter(Boolean).join(' ')
				: g.clientId;
			rows.push({
				id: g.id,
				clientId: g.clientId,
				label: `${g.title} — ${memberLabel}`,
			});
		}
		return rows;
	}, [fetchedGoals, selectedMemberIds, membersWithMembership]);

	useEffect(() => {
		if (!isOpen) return;
		setFormError('');
	}, [isOpen]);

	useEffect(() => {
		if (!goalId) return;
		const ok = goalOptions.some((g) => g.id === goalId);
		if (!ok) setGoalId('');
	}, [goalId, goalOptions]);

	const toggleMember = (id: string) => {
		setSelectedMemberIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setFormError('');
		if (!coachId) {
			setFormError('Select a coach.');
			return;
		}
		if (!sessionName.trim()) {
			setFormError('Workout name is required.');
			return;
		}
		if (!date) {
			setFormError('Date is required.');
			return;
		}
		const startD = parseTimeInputToDate(startTimeStr);
		if (!startD) {
			setFormError('Start time is required.');
			return;
		}
		const startTimeString = formatTimeToString(startD);
		let endTimeString: string | undefined;
		if (endTimeStr.trim()) {
			const endD = parseTimeInputToDate(endTimeStr);
			if (!endD) {
				setFormError('Invalid end time.');
				return;
			}
			endTimeString = formatTimeToString(endD);
		}
		if (!gymArea) {
			setFormError('Gym area is required.');
			return;
		}

		if (isGroupClass) {
			const mp = parseInt(maxParticipants, 10);
			if (!mp || mp < 1) {
				setFormError('Enter a valid max participants (at least 1).');
				return;
			}
			await createSession({
				variables: {
					input: {
						coachId,
						name: sessionName.trim(),
						date: sessionCalendarDateToIso(date),
						startTime: startTimeString,
						endTime: endTimeString,
						gymArea,
						note: note.trim() || undefined,
						sessionKind: SessionKind.GroupClass,
						maxParticipants: mp,
						invitedClientIds:
							selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
					},
				},
			});
			return;
		}

		if (selectedMemberIds.length === 0) {
			setFormError('Select at least one member with an active membership.');
			return;
		}
		if (!goalId) {
			setFormError('Select a goal for this session.');
			return;
		}

		await createSession({
			variables: {
				input: {
					coachId,
					clientsIds: selectedMemberIds,
					name: sessionName.trim(),
					date: sessionCalendarDateToIso(date),
					startTime: startTimeString,
					endTime: endTimeString,
					gymArea,
					note: note.trim() || undefined,
					goalId,
					sessionKind: SessionKind.Personal,
				},
			},
		});
	};

	const handleClose = () => {
		if (submitting) return;
		resetForm();
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div
			className="modal modal-large"
			onClick={(e) => e.stopPropagation()}
			style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}
		>
			<div className="modal-header" style={{ flexShrink: 0 }}>
				<h3>
					<CalendarIcon className="w-5 h-5" />
					Create session
				</h3>
				<button
					type="button"
					className="modal-close"
					onClick={handleClose}
					title="Close"
					aria-label="Close"
					disabled={submitting}
				>
					<X className="w-5 h-5" />
				</button>
			</div>
			<form
				onSubmit={handleSubmit}
				style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
			>
				<div className="modal-body" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
					{formError ? (
						<p className="text-sm text-red-500 mb-3" role="alert">
							{formError}
						</p>
					) : null}

					<div className="form-group">
						<label htmlFor="admin-session-coach">
							Coach <span className="required">*</span>
						</label>
						<select
							id="admin-session-coach"
							value={coachId}
							onChange={(e) => setCoachId(e.target.value)}
							className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
							required
						>
							<option value="">Select coach</option>
							{coaches.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
						</select>
					</div>

					<div className="form-group">
						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={isGroupClass}
								onChange={(e) => {
									setIsGroupClass(e.target.checked);
									setGoalId('');
								}}
							/>
							<span>Group class</span>
						</label>
						<small className="block text-xs text-[var(--text-secondary)] mt-1">
							Personal sessions require a goal (same as the coach app). Group classes use invites
							optionally.
						</small>
					</div>

					<div className="form-group">
						<label>
							Members with active membership{' '}
							{isGroupClass ? '(optional invites)' : <span className="required">*</span>}
						</label>
						<input
							type="search"
							placeholder="Search members..."
							value={memberSearch}
							onChange={(e) => setMemberSearch(e.target.value)}
							className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm mb-2"
						/>
						<div
							className={cn(
								'max-h-40 overflow-y-auto rounded-xl border border-[var(--card-border)] p-2 space-y-1',
								'bg-[rgba(0,0,0,0.15)]'
							)}
						>
							{filteredMembers.length === 0 ? (
								<p className="text-xs text-[var(--text-secondary)] px-1 py-2">
									No members with an active subscription match.
								</p>
							) : (
								filteredMembers.map((u) => {
									const label = [u.firstName, u.middleName, u.lastName]
										.filter(Boolean)
										.join(' ');
									const checked = selectedMemberIds.includes(u.id);
									return (
										<label
											key={u.id}
											className={cn(
												'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm cursor-pointer',
												checked ? 'bg-[rgba(249,197,19,0.12)]' : 'hover:bg-[rgba(255,255,255,0.04)]'
											)}
										>
											<input
												type="checkbox"
												checked={checked}
												onChange={() => toggleMember(u.id)}
											/>
											<span className="text-[var(--text-primary)]">{label}</span>
											<span className="text-[var(--text-secondary)] text-xs truncate">{u.email}</span>
										</label>
									);
								})
							)}
						</div>
						<small className="block text-xs text-[var(--text-secondary)] mt-1">
							{selectedMemberIds.length} selected
						</small>
					</div>

					{!isGroupClass ? (
						<div className="form-group">
							<label htmlFor="admin-session-goal">
								Goal <span className="required">*</span>
							</label>
							<select
								id="admin-session-goal"
								value={goalId}
								onChange={(e) => setGoalId(e.target.value)}
								className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
								disabled={selectedMemberIds.length === 0}
							>
								<option value="">
									{selectedMemberIds.length ? 'Select a goal' : 'Select members first'}
								</option>
								{goalOptions.map((g) => (
									<option key={g.id} value={g.id}>
										{g.label}
									</option>
								))}
							</select>
						</div>
					) : (
						<div className="form-group">
							<label htmlFor="admin-session-max-p">
								Max participants <span className="required">*</span>
							</label>
							<input
								id="admin-session-max-p"
								type="number"
								min={1}
								value={maxParticipants}
								onChange={(e) => setMaxParticipants(e.target.value)}
								className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm"
							/>
						</div>
					)}

					<div className="form-group">
						<label htmlFor="admin-session-name">
							Workout name <span className="required">*</span>
						</label>
						<input
							id="admin-session-name"
							value={sessionName}
							onChange={(e) => setSessionName(e.target.value)}
							placeholder="e.g. Upper body"
							className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm"
							required
						/>
					</div>

					<div className="form-group">
						<label>
							Date <span className="required">*</span>
						</label>
						<DatePicker
							date={date}
							onDateChange={setDate}
							placeholder="Pick a date"
							className="w-full"
						/>
					</div>

					<div className="form-grid">
						<div className="form-group">
							<label htmlFor="admin-session-start">
								Start time <span className="required">*</span>
							</label>
							<input
								id="admin-session-start"
								type="time"
								value={startTimeStr}
								onChange={(e) => setStartTimeStr(e.target.value)}
								className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm"
							/>
						</div>
						<div className="form-group">
							<label htmlFor="admin-session-end">End time</label>
							<input
								id="admin-session-end"
								type="time"
								value={endTimeStr}
								onChange={(e) => setEndTimeStr(e.target.value)}
								className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm"
							/>
						</div>
					</div>

					<div className="form-group">
						<label htmlFor="admin-session-area">
							Gym area <span className="required">*</span>
						</label>
						<select
							id="admin-session-area"
							value={gymArea}
							onChange={(e) => setGymArea(e.target.value)}
							className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm"
							required
						>
							<option value="">Select gym area</option>
							{GYM_AREAS.map((a) => (
								<option key={a.value} value={a.value}>
									{a.label}
								</option>
							))}
						</select>
					</div>

					<div className="form-group">
						<label htmlFor="admin-session-note">Note</label>
						<textarea
							id="admin-session-note"
							value={note}
							onChange={(e) => setNote(e.target.value)}
							rows={3}
							className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm"
							placeholder="Optional"
						/>
					</div>
				</div>
				<div
					className="modal-footer"
					style={{ flexShrink: 0, borderTop: '1px solid var(--card-border)', padding: '1rem' }}
				>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
							Cancel
						</Button>
						<Button type="submit" disabled={submitting}>
							{submitting ? 'Creating…' : 'Create session'}
						</Button>
					</div>
				</div>
			</form>
		</div>
	);
}
