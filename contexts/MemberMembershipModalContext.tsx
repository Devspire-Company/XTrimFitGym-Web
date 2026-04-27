import ConfirmModal from '@/components/ConfirmModal';
import { useRouter } from 'expo-router';
import React, {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from 'react';

type MemberMembershipModalContextValue = {
	openMembershipRequired: () => void;
	openMembershipExpiredFlow: (expiresAt?: string | null) => void;
	isMembershipExpiryFlowActive: boolean;
};

const MemberMembershipModalContext =
	createContext<MemberMembershipModalContextValue | null>(null);

export function MemberMembershipModalProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const [visible, setVisible] = useState(false);
	const [expiredVisible, setExpiredVisible] = useState(false);
	const [expiredMessage, setExpiredMessage] = useState(
		'Your membership has expired. Choose a new plan to continue premium member access.'
	);

	const openMembershipRequired = useCallback(() => {
		setVisible(true);
	}, []);

	const openMembershipExpiredFlow = useCallback((expiresAt?: string | null) => {
		let dateLabel = '';
		if (expiresAt) {
			const parsed = new Date(expiresAt);
			if (Number.isFinite(parsed.getTime())) {
				dateLabel = parsed.toLocaleString('en-PH', {
					timeZone: 'Asia/Manila',
					month: 'short',
					day: 'numeric',
					hour: 'numeric',
					minute: '2-digit',
				});
			}
		}
		setExpiredMessage(
			dateLabel
				? `Time's up - your membership ended on ${dateLabel}. Pick a new plan to keep full access.`
				: "Time's up - your membership has expired. Pick a new plan to keep full access."
		);
		setExpiredVisible(true);
	}, []);

	const value = useMemo(
		() => ({
			openMembershipRequired,
			openMembershipExpiredFlow,
			isMembershipExpiryFlowActive: expiredVisible,
		}),
		[openMembershipRequired, openMembershipExpiredFlow, expiredVisible]
	);

	const onConfirm = useCallback(() => {
		setVisible(false);
		router.push('/(member)/subscription');
	}, [router]);

	const onCancel = useCallback(() => setVisible(false), []);
	const onExpiredGotIt = useCallback(() => {
		setExpiredVisible(false);
		setVisible(true);
	}, []);

	return (
		<MemberMembershipModalContext.Provider value={value}>
			{children}
			<ConfirmModal
				visible={expiredVisible}
				title="Time's up"
				message={expiredMessage}
				variant='warning'
				confirmLabel='Got it'
				onConfirm={onExpiredGotIt}
				onCancel={onExpiredGotIt}
				hideCancel
			/>
			<ConfirmModal
				visible={visible}
				title='Membership required'
				message='Avail a gym membership to unlock the dashboard, schedule, progress, coaches, attendance, and session logs. You can keep using Workouts anytime.'
				variant='neutral'
				confirmLabel='View'
				cancelLabel='Not now'
				onConfirm={onConfirm}
				onCancel={onCancel}
			/>
		</MemberMembershipModalContext.Provider>
	);
}

export function useMemberMembershipModal(): MemberMembershipModalContextValue {
	const ctx = useContext(MemberMembershipModalContext);
	if (!ctx) {
		return {
			openMembershipRequired: () => {},
			openMembershipExpiredFlow: () => {},
			isMembershipExpiryFlowActive: false,
		};
	}
	return ctx;
}
