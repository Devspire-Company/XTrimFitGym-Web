import type mysql from 'mysql2/promise';
import mongoose from 'mongoose';
import { ensureMySQLConnection } from '../database/mysql/connectMysql.js';
import User from '../database/models/user/user-schema.js';
import type { IUser } from '../database/models/user/user-schema.js';

type LeanUser = IUser & { _id: mongoose.Types.ObjectId };

/**
 * If the member is still marked "biometric not complete" but the door system already
 * has at least one attendance row for them (card or name match), mark enrollment complete.
 * Keeps the app aligned with IVMS without requiring a manual admin toggle.
 */
export async function syncFacilityBiometricEnrollmentFromAttendance(
	userLean: LeanUser | null | undefined
): Promise<void> {
	if (!userLean || userLean.role !== 'member') return;
	const md = userLean.membershipDetails;
	if (!md?.membership_id) return;
	if (md.facilityBiometricEnrollmentComplete !== false) return;

	const firstName = userLean.firstName || '';
	const middleName = userLean.middleName || '';
	const lastName = userLean.lastName || '';
	const possibleNames = [
		`${firstName} ${lastName}`.trim(),
		`${firstName} ${middleName} ${lastName}`.trim(),
		`${lastName}, ${firstName}`.trim(),
		firstName,
		lastName,
	].filter((name) => name.length > 0);

	const userAttendanceId = userLean.attendanceId?.toString();
	if (!userAttendanceId && possibleNames.length === 0) return;

	let connection: mysql.Connection;
	try {
		connection = await ensureMySQLConnection();
	} catch (e) {
		console.warn('[syncFacilityBiometric] MySQL unavailable, skipping:', e);
		return;
	}

	const parts: string[] = [];
	const params: unknown[] = [];

	if (userAttendanceId) {
		parts.push(
			"(CAST(cardNo AS CHAR) = CAST(? AS CHAR) AND cardNo IS NOT NULL AND cardNo != '')",
		);
		params.push(userAttendanceId);
	}
	for (const name of possibleNames) {
		parts.push('personName LIKE ?');
		params.push(`%${name}%`);
	}

	const where = parts.join(' OR ');
	const query = `SELECT 1 AS ok FROM attendance WHERE (${where}) LIMIT 1`;

	try {
		const [rows] = await connection.execute<mysql.RowDataPacket[]>(query, params);
		if (!rows.length) return;

		await User.updateOne(
			{ _id: userLean._id },
			{ $set: { 'membershipDetails.facilityBiometricEnrollmentComplete': true } },
		);
	} catch (e) {
		console.error('[syncFacilityBiometric] attendance check / update failed:', e);
	}
}
