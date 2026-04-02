let getToken: (() => Promise<string | null>) | null = null;

export function registerClerkTokenGetter(fn: () => Promise<string | null>) {
	getToken = fn;
}

/** Prefer Clerk session token; fallback to persisted token (e.g. before Clerk mounts). */
export async function getAuthBearerToken(): Promise<string> {
	if (getToken) {
		const t = await getToken();
		if (t) return t;
	}
	return localStorage.getItem('authToken') || '';
}
