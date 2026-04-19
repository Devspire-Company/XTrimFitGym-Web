// @ts-nocheck
import SubscriptionRequest from '../../database/models/membership/subscriptionRequest-schema.js';
import Membership from '../../database/models/membership/membership-shema.js';
import MembershipTransaction from '../../database/models/membership/membershipTransaction-schema.js';
import User from '../../database/models/user/user-schema.js';
import { IAuthContext } from '../../context/auth-context.js';
import mongoose from 'mongoose';
import {
	onSubscriptionCreated,
	onSubscriptionSwitched,
} from '../../database/models/analytics/analytics-helper.js';

// Helper to map membership to GraphQL format
const mapMembershipToGraphQL = (membership: any) => {
	if (!membership) return null;
	
	// Ensure we have a valid ID
	let membershipId: string | null = null;
	if (membership._id) {
		membershipId = membership._id.toString();
	} else if (membership.id) {
		membershipId = typeof membership.id === 'string' ? membership.id : membership.id.toString();
	}
	
	if (!membershipId) {
		console.error('⚠️ Cannot map membership: missing _id or id', membership);
		throw new Error('Invalid membership: missing ID');
	}
	
	// Calculate monthDuration based on durationType if not set
	let monthDuration = membership.monthDuration;
	if (!monthDuration || monthDuration < 1) {
		const durationType = membership.durationType?.toLowerCase() || 'monthly';
		if (durationType === 'monthly') {
			monthDuration = 1;
		} else if (durationType === 'quarterly') {
			monthDuration = 3;
		} else if (durationType === 'yearly') {
			monthDuration = 12;
		} else {
			monthDuration = 1; // default fallback
		}
	}
	
	return {
		id: membershipId,
		name: membership.name,
		monthlyPrice: membership.monthlyPrice,
		description: membership.description || null,
		features: membership.features || [],
		status: membership.status?.toUpperCase() || 'INACTIVE',
		durationType: membership.durationType?.toUpperCase() || 'MONTHLY',
		monthDuration: monthDuration,
		createdAt: membership.createdAt?.toISOString(),
		updatedAt: membership.updatedAt?.toISOString(),
	};
};

type Context = IAuthContext;

const isPopulatedProcessorUser = (ref: any) =>
	ref && typeof ref === 'object' && typeof ref.firstName === 'string';

const processorUserIdString = (ref: any): string | null => {
	if (!ref) return null;
	if (isPopulatedProcessorUser(ref) && ref._id) return ref._id.toString();
	if (typeof ref === 'object' && ref._id) return ref._id.toString();
	if (typeof ref === 'string') return ref;
	try {
		const s = ref.toString();
		if (mongoose.Types.ObjectId.isValid(s)) return s;
	} catch {
		/* noop */
	}
	return null;
};

const formatProcessorUser = (ref: any) => {
	if (!ref || !isPopulatedProcessorUser(ref)) return null;
	return {
		id: ref._id.toString(),
		firstName: ref.firstName,
		lastName: ref.lastName,
		email: ref.email ?? '',
	};
};

async function buildProcessorUserLookupMap(requests: any[]) {
	const ids = new Set<string>();
	for (const r of requests) {
		const aid = processorUserIdString(r.approvedBy);
		if (aid && !isPopulatedProcessorUser(r.approvedBy)) ids.add(aid);
		const rid = processorUserIdString(r.rejectedBy);
		if (rid && !isPopulatedProcessorUser(r.rejectedBy)) ids.add(rid);
	}
	const map = new Map<string, { firstName: string; lastName: string; email: string }>();
	if (ids.size === 0) return map;
	const oids = [...ids].map((id) => new mongoose.Types.ObjectId(id));
	const users = await User.find({ _id: { $in: oids } }).select('firstName lastName email').lean();
	for (const u of users) {
		map.set(u._id.toString(), {
			firstName: u.firstName,
			lastName: u.lastName,
			email: u.email ?? '',
		});
	}
	return map;
}

function resolveProcessorRef(
	ref: any,
	lookup: Map<string, { firstName: string; lastName: string; email: string }>
) {
	const formatted = formatProcessorUser(ref);
	if (formatted) return formatted;
	const id = processorUserIdString(ref);
	if (!id) return null;
	const u = lookup.get(id);
	if (!u) return null;
	return { id, firstName: u.firstName, lastName: u.lastName, email: u.email };
}

