import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { removeToast } from '@/store/slices/uiSlice';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const icons = {
	success: CheckCircle2,
	error: XCircle,
	warning: AlertTriangle,
	info: Info,
};

export function ToastContainer() {
	const toasts = useAppSelector((state) => state.ui.toasts);
	const dispatch = useAppDispatch();

	return (
		<div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full">
			{toasts.map((toast) => {
				const Icon = icons[toast.type];
				return (
					<Toast
						key={toast.id}
						toast={toast}
						Icon={Icon}
						onClose={() => dispatch(removeToast(toast.id))}
					/>
				);
			})}
		</div>
	);
}

function Toast({
	toast,
	Icon,
	onClose,
}: {
	toast: { id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' };
	Icon: typeof CheckCircle2;
	onClose: () => void;
}) {
	useEffect(() => {
		const timer = setTimeout(() => {
			onClose();
		}, 5000);

		return () => clearTimeout(timer);
	}, [onClose]);

	return (
		<div
			className={cn(
				'flex items-center gap-3 p-4 rounded-lg shadow-lg border bg-white dark:bg-gray-800 animate-in slide-in-from-right',
				{
					'border-green-200 dark:border-green-800': toast.type === 'success',
					'border-red-200 dark:border-red-800': toast.type === 'error',
					'border-yellow-200 dark:border-yellow-800': toast.type === 'warning',
					'border-blue-200 dark:border-blue-800': toast.type === 'info',
				}
			)}
		>
			<Icon
				className={cn('w-5 h-5 shrink-0', {
					'text-green-600 dark:text-green-400': toast.type === 'success',
					'text-red-600 dark:text-red-400': toast.type === 'error',
					'text-yellow-600 dark:text-yellow-400': toast.type === 'warning',
					'text-blue-600 dark:text-blue-400': toast.type === 'info',
				})}
			/>
			<p className="flex-1 text-sm font-medium">{toast.message}</p>
			<button
				onClick={onClose}
				className="shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
			>
				<X className="w-4 h-4" />
			</button>
		</div>
	);
}

