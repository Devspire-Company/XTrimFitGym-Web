import { DEFAULT_GRAPHQL_HTTP_URL } from '@/lib/defaultGraphqlEndpoint';

/** Base API URL (no /graphql) for REST uploads */
export function getUploadBaseUrl(): string {
	const url = (import.meta.env.VITE_GRAPHQL_URL || '').trim() || DEFAULT_GRAPHQL_HTTP_URL;
	const base = url.replace(/\/graphql\/?$/, '') || DEFAULT_GRAPHQL_HTTP_URL.replace(/\/graphql\/?$/, '');
	return base;
}

const EQUIPMENT_FOLDER = 'XTrimFitGym/equipment';
const WALKIN_WAIVER_FOLDER = 'XTrimFitGym/walkin-waivers';

async function uploadImageToFolder(
	file: File,
	token: string | null,
	folder: string
): Promise<string> {
	const baseUrl = getUploadBaseUrl();
	const formData = new FormData();
	formData.append('image', file);
	formData.append('folder', folder);
	const headers: Record<string, string> = {};
	if (token) headers['Authorization'] = `Bearer ${token}`;
	const res = await fetch(`${baseUrl}/api/upload/image`, {
		method: 'POST',
		headers,
		body: formData,
	});
	if (res.status < 200 || res.status >= 300) {
		const err = await res.json().catch(() => ({}));
		throw new Error((err as { error?: string }).error || 'Upload failed');
	}
	const data = (await res.json()) as { url?: string };
	if (!data?.url) throw new Error('No URL returned');
	return data.url;
}

export async function uploadEquipmentImage(
	file: File,
	token: string | null
): Promise<string> {
	return uploadImageToFolder(file, token, EQUIPMENT_FOLDER);
}

export async function uploadWalkInWaiverImage(
	file: File,
	token: string | null
): Promise<string> {
	return uploadImageToFolder(file, token, WALKIN_WAIVER_FOLDER);
}
