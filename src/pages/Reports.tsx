import { useMemo, useEffect, useState } from 'react';
import { useQuery, useSubscription, useMutation } from '@apollo/client';
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	ArcElement,
	BarElement,
	Title,
	Tooltip,
	Legend,
	Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
	BarChart3,
	PhilippinePeso,
	Users,
	TrendingUp,
	Activity,
	Download,
	ChevronDown,
} from 'lucide-react';
import {
	GET_USERS,
	GET_REVENUE_SUMMARY,
	GET_ANALYTICS_RANGE,
	REVENUE_SUMMARY_UPDATED,
	USERS_UPDATED,
	WALK_IN_ACCOUNTS_OVERVIEW,
	LOG_REPORT_DOWNLOAD,
	GET_REPORT_DOWNLOAD_LOGS,
} from '@/graphql/operations/index';
import { RoleType, ReportType } from '@/graphql/generated/graphql';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAppSelector } from '@/store/hooks';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type LocalExportLog = {
	id: string;
	reportType: string;
	fileName: string;
	downloadedById: string;
	downloadedByRole: string;
	downloadedBy?: {
		firstName?: string;
		lastName?: string;
		email?: string;
	};
	createdAt: string;
};

const REPORT_EXPORT_LOCAL_STORAGE_KEY = 'xtrimfit-report-export-logs';

async function loadImageAsDataUrl(path: string): Promise<string | null> {
	try {
		const response = await fetch(path);
		if (!response.ok) return null;
		const blob = await response.blob();
		return await new Promise((resolve) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
			reader.onerror = () => resolve(null);
			reader.readAsDataURL(blob);
		});
	} catch {
		return null;
	}
}

async function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number } | null> {
	return await new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			if (!img.naturalWidth || !img.naturalHeight) {
				resolve(null);
				return;
			}
			resolve({ width: img.naturalWidth, height: img.naturalHeight });
		};
		img.onerror = () => resolve(null);
		img.src = dataUrl;
	});
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
	let binary = '';
	const bytes = new Uint8Array(buffer);
	const chunkSize = 0x8000;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		const chunk = bytes.subarray(i, i + chunkSize);
		binary += String.fromCharCode(...chunk);
	}
	return btoa(binary);
}

async function tryRegisterInterFont(doc: jsPDF): Promise<boolean> {
	try {
		const regularUrl =
			'https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/Inter-Regular.ttf';
		const boldUrl =
			'https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/Inter-Bold.ttf';
		const [regularRes, boldRes] = await Promise.all([fetch(regularUrl), fetch(boldUrl)]);
		if (!regularRes.ok || !boldRes.ok) return false;
		const [regularBuf, boldBuf] = await Promise.all([
			regularRes.arrayBuffer(),
			boldRes.arrayBuffer(),
		]);
		const pdf = doc as any;
		pdf.addFileToVFS('Inter-Regular.ttf', arrayBufferToBase64(regularBuf));
		pdf.addFont('Inter-Regular.ttf', 'Inter', 'normal');
		pdf.addFileToVFS('Inter-Bold.ttf', arrayBufferToBase64(boldBuf));
		pdf.addFont('Inter-Bold.ttf', 'Inter', 'bold');
		return true;
	} catch {
		return false;
	}
}

async function renderBrandedPdfHeader(
	doc: jsPDF,
	title: string,
	now: Date,
	summaryLine: string,
	exportedBy: string
): Promise<{ interReady: boolean; startY: number }> {
	const interReady = await tryRegisterInterFont(doc);
	doc.setFont(interReady ? 'Inter' : 'helvetica', 'normal');

	const logoDataUrl = await loadImageAsDataUrl('/logo.png');
	let headerTextX = 14;
	if (logoDataUrl) {
		const logoSize = await getImageDimensions(logoDataUrl);
		const maxLogoWidth = 32;
		const maxLogoHeight = 24;
		let logoWidth = maxLogoWidth;
		let logoHeight = maxLogoHeight;
		if (logoSize) {
			const ratio = logoSize.width / logoSize.height;
			if (ratio >= 1) {
				logoWidth = maxLogoWidth;
				logoHeight = maxLogoWidth / ratio;
				if (logoHeight > maxLogoHeight) {
					logoHeight = maxLogoHeight;
					logoWidth = maxLogoHeight * ratio;
				}
			} else {
				logoHeight = maxLogoHeight;
				logoWidth = maxLogoHeight * ratio;
			}
		}
		doc.addImage(logoDataUrl, 'PNG', 14, 10, logoWidth, logoHeight);
		headerTextX = 14 + logoWidth + 6;
	}

	doc.setFontSize(16);
	doc.setFont(interReady ? 'Inter' : 'helvetica', 'bold');
	doc.text('X-TRIM FIT GYM', headerTextX, 18);
	doc.setFontSize(13);
	doc.text(title, headerTextX, 26);
	doc.setFontSize(10);
	doc.setFont(interReady ? 'Inter' : 'helvetica', 'normal');
	doc.text(
		`Generated: ${now.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Asia/Manila)`,
		14,
		34
	);
	doc.text(summaryLine, 14, 40);
	doc.text(`Exported by: ${exportedBy}`, 14, 46);

	return { interReady, startY: 52 };
}

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	ArcElement,
	BarElement,
	Title,
	Tooltip,
	Legend,
	Filler
);

const REPORTS_CHART_FONT_FAMILY = "'Inter', ui-sans-serif, system-ui, sans-serif";

