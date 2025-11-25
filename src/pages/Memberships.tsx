import { useState } from 'react';
import { mockMembershipPlans, type MockMembershipPlan } from '@/lib/mock/data';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Edit, Trash2, CreditCard, Crown } from 'lucide-react';

export function MembershipsPage() {
	const [selectedPlan, setSelectedPlan] = useState<MockMembershipPlan | null>(null);
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);

	const plans = Object.values(mockMembershipPlans);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold flex items-center gap-2">
						<CreditCard className="w-8 h-8" />
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

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{plans.map((plan) => {
					const isFeatured = plan.count > 0;
					return (
						<div
							key={plan.id}
							className={`bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border-2 ${
								isFeatured ? 'border-primary' : 'border-gray-200 dark:border-gray-700'
							}`}
						>
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center gap-2">
									{isFeatured && (
										<span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center gap-1">
											<Crown className="w-3 h-3" />
											Popular
										</span>
									)}
									<h3 className="text-xl font-bold">{plan.name}</h3>
								</div>
								<span
									className={`px-2 py-1 text-xs rounded-full ${
										plan.status === 'Active'
											? 'bg-green-100 dark:bg-green-900 text-green-800'
											: 'bg-gray-100 dark:bg-gray-700'
									}`}
								>
									{plan.status}
								</span>
							</div>
							<div className="mb-4">
								<span className="text-3xl font-bold">₱{plan.price.toLocaleString()}</span>
								<span className="text-gray-600 dark:text-gray-400">/{plan.duration.toLowerCase()}</span>
							</div>
							<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{plan.description}</p>
							<ul className="space-y-2 mb-6">
								{plan.features.map((feature, idx) => (
									<li key={idx} className="flex items-center gap-2 text-sm">
										<span className="text-green-600">✓</span>
										<span>{feature}</span>
									</li>
								))}
							</ul>
							<div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
								<div>
									<div className="text-2xl font-bold">{plan.count}</div>
									<div className="text-xs text-gray-600 dark:text-gray-400">Active Members</div>
								</div>
								<div>
									<div className="text-2xl font-bold">₱{(plan.price * plan.count).toLocaleString()}</div>
									<div className="text-xs text-gray-600 dark:text-gray-400">Monthly Revenue</div>
								</div>
							</div>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									className="flex-1"
									onClick={() => {
										setSelectedPlan(plan);
										setIsViewModalOpen(true);
									}}
								>
									<Eye className="w-4 h-4" />
									View
								</Button>
								<Button variant="outline" size="sm" className="flex-1">
									<Edit className="w-4 h-4" />
									Edit
								</Button>
								<Button variant="outline" size="sm" className="flex-1">
									<Trash2 className="w-4 h-4" />
									Delete
								</Button>
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