const mapSubscriptionRequestToGraphQL = (request: any, membershipData?: any, memberData?: any) => {
	// If membershipData is provided, use it; otherwise use the request's membership_id
	const membership = membershipData 
		? mapMembershipToGraphQL(membershipData)
		: request.membership_id;

	// Handle member data - use provided memberData or format from request.member_id
	let member = memberData;
	if (!member) {
		const memberId = request.member_id;
		if (memberId && typeof memberId === 'object' && memberId._id) {
			// If it's a populated object, format it properly
			member = {
				id: memberId._id.toString(),
				firstName: memberId.firstName,
				lastName: memberId.lastName,
				email: memberId.email,
			};
		} else {
			// Otherwise, it's an ID string - will be resolved by the resolver
			member = memberId;
		}
	}

	// Handle EXPIRED status - convert to REJECTED since EXPIRED is no longer in the enum
	let status = request.status?.toUpperCase() || 'PENDING';
	if (status === 'EXPIRED') {
		status = 'REJECTED';
	}

	return {
		id: request._id.toString(),
		memberId: request.member_id?.toString() || (typeof request.member_id === 'string' ? request.member_id : ''),
		member: member,
		membershipId: request.membership_id?.toString() || (typeof request.membership_id === 'string' ? request.membership_id : ''),
		membership: membership,
		status: status,
		requestedAt: request.requestedAt?.toISOString(),
		approvedAt: request.approvedAt?.toISOString() || null,
		approvedBy: request.approvedBy || null,
		rejectedAt: request.rejectedAt?.toISOString() || null,
		rejectedBy: request.rejectedBy || null,
		createdAt: request.createdAt?.toISOString(),
		updatedAt: request.updatedAt?.toISOString(),
	};
};

const mapTransactionToGraphQL = (transaction: any, membershipData?: any) => {
	// If membershipData is provided, use it; otherwise use the transaction's membership_id
	const membership = membershipData 
		? mapMembershipToGraphQL(membershipData)
		: transaction.membership_id;

	return {
		id: transaction._id.toString(),
		clientId: transaction.client_id.toString(),
		client: transaction.client_id,
		membershipId: transaction.membership_id?.toString() || (typeof transaction.membership_id === 'string' ? transaction.membership_id : ''),
		membership: membership,
		priceAtPurchase: transaction.priceAtPurchase,
		startedAt: transaction.startedAt?.toISOString(),
		expiresAt: transaction.expiresAt?.toISOString(),
		status: transaction.status?.toUpperCase() || 'ACTIVE',
		createdAt: transaction.createdAt?.toISOString(),
		updatedAt: transaction.updatedAt?.toISOString(),
	};
};

