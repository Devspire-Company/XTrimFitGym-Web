import { useState, useEffect } from 'react';
import {
	Settings as SettingsIcon,
	User,
	Sliders,
	Bell,
	Shield,
	Key,
	History,
	LogOut,
	Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/store/hooks';

export function SettingsPage() {
	useEffect(() => {
		document.title = 'Settings - X-TRIM FIT GYM';
	}, []);
	const { user } = useAppSelector((state) => state.auth);
	const [activeSection, setActiveSection] = useState('account');
	const [editMode, setEditMode] = useState<Record<string, boolean>>({});

	const sections = [
		{ id: 'account', label: 'Account Information', icon: User },
		{ id: 'preferences', label: 'System Preferences', icon: Sliders },
		{ id: 'notifications', label: 'Notification Settings', icon: Bell },
		{ id: 'security', label: 'Account Security', icon: Shield },
	];

	const toggleEditMode = (section: string) => {
		setEditMode((prev) => ({ ...prev, [section]: !prev[section] }));
	};

	const cancelEdit = (section: string) => {
		setEditMode((prev) => ({ ...prev, [section]: false }));
	};

	const saveChanges = (section: string) => {
		// Handle save logic here
		setEditMode((prev) => ({ ...prev, [section]: false }));
	};

	return (
		<div className="settings-layout flex min-h-[calc(100vh-80px)]">
			{/* Sidebar */}
			<aside className="settings-sidebar w-80 bg-[var(--card-bg)] border-r border-[var(--card-border)] py-10 flex flex-col sticky top-20 h-[calc(100vh-80px)] overflow-y-auto backdrop-blur-md">
				<div className="profile-section px-8 pb-8 border-b border-[var(--card-border)] mb-6 text-center">
					<div className="profile-picture-wrapper relative inline-block mb-4">
						<div className="profile-picture w-25 h-25 rounded-full bg-gradient-to-br from-[var(--primary-yellow)] to-[#E6B800] flex items-center justify-center text-3xl font-semibold text-[#1a1a1a] mx-auto">
							{user?.firstName?.[0] || 'A'}
							{user?.lastName?.[0] || 'D'}
						</div>
						<button
							className="edit-profile-pic absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[var(--primary-yellow)] border-[3px] border-[var(--bg-dark)] flex items-center justify-center text-[#1a1a1a] text-sm transition-[var(--transition)] hover:bg-[#E6B800] hover:scale-110"
							title="Edit Profile Picture"
						>
							<Pencil className="w-3.5 h-3.5" />
						</button>
					</div>
					<h3 className="profile-name text-xl font-semibold text-[var(--text-primary)] mb-1 font-['Poppins']">
						{user?.firstName} {user?.lastName}
					</h3>
					<p className="profile-role text-sm text-[var(--text-secondary)]">System Administrator</p>
				</div>
				<nav className="settings-nav flex flex-col px-4">
					{sections.map((section) => {
						const Icon = section.icon;
						return (
							<button
								key={section.id}
								onClick={() => setActiveSection(section.id)}
								className={`nav-link flex items-center gap-3 px-5 py-3.5 rounded-[10px] text-[var(--text-secondary)] text-[0.95rem] font-medium transition-[var(--transition)] ${
									activeSection === section.id
										? 'active bg-[var(--primary-yellow)] text-[#1a1a1a] font-semibold'
										: 'hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-primary)]'
								}`}
							>
								<Icon className="w-5 h-5" />
								<span>{section.label}</span>
							</button>
						);
					})}
					<div className="nav-divider h-px bg-[var(--card-border)] my-2 mx-5" />
					<button
						onClick={() => {
							// Handle logout
						}}
						className="nav-link logout-link flex items-center gap-3 px-5 py-3.5 rounded-[10px] text-[var(--text-secondary)] text-[0.95rem] font-medium transition-[var(--transition)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-primary)]"
					>
						<LogOut className="w-5 h-5" />
						<span>Log Out</span>
					</button>
				</nav>
			</aside>

			{/* Main Content Area */}
			<div className="settings-main-content flex-1 py-10 px-12 overflow-y-auto">
				<div className="settings-container max-w-[900px] w-full">
					{activeSection === 'account' && (
						<AccountSection
							editMode={editMode.account}
							onToggleEdit={() => toggleEditMode('account')}
							onCancel={() => cancelEdit('account')}
							onSave={() => saveChanges('account')}
						/>
					)}
					{activeSection === 'preferences' && (
						<PreferencesSection
							editMode={editMode.preferences}
							onToggleEdit={() => toggleEditMode('preferences')}
							onCancel={() => cancelEdit('preferences')}
							onSave={() => saveChanges('preferences')}
						/>
					)}
					{activeSection === 'notifications' && (
						<NotificationsSection
							editMode={editMode.notifications}
							onToggleEdit={() => toggleEditMode('notifications')}
							onCancel={() => cancelEdit('notifications')}
							onSave={() => saveChanges('notifications')}
						/>
					)}
					{activeSection === 'security' && <SecuritySection />}
				</div>
			</div>
		</div>
	);
}

function AccountSection({
	editMode,
	onToggleEdit,
	onCancel,
	onSave,
}: {
	editMode?: boolean;
	onToggleEdit: () => void;
	onCancel: () => void;
	onSave: () => void;
}) {
	const { user } = useAppSelector((state) => state.auth);
	return (
		<div className="settings-section bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8">
			<div className="section-header-modern flex items-center justify-between mb-8 pb-6 border-b border-[var(--card-border)]">
				<h2 className="section-title text-[1.75rem] font-semibold text-[var(--text-primary)] font-['Poppins'] m-0">
					Account Information
				</h2>
				<button
					onClick={onToggleEdit}
					className={`btn-edit-modern flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--card-border)] text-[var(--text-secondary)] text-sm font-medium transition-[var(--transition)] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(249,197,19,0.3)] hover:text-[var(--primary-yellow)] ${editMode ? 'editing' : ''}`}
				>
					<Pencil className="w-4 h-4" />
					Edit
				</button>
			</div>
			<div className="section-content flex flex-col gap-6">
				<div className="form-grid grid grid-cols-2 gap-6 mb-6">
					<div className="form-group flex flex-col gap-2">
						<label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
							Email Address
						</label>
						<div className="input-wrapper relative">
							<input
								type="email"
								value={user?.email || ''}
								readOnly={!editMode}
								className={`w-full px-4 py-3 bg-[rgba(255,255,255,0.05)] border border-[var(--card-border)] rounded-lg text-[var(--text-primary)] text-[0.95rem] transition-[var(--transition)] ${
									editMode ? 'edit-mode' : 'read-only'
								} focus:outline-none focus:bg-[rgba(255,255,255,0.08)] focus:border-[var(--primary-yellow)] focus:ring-[3px] focus:ring-[rgba(249,197,19,0.1)]`}
							/>
						</div>
					</div>
					<div className="form-group flex flex-col gap-2">
						<label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
							Role
						</label>
						<div className="input-wrapper relative">
							<input
								type="text"
								value="System Administrator"
								readOnly={!editMode}
								className={`w-full px-4 py-3 bg-[rgba(255,255,255,0.05)] border border-[var(--card-border)] rounded-lg text-[var(--text-primary)] text-[0.95rem] transition-[var(--transition)] ${
									editMode ? 'edit-mode' : 'read-only'
								} focus:outline-none focus:bg-[rgba(255,255,255,0.08)] focus:border-[var(--primary-yellow)] focus:ring-[3px] focus:ring-[rgba(249,197,19,0.1)]`}
							/>
						</div>
					</div>
				</div>
				<div
					className={`form-actions flex gap-4 justify-end mt-8 pt-6 border-t border-[var(--card-border)] ${editMode ? '' : 'hidden'}`}
				>
					<button
						type="button"
						onClick={onCancel}
						className="btn-discard px-6 py-3 bg-transparent text-[var(--primary-yellow)] border border-[var(--primary-yellow)] rounded-lg font-medium text-[0.95rem] cursor-pointer transition-[var(--transition)] hover:bg-[var(--primary-yellow)] hover:text-[#1a1a1a]"
					>
						Discard Changes
					</button>
					<button
						type="button"
						onClick={onSave}
						className="btn-save px-6 py-3 bg-[var(--primary-yellow)] text-[#1a1a1a] border-none rounded-lg font-semibold text-[0.95rem] cursor-pointer transition-[var(--transition)] hover:bg-[#E6B800] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(249,197,19,0.3)]"
					>
						Save Changes
					</button>
				</div>
			</div>
		</div>
	);
}

function PreferencesSection({
	editMode,
	onToggleEdit,
	onCancel,
	onSave,
}: {
	editMode?: boolean;
	onToggleEdit: () => void;
	onCancel: () => void;
	onSave: () => void;
}) {
	return (
		<div className="settings-section bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8">
			<div className="section-header-modern flex items-center justify-between mb-8 pb-6 border-b border-[var(--card-border)]">
				<h2 className="section-title text-[1.75rem] font-semibold text-[var(--text-primary)] font-['Poppins'] m-0">
					System Preferences
				</h2>
				<button
					onClick={onToggleEdit}
					className={`btn-edit-modern flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--card-border)] text-[var(--text-secondary)] text-sm font-medium transition-[var(--transition)] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(249,197,19,0.3)] hover:text-[var(--primary-yellow)] ${editMode ? 'editing' : ''}`}
				>
					<Pencil className="w-4 h-4" />
					Edit
				</button>
			</div>
			<div className="section-content flex flex-col gap-6">
				<div className="form-grid grid grid-cols-2 gap-6 mb-6">
					<div className="form-group flex flex-col gap-2">
						<label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
							Timezone
						</label>
						<div className="input-wrapper relative">
							<select
								disabled={!editMode}
								className={`w-full px-4 py-3 bg-[rgba(255,255,255,0.05)] border border-[var(--card-border)] rounded-lg text-[var(--text-primary)] text-[0.95rem] transition-[var(--transition)] ${
									editMode ? 'edit-mode' : ''
								} focus:outline-none focus:bg-[rgba(255,255,255,0.08)] focus:border-[var(--primary-yellow)] focus:ring-[3px] focus:ring-[rgba(249,197,19,0.1)]`}
							>
								<option>Asia/Manila (GMT+8)</option>
								<option>UTC (GMT+0)</option>
								<option>America/New_York (GMT-5)</option>
								<option>Europe/London (GMT+0)</option>
							</select>
						</div>
					</div>
					<div className="form-group flex flex-col gap-2">
						<label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
							Date Format
						</label>
						<div className="input-wrapper relative">
							<select
								disabled={!editMode}
								className={`w-full px-4 py-3 bg-[rgba(255,255,255,0.05)] border border-[var(--card-border)] rounded-lg text-[var(--text-primary)] text-[0.95rem] transition-[var(--transition)] ${
									editMode ? 'edit-mode' : ''
								} focus:outline-none focus:bg-[rgba(255,255,255,0.08)] focus:border-[var(--primary-yellow)] focus:ring-[3px] focus:ring-[rgba(249,197,19,0.1)]`}
							>
								<option>MM/DD/YYYY</option>
								<option>DD/MM/YYYY</option>
								<option>YYYY-MM-DD</option>
							</select>
						</div>
					</div>
					<div className="form-group flex flex-col gap-2">
						<label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
							Language
						</label>
						<div className="input-wrapper relative">
							<select
								disabled={!editMode}
								className={`w-full px-4 py-3 bg-[rgba(255,255,255,0.05)] border border-[var(--card-border)] rounded-lg text-[var(--text-primary)] text-[0.95rem] transition-[var(--transition)] ${
									editMode ? 'edit-mode' : ''
								} focus:outline-none focus:bg-[rgba(255,255,255,0.08)] focus:border-[var(--primary-yellow)] focus:ring-[3px] focus:ring-[rgba(249,197,19,0.1)]`}
							>
								<option>English</option>
								<option>Filipino</option>
							</select>
						</div>
					</div>
					<div className="form-group flex flex-col gap-2">
						<label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
							Currency
						</label>
						<div className="input-wrapper relative">
							<select
								disabled={!editMode}
								className={`w-full px-4 py-3 bg-[rgba(255,255,255,0.05)] border border-[var(--card-border)] rounded-lg text-[var(--text-primary)] text-[0.95rem] transition-[var(--transition)] ${
									editMode ? 'edit-mode' : ''
								} focus:outline-none focus:bg-[rgba(255,255,255,0.08)] focus:border-[var(--primary-yellow)] focus:ring-[3px] focus:ring-[rgba(249,197,19,0.1)]`}
							>
								<option>Philippine Peso (₱)</option>
								<option>US Dollar ($)</option>
								<option>Euro (€)</option>
							</select>
						</div>
					</div>
				</div>
				<div
					className={`form-actions flex gap-4 justify-end mt-8 pt-6 border-t border-[var(--card-border)] ${editMode ? '' : 'hidden'}`}
				>
					<button
						type="button"
						onClick={onCancel}
						className="btn-discard px-6 py-3 bg-transparent text-[var(--primary-yellow)] border border-[var(--primary-yellow)] rounded-lg font-medium text-[0.95rem] cursor-pointer transition-[var(--transition)] hover:bg-[var(--primary-yellow)] hover:text-[#1a1a1a]"
					>
						Discard Changes
					</button>
					<button
						type="button"
						onClick={onSave}
						className="btn-save px-6 py-3 bg-[var(--primary-yellow)] text-[#1a1a1a] border-none rounded-lg font-semibold text-[0.95rem] cursor-pointer transition-[var(--transition)] hover:bg-[#E6B800] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(249,197,19,0.3)]"
					>
						Save Changes
					</button>
				</div>
			</div>
		</div>
	);
}

function NotificationsSection({
	editMode,
	onToggleEdit,
	onCancel,
	onSave,
}: {
	editMode?: boolean;
	onToggleEdit: () => void;
	onCancel: () => void;
	onSave: () => void;
}) {
	const [notifications, setNotifications] = useState({
		email: true,
		newMember: true,
		payment: true,
		system: true,
	});

	return (
		<div className="settings-section bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8">
			<div className="section-header-modern flex items-center justify-between mb-8 pb-6 border-b border-[var(--card-border)]">
				<h2 className="section-title text-[1.75rem] font-semibold text-[var(--text-primary)] font-['Poppins'] m-0">
					Notification Settings
				</h2>
				<button
					onClick={onToggleEdit}
					className={`btn-edit-modern flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--card-border)] text-[var(--text-secondary)] text-sm font-medium transition-[var(--transition)] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(249,197,19,0.3)] hover:text-[var(--primary-yellow)] ${editMode ? 'editing' : ''}`}
				>
					<Pencil className="w-4 h-4" />
					Edit
				</button>
			</div>
			<div className="section-content flex flex-col gap-6">
				<div className="notification-list flex flex-col gap-6">
					<div className="notification-item">
						<div className="notification-info">
							<h3>Email Notifications</h3>
							<p>Receive email alerts for important system events</p>
						</div>
						<label className="toggle-switch">
							<input
								type="checkbox"
								checked={notifications.email}
								disabled={!editMode}
								onChange={(e) => setNotifications((prev) => ({ ...prev, email: e.target.checked }))}
							/>
							<span className="toggle-slider"></span>
						</label>
					</div>
					<div className="notification-item">
						<div className="notification-info">
							<h3>New Member Registration</h3>
							<p>Get notified when a new member registers</p>
						</div>
						<label className="toggle-switch">
							<input
								type="checkbox"
								checked={notifications.newMember}
								disabled={!editMode}
								onChange={(e) =>
									setNotifications((prev) => ({ ...prev, newMember: e.target.checked }))
								}
							/>
							<span className="toggle-slider"></span>
						</label>
					</div>
					<div className="notification-item">
						<div className="notification-info">
							<h3>Payment Alerts</h3>
							<p>Receive notifications for payment transactions</p>
						</div>
						<label className="toggle-switch">
							<input
								type="checkbox"
								checked={notifications.payment}
								disabled={!editMode}
								onChange={(e) =>
									setNotifications((prev) => ({ ...prev, payment: e.target.checked }))
								}
							/>
							<span className="toggle-slider"></span>
						</label>
					</div>
					<div className="notification-item">
						<div className="notification-info">
							<h3>System Updates</h3>
							<p>Get notified about system maintenance and updates</p>
						</div>
						<label className="toggle-switch">
							<input
								type="checkbox"
								checked={notifications.system}
								disabled={!editMode}
								onChange={(e) =>
									setNotifications((prev) => ({ ...prev, system: e.target.checked }))
								}
							/>
							<span className="toggle-slider"></span>
						</label>
					</div>
				</div>
				<div
					className={`form-actions flex gap-4 justify-end mt-8 pt-6 border-t border-[var(--card-border)] ${editMode ? '' : 'hidden'}`}
				>
					<button
						type="button"
						onClick={onCancel}
						className="btn-discard px-6 py-3 bg-transparent text-[var(--primary-yellow)] border border-[var(--primary-yellow)] rounded-lg font-medium text-[0.95rem] cursor-pointer transition-[var(--transition)] hover:bg-[var(--primary-yellow)] hover:text-[#1a1a1a]"
					>
						Discard Changes
					</button>
					<button
						type="button"
						onClick={onSave}
						className="btn-save px-6 py-3 bg-[var(--primary-yellow)] text-[#1a1a1a] border-none rounded-lg font-semibold text-[0.95rem] cursor-pointer transition-[var(--transition)] hover:bg-[#E6B800] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(249,197,19,0.3)]"
					>
						Save Changes
					</button>
				</div>
			</div>
		</div>
	);
}

function SecuritySection() {
	return (
		<div className="settings-section bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8">
			<h2 className="section-title text-[1.75rem] font-semibold text-[var(--text-primary)] font-['Poppins'] mb-6">
				Account Security
			</h2>
			<div className="section-content flex flex-col gap-6">
				<div className="security-actions flex flex-col gap-4">
					<div className="security-item flex items-center justify-between p-6 bg-[rgba(255,255,255,0.03)] border border-[var(--card-border)] rounded-xl transition-[var(--transition)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.12)]">
						<div className="security-info flex items-center gap-4 flex-1">
							<div className="w-12 h-12 rounded-xl bg-[rgba(249,197,19,0.1)] flex items-center justify-center text-[var(--primary-yellow)] text-2xl">
								<Key className="w-6 h-6" />
							</div>
							<div>
								<h3 className="text-[0.95rem] font-semibold text-[var(--text-primary)] mb-1">
									Change Password
								</h3>
								<p className="text-xs text-[var(--text-secondary)]">
									Update your password to keep your account secure
								</p>
							</div>
						</div>
						<button className="btn-secondary px-6 py-3 bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] border border-[var(--card-border)] rounded-lg font-medium text-sm cursor-pointer transition-[var(--transition)] flex items-center gap-2 hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--text-primary)] hover:border-[rgba(255,255,255,0.15)]">
							<Pencil className="w-4 h-4" />
							Change Password
						</button>
					</div>
					<div className="security-item flex items-center justify-between p-6 bg-[rgba(255,255,255,0.03)] border border-[var(--card-border)] rounded-xl transition-[var(--transition)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.12)]">
						<div className="security-info flex items-center gap-4 flex-1">
							<div className="w-12 h-12 rounded-xl bg-[rgba(249,197,19,0.1)] flex items-center justify-center text-[var(--primary-yellow)] text-2xl">
								<History className="w-6 h-6" />
							</div>
							<div>
								<h3 className="text-[0.95rem] font-semibold text-[var(--text-primary)] mb-1">
									Login History
								</h3>
								<p className="text-xs text-[var(--text-secondary)]">
									View your recent login activity and sessions
								</p>
							</div>
						</div>
						<button className="btn-secondary px-6 py-3 bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] border border-[var(--card-border)] rounded-lg font-medium text-sm cursor-pointer transition-[var(--transition)] flex items-center gap-2 hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--text-primary)] hover:border-[rgba(255,255,255,0.15)]">
							<History className="w-4 h-4" />
							View History
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
