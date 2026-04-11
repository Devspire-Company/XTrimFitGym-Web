import { useState, useEffect } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Edit, Trash2, CreditCard, Crown, Check } from 'lucide-react';
import { MembershipFormModal, type MembershipFormData } from '@/components/modals/MembershipFormModal';
import { MembershipViewModal } from '@/components/modals/MembershipViewModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { SuccessModal } from '@/components/modals/SuccessModal';
import {
	GET_ALL_MEMBERSHIPS,
	CREATE_MEMBERSHIP,
	UPDATE_MEMBERSHIP,
	DELETE_MEMBERSHIP,
	MEMBERSHIPS_UPDATED,
} from '@/graphql/operations/index';
import type { Membership } from '@/graphql/generated/types';
import { MembershipStatus, DurationType } from '@/graphql/generated/graphql';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';

export function MembershipsPage() {
	useEffect(() => {
		document.title = 'Membership Management - X-TRIM FIT GYM';
	}, []);

	const dispatch = useAppDispatch();
	const [selectedPlan, setSelectedPlan] = useState<Membership | null>(null);
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);
	const [isFormModalOpen, setIsFormModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
	const [successMessage, setSuccessMessage] = useState('');
	const [isEditMode, setIsEditMode] = useState(false);

	// Initial data fetch with query
	const { data, loading, error } = useQuery(GET_ALL_MEMBERSHIPS, {
		errorPolicy: 'none',
	});

	// Real-time subscription for membership updates
	const { data: subscriptionData } = useSubscription(MEMBERSHIPS_UPDATED, {
		skip: !data, // Skip if initial data not loaded
	});

	// Use subscription data if available, otherwise fall back to query data
	const membershipsData = subscriptionData?.membershipsUpdated || data?.getMemberships || [];

	const [createMembership, { loading: creating }] = useMutation(CREATE_MEMBERSHIP, {
		onCompleted: () => {
			setSuccessMessage('Membership plan created successfully!');
			setIsSuccessModalOpen(true);
			setIsFormModalOpen(false);
			// Subscription will automatically update the data
			dispatch(addToast({ type: 'success', message: 'Membership plan created!' }));
		},
		onError: (error) => {
			dispatch(addToast({ type: 'error', message: error.message }));
		},
	});

	const [updateMembership, { loading: updating }] = useMutation(UPDATE_MEMBERSHIP, {
		onCompleted: () => {
			setSuccessMessage('Membership plan updated successfully!');
			setIsSuccessModalOpen(true);
			setIsFormModalOpen(false);
			// Subscription will automatically update the data
			dispatch(addToast({ type: 'success', message: 'Membership plan updated!' }));
		},
		onError: (error) => {
			dispatch(addToast({ type: 'error', message: error.message }));
		},
	});

	const [deleteMembership, { loading: deleting }] = useMutation(DELETE_MEMBERSHIP, {
		onCompleted: () => {
			setSuccessMessage('Membership plan deleted successfully!');
			setIsSuccessModalOpen(true);
			setIsDeleteModalOpen(false);
			setSelectedPlan(null);
			// Subscription will automatically update the data
			dispatch(addToast({ type: 'success', message: 'Membership plan deleted!' }));
		},
		onError: (error) => {
			dispatch(addToast({ type: 'error', message: error.message }));
		},
	});

	const handleCreatePlan = () => {
		setIsEditMode(false);
		setSelectedPlan(null);
		setIsFormModalOpen(true);
	};

	const handleEditPlan = (plan: Membership) => {
		setIsEditMode(true);
		setSelectedPlan(plan);
		setIsFormModalOpen(true);
		setIsViewModalOpen(false);
	};

	const handleDeletePlan = (plan: Membership) => {
		setSelectedPlan(plan);
		setIsDeleteModalOpen(true);
		setIsViewModalOpen(false);
	};

	const handleFormSubmit = (formData: MembershipFormData) => {
		// Map status from form format to API format
		const statusMap: Record<string, MembershipStatus> = {
			'Active': MembershipStatus.Active,
			'Inactive': MembershipStatus.Inactive,
			'Coming Soon': MembershipStatus.ComingSoon,
		};

		// Map durationType from form format to API format
		const durationMap: Record<string, DurationType> = {
			'Monthly': DurationType.Monthly,
			'Quarterly': DurationType.Quarterly,
			'Yearly': DurationType.Yearly,
			'Daily': DurationType.Daily,
		};

		const status = statusMap[formData.status] ?? MembershipStatus.Active;
		const durationType = durationMap[formData.durationType] ?? DurationType.Monthly;

		if (isEditMode && selectedPlan) {
			// Update existing plan
			updateMembership({
				variables: {
					id: selectedPlan.id,
					input: {
						name: formData.name,
						monthlyPrice: formData.monthlyPrice,
						description: formData.description,
						features: formData.features,
						status,
						durationType,
						monthDuration: formData.monthDuration,
					},
				},
			});
		} else {
			// Create new plan
			createMembership({
				variables: {
					input: {
						name: formData.name,
						monthlyPrice: formData.monthlyPrice,
						description: formData.description,
						features: formData.features,
						status,
						durationType,
						monthDuration: formData.monthDuration,
					},
				},
			});
		}
	};

	const handleConfirmDelete = () => {
		if (selectedPlan) {
			deleteMembership({
				variables: {
					id: selectedPlan.id,
				},
			});
		}
	};

	// Show loading state
	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-yellow)] mx-auto mb-4"></div>
					<p className="text-[var(--text-secondary)]">Loading membership plans...</p>
				</div>
			</div>
		);
	}

	// Show error state
	if (error || !data) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="text-red-500 mb-4">
						<svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Unable to Load Membership Plans</h2>
					<p className="text-[var(--text-secondary)] mb-4">
						{error?.message || 'Failed to connect to the server'}
					</p>
					<button 
						onClick={() => window.location.reload()} 
						className="btn-primary"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	const plans: Membership[] = membershipsData;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold flex items-center gap-2">
						<CreditCard className="w-8 h-8" color="var(--primary-yellow)" />
						Membership Management
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-1">
						Manage membership plans, pricing, and features ({plans.length} plans)
					</p>
				</div>
				<div className="flex items-center gap-3">
					<Button onClick={handleCreatePlan}>
						<Plus className="w-4 h-4" />
						Add New Plan
					</Button>
				</div>
			</div>

			<div className="plans-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
				{plans.map((plan) => {
					const isFeatured = plan.name.includes('PROMO');
					const statusMap: Record<string, string> = {
						ACTIVE: 'Active',
						INACTIVE: 'Inactive',
						COMING_SOON: 'Coming Soon',
					};
					const durationMap: Record<string, string> = {
						MONTHLY: 'month',
						QUARTERLY: 'quarter',
						YEARLY: 'year',
						DAILY: 'day pass',
					};

					return (
						<div
							key={plan.id}
							className={`plan-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[20px] p-8 backdrop-blur-md ${
								isFeatured
									? 'featured border-2 border-[var(--primary-yellow)] shadow-[0_0_30px_rgba(249,197,19,0.2)]'
									: ''
							}`}
						>
							<div className="plan-header flex items-center justify-between mb-6">
								<div className="plan-name-section flex-1">
									{isFeatured && (
										<span className="plan-badge inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider mb-3 bg-[rgba(249,197,19,0.15)] text-[var(--primary-yellow)] border border-[rgba(249,197,19,0.3)]">
											<Crown className="w-3 h-3" />
											Popular
										</span>
									)}
									<h3 className="plan-name text-[1.75rem] font-bold text-[var(--text-primary)] mb-2 font-['Poppins']">
										{plan.name}
									</h3>
								</div>
								<span
									className={`plan-status-badge px-2.5 py-1.5 text-xs rounded-lg font-semibold ${
										plan.status === 'ACTIVE'
											? 'active bg-[rgba(16,185,129,0.15)] text-[#10B981] border border-[rgba(16,185,129,0.3)]'
											: 'inactive bg-[rgba(107,114,128,0.15)] text-[#9CA3AF] border border-[rgba(107,114,128,0.3)]'
									}`}
								>
									{statusMap[plan.status] || plan.status}
								</span>
							</div>
							<div className="plan-price flex items-baseline gap-2 mb-4">
								<span className="plan-price-value text-[2.5rem] font-bold text-[var(--primary-yellow)] font-['Poppins']">
									₱{plan.monthlyPrice.toLocaleString()}
								</span>
								<span className="plan-price-period text-base text-[var(--text-secondary)] font-medium">
									/{durationMap[plan.durationType] || 'month'}
								</span>
							</div>
							<p className="plan-description text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
								{plan.description}
							</p>
							<ul className="plan-features space-y-3 mb-6">
								{plan.features?.map((feature, idx) => (
									<li
										key={idx}
										className="flex items-center gap-3 text-sm text-[var(--text-secondary)] py-3 border-b border-[rgba(255,255,255,0.05)] last:border-0"
									>
										<Check className="text-[var(--primary-yellow)] w-4 h-4 flex-shrink-0" aria-hidden strokeWidth={3} />
										<span>{feature}</span>
									</li>
								))}
							</ul>
							<div className="plan-actions flex gap-3">
								<button
									onClick={() => {
										setSelectedPlan(plan);
										setIsViewModalOpen(true);
									}}
									className="btn-small btn-view flex-1 px-4 py-2 rounded-lg text-xs font-semibold bg-[rgba(59,130,246,0.15)] text-[#3B82F6] border border-[rgba(59,130,246,0.3)] flex items-center justify-center gap-2"
								>
									<Eye className="w-4 h-4" />
									View
								</button>
								<button
									onClick={() => handleEditPlan(plan)}
									className="btn-small btn-edit flex-1 px-4 py-2 rounded-lg text-xs font-semibold bg-[rgba(249,197,19,0.15)] text-[var(--primary-yellow)] border border-[rgba(249,197,19,0.3)] flex items-center justify-center gap-2"
								>
									<Edit className="w-4 h-4" />
									Edit
								</button>
								<button
									onClick={() => handleDeletePlan(plan)}
									className="btn-small btn-delete flex-1 px-4 py-2 rounded-lg text-xs font-semibold bg-[rgba(239,68,68,0.15)] text-[#EF4444] border border-[rgba(239,68,68,0.3)] flex items-center justify-center gap-2"
								>
									<Trash2 className="w-4 h-4" />
									Delete
								</button>
							</div>
						</div>
					);
				})}
			</div>

			{/* Modals */}
			<MembershipViewModal
				isOpen={isViewModalOpen}
				onClose={() => {
					setIsViewModalOpen(false);
					setSelectedPlan(null);
				}}
				membership={selectedPlan}
				onEdit={() => handleEditPlan(selectedPlan!)}
			/>

			<MembershipFormModal
				isOpen={isFormModalOpen}
				onClose={() => {
					setIsFormModalOpen(false);
					setSelectedPlan(null);
					setIsEditMode(false);
				}}
				onSubmit={handleFormSubmit}
				membership={isEditMode ? selectedPlan : null}
				isLoading={creating || updating}
			/>

			<DeleteConfirmModal
				isOpen={isDeleteModalOpen}
				onClose={() => {
					setIsDeleteModalOpen(false);
					setSelectedPlan(null);
				}}
				onConfirm={handleConfirmDelete}
				title="Delete Membership Plan?"
				message={`Are you sure you want to delete "${selectedPlan?.name}"? This action cannot be undone.`}
				isDeleting={deleting}
			/>

			<SuccessModal
				isOpen={isSuccessModalOpen}
				onClose={() => setIsSuccessModalOpen(false)}
				title="Success!"
				message={successMessage}
			/>
		</div>
	);
}