// Helper function to create membership transaction
const createMembershipTransaction = async (
	memberId: string,
	membershipId: string,
	approvedBy?: string
) => {
	const membership = await Membership.findById(membershipId).lean();
	if (!membership) {
		throw new Error('Membership not found');
	}

	if (membership.status !== 'Active') {
		throw new Error('This membership plan is not available');
	}

	// Check if user has an existing active membership (switching plans)
	const existingActive = await MembershipTransaction.findOne({
		client_id: new mongoose.Types.ObjectId(memberId),
		status: 'Active',
	}).lean();

	// Calculate remaining days from existing subscription if not expired
	let remainingDays = 0;
	if (existingActive && existingActive.expiresAt) {
		const now = new Date();
		const expiryDate = new Date(existingActive.expiresAt);
		
		// Only add remaining days if the subscription hasn't expired yet
		if (expiryDate > now) {
			const diffTime = expiryDate.getTime() - now.getTime();
			remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
			remainingDays = Math.max(0, remainingDays); // Ensure non-negative
		}
	}

	// Cancel any existing active memberships (when switching plans)
	await MembershipTransaction.updateMany(
		{
			client_id: new mongoose.Types.ObjectId(memberId),
			status: 'Active',
		},
		{
			status: 'Canceled',
		}
	);

	// Calculate expiry date based on month duration + remaining days
	const now = new Date();
	const expiresAt = new Date(now);
	const monthDuration = membership.monthDuration || 1;
	expiresAt.setMonth(expiresAt.getMonth() + monthDuration);
	
	// Add remaining days from previous subscription
	if (remainingDays > 0) {
		expiresAt.setDate(expiresAt.getDate() + remainingDays);
	}

	const transaction = new MembershipTransaction({
		client_id: new mongoose.Types.ObjectId(memberId),
		membership_id: new mongoose.Types.ObjectId(membershipId),
		priceAtPurchase: membership.monthlyPrice,
		startedAt: now,
		expiresAt,
		status: 'Active',
	});

	await transaction.save();

	// Update user's membership details (require facility biometric before full app access)
	await User.findByIdAndUpdate(memberId, {
		'membershipDetails.membership_id': new mongoose.Types.ObjectId(membershipId),
		'membershipDetails.facilityBiometricEnrollmentComplete': false,
	});

	// Update analytics: If switching plans, use onSubscriptionSwitched; otherwise onSubscriptionCreated
	if (existingActive) {
		await onSubscriptionSwitched(transaction._id.toString());
	} else {
		await onSubscriptionCreated(transaction._id.toString());
	}

	const populatedTransaction = await MembershipTransaction.findById(transaction._id)
		.populate('membership_id')
		.populate('client_id', 'firstName lastName email')
		.lean();

	if (!populatedTransaction) {
		throw new Error('Failed to create membership transaction');
	}

	// Ensure membership is properly populated and mapped
	let membershipData: any = populatedTransaction.membership_id;
	
	// If membership_id is a string (ObjectId), fetch the membership
	if (typeof membershipData === 'string' || !membershipData || !membershipData._id) {
		const membershipId = typeof membershipData === 'string' 
			? membershipData 
			: (populatedTransaction.membership_id?.toString() || populatedTransaction.membership_id);
		
		membershipData = await Membership.findById(membershipId).lean();
		if (!membershipData) {
			throw new Error('Membership not found');
		}
	}

	// Map the transaction with properly formatted membership
	const mappedTransaction = mapTransactionToGraphQL(populatedTransaction, membershipData);
	
	// Double-check that membership has an id
	if (!mappedTransaction.membership || !mappedTransaction.membership.id) {
		console.error('⚠️ Membership mapping failed, re-mapping...', {
			membershipData,
			mappedMembership: mappedTransaction.membership,
		});
		mappedTransaction.membership = mapMembershipToGraphQL(membershipData);
	}

	return mappedTransaction;
};

