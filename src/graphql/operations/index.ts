// Export all GraphQL operations for easy imports throughout the application

// Queries
export {
	GetDashboardStatsDocument as GET_DASHBOARD_STATS,
	GetAllMembersDocument as GET_ALL_MEMBERS,
	GetAllCoachesDocument as GET_ALL_COACHES,
	GetAllMembershipsDocument as GET_ALL_MEMBERSHIPS,
	GetActiveMembershipsDocument as GET_ACTIVE_MEMBERSHIPS,
	GetCurrentMembershipDocument as GET_CURRENT_MEMBERSHIP,
	GetUsersDocument as GET_USERS,
	GetUserDocument as GET_USER,
} from '../generated/graphql';

// Mutations
export {
	LoginDocument as LOGIN,
	CreateUserDocument as CREATE_USER,
	UpdateUserDocument as UPDATE_USER,
	DeleteUserDocument as DELETE_USER,
	CreateMembershipDocument as CREATE_MEMBERSHIP,
	UpdateMembershipDocument as UPDATE_MEMBERSHIP,
	DeleteMembershipDocument as DELETE_MEMBERSHIP,
	PurchaseMembershipDocument as PURCHASE_MEMBERSHIP,
	CancelMembershipDocument as CANCEL_MEMBERSHIP,
} from '../generated/graphql';