export function ReportsPage() {
	useEffect(() => {
		document.title = 'Reports & Analytics - X-TRIM FIT GYM';
	}, []);

	// Inter draws ₱ and digits consistently on canvas; restore when leaving page.
	useEffect(() => {
		const prev = ChartJS.defaults.font.family;
		ChartJS.defaults.font.family = REPORTS_CHART_FONT_FAMILY;
		return () => {
			ChartJS.defaults.font.family = prev;
		};
	}, []);
	const currentUser = useAppSelector((s) => s.auth.user);
	const exportedByLabel = [currentUser?.firstName, currentUser?.lastName]
		.filter(Boolean)
		.join(' ')
		.trim() || currentUser?.email || 'System';
	const [auditApiSupported, setAuditApiSupported] = useState(true);
	const [downloadablesOpen, setDownloadablesOpen] = useState(false);
	const [localExportLogs, setLocalExportLogs] = useState<LocalExportLog[]>([]);

	useEffect(() => {
		try {
			const raw = localStorage.getItem(REPORT_EXPORT_LOCAL_STORAGE_KEY);
			if (!raw) return;
			const parsed = JSON.parse(raw) as LocalExportLog[];
			if (Array.isArray(parsed)) setLocalExportLogs(parsed);
		} catch {
			// Ignore malformed local history
		}
	}, []);

	// Initial data fetch with queries
	const { data: membersData, loading: membersLoading } = useQuery(GET_USERS, {
		variables: { role: RoleType.Member },
		errorPolicy: 'none',
	});

	const { data: coachesData, loading: coachesLoading } = useQuery(GET_USERS, {
		variables: { role: RoleType.Coach },
		errorPolicy: 'none',
	});

	// Fetch admins for export
	const { data: adminsData, loading: adminsLoading } = useQuery(GET_USERS, {
		variables: { role: RoleType.Admin },
		errorPolicy: 'none',
	});

	const { data: analyticsData, error: analyticsError } = useQuery(GET_REVENUE_SUMMARY, {
		errorPolicy: 'all',
		fetchPolicy: 'cache-and-network',
		onError: (error) => {
			// Silently handle analytics errors - we'll use fallback data
			console.warn('[Reports] Analytics query failed, using fallback data:', error.message);
		},
	});

	// Real-time subscriptions
	const { data: membersSubscriptionData } = useSubscription(USERS_UPDATED, {
		variables: { role: RoleType.Member },
		skip: !membersData,
	});

	const { data: coachesSubscriptionData } = useSubscription(USERS_UPDATED, {
		variables: { role: RoleType.Coach },
		skip: !coachesData,
	});

	const { data: revenueSubscriptionData } = useSubscription(REVENUE_SUMMARY_UPDATED, {
		skip: !analyticsData,
	});

	// Get last 30 days of analytics for revenue chart
	const endDate = new Date();
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - 30);

	const { data: analyticsRangeData, error: analyticsRangeError } = useQuery(GET_ANALYTICS_RANGE, {
		variables: {
			dateRange: {
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			},
		},
		errorPolicy: 'all',
		fetchPolicy: 'cache-and-network',
		notifyOnNetworkStatusChange: true,
		onError: (error) => {
			// Silently handle analytics range errors - we'll use fallback data
			console.warn('[Reports] Analytics range query failed, using fallback data:', error.message);
		},
	});
	const { data: walkInOverviewData } = useQuery(WALK_IN_ACCOUNTS_OVERVIEW, {
		variables: { pagination: { limit: 200, offset: 0 } },
		errorPolicy: 'ignore',
	});
	const [logReportDownload] = useMutation(LOG_REPORT_DOWNLOAD);
	const {
		data: reportLogsData,
		loading: reportLogsLoading,
		refetch: refetchReportLogs,
		error: reportLogsError,
	} = useQuery(GET_REPORT_DOWNLOAD_LOGS, {
		variables: { limit: 10, offset: 0 },
		fetchPolicy: 'cache-and-network',
		pollInterval: 15000,
		skip: !auditApiSupported,
	});
	useEffect(() => {
		if (!reportLogsError) return;
		const message = reportLogsError.message || '';
		if (
			message.includes('Cannot query field "getReportDownloadLogs"') ||
			message.includes('Cannot query field "logReportDownload"') ||
			message.includes('Unknown type "ReportType"') ||
			message.includes('Unknown type "LogReportDownloadInput"')
		) {
			setAuditApiSupported(false);
		}
	}, [reportLogsError]);

	// Use subscription data if available, otherwise fall back to query data
	const data = {
		members: membersSubscriptionData?.usersUpdated || membersData?.getUsers || [],
		coaches: coachesSubscriptionData?.usersUpdated || coachesData?.getUsers || [],
		admins: adminsData?.getUsers || [],
	};

	// Use subscription data for analytics if available, otherwise fall back to query data
	const analytics =
		revenueSubscriptionData?.revenueSummaryUpdated || analyticsData?.getRevenueSummary;

	// Only block on members and coaches loading - analytics can load in background
	const loading = membersLoading || coachesLoading;
	const error = analyticsError || analyticsRangeError || null;

	const userExportLoading = membersLoading || coachesLoading || adminsLoading;
	const recentReportLogs =
		auditApiSupported && (reportLogsData?.getReportDownloadLogs?.length ?? 0) > 0
			? reportLogsData?.getReportDownloadLogs ?? []
			: localExportLogs;

	const appendLocalExportLog = (reportType: ReportType, fileName: string) => {
		const next: LocalExportLog = {
			id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			reportType: String(reportType),
			fileName,
			downloadedById: currentUser?.id || 'unknown',
			downloadedByRole: currentUser?.role || 'admin',
			downloadedBy: {
				firstName: currentUser?.firstName,
				lastName: currentUser?.lastName,
				email: currentUser?.email,
			},
			createdAt: new Date().toISOString(),
		};
		setLocalExportLogs((prev) => {
			const updated = [next, ...prev].slice(0, 50);
			try {
				localStorage.setItem(REPORT_EXPORT_LOCAL_STORAGE_KEY, JSON.stringify(updated));
			} catch {
				// Ignore storage write failures
			}
			return updated;
		});
	};

	// Update analytics range data when revenue subscription updates
	// Note: Analytics range query is still used for historical data, but we could trigger a refetch
	// when subscription updates if needed. For now, the range query will update on its own schedule.

	// Prepare data transformations (must be before early returns to avoid hook order issues)
	const members = (data?.members || []).map((m: any) => {
		// IMPORTANT: Only use currentMembership which only returns ACTIVE transactions
		// Do NOT use membershipDetails.membershipTransaction as it may include canceled/expired transactions
		const membershipTransaction = m.currentMembership;
		// Only consider it active if the transaction exists and status is ACTIVE
		const isActive = membershipTransaction?.status === 'ACTIVE';
		return {
			id: m.id,
			name: `${m.firstName} ${m.lastName}`,
			status: isActive ? 'Active' : 'Inactive',
			membership: isActive ? membershipTransaction?.membership?.name || 'No Plan' : 'No Plan',
			joinDate: m.createdAt || new Date().toISOString(),
			// Only include price if transaction is ACTIVE
			monthlyPrice: isActive ? membershipTransaction?.membership?.monthlyPrice || 0 : 0,
		};
	});

	const coaches = (data?.coaches || []).map((c: any) => ({
		id: c.id,
		name: `${c.firstName} ${c.lastName}`,
		specialization: c.coachDetails?.specialization?.[0] || 'General Fitness',
	}));

	// Group members by membership type
	const membershipTypes = members.reduce((acc: any, m: any) => {
		acc[m.membership] = (acc[m.membership] || 0) + 1;
		return acc;
	}, {});

	// ALL HOOKS (including useMemo) MUST BE CALLED BEFORE EARLY RETURNS
	// Use analytics range data for revenue chart
	const revenueData = useMemo(() => {
		const analyticsRange = analyticsRangeData?.getAnalyticsRange || [];

		// If we have analytics data, use it; otherwise use placeholder
		if (analyticsRange.length > 0) {
			const slice = analyticsRange.slice(-30);
			const labels = slice.map((a: any) => {
				const date = new Date(a.date);
				return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
			});
			const membershipSeries = slice.map(
				(a: any) => a.membershipSubscriptionRevenue ?? a.totalRevenue ?? 0,
			);
			const walkSeries = slice.map((a: any) => a.walkInRevenue ?? 0);

			return {
				labels,
				datasets: [
					{
						label: 'Membership revenue (snapshot)',
						data: membershipSeries,
						borderColor: '#F9C513',
						backgroundColor: 'rgba(249, 197, 19, 0.1)',
						fill: true,
						tension: 0.4,
						pointRadius: 3,
						pointHoverRadius: 5,
						pointBackgroundColor: '#F9C513',
						pointBorderColor: '#fff',
						pointBorderWidth: 2,
					},
					{
						label: 'Walk-in fees (snapshot)',
						data: walkSeries,
						borderColor: '#10B981',
						backgroundColor: 'rgba(16, 185, 129, 0.08)',
						fill: true,
						tension: 0.4,
						pointRadius: 3,
						pointHoverRadius: 5,
						pointBackgroundColor: '#10B981',
						pointBorderColor: '#fff',
						pointBorderWidth: 2,
					},
				],
			};
		}

		// Fallback to placeholder data
		return {
			labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
			datasets: [
				{
					label: 'Revenue',
					data: [2500, 3000, 2800, 3200],
					borderColor: '#F9C513',
					backgroundColor: 'rgba(249, 197, 19, 0.1)',
					tension: 0.4,
				},
			],
		};
	}, [analyticsRangeData]);

	// Use analytics data for membership distribution if available
	const membershipData = useMemo(() => {
		const revenueByMembership = analytics?.revenueByMembership || [];

		if (revenueByMembership.length > 0) {
			return {
				labels: revenueByMembership.map((m: any) => m.membershipName),
				datasets: [
					{
						label: 'Subscriptions',
						data: revenueByMembership.map((m: any) => m.count),
						backgroundColor: ['#F9C513', '#E41E26', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'],
					},
				],
			};
		}

		// Fallback to member-based distribution
		return {
			labels: Object.keys(membershipTypes),
			datasets: [
				{
					data: Object.values(membershipTypes),
					backgroundColor: ['#F9C513', '#E41E26', '#10B981', '#3B82F6'],
				},
			],
		};
	}, [analytics, membershipTypes]);

	// Group members by month for growth data
	const memberGrowthData = useMemo(() => {
		const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
		const counts = months.map((_, i) => {
			const date = new Date();
			date.setMonth(date.getMonth() - (5 - i));
			return members.filter((m: any) => {
				const joinDate = new Date(m.joinDate);
				return (
					joinDate.getMonth() === date.getMonth() && joinDate.getFullYear() === date.getFullYear()
				);
			}).length;
		});

		return {
			labels: months,
			datasets: [
				{
					label: 'New Members',
					data: counts,
					backgroundColor: 'rgba(249, 197, 19, 0.8)',
				},
			],
		};
	}, [members]);

	// Calculate derived values (after all hooks)
	const totalMembers = members.length;
	const activeMembers = members.filter((m: any) => m.status === 'Active').length;
	const totalRevenue = analytics?.totalRevenue || 0;
	const membershipSubscriptionRevenue = analytics?.membershipSubscriptionRevenue ?? 0;
	const walkInRevenueTotal = analytics?.walkInRevenue ?? 0;
	const activeSubscriptions = analytics?.activeSubscriptions || 0;
	const newSubscriptions = analytics?.newSubscriptions || 0;
	const canceledSubscriptions = analytics?.canceledSubscriptions || 0;
	const expiredSubscriptions = analytics?.expiredSubscriptions || 0;
	const avgRevenuePerMember =
		activeSubscriptions > 0 ? membershipSubscriptionRevenue / activeSubscriptions : 0;
	const subscriptionRetentionRate =
		activeSubscriptions > 0
			? (
					(activeSubscriptions /
						(activeSubscriptions + canceledSubscriptions + expiredSubscriptions)) *
					100
				).toFixed(1)
			: '0';

	// Revenue by membership type chart data
	const revenueByMembershipChart = useMemo(() => {
		const revenueByMembership = analytics?.revenueByMembership || [];

		if (revenueByMembership.length > 0) {
			return {
				labels: revenueByMembership.map((m: any) => m.membershipName),
				datasets: [
					{
						label: 'Revenue (₱)',
						data: revenueByMembership.map((m: any) => m.revenue),
						backgroundColor: [
							'rgba(249, 197, 19, 0.8)',
							'rgba(228, 30, 38, 0.8)',
							'rgba(16, 185, 129, 0.8)',
							'rgba(59, 130, 246, 0.8)',
							'rgba(139, 92, 246, 0.8)',
							'rgba(236, 72, 153, 0.8)',
						],
						borderColor: [
							'rgba(249, 197, 19, 1)',
							'rgba(228, 30, 38, 1)',
							'rgba(16, 185, 129, 1)',
							'rgba(59, 130, 246, 1)',
							'rgba(139, 92, 246, 1)',
							'rgba(236, 72, 153, 1)',
						],
						borderWidth: 2,
					},
				],
			};
		}

		return {
			labels: [],
			datasets: [],
		};
	}, [analytics]);

	// Subscription trends chart (new, canceled, expired)
	const subscriptionTrendsChart = useMemo(() => {
		return {
			labels: ['New', 'Active', 'Canceled', 'Expired'],
			datasets: [
				{
					label: 'Subscriptions',
					data: [
						newSubscriptions,
						activeSubscriptions,
						canceledSubscriptions,
						expiredSubscriptions,
					],
					backgroundColor: [
						'rgba(16, 185, 129, 0.8)',
						'rgba(59, 130, 246, 0.8)',
						'rgba(239, 68, 68, 0.8)',
						'rgba(107, 114, 128, 0.8)',
					],
					borderColor: [
						'rgba(16, 185, 129, 1)',
						'rgba(59, 130, 246, 1)',
						'rgba(239, 68, 68, 1)',
						'rgba(107, 114, 128, 1)',
					],
					borderWidth: 2,
				},
			],
		};
	}, [newSubscriptions, activeSubscriptions, canceledSubscriptions, expiredSubscriptions]);

	// Revenue by period chart (from analytics)
	const revenueByPeriodChart = useMemo(() => {
		const revenueByPeriod = analytics?.revenueByPeriod || [];

		if (revenueByPeriod.length > 0) {
			const subDay = revenueByPeriod.map((p: any) =>
				Math.max(0, (p.revenue ?? 0) - (p.walkInRevenue ?? 0)),
			);
			const walkDay = revenueByPeriod.map((p: any) => p.walkInRevenue ?? 0);
			return {
				labels: revenueByPeriod.map((p: any) => p.period),
				datasets: [
					{
						label: 'Membership (new sales, day)',
						data: subDay,
						backgroundColor: 'rgba(249, 197, 19, 0.75)',
						borderColor: 'rgba(249, 197, 19, 1)',
						borderWidth: 2,
						stack: 'rev',
					},
					{
						label: 'Walk-in (day)',
						data: walkDay,
						backgroundColor: 'rgba(16, 185, 129, 0.75)',
						borderColor: 'rgba(16, 185, 129, 1)',
						borderWidth: 2,
						stack: 'rev',
					},
				],
			};
		}

		return {
			labels: [],
			datasets: [],
		};
	}, [analytics]);

	// CSV Export Function
	const exportToCSV = () => {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
		const filename = `xtrimfitgym-analytics-${timestamp}.csv`;

		// Helper function to escape CSV values
		const escapeCSV = (value: any): string => {
			if (value === null || value === undefined) return '';
			const stringValue = String(value);
			// If value contains comma, quote, or newline, wrap in quotes and escape quotes
			if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
				return `"${stringValue.replace(/"/g, '""')}"`;
			}
			return stringValue;
		};

		// Helper function to create CSV row
		const createRow = (values: any[]): string => {
			return values.map(escapeCSV).join(',') + '\n';
		};

		// Helper function to format date
		const formatDate = (dateString: string | null | undefined): string => {
			if (!dateString) return 'N/A';
			try {
				return new Date(dateString).toLocaleDateString('en-US', {
					year: 'numeric',
					month: '2-digit',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit',
				});
			} catch {
				return dateString;
			}
		};

		// Helper function to calculate age from date of birth
		const calculateAge = (dob: string | null | undefined): string => {
			if (!dob) return 'N/A';
			try {
				const birthDate = new Date(dob);
				const today = new Date();
				let age = today.getFullYear() - birthDate.getFullYear();
				const monthDiff = today.getMonth() - birthDate.getMonth();
				if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
					age--;
				}
				return age.toString();
			} catch {
				return 'N/A';
			}
		};

		let csvContent = '';

		// 1. Summary Statistics
		csvContent += '=== SUMMARY STATISTICS ===\n';
		csvContent += createRow(['Metric', 'Value']);
		csvContent += createRow(['Total Revenue', `₱${totalRevenue.toLocaleString()}`]);
		csvContent += createRow([
			'Membership Subscription Revenue',
			`₱${membershipSubscriptionRevenue.toLocaleString()}`,
		]);
		csvContent += createRow(['Walk-in Fees (time-in)', `₱${walkInRevenueTotal.toLocaleString()}`]);
		csvContent += createRow(['Total Members', totalMembers]);
		csvContent += createRow(['Active Members', activeMembers]);
		csvContent += createRow(['Inactive Members', totalMembers - activeMembers]);
		csvContent += createRow(['Total Coaches', coaches.length]);
		csvContent += createRow(['Active Subscriptions', activeSubscriptions]);
		csvContent += createRow(['New Subscriptions', newSubscriptions]);
		csvContent += createRow(['Canceled Subscriptions', canceledSubscriptions]);
		csvContent += createRow(['Expired Subscriptions', expiredSubscriptions]);
		csvContent += createRow([
			'Average Subscription Revenue per Active Member',
			`₱${avgRevenuePerMember.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
		]);
		csvContent += createRow(['Subscription Retention Rate', `${subscriptionRetentionRate}%`]);
		csvContent += createRow([
			'Total Monthly Recurring Revenue',
			`₱${(activeMembers * avgRevenuePerMember).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
		]);
		csvContent += createRow([
			'Member to Coach Ratio',
			coaches.length > 0 ? (totalMembers / coaches.length).toFixed(2) : 'N/A',
		]);
		csvContent += '\n';

		// 2. Detailed Member Information
		csvContent += '=== DETAILED MEMBER INFORMATION ===\n';
		csvContent += createRow([
			'ID',
			'Attendance ID',
			'First Name',
			'Middle Name',
			'Last Name',
			'Full Name',
			'Email',
			'Phone Number',
			'Date of Birth',
			'Age',
			'Gender',
			'Status',
			'Membership Plan',
			'Monthly Price',
			'Subscription Start Date',
			'Subscription End Date',
			'Subscription Status',
			'Price at Purchase',
			'Join Date',
			'Heard From',
			'Physique Goal',
			'Fitness Goal',
			'Workout Time',
			'Has Entered Details',
			'Assigned Coaches Count',
		]);

		(data?.members || []).forEach((m: any) => {
			const membershipTransaction = m.currentMembership;
			const isActive = membershipTransaction?.status === 'ACTIVE';
			const membershipDetails = m.membershipDetails || {};
			const coachesCount = membershipDetails.coachesIds?.length || 0;

			csvContent += createRow([
				m.id,
				m.attendanceId || 'N/A',
				m.firstName || '',
				m.middleName || '',
				m.lastName || '',
				`${m.firstName || ''} ${m.middleName || ''} ${m.lastName || ''}`.trim(),
				m.email || 'N/A',
				m.phoneNumber || 'N/A',
				m.dateOfBirth ? formatDate(m.dateOfBirth) : 'N/A',
				calculateAge(m.dateOfBirth),
				m.gender || 'N/A',
				isActive ? 'Active' : 'Inactive',
				isActive ? membershipTransaction?.membership?.name || 'No Plan' : 'No Plan',
				isActive
					? `₱${(membershipTransaction?.membership?.monthlyPrice || 0).toLocaleString()}`
					: 'N/A',
				membershipTransaction?.startedAt ? formatDate(membershipTransaction.startedAt) : 'N/A',
				membershipTransaction?.expiresAt ? formatDate(membershipTransaction.expiresAt) : 'N/A',
				membershipTransaction?.status || 'N/A',
				membershipTransaction?.priceAtPurchase
					? `₱${membershipTransaction.priceAtPurchase.toLocaleString()}`
					: 'N/A',
				formatDate(m.createdAt),
				m.heardFrom || 'N/A',
				membershipDetails.physiqueGoalType || 'N/A',
				membershipDetails.fitnessGoal || 'N/A',
				membershipDetails.workOutTime || 'N/A',
				membershipDetails.hasEnteredDetails ? 'Yes' : 'No',
				coachesCount.toString(),
			]);
		});
		csvContent += '\n';

		// 3. Detailed Coach Information
		csvContent += '=== DETAILED COACH INFORMATION ===\n';
		csvContent += createRow([
			'ID',
			'First Name',
			'Middle Name',
			'Last Name',
			'Full Name',
			'Email',
			'Phone Number',
			'Date of Birth',
			'Age',
			'Gender',
			'Specialization',
			'All Specializations',
			'Join Date',
			'Heard From',
		]);

		(data?.coaches || []).forEach((c: any) => {
			const coachDetails = c.coachDetails || {};
			const specializations = coachDetails.specialization || [];

			csvContent += createRow([
				c.id,
				c.firstName || '',
				c.middleName || '',
				c.lastName || '',
				`${c.firstName || ''} ${c.middleName || ''} ${c.lastName || ''}`.trim(),
				c.email || 'N/A',
				c.phoneNumber || 'N/A',
				c.dateOfBirth ? formatDate(c.dateOfBirth) : 'N/A',
				calculateAge(c.dateOfBirth),
				c.gender || 'N/A',
				specializations[0] || 'General Fitness',
				specializations.join('; ') || 'N/A',
				formatDate(c.createdAt),
				c.heardFrom || 'N/A',
			]);
		});
		csvContent += '\n';

		// 4. Membership Transaction Details
		csvContent += '=== MEMBERSHIP TRANSACTION DETAILS ===\n';
		csvContent += createRow([
			'Transaction ID',
			'Member ID',
			'Member Name',
			'Membership Plan ID',
			'Membership Plan Name',
			'Price at Purchase',
			'Start Date',
			'End Date',
			'Status',
			'Created At',
			'Days Active',
			'Days Remaining',
		]);

		(data?.members || []).forEach((m: any) => {
			const membershipTransaction = m.currentMembership;
			if (membershipTransaction) {
				const startDate = membershipTransaction.startedAt
					? new Date(membershipTransaction.startedAt)
					: null;
				const endDate = membershipTransaction.expiresAt
					? new Date(membershipTransaction.expiresAt)
					: null;
				const now = new Date();

				let daysActive = 'N/A';
				let daysRemaining = 'N/A';

				if (startDate) {
					const diffTime = now.getTime() - startDate.getTime();
					daysActive = Math.floor(diffTime / (1000 * 60 * 60 * 24)).toString();
				}

				if (endDate && membershipTransaction.status === 'ACTIVE') {
					const diffTime = endDate.getTime() - now.getTime();
					daysRemaining = Math.floor(diffTime / (1000 * 60 * 60 * 24)).toString();
				}

				csvContent += createRow([
					membershipTransaction.id || 'N/A',
					m.id,
					`${m.firstName || ''} ${m.lastName || ''}`.trim(),
					membershipTransaction.membershipId || 'N/A',
					membershipTransaction.membership?.name || 'N/A',
					membershipTransaction.priceAtPurchase
						? `₱${membershipTransaction.priceAtPurchase.toLocaleString()}`
						: 'N/A',
					formatDate(membershipTransaction.startedAt),
					formatDate(membershipTransaction.expiresAt),
					membershipTransaction.status || 'N/A',
					formatDate(membershipTransaction.createdAt),
					daysActive,
					daysRemaining,
				]);
			}
		});
		csvContent += '\n';

		// 5. Revenue by Membership Type (Detailed)
		if (analytics?.revenueByMembership && analytics.revenueByMembership.length > 0) {
			csvContent += '=== REVENUE BY MEMBERSHIP TYPE (DETAILED) ===\n';
			csvContent += createRow([
				'Membership Plan',
				'Total Revenue',
				'Active Subscriptions',
				'Average Revenue per Subscription',
				'Percentage of Total Revenue',
				'Monthly Recurring Revenue',
			]);

			const totalRevenueForCalc = analytics.revenueByMembership.reduce(
				(sum: number, item: any) => sum + item.revenue,
				0
			);

			analytics.revenueByMembership.forEach((item: any) => {
				const avgRevenue = item.count > 0 ? item.revenue / item.count : 0;
				const percentage =
					totalRevenueForCalc > 0
						? ((item.revenue / totalRevenueForCalc) * 100).toFixed(2)
						: '0.00';
				const mrr = item.count * avgRevenue;

				csvContent += createRow([
					item.membershipName,
					`₱${item.revenue.toLocaleString()}`,
					item.count,
					`₱${avgRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
					`${percentage}%`,
					`₱${mrr.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
				]);
			});
			csvContent += '\n';
		}

		// 6. Revenue by Period (Detailed)
		if (analytics?.revenueByPeriod && analytics.revenueByPeriod.length > 0) {
			csvContent += '=== REVENUE BY PERIOD (DETAILED) ===\n';
			csvContent += createRow([
				'Period',
				'Day total',
				'Membership (day)',
				'Walk-in (day)',
				'Walk-in count',
				'% of period total',
				'Growth (day total)',
			]);

			const totalPeriodRevenue = analytics.revenueByPeriod.reduce(
				(sum: number, item: any) => sum + item.revenue,
				0
			);
			let previousRevenue = 0;

			analytics.revenueByPeriod.forEach((item: any, index: number) => {
				const w = item.walkInRevenue ?? 0;
				const sub = Math.max(0, (item.revenue ?? 0) - w);
				const percentage =
					totalPeriodRevenue > 0 ? ((item.revenue / totalPeriodRevenue) * 100).toFixed(2) : '0.00';
				let growthRate = 'N/A';

				if (index > 0 && previousRevenue > 0) {
					const growth = ((item.revenue - previousRevenue) / previousRevenue) * 100;
					growthRate = `${growth >= 0 ? '+' : ''}${growth.toFixed(2)}%`;
				}

				csvContent += createRow([
					item.period,
					`₱${item.revenue.toLocaleString()}`,
					`₱${sub.toLocaleString()}`,
					`₱${w.toLocaleString()}`,
					item.walkInCount ?? 0,
					`${percentage}%`,
					growthRate,
				]);

				previousRevenue = item.revenue;
			});
			csvContent += '\n';
		}

		// 7. Membership Distribution (Detailed)
		csvContent += '=== MEMBERSHIP DISTRIBUTION (DETAILED) ===\n';
		csvContent += createRow([
			'Membership Plan',
			'Active Member Count',
			'Inactive Member Count',
			'Total Member Count',
			'Percentage of Active Members',
			'Percentage of Total Members',
		]);

		const activeMembersWithPlan = members.filter((m: any) => m.status === 'Active').length;

		// Get inactive counts per plan
		const inactiveByPlan: { [key: string]: number } = {};
		members.forEach((m: any) => {
			if (m.status === 'Inactive') {
				inactiveByPlan[m.membership] = (inactiveByPlan[m.membership] || 0) + 1;
			}
		});

		Object.entries(membershipTypes).forEach(([plan]: [string, unknown]) => {
			const activeCount = members.filter(
				(m: any) => m.membership === plan && m.status === 'Active'
			).length;
			const inactiveCount = inactiveByPlan[plan] || 0;
			const totalCount = activeCount + inactiveCount;
			const activePercentage =
				activeMembersWithPlan > 0
					? ((activeCount / activeMembersWithPlan) * 100).toFixed(2)
					: '0.00';
			const totalPercentage =
				totalMembers > 0 ? ((totalCount / totalMembers) * 100).toFixed(2) : '0.00';

			csvContent += createRow([
				plan,
				activeCount,
				inactiveCount,
				totalCount,
				`${activePercentage}%`,
				`${totalPercentage}%`,
			]);
		});
		csvContent += '\n';

		// 8. Revenue Trends (Last 30 Days - Detailed)
		if (analyticsRangeData?.getAnalyticsRange && analyticsRangeData.getAnalyticsRange.length > 0) {
			csvContent += '=== REVENUE TRENDS (LAST 30 DAYS - DETAILED) ===\n';
			csvContent += createRow([
				'Date',
				'Total Revenue',
				'Daily Growth',
				'7-Day Average',
				'30-Day Average',
				'Cumulative Revenue',
			]);

			const rangeData = analyticsRangeData.getAnalyticsRange.slice(-30);
			let cumulativeRevenue = 0;
			let previousRevenue = 0;
			const revenueArray: number[] = [];

			rangeData.forEach((item: any, index: number) => {
				const revenue = item.totalRevenue || 0;
				cumulativeRevenue += revenue;
				revenueArray.push(revenue);

				let dailyGrowth = 'N/A';
				if (index > 0 && previousRevenue > 0) {
					const growth = ((revenue - previousRevenue) / previousRevenue) * 100;
					dailyGrowth = `${growth >= 0 ? '+' : ''}${growth.toFixed(2)}%`;
				}

				let sevenDayAvg = 'N/A';
				if (index >= 6) {
					const last7Days = revenueArray.slice(-7);
					const avg = last7Days.reduce((a, b) => a + b, 0) / 7;
					sevenDayAvg = `₱${avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
				}

				const thirtyDayAvg =
					revenueArray.length > 0
						? `₱${(revenueArray.reduce((a, b) => a + b, 0) / revenueArray.length).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
						: 'N/A';

				csvContent += createRow([
					formatDate(item.date),
					`₱${revenue.toLocaleString()}`,
					dailyGrowth,
					sevenDayAvg,
					thirtyDayAvg,
					`₱${cumulativeRevenue.toLocaleString()}`,
				]);

				previousRevenue = revenue;
			});
			csvContent += '\n';
		}

		// 9. Member Growth (Last 6 Months - Detailed)
		csvContent += '=== MEMBER GROWTH (LAST 6 MONTHS - DETAILED) ===\n';
		csvContent += createRow([
			'Month',
			'Year',
			'New Members',
			'Active Members',
			'Inactive Members',
			'Growth Rate',
			'Cumulative Total',
		]);

		const monthAbbr = [
			'Jan',
			'Feb',
			'Mar',
			'Apr',
			'May',
			'Jun',
			'Jul',
			'Aug',
			'Sep',
			'Oct',
			'Nov',
			'Dec',
		];
		let cumulativeTotal = 0;
		let previousCount = 0;

		for (let i = 5; i >= 0; i--) {
			const date = new Date();
			date.setMonth(date.getMonth() - i);
			const month = date.getMonth();
			const year = date.getFullYear();
			const monthName = monthAbbr[month];

			const newMembers = (data?.members || []).filter((m: any) => {
				const joinDate = new Date(m.createdAt || m.joinDate);
				return joinDate.getMonth() === month && joinDate.getFullYear() === year;
			});

			const activeInMonth = newMembers.filter((m: any) => {
				const membershipTransaction = m.currentMembership;
				return membershipTransaction?.status === 'ACTIVE';
			}).length;

			const inactiveInMonth = newMembers.length - activeInMonth;
			cumulativeTotal += newMembers.length;

			let growthRate = 'N/A';
			if (i < 5 && previousCount > 0) {
				const growth = ((newMembers.length - previousCount) / previousCount) * 100;
				growthRate = `${growth >= 0 ? '+' : ''}${growth.toFixed(2)}%`;
			}

			csvContent += createRow([
				monthName,
				year.toString(),
				newMembers.length,
				activeInMonth,
				inactiveInMonth,
				growthRate,
				cumulativeTotal,
			]);

			previousCount = newMembers.length;
		}
		csvContent += '\n';

		// 10. Subscription Status Breakdown
		csvContent += '=== SUBSCRIPTION STATUS BREAKDOWN ===\n';
		csvContent += createRow([
			'Status',
			'Count',
			'Percentage',
			'Total Revenue',
			'Average Revenue per Subscription',
		]);

		const statusData = [
			{ status: 'Active', count: activeSubscriptions, revenue: totalRevenue },
			{ status: 'New', count: newSubscriptions, revenue: 0 },
			{ status: 'Canceled', count: canceledSubscriptions, revenue: 0 },
			{ status: 'Expired', count: expiredSubscriptions, revenue: 0 },
		];

		const totalSubscriptions =
			activeSubscriptions + newSubscriptions + canceledSubscriptions + expiredSubscriptions;

		statusData.forEach((item) => {
			const percentage =
				totalSubscriptions > 0 ? ((item.count / totalSubscriptions) * 100).toFixed(2) : '0.00';
			const avgRevenue = item.count > 0 ? item.revenue / item.count : 0;

			csvContent += createRow([
				item.status,
				item.count,
				`${percentage}%`,
				item.revenue > 0 ? `₱${item.revenue.toLocaleString()}` : 'N/A',
				item.revenue > 0
					? `₱${avgRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
					: 'N/A',
			]);
		});
		csvContent += '\n';

		// 11. Demographic Analysis
		csvContent += '=== DEMOGRAPHIC ANALYSIS ===\n';

		// Gender Distribution
		csvContent += '--- Gender Distribution ---\n';
		csvContent += createRow(['Gender', 'Count', 'Percentage']);
		const genderCounts: { [key: string]: number } = {};
		(data?.members || []).forEach((m: any) => {
			const gender = m.gender || 'Not Specified';
			genderCounts[gender] = (genderCounts[gender] || 0) + 1;
		});
		Object.entries(genderCounts).forEach(([gender, count]) => {
			const percentage = totalMembers > 0 ? ((count / totalMembers) * 100).toFixed(2) : '0.00';
			csvContent += createRow([gender, count, `${percentage}%`]);
		});
		csvContent += '\n';

		// Age Groups
		csvContent += '--- Age Groups ---\n';
		csvContent += createRow(['Age Group', 'Count', 'Percentage']);
		const ageGroups: { [key: string]: number } = {
			'18-25': 0,
			'26-35': 0,
			'36-45': 0,
			'46-55': 0,
			'56+': 0,
			'Not Specified': 0,
		};

		(data?.members || []).forEach((m: any) => {
			if (m.dateOfBirth) {
				const age = parseInt(calculateAge(m.dateOfBirth));
				if (isNaN(age)) {
					ageGroups['Not Specified']++;
				} else if (age >= 18 && age <= 25) {
					ageGroups['18-25']++;
				} else if (age >= 26 && age <= 35) {
					ageGroups['26-35']++;
				} else if (age >= 36 && age <= 45) {
					ageGroups['36-45']++;
				} else if (age >= 46 && age <= 55) {
					ageGroups['46-55']++;
				} else if (age >= 56) {
					ageGroups['56+']++;
				} else {
					ageGroups['Not Specified']++;
				}
			} else {
				ageGroups['Not Specified']++;
			}
		});

		Object.entries(ageGroups).forEach(([group, count]) => {
			const percentage = totalMembers > 0 ? ((count / totalMembers) * 100).toFixed(2) : '0.00';
			csvContent += createRow([group, count, `${percentage}%`]);
		});
		csvContent += '\n';

		// Referral Sources
		csvContent += '--- Referral Sources (How Members Heard About Us) ---\n';
		csvContent += createRow(['Source', 'Count', 'Percentage']);
		const referralSources: { [key: string]: number } = {};
		(data?.members || []).forEach((m: any) => {
			const source = m.heardFrom || 'Not Specified';
			referralSources[source] = (referralSources[source] || 0) + 1;
		});
		Object.entries(referralSources).forEach(([source, count]) => {
			const percentage = totalMembers > 0 ? ((count / totalMembers) * 100).toFixed(2) : '0.00';
			csvContent += createRow([source, count, `${percentage}%`]);
		});
		csvContent += '\n';

		// 12. Coach Specialization Analysis
		csvContent += '=== COACH SPECIALIZATION ANALYSIS ===\n';
		csvContent += createRow(['Specialization', 'Count', 'Percentage']);
		const specializationCounts: { [key: string]: number } = {};

		(data?.coaches || []).forEach((c: any) => {
			const specializations = c.coachDetails?.specialization || [];
			if (specializations.length === 0) {
				specializationCounts['General Fitness'] =
					(specializationCounts['General Fitness'] || 0) + 1;
			} else {
				specializations.forEach((spec: string) => {
					specializationCounts[spec] = (specializationCounts[spec] || 0) + 1;
				});
			}
		});

		const totalSpecializations = Object.values(specializationCounts).reduce((a, b) => a + b, 0);
		Object.entries(specializationCounts).forEach(([spec, count]) => {
			const percentage =
				totalSpecializations > 0 ? ((count / totalSpecializations) * 100).toFixed(2) : '0.00';
			csvContent += createRow([spec, count, `${percentage}%`]);
		});
		csvContent += '\n';

		// 13. Fitness Goals Analysis
		csvContent += '=== FITNESS GOALS ANALYSIS ===\n';
		csvContent += createRow(['Fitness Goal', 'Count', 'Percentage']);
		const fitnessGoals: { [key: string]: number } = {};

		(data?.members || []).forEach((m: any) => {
			const goal = m.membershipDetails?.fitnessGoal || 'Not Specified';
			fitnessGoals[goal] = (fitnessGoals[goal] || 0) + 1;
		});

		Object.entries(fitnessGoals).forEach(([goal, count]) => {
			const percentage = totalMembers > 0 ? ((count / totalMembers) * 100).toFixed(2) : '0.00';
			csvContent += createRow([goal, count, `${percentage}%`]);
		});
		csvContent += '\n';

		// 14. Export Metadata
		csvContent += '=== EXPORT METADATA ===\n';
		csvContent += createRow([
			'Export Date',
			new Date().toLocaleString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				timeZoneName: 'short',
			}),
		]);
		csvContent += createRow(['Generated By', 'X-TRIM FIT GYM Analytics System']);
		csvContent += createRow([
			'Total Records Exported',
			`${totalMembers} Members, ${coaches.length} Coaches, ${analyticsRangeData?.getAnalyticsRange?.length || 0} Daily Records`,
		]);
		csvContent += createRow([
			'Data Range',
			`From ${formatDate(analyticsRangeData?.getAnalyticsRange?.[0]?.date || new Date().toISOString())} to ${formatDate(analyticsRangeData?.getAnalyticsRange?.[analyticsRangeData.getAnalyticsRange.length - 1]?.date || new Date().toISOString())}`,
		]);

		// Create blob and download
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', filename);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const exportRevenuePdf = async () => {
		const doc = new jsPDF({ orientation: 'landscape' });
		const now = new Date();
		const filename = `revenue-report-${now.toISOString().replace(/[:.]/g, '-').slice(0, 19)}.pdf`;
		const summaryLine = `Total: PHP ${Number(totalRevenue).toLocaleString()} | Membership: PHP ${Number(membershipSubscriptionRevenue).toLocaleString()} | Walk-in: PHP ${Number(walkInRevenueTotal).toLocaleString()} | Active subscriptions: ${activeSubscriptions}`;
		const { startY } = await renderBrandedPdfHeader(
			doc,
			'Revenue Report',
			now,
			summaryLine,
			exportedByLabel
		);

		autoTable(doc, {
			startY,
			head: [['Metric', 'Value']],
			body: [
				['Total Revenue', `PHP ${Number(totalRevenue).toLocaleString()}`],
				['Membership Revenue', `PHP ${Number(membershipSubscriptionRevenue).toLocaleString()}`],
				['Walk-in Revenue', `PHP ${Number(walkInRevenueTotal).toLocaleString()}`],
				['Active Subscriptions', String(activeSubscriptions)],
			],
			styles: { fontSize: 9 },
			headStyles: { fillColor: [249, 197, 19], textColor: [20, 20, 20] },
			alternateRowStyles: { fillColor: [245, 245, 248] },
			margin: { left: 14, right: 14 },
		});
		doc.save(filename);
		appendLocalExportLog(ReportType.Revenue, filename);
		if (auditApiSupported) {
			await logReportDownload({
				variables: { input: { reportType: ReportType.Revenue, fileName: filename, filterSummary: 'reports-page-summary' } },
			})
				.then(() => refetchReportLogs())
				.catch(() => {});
		}
	};

	const exportNearEndingMembershipPdf = async () => {
		const thresholdDate = new Date();
		thresholdDate.setDate(thresholdDate.getDate() + 7);
		const nearEnding = (data?.members || []).filter((m: any) => {
			const exp = m.currentMembership?.expiresAt;
			if (!exp) return false;
			const d = new Date(exp);
			return d >= new Date() && d <= thresholdDate;
		});
		const doc = new jsPDF({ orientation: 'landscape' });
		const now = new Date();
		const filename = `near-ending-memberships-${now.toISOString().replace(/[:.]/g, '-').slice(0, 19)}.pdf`;
		const summaryLine = `Members near expiry (<=7 days): ${nearEnding.length} | Threshold date: ${thresholdDate.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}`;
		const { startY } = await renderBrandedPdfHeader(
			doc,
			'Near-Ending Memberships Report',
			now,
			summaryLine,
			exportedByLabel
		);

		autoTable(doc, {
			startY,
			head: [['Member', 'Plan', 'Expires At', 'Status']],
			body: nearEnding.map((m: any) => [
				`${m.firstName} ${m.lastName}`,
				m.currentMembership?.membership?.name || 'N/A',
				new Date(m.currentMembership?.expiresAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }),
				m.currentMembership?.status || 'N/A',
			]),
			styles: { fontSize: 9 },
			headStyles: { fillColor: [249, 197, 19], textColor: [20, 20, 20] },
			alternateRowStyles: { fillColor: [245, 245, 248] },
			margin: { left: 14, right: 14 },
		});
		doc.save(filename);
		appendLocalExportLog(ReportType.NearEndingMemberships, filename);
		if (auditApiSupported) {
			await logReportDownload({
				variables: { input: { reportType: ReportType.NearEndingMemberships, fileName: filename, filterSummary: 'threshold=7days' } },
			})
				.then(() => refetchReportLogs())
				.catch(() => {});
		}
	};

	const exportWalkInPdf = async () => {
		const rows = walkInOverviewData?.walkInAccountsOverview?.rows || [];
		const doc = new jsPDF({ orientation: 'landscape' });
		const now = new Date();
		const filename = `walk-in-report-${now.toISOString().replace(/[:.]/g, '-').slice(0, 19)}.pdf`;
		const totalTimeIns = rows.reduce((sum: number, r: any) => sum + Number(r.timeInCount ?? 0), 0);
		const summaryLine = `Profiles: ${rows.length} | Total time-ins (visible rows): ${totalTimeIns}`;
		const { startY } = await renderBrandedPdfHeader(
			doc,
			'Walk-in Accounts Report',
			now,
			summaryLine,
			exportedByLabel
		);

		autoTable(doc, {
			startY,
			head: [['Name', 'Phone', 'Email', 'Time-ins']],
			body: rows.map((r: any) => [
				`${r.client.firstName} ${r.client.lastName}`,
				r.client.phoneNumber || '-',
				r.client.email || '-',
				String(r.timeInCount ?? 0),
			]),
			styles: { fontSize: 9 },
			headStyles: { fillColor: [249, 197, 19], textColor: [20, 20, 20] },
			alternateRowStyles: { fillColor: [245, 245, 248] },
			margin: { left: 14, right: 14 },
		});
		doc.save(filename);
		appendLocalExportLog(ReportType.WalkIn, filename);
		if (auditApiSupported) {
			await logReportDownload({
				variables: { input: { reportType: ReportType.WalkIn, fileName: filename, filterSummary: 'accounts-overview' } },
			})
				.then(() => refetchReportLogs())
				.catch(() => {});
		}
	};

	// Export all members, coaches, and admins to CSV (no filters)
	const exportUsersToCSV = () => {
		if (membersLoading || coachesLoading || adminsLoading) {
			alert('Please wait for user data to finish loading.');
			return;
		}

		const membersList = data?.members ?? [];
		const coachesList = data?.coaches ?? [];
		const adminsList = data?.admins ?? [];

		const allUsers: any[] = [
			...membersList.map((u: any) => ({ ...u, role: 'member' })),
			...coachesList.map((u: any) => ({ ...u, role: 'coach' })),
			...adminsList.map((u: any) => ({ ...u, role: 'admin' })),
		];

		if (allUsers.length === 0) {
			alert('No users found to export.');
			return;
		}

		// Helper functions
		const escapeCSV = (value: any): string => {
			if (value === null || value === undefined) return '';
			const str = String(value);
			if (str.includes(',') || str.includes('"') || str.includes('\n')) {
				return `"${str.replace(/"/g, '""')}"`;
			}
			return str;
		};

		// Map gender to numeric value
		const mapGender = (gender: string | null | undefined): string => {
			if (!gender) return '1';
			const genderLower = gender.toLowerCase().trim();
			if (genderLower === 'male' || genderLower === 'm') return '1';
			if (genderLower === 'female' || genderLower === 'f') return '2';
			// For "Prefer not to say" or "N/A", default to 1
			return '1';
		};

		// Format person name: first name + middle name + last name
		const formatPersonName = (user: any): string => {
			const firstName = user.firstName || '';
			const middleName = user.middleName || '';
			const lastName = user.lastName || '';
			return `${firstName} ${middleName} ${lastName}`.trim().replace(/\s+/g, ' ');
		};

		// CSV Headers - New format
		const headers = [
			'*Person ID',
			'*Organization',
			'*Person Name',
			'*Gender',
			'Contact',
			'Email',
			'Effective Time',
			'Expiry Time',
			'Card No.',
			'Room No.',
			'Floor No.',
		];

		// Build CSV content
		let csvContent = headers.join(',') + '\n';

		// Add user rows
		allUsers.forEach((user: any) => {
			const row = [
				escapeCSV(user.attendanceId || ''),
				escapeCSV('Xtrimfitgym-users'),
				escapeCSV(formatPersonName(user)),
				escapeCSV(mapGender(user.gender)),
				'', // Contact - leave blank
				escapeCSV(user.email || ''),
				'2026/01/01', // Effective Time - default value
				'2026/12/01', // Expiry Time - default value
				'', // Card No. - leave blank
				'', // Room No. - leave blank
				'', // Floor No. - leave blank
			];

			csvContent += row.join(',') + '\n';
		});

		const filename = `users_export_all_${new Date().toISOString().split('T')[0]}.csv`;

		// Create blob and download
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', filename);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	// Show loading state only for essential data (members and coaches)
	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-yellow)] mx-auto mb-4"></div>
					<p className="text-[var(--text-secondary)]">Loading reports...</p>
				</div>
			</div>
		);
	}

	// Show error state only if essential data failed
	if (!data || (!membersData && !coachesData)) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="text-red-500 mb-4">
						<svg
							className="w-16 h-16 mx-auto"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
						Unable to Load Reports
					</h2>
					<p className="text-[var(--text-secondary)] mb-4">
						Failed to load essential data. Analytics may still be loading.
					</p>
					<button onClick={() => window.location.reload()} className="btn-primary">
						Retry
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold flex items-center gap-2">
						<BarChart3 className="w-8 h-8" color="var(--primary-yellow)" />
						Reports & Analytics
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-1">
						Comprehensive insights and analytics for your gym operations
					</p>
				</div>
				<div className="flex shrink-0 justify-start sm:justify-end">
				<Popover open={downloadablesOpen} onOpenChange={setDownloadablesOpen}>
					<PopoverTrigger asChild>
						<button
							type="button"
							className="flex items-center gap-2 px-4 py-2.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] text-sm font-medium hover:border-[var(--primary-yellow)] hover:bg-[rgba(249,197,19,0.08)] transition-all focus:outline-none focus:border-[var(--primary-yellow)] focus:ring-[3px] focus:ring-[rgba(249,197,19,0.15)]"
							aria-label="Downloadables: exports menu"
						>
							<Download className="w-4 h-4 text-[var(--primary-yellow)]" />
							Downloadables
							<ChevronDown
								className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${downloadablesOpen ? 'rotate-180' : ''}`}
							/>
						</button>
					</PopoverTrigger>
					<PopoverContent
						align="end"
						sideOffset={8}
						className="w-[min(100vw-2rem,20rem)] rounded-xl border border-[rgba(255,255,255,0.12)] p-2 text-[var(--text-primary)] shadow-2xl ring-1 ring-black/25 !bg-[#16181f]"
					>
						<div className="flex flex-col gap-0.5">
							<button
								type="button"
								onClick={() => {
									setDownloadablesOpen(false);
									exportToCSV();
								}}
								className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
							>
								<Download className="h-4 w-4 shrink-0 text-[#4ade80]" aria-hidden />
								<span>Analytics (CSV)</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setDownloadablesOpen(false);
									void exportRevenuePdf();
								}}
								className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
							>
								<Download className="h-4 w-4 shrink-0 text-[#fb923c]" aria-hidden />
								<span>Revenue (PDF)</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setDownloadablesOpen(false);
									void exportNearEndingMembershipPdf();
								}}
								className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
							>
								<Download className="h-4 w-4 shrink-0 text-[#fb923c]" aria-hidden />
								<span>Near-ending memberships (PDF)</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setDownloadablesOpen(false);
									void exportWalkInPdf();
								}}
								className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
							>
								<Download className="h-4 w-4 shrink-0 text-[#fb923c]" aria-hidden />
								<span>Walk-in (PDF)</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setDownloadablesOpen(false);
									exportUsersToCSV();
								}}
								disabled={userExportLoading}
								title={
									userExportLoading
										? 'Loading user data...'
										: 'Download CSV of all members, coaches, and admins'
								}
								className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.06)] transition-colors disabled:pointer-events-none disabled:opacity-45"
							>
								<Download className="h-4 w-4 shrink-0 text-[#4ade80]" aria-hidden />
								<span>{userExportLoading ? 'Loading users…' : 'All users (CSV)'}</span>
							</button>
						</div>
					</PopoverContent>
				</Popover>
				</div>
			</div>

			{/* Analytics Error Banner - Only show if there's an actual error */}
			{error && (
				<div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg p-4 flex items-center gap-3">
					<svg
						className="w-5 h-5 text-red-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<p className="text-red-400">Analytics data unavailable. Showing fallback data.</p>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<SummaryCard
					icon={PhilippinePeso}
					title="Total revenue"
					value={`₱${totalRevenue.toLocaleString()}`}
					change="Membership + walk-in"
					changeType="positive"
				/>
				<SummaryCard
					icon={PhilippinePeso}
					title="Membership revenue"
					value={`₱${membershipSubscriptionRevenue.toLocaleString()}`}
					change="All-time subscription sales"
					changeType="positive"
				/>
				<SummaryCard
					icon={PhilippinePeso}
					title="Walk-in fees"
					value={`₱${walkInRevenueTotal.toLocaleString()}`}
					change="Sum of time-in payments"
					changeType="positive"
				/>
				<SummaryCard
					icon={Users}
					title="Total Members"
					value={totalMembers}
					change={`${activeMembers} active`}
					changeType="positive"
				/>
				<SummaryCard
					icon={TrendingUp}
					title="Avg subscription / member"
					value={`₱${avgRevenuePerMember.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
					change={`${subscriptionRetentionRate}% retention`}
					changeType="positive"
				/>
				<SummaryCard
					icon={Activity}
					title="Active Subscriptions"
					value={activeSubscriptions}
					change={`${newSubscriptions} new, ${canceledSubscriptions} canceled`}
					changeType="positive"
				/>
			</div>

			{/* Charts Row 1: Revenue Trends & Membership Distribution */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="section-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-md">
					<h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)] font-['Poppins']">
						Revenue Trends (Last 30 Days)
					</h2>
					<div className="h-64">
						<Line
							data={revenueData}
							options={{
								maintainAspectRatio: false,
								responsive: true,
								plugins: {
									legend: {
										display: true,
										position: 'top',
									},
									tooltip: {
										mode: 'index',
										intersect: false,
										callbacks: {
											label: function (context: any) {
												return `₱${context.parsed.y.toLocaleString()}`;
											},
										},
									},
								},
								scales: {
									y: {
										beginAtZero: true,
										ticks: {
											callback: function (value: any) {
												return `₱${value.toLocaleString()}`;
											},
										},
									},
								},
							}}
						/>
					</div>
				</div>
				<div className="section-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-md">
					<h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)] font-['Poppins']">
						Membership Distribution
					</h2>
					<div className="h-64">
						<Doughnut
							data={membershipData}
							options={{
								maintainAspectRatio: false,
								responsive: true,
								plugins: {
									legend: {
										display: true,
										position: 'bottom',
									},
									tooltip: {
										callbacks: {
											label: function (context: any) {
												const label = context.label || '';
												const value = context.parsed || 0;
												const total = context.dataset.data.reduce(
													(a: number, b: number) => a + b,
													0
												);
												const percentage = ((value / total) * 100).toFixed(1);
												return `${label}: ${value} (${percentage}%)`;
											},
										},
									},
								},
							}}
						/>
					</div>
				</div>
			</div>

			{/* Charts Row 2: Revenue by Membership & Subscription Trends */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{revenueByMembershipChart.labels.length > 0 && (
					<div className="section-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-md">
						<h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)] font-['Poppins']">
							Revenue by Membership Type
						</h2>
						<div className="h-64">
							<Bar
								data={revenueByMembershipChart}
								options={{
									maintainAspectRatio: false,
									responsive: true,
									plugins: {
										legend: {
											display: false,
										},
										tooltip: {
											callbacks: {
												label: function (context: any) {
													return `₱${context.parsed.y.toLocaleString()}`;
												},
											},
										},
									},
									scales: {
										y: {
											beginAtZero: true,
											ticks: {
												callback: function (value: any) {
													return `₱${value.toLocaleString()}`;
												},
											},
										},
									},
								}}
							/>
						</div>
					</div>
				)}
				<div className="section-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-md">
					<h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)] font-['Poppins']">
						Subscription Status Overview
					</h2>
					<div className="h-64">
						<Bar
							data={subscriptionTrendsChart}
							options={{
								maintainAspectRatio: false,
								responsive: true,
								plugins: {
									legend: {
										display: false,
									},
									tooltip: {
										callbacks: {
											label: function (context: any) {
												return `${context.label}: ${context.parsed.y}`;
											},
										},
									},
								},
								scales: {
									y: {
										beginAtZero: true,
										ticks: {
											stepSize: 1,
										},
									},
								},
							}}
						/>
					</div>
				</div>
			</div>

			{/* Charts Row 3: Revenue by Period & Member Growth */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{revenueByPeriodChart.labels.length > 0 && (
					<div className="section-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-md">
						<h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)] font-['Poppins']">
							Revenue by Period
						</h2>
						<div className="h-64">
							<Bar
								data={revenueByPeriodChart}
								options={{
									maintainAspectRatio: false,
									responsive: true,
									plugins: {
										legend: {
											display: true,
											position: 'top',
										},
										tooltip: {
											callbacks: {
												label: function (context: any) {
													return `${context.dataset.label}: ₱${context.parsed.y.toLocaleString()}`;
												},
											},
										},
									},
									scales: {
										x: { stacked: true },
										y: {
											stacked: true,
											beginAtZero: true,
											ticks: {
												callback: function (value: any) {
													return `₱${value.toLocaleString()}`;
												},
											},
										},
									},
								}}
							/>
						</div>
					</div>
				)}
				<div className="section-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-md">
					<h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)] font-['Poppins']">
						Member Growth (Last 6 Months)
					</h2>
					<div className="h-64">
						<Bar
							data={memberGrowthData}
							options={{
								maintainAspectRatio: false,
								responsive: true,
								plugins: {
									legend: {
										display: false,
									},
									tooltip: {
										callbacks: {
											label: function (context: any) {
												return `${context.parsed.y} new members`;
											},
										},
									},
								},
								scales: {
									y: {
										beginAtZero: true,
										ticks: {
											stepSize: 1,
										},
									},
								},
							}}
						/>
					</div>
				</div>
			</div>

			{/* Recent report exports — secondary; placed last */}
			<div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 backdrop-blur-md">
				<h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
					Recent Report Exports
				</h2>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-[var(--text-secondary)] border-b border-[var(--card-border)]">
								<th className="px-3 py-2 font-medium">Exported At</th>
								<th className="px-3 py-2 font-medium">Report</th>
								<th className="px-3 py-2 font-medium">Exported By</th>
								<th className="px-3 py-2 font-medium">Role</th>
								<th className="px-3 py-2 font-medium">File</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--card-border)]">
							{reportLogsLoading ? (
								<tr>
									<td colSpan={5} className="px-3 py-6 text-center text-[var(--text-secondary)]">
										Loading export logs...
									</td>
								</tr>
							) : recentReportLogs.length === 0 ? (
								<tr>
									<td colSpan={5} className="px-3 py-6 text-center text-[var(--text-secondary)]">
										No export logs yet.
									</td>
								</tr>
							) : (
								recentReportLogs.map((row: any) => {
									const asText = (value: unknown): string => {
										if (typeof value === 'string') return value.trim();
										if (typeof value === 'number') return String(value);
										if (value && typeof value === 'object') {
											const obj = value as Record<string, unknown>;
											const candidate = [
												obj.fullName,
												obj.name,
												obj.email,
												obj.id,
												obj._id,
												obj.value,
											].find((entry) => typeof entry === 'string' && entry.trim().length > 0);
											return typeof candidate === 'string' ? candidate.trim() : '';
										}
										return '';
									};
									const firstName = asText(row.downloadedBy?.firstName);
									const lastName = asText(row.downloadedBy?.lastName);
									const matchedLocalLog = localExportLogs.find((localRow) => {
										if (!localRow) return false;
										const sameFile =
											asText(localRow.fileName) !== '' &&
											asText(localRow.fileName) === asText(row.fileName);
										const sameReportType =
											asText(localRow.reportType) !== '' &&
											asText(localRow.reportType).toUpperCase() ===
												asText(row.reportType).toUpperCase();
										return sameFile && sameReportType;
									});
									const localName = [
										asText(matchedLocalLog?.downloadedBy?.firstName),
										asText(matchedLocalLog?.downloadedBy?.lastName),
									]
										.filter((value) => value.length > 0)
										.join(' ')
										.trim();
									const localEmail = asText(matchedLocalLog?.downloadedBy?.email);
									const fullName = [firstName, lastName]
										.filter((value) => value.length > 0)
										.join(' ')
										.trim();
									const sameAsCurrentUser =
										!!currentUser?.id && row.downloadedById === currentUser.id;
									const fallbackCurrentUserName =
										sameAsCurrentUser
											? [currentUser?.firstName, currentUser?.lastName]
													.filter(Boolean)
													.join(' ')
													.trim()
											: '';
									const downloadedByEmail = asText(row.downloadedBy?.email);
									const downloadedByIdValue = asText(row.downloadedById);
									const downloadedByObjectValue = asText(row.downloadedBy);
									const exporterDisplay =
										fullName ||
										localName ||
										fallbackCurrentUserName ||
										downloadedByEmail ||
										localEmail ||
										downloadedByObjectValue ||
										downloadedByIdValue ||
										'Unknown user';
									const safeExporterDisplay = /^\[object Object\](\s+\[object Object\])*$/.test(
										exporterDisplay
									)
										? 'Unknown user'
										: exporterDisplay;
									return (
										<tr key={row.id} className="hover:bg-[rgba(255,255,255,0.03)]">
											<td className="px-3 py-2 text-[var(--text-primary)]">
												{row.createdAt
													? new Date(row.createdAt).toLocaleString('en-PH', {
															timeZone: 'Asia/Manila',
														})
													: '-'}
											</td>
											<td className="px-3 py-2 text-[var(--text-primary)]">
												{String(row.reportType || '').replaceAll('_', ' ')}
											</td>
											<td className="px-3 py-2 text-[var(--text-primary)]">
												{safeExporterDisplay}
											</td>
											<td className="px-3 py-2 text-[var(--text-secondary)] uppercase">
												{row.downloadedByRole || '-'}
											</td>
											<td className="px-3 py-2 text-[var(--text-secondary)]">
												{row.fileName || '-'}
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

function SummaryCard({
	icon: Icon,
	title,
	value,
	change,
	changeType,
}: {
	icon: typeof PhilippinePeso;
	title: string;
	value: string | number;
	change: string;
	changeType: 'positive' | 'negative' | 'neutral';
}) {
	return (
		<div className="stat-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[18px] p-7 backdrop-blur-md">
			<div className="flex items-center justify-between mb-6">
				<div className="stat-icon w-14 h-14 rounded-[14px] bg-gradient-to-br from-[rgba(249,197,19,0.15)] to-[rgba(228,30,38,0.1)] flex items-center justify-center text-[1.6rem] text-[var(--primary-yellow)]">
					<Icon className="w-6 h-6" />
				</div>
			</div>
			<h3 className="text-[0.85rem] font-medium text-[var(--text-secondary)] mb-2 uppercase">
				{title}
			</h3>
			<div className="stat-value text-[2.2rem] font-bold tracking-tight text-[var(--text-primary)] mb-2 font-['Inter',ui-sans-serif,system-ui,sans-serif] tabular-nums">
				{value}
			</div>
			<div
				className={`stat-change text-[0.8rem] font-semibold flex items-center gap-1 ${
					changeType === 'positive'
						? 'text-[var(--primary-yellow)]'
						: changeType === 'negative'
							? 'text-[#EF4444]'
							: 'text-[var(--text-secondary)]'
				}`}
			>
				{change}
			</div>
		</div>
	);
}
