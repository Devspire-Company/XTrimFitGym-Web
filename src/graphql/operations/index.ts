// Export all GraphQL operations for easy imports throughout the application

// Queries
export {
	GetAllMembershipsDocument as GET_ALL_MEMBERSHIPS,
	GetActiveMembershipsDocument as GET_ACTIVE_MEMBERSHIPS,
	GetCurrentMembershipDocument as GET_CURRENT_MEMBERSHIP,
	GetUsersDocument as GET_USERS,
	GetUserDocument as GET_USER,
	GetPendingSubscriptionRequestsDocument as GET_PENDING_SUBSCRIPTION_REQUESTS,
	GetRevenueSummaryDocument as GET_REVENUE_SUMMARY,
	GetAnalyticsDocument as GET_ANALYTICS,
	GetAnalyticsRangeDocument as GET_ANALYTICS_RANGE,
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
	DirectSubscribeMemberDocument as DIRECT_SUBSCRIBE_MEMBER,
	ApproveSubscriptionRequestDocument as APPROVE_SUBSCRIPTION_REQUEST,
	RejectSubscriptionRequestDocument as REJECT_SUBSCRIPTION_REQUEST,
} from '../generated/graphql';

// Subscriptions
export {
	RevenueSummaryUpdatedDocument as REVENUE_SUMMARY_UPDATED,
	UsersUpdatedDocument as USERS_UPDATED,
	MembershipsUpdatedDocument as MEMBERSHIPS_UPDATED,
} from '../generated/graphql';

