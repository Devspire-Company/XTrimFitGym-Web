import {
	attendanceRecordSortMs,
	attendanceRecordsForDay,
	formatAttendanceClockLabel,
	formatAttendanceDirectionLabel,
	isAttendanceTimedOut,
	type AttendanceRecordLike,
} from '@/utils/attendanceCalendar';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

type Props = {
	dayKey: string;
	dayLabel: string;
	allRecords: AttendanceRecordLike[];
	/** When true and there are no check-ins, hint that sessions may still apply. */
	hasSessionsOnDay: boolean;
};

export function ScheduleDayAttendancePanel({
	dayKey,
	dayLabel,
	allRecords,
	hasSessionsOnDay,
}: Props) {
	const dayRecords = useMemo(
		() => attendanceRecordsForDay(allRecords, dayKey),
		[allRecords, dayKey]
	);

	const sorted = useMemo(() => {
		return [...dayRecords].sort(
			(a, b) => attendanceRecordSortMs(a, dayKey) - attendanceRecordSortMs(b, dayKey)
		);
	}, [dayRecords, dayKey]);

	const hasCheckIns = sorted.length > 0;
	const headerAccent = hasCheckIns ? '#34C759' : '#8E8E93';

	return (
		<View className='bg-bg-primary rounded-xl p-4 mb-4 border border-[#F9C513]/40' style={{ borderWidth: 0.5 }}>
			<View className='flex-row items-center gap-2 mb-2'>
				<Ionicons name='log-in-outline' size={20} color={headerAccent} />
				<Text
					className={`font-semibold text-base ${hasCheckIns ? 'text-text-primary' : 'text-text-secondary'}`}
				>
					Gym check-ins — {dayLabel}
				</Text>
			</View>
			{sorted.length === 0 ? (
				<Text className='text-text-secondary text-sm leading-5'>
					{hasSessionsOnDay
						? 'No door check-in recorded for this day. Your sessions for this date are listed below.'
						: 'No check-ins on this date.'}
				</Text>
			) : (
				sorted.map((r, idx) => {
					const isOut = isAttendanceTimedOut(r.direction);
					const rowAccent = isOut ? '#EF4444' : '#34C759';
					return (
					<View
						key={r.id ? String(r.id) : `att-${r.authDateTime || ''}-${r.direction || ''}-${idx}`}
						className={`flex-row items-start py-2 ${
							idx < sorted.length - 1 ? 'border-b border-[#2C2C2E]' : ''
						}`}
					>
						<View className='w-24 flex-shrink-0'>
							<Text className='font-semibold text-sm' style={{ color: rowAccent }}>
								{formatAttendanceClockLabel(r)}
							</Text>
						</View>
						<View className='flex-1'>
							<Text className='text-sm font-medium' style={{ color: rowAccent }}>
								{formatAttendanceDirectionLabel(r.direction)}
							</Text>
							{r.deviceName ? (
								<Text
									className={`text-xs mt-0.5 ${isOut ? '' : 'text-text-secondary'}`}
									style={isOut ? { color: '#F87171' } : undefined}
									numberOfLines={1}
								>
									{r.deviceName}
								</Text>
							) : null}
						</View>
					</View>
					);
				})
			)}
		</View>
	);
}
