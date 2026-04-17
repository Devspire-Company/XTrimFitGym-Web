import { FacilityBiometricPendingModal } from '@/components/FacilityBiometricPendingModal';
import { PostOnboardingWelcomeModal } from '@/components/PostOnboardingWelcomeModal';
import { useAuth } from '@/contexts/AuthContext';
import { useMeQuery } from '@/graphql/generated/types';
import { setUser } from '@/store/slices/userSlice';
import { convertGraphQLUser } from '@/utils/graphql-utils';
import {
	memberHasActiveGymMembership,
	memberNeedsFacilityBiometric,
} from '@/utils/memberMembership';
import { storage } from '@/utils/storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

const ME_POLL_MS = 12_000;

const facilityBiometricReminderStorageKey = (userId: string) =>
	`facilityBiometricReminderAck:v1:${userId}`;

/**
 * Polls `me` while membership is inactive or facility biometric is still being set up at the gym.
 * Shows a dismissible front-desk reminder at most once per outstanding enrollment (persisted per user).
 * Server clears `facilityBiometricEnrollmentComplete` when door attendance exists; `me` runs that sync.
 */
export function MemberMeSyncAndWelcome() {
	const { user } = useAuth();
	const dispatch = useDispatch();
	const router = useRouter();
	const [showApprovedWelcome, setShowApprovedWelcome] = useState(false);
	const [biometricReminderDismissed, setBiometricReminderDismissed] =
		useState(false);
	const prevHasMembershipRef = useRef<boolean | null>(null);
	const prevNeedsBiometricRef = useRef<boolean | null>(null);
	const seededRef = useRef(false);

	const hasMembership = memberHasActiveGymMembership(user);
	const needsBiometric = memberNeedsFacilityBiometric(user);
	const skipMe = !user?.id || user.role !== 'member';

	// Keep polling for member accounts so admin-side membership changes
	// (approve/cancel/unsubscribe) are reflected in the app promptly.
	const shouldPollMe = !skipMe;

	const { data, refetch } = useMeQuery({
		skip: skipMe,
		fetchPolicy: 'cache-and-network',
		pollInterval: shouldPollMe ? ME_POLL_MS : 0,
		notifyOnNetworkStatusChange: true,
	});

	useLayoutEffect(() => {
		if (data?.me) {
			dispatch(setUser(convertGraphQLUser(data.me)));
		}
	}, [data, dispatch]);

	useEffect(() => {
		if (skipMe) {
			seededRef.current = false;
			prevHasMembershipRef.current = null;
			prevNeedsBiometricRef.current = null;
		}
	}, [skipMe]);

	useEffect(() => {
		if (!needsBiometric && user?.id) {
			setBiometricReminderDismissed(false);
			void storage.removeItem(facilityBiometricReminderStorageKey(user.id));
		}
	}, [needsBiometric, user?.id]);

	useEffect(() => {
		if (!user?.id || user.role !== 'member') return;
		let cancelled = false;
		void (async () => {
			try {
				const v = await storage.getItem(facilityBiometricReminderStorageKey(user.id!));
				if (!cancelled && v === '1') setBiometricReminderDismissed(true);
			} catch {
				/* ignore */
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [user?.id, user?.role]);

	useEffect(() => {
		if (skipMe) return;

		if (!seededRef.current) {
			prevHasMembershipRef.current = hasMembership;
			prevNeedsBiometricRef.current = needsBiometric;
			seededRef.current = true;
			return;
		}

		const prevMem = prevHasMembershipRef.current;
		const prevBio = prevNeedsBiometricRef.current;

		if (prevMem === false && hasMembership === true && !needsBiometric) {
			setShowApprovedWelcome(true);
		}
		if (prevBio === true && needsBiometric === false && hasMembership) {
			setShowApprovedWelcome(true);
		}

		prevHasMembershipRef.current = hasMembership;
		prevNeedsBiometricRef.current = needsBiometric;
	}, [skipMe, hasMembership, needsBiometric]);

	const dismissWelcome = () => {
		setShowApprovedWelcome(false);
		router.replace('/(member)/dashboard');
	};

	const onBiometricReminderGotIt = () => {
		void refetch().then((res) => {
			if (res.data?.me) {
				dispatch(setUser(convertGraphQLUser(res.data.me)));
			}
		});
		setBiometricReminderDismissed(true);
		if (user?.id) {
			void storage.setItem(facilityBiometricReminderStorageKey(user.id), '1');
		}
	};

	if (skipMe) return null;

	return (
		<>
			<FacilityBiometricPendingModal
				visible={
					hasMembership && needsBiometric && !biometricReminderDismissed
				}
				onGotIt={onBiometricReminderGotIt}
			/>
			<PostOnboardingWelcomeModal
				visible={showApprovedWelcome}
				onDismiss={dismissWelcome}
			/>
		</>
	);
}
