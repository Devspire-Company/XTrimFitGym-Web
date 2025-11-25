import { useState } from 'react';
import { Settings as SettingsIcon, User, Sliders, Bell, Shield, Key, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/store/hooks';

export function SettingsPage() {
	const { user } = useAppSelector((state) => state.auth);
	const [activeSection, setActiveSection] = useState('account');

	const sections = [
		{ id: 'account', label: 'Account Information', icon: User },
		{ id: 'preferences', label: 'System Preferences', icon: Sliders },
		{ id: 'notifications', label: 'Notification Settings', icon: Bell },
		{ id: 'security', label: 'Account Security', icon: Shield },
	];

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold flex items-center gap-2">
					<SettingsIcon className="w-8 h-8" />
					Settings
				</h1>
				<p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account settings and preferences</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
				{/* Sidebar */}
				<div className="lg:col-span-1">
					<div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
						<div className="text-center mb-6">
							<div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xl">
								{user?.firstName?.[0] || 'A'}
								{user?.lastName?.[0] || 'D'}
							</div>
							<h3 className="font-semibold">
								{user?.firstName} {user?.lastName}
							</h3>
							<p className="text-sm text-gray-600 dark:text-gray-400">System Administrator</p>
						</div>
						<nav className="space-y-2">
							{sections.map((section) => {
								const Icon = section.icon;
								return (
									<button
										key={section.id}
										onClick={() => setActiveSection(section.id)}
										className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
											activeSection === section.id
												? 'bg-primary text-primary-foreground'
												: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
										}`}
									>
										<Icon className="w-5 h-5" />
										<span>{section.label}</span>
									</button>
								);
							})}
						</nav>
					</div>
				</div>

				{/* Content */}
				<div className="lg:col-span-3">
					<div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
						{activeSection === 'account' && <AccountSection />}
						{activeSection === 'preferences' && <PreferencesSection />}
						{activeSection === 'notifications' && <NotificationsSection />}
						{activeSection === 'security' && <SecuritySection />}
					</div>
				</div>
			</div>
		</div>
	);
}

function AccountSection() {
	const { user } = useAppSelector((state) => state.auth);
	return (
		<div>
			<h2 className="text-xl font-semibold mb-6">Account Information</h2>
			<div className="space-y-4">
				<div>
					<label className="block text-sm font-medium mb-2">Email Address</label>
					<input
						type="email"
						value={user?.email || ''}
						readOnly
						className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium mb-2">Role</label>
					<input
						type="text"
						value="System Administrator"
						readOnly
						className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"
					/>
				</div>
			</div>
		</div>
	);
}

function PreferencesSection() {
	return (
		<div>
			<h2 className="text-xl font-semibold mb-6">System Preferences</h2>
			<div className="space-y-4">
				<div>
					<label className="block text-sm font-medium mb-2">Timezone</label>
					<select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">
						<option>Asia/Manila (GMT+8)</option>
					</select>
				</div>
				<div>
					<label className="block text-sm font-medium mb-2">Date Format</label>
					<select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">
						<option>MM/DD/YYYY</option>
					</select>
				</div>
			</div>
		</div>
	);
}

function NotificationsSection() {
	return (
		<div>
			<h2 className="text-xl font-semibold mb-6">Notification Settings</h2>
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="font-medium">Email Notifications</h3>
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Receive email alerts for important system events
						</p>
					</div>
					<input type="checkbox" defaultChecked className="w-5 h-5" />
				</div>
			</div>
		</div>
	);
}

function SecuritySection() {
	return (
		<div>
			<h2 className="text-xl font-semibold mb-6">Account Security</h2>
			<div className="space-y-4">
				<div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
					<div className="flex items-center gap-3">
						<Key className="w-5 h-5" />
						<div>
							<h3 className="font-medium">Change Password</h3>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								Update your password to keep your account secure
							</p>
						</div>
					</div>
					<Button variant="outline">Change Password</Button>
				</div>
				<div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
					<div className="flex items-center gap-3">
						<History className="w-5 h-5" />
						<div>
							<h3 className="font-medium">Login History</h3>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								View your recent login activity and sessions
							</p>
						</div>
					</div>
					<Button variant="outline">View History</Button>
				</div>
			</div>
		</div>
	);
}

