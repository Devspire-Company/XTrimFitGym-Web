import { useAuth, useClerk } from '@clerk/clerk-react';
import { useEffect, useRef } from 'react';
import { useApolloClient } from '@apollo/client';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials, logout } from '@/store/slices/authSlice';
import { addToast } from '@/store/slices/uiSlice';
import type { User } from '@/store/slices/authSlice';
import { MeDocument } from '@/graphql/generated/graphql';
import { registerClerkTokenGetter } from '@/lib/clerkTokenBridge';

function mapMeToUser(u: NonNullable<import('@/graphql/generated/graphql').MeQuery['me']>): User {
	return {
		id: u.id,
		firstName: u.firstName,
		middleName: u.middleName ?? undefined,
		lastName: u.lastName,
		email: u.email,
		role: u.role,
		phoneNumber: u.phoneNumber ?? undefined,
		dateOfBirth: u.dateOfBirth ?? undefined,
		gender: u.gender,
	};
}

export function ClerkSessionSync() {
	const { isLoaded, isSignedIn, getToken, sessionId } = useAuth();
	const { signOut } = useClerk();
	const client = useApolloClient();
	const dispatch = useAppDispatch();
	const syncRunId = useRef(0);

	useEffect(() => {
		registerClerkTokenGetter(() => getToken());
	}, [getToken]);

	useEffect(() => {
		if (!isLoaded) return;

		if (!isSignedIn) {
			dispatch(logout());
			return;
		}

		const id = ++syncRunId.current;

		const run = async () => {
			const token = await getToken();
			if (!token) {
				dispatch(logout());
				return;
			}

			localStorage.setItem('authToken', token);

			try {
				const { data } = await client.query({
					query: MeDocument,
					fetchPolicy: 'network-only',
				});
				if (id !== syncRunId.current) return;

				const me = data?.me;
				if (!me) {
					await signOut();
					dispatch(logout());
					dispatch(
						addToast({
							type: 'error',
							message:
								'No gym account found for this sign-in. Use the email registered in X-TRIM FIT GYM.',
						})
					);
					return;
				}

				if (me.role !== 'admin') {
					await signOut();
					dispatch(logout());
					dispatch(
						addToast({
							type: 'error',
							message: 'Access denied. Only administrators can access this application.',
						})
					);
					return;
				}

				dispatch(
					setCredentials({
						user: mapMeToUser(me),
						token,
					})
				);
			} catch {
				if (id !== syncRunId.current) return;
				await signOut();
				dispatch(logout());
				dispatch(
					addToast({
						type: 'error',
						message: 'Could not verify your session with the server.',
					})
				);
			}
		};

		void run();
	}, [isLoaded, isSignedIn, sessionId, getToken, client, dispatch, signOut]);

	return null;
}
