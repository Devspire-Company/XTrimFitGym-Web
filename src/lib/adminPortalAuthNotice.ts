export const ADMIN_PORTAL_AUTH_NOTICE_KEY = 'xtrimfit_admin_portal_auth_notice';

export type AdminPortalAuthNotice = {
	code: 'WRONG_ROLE_MEMBER' | 'WRONG_ROLE_COACH' | 'NO_STAFF_ACCOUNT' | 'SESSION_ERROR';
};

export function setAdminPortalAuthNotice(notice: AdminPortalAuthNotice) {
	try {
		sessionStorage.setItem(ADMIN_PORTAL_AUTH_NOTICE_KEY, JSON.stringify(notice));
	} catch {
		/* ignore */
	}
}

export function consumeAdminPortalAuthNotice(): AdminPortalAuthNotice | null {
	try {
		const raw = sessionStorage.getItem(ADMIN_PORTAL_AUTH_NOTICE_KEY);
		if (!raw) return null;
		sessionStorage.removeItem(ADMIN_PORTAL_AUTH_NOTICE_KEY);
		const parsed = JSON.parse(raw) as AdminPortalAuthNotice;
		if (
			parsed &&
			(parsed.code === 'WRONG_ROLE_MEMBER' ||
				parsed.code === 'WRONG_ROLE_COACH' ||
				parsed.code === 'NO_STAFF_ACCOUNT' ||
				parsed.code === 'SESSION_ERROR')
		) {
			return parsed;
		}
		return null;
	} catch {
		return null;
	}
}

export function messageForAdminPortalAuthNotice(n: AdminPortalAuthNotice): string {
	switch (n.code) {
		case 'WRONG_ROLE_MEMBER':
			return 'This portal is for gym administrators only. Member accounts must use the member mobile app to sign in.';
		case 'WRONG_ROLE_COACH':
			return 'This portal is for gym administrators only. Coach accounts must use the coach mobile app to sign in.';
		case 'NO_STAFF_ACCOUNT':
			return 'No administrator account exists for this email. Self sign-up is disabled on the admin portal; ask an existing administrator to create your admin user in Settings.';
		case 'SESSION_ERROR':
			return 'Could not verify your session with the server. Check that the API is reachable and try again.';
		default:
			return 'Sign-in could not be completed.';
	}
}
