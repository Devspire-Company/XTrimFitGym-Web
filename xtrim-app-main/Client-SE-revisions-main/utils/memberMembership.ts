import type { User } from '@/graphql/generated/types';

/** Active gym membership is represented by an assigned membership id on the user. */
export function memberHasActiveGymMembership(user: User | null | undefined): boolean {
	return !!user?.membershipDetails?.membershipId;
}

/**
 * Server sets `facilityBiometricEnrollmentComplete` to false when a subscription becomes active.
 * Legacy accounts omit the field (treated as complete). Only explicit `false` blocks the app.
 *
 * When that flag is still false but the user already has a positive `attendanceId` (facility / VMS
 * card number stored on the user), do not block the app—staff may have enrolled on the device
 * without flipping the boolean in admin.
 */
export function memberNeedsFacilityBiometric(user: User | null | undefined): boolean {
	if (!memberHasActiveGymMembership(user)) return false;
	if (user?.membershipDetails?.facilityBiometricEnrollmentComplete !== false) return false;
	const id = user?.attendanceId;
	if (typeof id === 'number' && Number.isFinite(id) && id > 0) return false;
	return true;
}
