import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface User {
	id: string;
	firstName: string;
	middleName?: string;
	lastName: string;
	email: string;
	role: 'admin' | 'coach' | 'member';
	phoneNumber?: string;
	dateOfBirth?: string;
	gender: string;
}

interface AuthState {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
}

const initialState: AuthState = {
	user: null,
	token: null,
	isAuthenticated: false,
};

const authSlice = createSlice({
	name: 'auth',
	initialState,
	reducers: {
		setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
			// Only allow admin users to be authenticated
			if (action.payload.user.role !== 'admin') {
				return; // Don't set credentials for non-admin users
			}
			state.user = action.payload.user;
			state.token = action.payload.token;
			state.isAuthenticated = true;
			localStorage.setItem('authToken', action.payload.token);
		},
		logout: (state) => {
			state.user = null;
			state.token = null;
			state.isAuthenticated = false;
			localStorage.removeItem('authToken');
		},
		updateUser: (state, action: PayloadAction<Partial<User>>) => {
			if (state.user) {
				state.user = { ...state.user, ...action.payload };
			}
		},
	},
});

export const { setCredentials, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;

