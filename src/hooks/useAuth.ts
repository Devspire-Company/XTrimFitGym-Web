import { useMutation } from '@apollo/client';
import { useNavigate } from 'react-router';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials, logout as logoutAction } from '@/store/slices/authSlice';
import { addToast } from '@/store/slices/uiSlice';
import { LOGIN } from '@/graphql/operations/index';

export function useAuth() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	const [loginMutation, { loading: loginLoading }] = useMutation(LOGIN, {
		onCompleted: (data) => {
			if (data?.login) {
				const { user, token } = data.login;
				
				// Check if user is an admin - only admins can access the web app
				if (user.role !== 'admin') {
					dispatch(
						addToast({
							type: 'error',
							message: 'Access denied. Only administrators can access this application.',
						})
					);
					return;
				}
				
				// Store credentials in Redux and localStorage
				dispatch(
					setCredentials({
						user: {
							id: user.id,
							firstName: user.firstName,
							middleName: user.middleName,
							lastName: user.lastName,
							email: user.email,
							role: user.role,
							phoneNumber: user.phoneNumber,
							dateOfBirth: user.dateOfBirth,
							gender: user.gender,
						},
						token,
					})
				);

				dispatch(
					addToast({
						type: 'success',
						message: `Welcome back, ${user.firstName}!`,
					})
				);

				// Navigate to dashboard
				navigate('/dashboard');
			}
		},
		onError: (error) => {
			dispatch(
				addToast({
					type: 'error',
					message: error.message || 'Login failed. Please try again.',
				})
			);
		},
	});

	const login = async (email: string, password: string) => {
		try {
			await loginMutation({
				variables: {
					input: {
						email,
						password,
					},
				},
			});
		} catch (error) {
			console.error('Login error:', error);
		}
	};

	const logout = () => {
		dispatch(logoutAction());
		navigate('/login');
	};

	return {
		login,
		logout,
		loginLoading,
	};
}

