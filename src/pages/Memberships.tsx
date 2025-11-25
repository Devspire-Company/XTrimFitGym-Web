import { useState, useEffect } from 'react';
import { mockMembershipPlans, type MockMembershipPlan } from '@/lib/mock/data';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Edit, Trash2, CreditCard, Crown } from 'lucide-react';

export function MembershipsPage() {
	useEffect(() => {
		document.title = 'Membership Management - X-TRIM FIT GYM';
	}, []);
	const [selectedPlan, setSelectedPlan] = useState<MockMembershipPlan | null>(null);
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);

	const plans = Object.values(mockMembershipPlans);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold flex items-center gap-2">
						<CreditCard className="w-8 h-8" color="var(--primary-yellow)" />
						Membership Management
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-1">
						Manage membership plans, pricing, and features
					</p>
				</div>
				<Button>
					<Plus className="w-4 h-4" />
					Add New Plan
				</Button>
			</div>

			<div className="plans-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
				{plans.map((plan) => {
					const isFeatured = plan.count > 0;
					return (
						<div
							key={plan.id}
							className={`plan-card bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[20px] p-8 backdrop-blur-[10px] ${
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
										plan.status === 'Active'
											? 'active bg-[rgba(16,185,129,0.15)] text-[#10B981] border border-[rgba(16,185,129,0.3)]'
											: 'inactive bg-[rgba(107,114,128,0.15)] text-[#9CA3AF] border border-[rgba(107,114,128,0.3)]'
									}`}
								>
									{plan.status}
								</span>
							</div>
							<div className="plan-price flex items-baseline gap-2 mb-4">
								<span className="plan-price-value text-[2.5rem] font-bold text-[var(--primary-yellow)] font-['Poppins']">
									₱{plan.price.toLocaleString()}
								</span>
								<span className="plan-price-period text-base text-[var(--text-secondary)] font-medium">
									/{plan.duration.toLowerCase()}
								</span>
							</div>
							<p className="plan-description text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
								{plan.description}
							</p>
							<ul className="plan-features space-y-3 mb-6">
								{plan.features.map((feature, idx) => (
									<li
										key={idx}
										className="flex items-center gap-3 text-sm text-[var(--text-secondary)] py-3 border-b border-[rgba(255,255,255,0.05)] last:border-0"
									>
										<span className="text-[var(--primary-yellow)] text-xs w-5 flex-shrink-0">
											✓
										</span>
										<span>{feature}</span>
									</li>
								))}
							</ul>
							<div className="plan-stats flex gap-4 mb-6 p-4 bg-[rgba(255,255,255,0.02)] rounded-xl">
								<div className="plan-stat flex-1 text-center">
									<span className="plan-stat-value block text-2xl font-bold text-[var(--primary-yellow)] mb-1">
										{plan.count}
									</span>
									<span className="plan-stat-label text-xs text-[var(--text-secondary)] uppercase tracking-wider">
										Active Members
									</span>
								</div>
								<div className="plan-stat flex-1 text-center">
									<span className="plan-stat-value block text-2xl font-bold text-[var(--primary-yellow)] mb-1">
										₱{(plan.price * plan.count).toLocaleString()}
									</span>
									<span className="plan-stat-label text-xs text-[var(--text-secondary)] uppercase tracking-wider">
										Monthly Revenue
									</span>
								</div>
							</div>
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
								<button className="btn-small btn-edit flex-1 px-4 py-2 rounded-lg text-xs font-semibold bg-[rgba(249,197,19,0.15)] text-[var(--primary-yellow)] border border-[rgba(249,197,19,0.3)] flex items-center justify-center gap-2">
									<Edit className="w-4 h-4" />
									Edit
								</button>
								<button className="btn-small btn-delete flex-1 px-4 py-2 rounded-lg text-xs font-semibold bg-[rgba(239,68,68,0.15)] text-[#EF4444] border border-[rgba(239,68,68,0.3)] flex items-center justify-center gap-2">
									<Trash2 className="w-4 h-4" />
									Delete
								</button>
							</div>
						</div>
					);
				})}
			</div>

			{isViewModalOpen && selectedPlan && (
				<div
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
					onClick={() => setIsViewModalOpen(false)}
				>
					<div
						className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4"
						onClick={(e) => e.stopPropagation()}
					>
						<h2 className="text-2xl font-bold mb-4">Plan Details</h2>
						<div className="space-y-4">
							<div>
								<span className="text-gray-600 dark:text-gray-400">Name:</span>{' '}
								<span className="font-medium">{selectedPlan.name}</span>
							</div>
							<div>
								<span className="text-gray-600 dark:text-gray-400">Price:</span>{' '}
								<span className="font-medium">₱{selectedPlan.price.toLocaleString()}</span>
							</div>
							<div>
								<span className="text-gray-600 dark:text-gray-400">Duration:</span>{' '}
								<span className="font-medium">{selectedPlan.duration}</span>
							</div>
							<div>
								<span className="text-gray-600 dark:text-gray-400">Active Members:</span>{' '}
								<span className="font-medium">{selectedPlan.count}</span>
							</div>
						</div>
						<Button className="mt-6" onClick={() => setIsViewModalOpen(false)}>
							Close
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