export default {
	Query: {
		getPendingSubscriptionRequests: async (_: any, __: any, context: Context) => {
			// Authorization: Only admin can view pending requests
			const userRole = context.auth.user?.role;
			if (userRole !== 'admin') {
				throw new Error('Unauthorized: Only admins can view pending subscription requests');
			}

			const requests = await SubscriptionRequest.find({
				status: 'Pending',
			})
				.populate('member_id', 'firstName lastName email')
				.populate('membership_id')
				.sort({ requestedAt: -1 })
				.lean();

			// Map requests and ensure member data is properly formatted
			return requests.map((request) => {
				// Ensure member is properly formatted before mapping
				let memberData: any = null;
				if (request.member_id && typeof request.member_id === 'object' && request.member_id._id) {
					// If it's a populated object, format it properly
					memberData = {
						id: request.member_id._id.toString(),
						firstName: request.member_id.firstName,
						lastName: request.member_id.lastName,
						email: request.member_id.email,
					};
				}
				
				return mapSubscriptionRequestToGraphQL(request, undefined, memberData);
			});
		},

		getAllSubscriptionRequests: async (_: any, __: any, context: Context) => {
			// Authorization: Only admin can view all requests
			const userRole = context.auth.user?.role;
			if (userRole !== 'admin') {
				throw new Error('Unauthorized: Only admins can view all subscription requests');
			}

			const requests = await SubscriptionRequest.find({})
				.populate('member_id', 'firstName lastName email')
				.populate('membership_id')
				.populate('approvedBy', 'firstName lastName email')
				.populate('rejectedBy', 'firstName lastName email')
				.sort({ createdAt: -1 })
				.lean();

			const processorLookup = await buildProcessorUserLookupMap(requests);

			// Map requests and ensure member data is properly formatted
			return requests.map((request) => {
				// Ensure member is properly formatted before mapping
				let memberData: any = null;
				if (request.member_id && typeof request.member_id === 'object' && request.member_id._id) {
					// If it's a populated object, format it properly
					memberData = {
						id: request.member_id._id.toString(),
						firstName: request.member_id.firstName,
						lastName: request.member_id.lastName,
						email: request.member_id.email,
					};
				}

				const approvedByData = resolveProcessorRef(request.approvedBy, processorLookup);
				const rejectedByData = resolveProcessorRef(request.rejectedBy, processorLookup);

				const mapped = mapSubscriptionRequestToGraphQL(request, undefined, memberData);
				if (approvedByData) mapped.approvedBy = approvedByData;
				if (rejectedByData) mapped.rejectedBy = rejectedByData;
				return mapped;
			});
		},

		getSubscriptionRequest: async (_: any, { id }: { id: string }, context: Context) => {
			const userId = context.auth.user?.id;
			const userRole = context.auth.user?.role;
			if (!userId) {
				throw new Error('Unauthorized: Please log in');
			}

			const request = await SubscriptionRequest.findById(id)
				.populate('member_id', 'firstName lastName email')
				.populate('membership_id')
				.populate('approvedBy', 'firstName lastName email')
				.populate('rejectedBy', 'firstName lastName email')
				.lean();

			if (!request) {
				throw new Error('Subscription request not found');
			}

			// Authorization: Only the member or admin can view the request
			if (request.member_id.toString() !== userId && userRole !== 'admin') {
				throw new Error('Unauthorized: You cannot view this request');
			}

			// Format member data if populated
			let memberData: any = null;
			if (request.member_id && typeof request.member_id === 'object' && request.member_id._id) {
				memberData = {
					id: request.member_id._id.toString(),
					firstName: request.member_id.firstName,
					lastName: request.member_id.lastName,
					email: request.member_id.email,
				};
			}

			const processorLookup = await buildProcessorUserLookupMap([request]);
			const mapped = mapSubscriptionRequestToGraphQL(request, undefined, memberData);
			const approvedByData = resolveProcessorRef(request.approvedBy, processorLookup);
			const rejectedByData = resolveProcessorRef(request.rejectedBy, processorLookup);
			if (approvedByData) mapped.approvedBy = approvedByData;
			if (rejectedByData) mapped.rejectedBy = rejectedByData;
			return mapped;
		},

		getMySubscriptionRequests: async (_: any, __: any, context: Context) => {
			const userId = context.auth.user?.id;
			if (!userId) {
				throw new Error('Unauthorized: Please log in');
			}

			const requests = await SubscriptionRequest.find({
				member_id: new mongoose.Types.ObjectId(userId),
			})
				.populate('membership_id')
				.populate('approvedBy', 'firstName lastName email')
				.populate('rejectedBy', 'firstName lastName email')
				.sort({ createdAt: -1 })
				.lean();

			const processorLookup = await buildProcessorUserLookupMap(requests);

			return requests.map((request) => {
				// Format member data if populated
				let memberData: any = null;
				if (request.member_id && typeof request.member_id === 'object' && request.member_id._id) {
					memberData = {
						id: request.member_id._id.toString(),
						firstName: request.member_id.firstName,
						lastName: request.member_id.lastName,
						email: request.member_id.email,
					};
				}
				const mapped = mapSubscriptionRequestToGraphQL(request, undefined, memberData);
				const approvedByData = resolveProcessorRef(request.approvedBy, processorLookup);
				const rejectedByData = resolveProcessorRef(request.rejectedBy, processorLookup);
				if (approvedByData) mapped.approvedBy = approvedByData;
				if (rejectedByData) mapped.rejectedBy = rejectedByData;
				return mapped;
			});
		},
	},

	Mutation: {
		createSubscriptionRequest: async (
			_: any,
			{ input }: { input: { membershipId: string } },
			context: Context
		) => {
			// Authorization: Only authenticated members can create subscription requests.
			// Resolve role from DB to avoid stale/missing role claims in tokens.
			const userId = context.auth.user?.id;
			if (!userId) {
				throw new Error('Unauthorized: Please log in');
			}
			const requester = await User.findById(userId).select('role').lean();
			if (!requester || requester.role !== 'member') {
				throw new Error('Unauthorized: Only members can create subscription requests');
			}

			// Check if membership exists and is active
			const membership = await Membership.findById(input.membershipId).lean();
			if (!membership) {
				throw new Error('Membership not found');
			}

			if (membership.status !== 'Active') {
				throw new Error('This membership plan is not available');
			}

			// Check if there's already a pending request for this membership
			const existingRequest = await SubscriptionRequest.findOne({
				member_id: new mongoose.Types.ObjectId(userId),
				membership_id: new mongoose.Types.ObjectId(input.membershipId),
				status: 'Pending',
			}).lean();

			if (existingRequest) {
				throw new Error('You already have a pending request for this membership plan');
			}

			// Create subscription request (no expiration)
			const now = new Date();

			const request = new SubscriptionRequest({
				member_id: new mongoose.Types.ObjectId(userId),
				membership_id: new mongoose.Types.ObjectId(input.membershipId),
				status: 'Pending',
				requestedAt: now,
			});

			await request.save();

			const populatedRequest = await SubscriptionRequest.findById(request._id)
				.populate('member_id', 'firstName lastName email')
				.populate('membership_id')
				.lean();

			if (!populatedRequest) {
				throw new Error('Failed to create subscription request');
			}

			// Ensure membership is properly populated and mapped
			let membershipData: any = populatedRequest.membership_id;
			
			// If membership_id is a string (ObjectId) or not properly populated, fetch the membership
			if (typeof membershipData === 'string' || !membershipData || !membershipData._id) {
				const membershipId = typeof membershipData === 'string' 
					? membershipData 
					: (populatedRequest.membership_id?.toString() || populatedRequest.membership_id || input.membershipId);
				
				if (!membershipId) {
					throw new Error('Membership ID is missing');
				}
				
				membershipData = await Membership.findById(membershipId).lean();
				if (!membershipData) {
					throw new Error(`Membership not found with ID: ${membershipId}`);
				}
			}

			// Validate membership data has required fields
			if (!membershipData._id && !membershipData.id) {
				throw new Error('Invalid membership data: missing ID');
			}

			// Format member data if populated
			let memberData: any = null;
			if (populatedRequest.member_id && typeof populatedRequest.member_id === 'object' && populatedRequest.member_id._id) {
				memberData = {
					id: populatedRequest.member_id._id.toString(),
					firstName: populatedRequest.member_id.firstName,
					lastName: populatedRequest.member_id.lastName,
					email: populatedRequest.member_id.email,
				};
			}

			// Map the request with properly formatted membership and member
			const mappedRequest = mapSubscriptionRequestToGraphQL(populatedRequest, membershipData, memberData);
			
			// Double-check that membership has an id (this should never happen, but safety check)
			if (!mappedRequest.membership || !mappedRequest.membership.id) {
				console.error('⚠️ Membership mapping failed, re-mapping...', {
					membershipData,
					mappedMembership: mappedRequest.membership,
					membershipId: input.membershipId,
				});
				try {
					mappedRequest.membership = mapMembershipToGraphQL(membershipData);
				} catch (error) {
					console.error('❌ Failed to map membership:', error);
					throw new Error('Failed to map membership data');
				}
			}

			// Final validation
			if (!mappedRequest.membership || !mappedRequest.membership.id) {
				throw new Error('Membership ID is required but was not found');
			}

			// Ensure member has an id
			if (!mappedRequest.member || (typeof mappedRequest.member === 'object' && !mappedRequest.member.id)) {
				console.error('⚠️ Member mapping failed, re-mapping...', {
					memberData,
					mappedMember: mappedRequest.member,
					memberId: userId,
				});
				// Fetch member if needed
				const user = await User.findById(userId).select('firstName lastName email').lean();
				if (user) {
					mappedRequest.member = {
						id: user._id.toString(),
						firstName: user.firstName,
						lastName: user.lastName,
						email: user.email,
					};
				} else {
					throw new Error('Member not found');
				}
			}

			return mappedRequest;
		},

		approveSubscriptionRequest: async (
			_: any,
			{ input }: { input: { requestId: string } },
			context: Context
		) => {
			// Authorization: Only admin can approve requests
			const userId = context.auth.user?.id;
			const userRole = context.auth.user?.role;
			if (userRole !== 'admin') {
				throw new Error('Unauthorized: Only admins can approve subscription requests');
			}

			if (!userId) {
				throw new Error('Unauthorized: Please log in');
			}

			const request = await SubscriptionRequest.findById(input.requestId).lean();

			if (!request) {
				throw new Error('Subscription request not found');
			}

			if (request.status !== 'Pending') {
				throw new Error(`Cannot approve request with status: ${request.status}`);
			}

			// Create membership transaction
			const transaction = await createMembershipTransaction(
				request.member_id.toString(),
				request.membership_id.toString(),
				userId
			);

			// Update request status
			await SubscriptionRequest.findByIdAndUpdate(input.requestId, {
				status: 'Approved',
				approvedAt: new Date(),
				approvedBy: new mongoose.Types.ObjectId(userId),
			});

			// Ensure transaction has properly formatted membership
			if (!transaction.membership || !transaction.membership.id) {
				// Re-fetch membership if needed
				const membership = await Membership.findById(request.membership_id).lean();
				if (membership) {
					transaction.membership = mapMembershipToGraphQL(membership);
				}
			}

			return transaction;
		},

		rejectSubscriptionRequest: async (
			_: any,
			{ input }: { input: { requestId: string } },
			context: Context
		) => {
			// Authorization: Only admin can reject requests
			const userId = context.auth.user?.id;
			const userRole = context.auth.user?.role;
			if (userRole !== 'admin') {
				throw new Error('Unauthorized: Only admins can reject subscription requests');
			}

			if (!userId) {
				throw new Error('Unauthorized: Please log in');
			}

			const request = await SubscriptionRequest.findById(input.requestId).lean();

			if (!request) {
				throw new Error('Subscription request not found');
			}

			if (request.status !== 'Pending') {
				throw new Error(`Cannot reject request with status: ${request.status}`);
			}

			await SubscriptionRequest.findByIdAndUpdate(input.requestId, {
				status: 'Rejected',
				rejectedAt: new Date(),
				rejectedBy: new mongoose.Types.ObjectId(userId),
			});

			return true;
		},

		deleteSubscriptionRequest: async (
			_: any,
			{ id }: { id: string },
			context: Context
		) => {
			// Authorization: Only admin can delete requests
			const userId = context.auth.user?.id;
			const userRole = context.auth.user?.role;
			if (userRole !== 'admin') {
				throw new Error('Unauthorized: Only admins can delete subscription requests');
			}

			if (!userId) {
				throw new Error('Unauthorized: Please log in');
			}

			const request = await SubscriptionRequest.findById(id).lean();

			if (!request) {
				throw new Error('Subscription request not found');
			}

			// Only allow deleting pending or rejected requests
			// Approved requests should not be deleted as they have associated transactions
			if (request.status === 'Approved') {
				throw new Error('Cannot delete an approved subscription request. It has an associated membership transaction.');
			}

			await SubscriptionRequest.findByIdAndDelete(id);

			return true;
		},

		directSubscribeMember: async (
			_: any,
			{ input }: { input: { memberId: string; membershipId: string } },
			context: Context
		) => {
			// Authorization: Only admin can directly subscribe members
			const userId = context.auth.user?.id;
			const userRole = context.auth.user?.role;
			if (userRole !== 'admin') {
				throw new Error('Unauthorized: Only admins can directly subscribe members');
			}

			if (!userId) {
				throw new Error('Unauthorized: Please log in');
			}

			// Verify member exists
			const member = await User.findById(input.memberId).lean();
			if (!member) {
				throw new Error('Member not found');
			}

			if (member.role !== 'member') {
				throw new Error('User is not a member');
			}

			// Create membership transaction
			const transaction = await createMembershipTransaction(
				input.memberId,
				input.membershipId,
				userId
			);

			return transaction;
		},
	},

	SubscriptionRequest: {
		member: async (parent: any) => {
			// Handle string ID
			if (typeof parent.member === 'string') {
				const user = await User.findById(parent.member)
					.select('firstName lastName email')
					.lean();
				return user
					? {
							id: user._id.toString(),
							firstName: user.firstName,
							lastName: user.lastName,
							email: user.email,
					  }
					: null;
			}
			// Handle populated member object (from mongoose populate)
			if (parent.member && typeof parent.member === 'object') {
				// Check if it's already a GraphQL-formatted object (has id field)
				if (parent.member.id) {
					return parent.member;
				}
				// If it's a mongoose document/object, map it
				if (parent.member._id) {
					return {
						id: parent.member._id.toString(),
						firstName: parent.member.firstName,
						lastName: parent.member.lastName,
						email: parent.member.email,
					};
				}
			}
			// Fallback: try to fetch by memberId if available
			if (parent.memberId) {
				const user = await User.findById(parent.memberId)
					.select('firstName lastName email')
					.lean();
				return user
					? {
							id: user._id.toString(),
							firstName: user.firstName,
							lastName: user.lastName,
							email: user.email,
					  }
					: null;
			}
			return null;
		},
		membership: async (parent: any) => {
			// Handle string ID
			if (typeof parent.membership === 'string') {
				const membership = await Membership.findById(parent.membership).lean();
				return membership ? mapMembershipToGraphQL(membership) : null;
			}
			// Handle populated membership object (from mongoose populate)
			if (parent.membership && typeof parent.membership === 'object') {
				// Check if it's already a GraphQL-formatted object (has id field)
				if (parent.membership.id) {
					return parent.membership;
				}
				// If it's a mongoose document/object, map it
				if (parent.membership._id) {
					return mapMembershipToGraphQL(parent.membership);
				}
			}
			// Fallback: try to fetch by membershipId if available
			if (parent.membershipId) {
				const membership = await Membership.findById(parent.membershipId).lean();
				return membership ? mapMembershipToGraphQL(membership) : null;
			}
			return null;
		},
		approvedBy: async (parent: any) => {
			if (!parent.approvedBy) return null;
			if (typeof parent.approvedBy === 'string') {
				const user = await User.findById(parent.approvedBy)
					.select('firstName lastName email')
					.lean();
				return user
					? {
							id: user._id.toString(),
							firstName: user.firstName,
							lastName: user.lastName,
							email: user.email,
					  }
					: null;
			}
			if (typeof parent.approvedBy === 'object' && parent.approvedBy.id && parent.approvedBy.firstName) {
				return {
					...parent.approvedBy,
					email: parent.approvedBy.email ?? '',
				};
			}
			const formatted = formatProcessorUser(parent.approvedBy);
			if (formatted) return formatted;
			const id = processorUserIdString(parent.approvedBy);
			if (!id) return null;
			const user = await User.findById(id).select('firstName lastName email').lean();
			return user
				? {
						id: user._id.toString(),
						firstName: user.firstName,
						lastName: user.lastName,
						email: user.email,
				  }
				: null;
		},
		rejectedBy: async (parent: any) => {
			if (!parent.rejectedBy) return null;
			if (typeof parent.rejectedBy === 'string') {
				const user = await User.findById(parent.rejectedBy)
					.select('firstName lastName email')
					.lean();
				return user
					? {
							id: user._id.toString(),
							firstName: user.firstName,
							lastName: user.lastName,
							email: user.email,
					  }
					: null;
			}
			if (typeof parent.rejectedBy === 'object' && parent.rejectedBy.id && parent.rejectedBy.firstName) {
				return {
					...parent.rejectedBy,
					email: parent.rejectedBy.email ?? '',
				};
			}
			const formatted = formatProcessorUser(parent.rejectedBy);
			if (formatted) return formatted;
			const id = processorUserIdString(parent.rejectedBy);
			if (!id) return null;
			const user = await User.findById(id).select('firstName lastName email').lean();
			return user
				? {
						id: user._id.toString(),
						firstName: user.firstName,
						lastName: user.lastName,
						email: user.email,
				  }
				: null;
		},
	},
};

