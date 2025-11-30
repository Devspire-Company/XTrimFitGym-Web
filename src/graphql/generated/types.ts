export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Analytics = {
  __typename?: 'Analytics';
  activeSubscriptions: Scalars['Int']['output'];
  canceledSubscriptions: Scalars['Int']['output'];
  createdAt?: Maybe<Scalars['String']['output']>;
  date: Scalars['String']['output'];
  expiredSubscriptions: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  newSubscriptions: Scalars['Int']['output'];
  revenueByMembership: Array<MembershipRevenue>;
  totalRevenue: Scalars['Float']['output'];
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export type ApproveSubscriptionRequestInput = {
  requestId: Scalars['ID']['input'];
};

export type AuthResponse = {
  __typename?: 'AuthResponse';
  token: Scalars['String']['output'];
  user: User;
};

export type CoachDetails = {
  __typename?: 'CoachDetails';
  clientLimit?: Maybe<Scalars['Int']['output']>;
  clientsIds?: Maybe<Array<Maybe<Scalars['ID']['output']>>>;
  moreDetails?: Maybe<Scalars['String']['output']>;
  ratings?: Maybe<Scalars['Float']['output']>;
  sessionsIds?: Maybe<Array<Maybe<Scalars['ID']['output']>>>;
  specialization?: Maybe<Array<Scalars['String']['output']>>;
  teachingDate?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  teachingTime?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  yearsOfExperience?: Maybe<Scalars['Int']['output']>;
};

export type CoachDetailsInput = {
  clientLimit?: InputMaybe<Scalars['Int']['input']>;
  clientsIds?: InputMaybe<Array<InputMaybe<Scalars['ID']['input']>>>;
  moreDetails?: InputMaybe<Scalars['String']['input']>;
  ratings?: InputMaybe<Scalars['Float']['input']>;
  sessionsIds?: InputMaybe<Array<InputMaybe<Scalars['ID']['input']>>>;
  specialization?: InputMaybe<Array<Scalars['String']['input']>>;
  teachingDate?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  teachingTime?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  yearsOfExperience?: InputMaybe<Scalars['Int']['input']>;
};

export type CoachRequest = {
  __typename?: 'CoachRequest';
  client?: Maybe<User>;
  clientId: Scalars['ID']['output'];
  coach?: Maybe<User>;
  coachId: Scalars['ID']['output'];
  createdAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  message?: Maybe<Scalars['String']['output']>;
  status: CoachRequestStatus;
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export enum CoachRequestStatus {
  Approved = 'approved',
  Denied = 'denied',
  Pending = 'pending'
}

export type ConfirmSessionCompletionInput = {
  confirm: Scalars['Boolean']['input'];
  sessionLogId: Scalars['ID']['input'];
};

export type CreateCoachRequestInput = {
  coachId: Scalars['ID']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
};

export type CreateGoalInput = {
  currentWeight?: InputMaybe<Scalars['Float']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  goalType: FitnessGoalType;
  targetDate?: InputMaybe<Scalars['String']['input']>;
  targetWeight?: InputMaybe<Scalars['Float']['input']>;
  title: Scalars['String']['input'];
};

export type CreateMembershipInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  durationType: DurationType;
  features: Array<Scalars['String']['input']>;
  monthlyPrice: Scalars['Float']['input'];
  name: Scalars['String']['input'];
  status: MembershipStatus;
};

export type CreateSessionInput = {
  clientsIds: Array<Scalars['ID']['input']>;
  date: Scalars['String']['input'];
  endTime?: InputMaybe<Scalars['String']['input']>;
  gymArea: Scalars['String']['input'];
  name: Scalars['String']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  startTime: Scalars['String']['input'];
  workoutType?: InputMaybe<Scalars['String']['input']>;
};

export type CreateSessionLogInput = {
  notes?: InputMaybe<Scalars['String']['input']>;
  sessionId: Scalars['ID']['input'];
  weight: Scalars['Float']['input'];
};

export type CreateSubscriptionRequestInput = {
  membershipId: Scalars['ID']['input'];
};

export type CreateUserInput = {
  agreedToLiabilityWaiver?: InputMaybe<Scalars['Boolean']['input']>;
  agreedToPrivacyPolicy?: InputMaybe<Scalars['Boolean']['input']>;
  agreedToTermsAndConditions?: InputMaybe<Scalars['Boolean']['input']>;
  coachDetails?: InputMaybe<CoachDetailsInput>;
  dateOfBirth?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  gender?: InputMaybe<Scalars['String']['input']>;
  heardFrom?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  lastName: Scalars['String']['input'];
  membershipDetails?: InputMaybe<MemberDetailsInput>;
  middleName?: InputMaybe<Scalars['String']['input']>;
  password: Scalars['String']['input'];
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  role: RoleType;
};

export type DateRangeInput = {
  endDate: Scalars['String']['input'];
  startDate: Scalars['String']['input'];
};

export type DirectSubscribeInput = {
  memberId: Scalars['ID']['input'];
  membershipId: Scalars['ID']['input'];
};

export enum DurationType {
  Monthly = 'MONTHLY',
  Quarterly = 'QUARTERLY',
  Yearly = 'YEARLY'
}

export enum FitnessGoalType {
  AthleticPerformance = 'ATHLETIC_PERFORMANCE',
  Endurance = 'ENDURANCE',
  Flexibility = 'FLEXIBILITY',
  GeneralFitness = 'GENERAL_FITNESS',
  MuscleBuilding = 'MUSCLE_BUILDING',
  Rehabilitation = 'REHABILITATION',
  StrengthTraining = 'STRENGTH_TRAINING',
  WeightLoss = 'WEIGHT_LOSS'
}

export type Goal = {
  __typename?: 'Goal';
  client?: Maybe<User>;
  clientId: Scalars['ID']['output'];
  createdAt?: Maybe<Scalars['String']['output']>;
  currentWeight?: Maybe<Scalars['Float']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  goalType: FitnessGoalType;
  id: Scalars['ID']['output'];
  status: GoalStatus;
  targetDate?: Maybe<Scalars['String']['output']>;
  targetWeight?: Maybe<Scalars['Float']['output']>;
  title: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export enum GoalStatus {
  Active = 'active',
  Cancelled = 'cancelled',
  Completed = 'completed',
  Paused = 'paused'
}

export type LoginInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type MemberDetails = {
  __typename?: 'MemberDetails';
  coachesIds?: Maybe<Array<Maybe<Scalars['ID']['output']>>>;
  fitnessGoal?: Maybe<Array<Scalars['String']['output']>>;
  hasEnteredDetails?: Maybe<Scalars['Boolean']['output']>;
  membershipId?: Maybe<Scalars['ID']['output']>;
  membershipTransaction?: Maybe<MembershipTransaction>;
  physiqueGoalType: Scalars['String']['output'];
  workOutTime?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type MemberDetailsInput = {
  coachesIds?: InputMaybe<Array<InputMaybe<Scalars['ID']['input']>>>;
  fitnessGoal?: InputMaybe<Array<Scalars['String']['input']>>;
  hasEnteredDetails?: InputMaybe<Scalars['Boolean']['input']>;
  membershipId?: InputMaybe<Scalars['ID']['input']>;
  physiqueGoalType: Scalars['String']['input'];
  workOutTime?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type Membership = {
  __typename?: 'Membership';
  createdAt?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  durationType: DurationType;
  features: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  monthlyPrice: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  status: MembershipStatus;
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export type MembershipRevenue = {
  __typename?: 'MembershipRevenue';
  count: Scalars['Int']['output'];
  membershipId: Scalars['ID']['output'];
  membershipName: Scalars['String']['output'];
  revenue: Scalars['Float']['output'];
};

export enum MembershipStatus {
  Active = 'ACTIVE',
  ComingSoon = 'COMING_SOON',
  Inactive = 'INACTIVE'
}

export type MembershipTransaction = {
  __typename?: 'MembershipTransaction';
  client?: Maybe<User>;
  clientId: Scalars['ID']['output'];
  createdAt?: Maybe<Scalars['String']['output']>;
  expiresAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  membership?: Maybe<Membership>;
  membershipId: Scalars['ID']['output'];
  priceAtPurchase: Scalars['Float']['output'];
  startedAt: Scalars['String']['output'];
  status: TransactionStatus;
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  approveSubscriptionRequest: MembershipTransaction;
  cancelCoachRequest: Scalars['Boolean']['output'];
  cancelMembership: Scalars['Boolean']['output'];
  cancelSession: Scalars['Boolean']['output'];
  clientConfirmWeight: SessionLog;
  completeSession: SessionLog;
  confirmSessionCompletion: SessionLog;
  createCoachRequest: CoachRequest;
  createGoal: Goal;
  createMembership: Membership;
  createSession: Session;
  createSubscriptionRequest: SubscriptionRequest;
  createUser: AuthResponse;
  deleteGoal: Scalars['Boolean']['output'];
  deleteMembership: Scalars['Boolean']['output'];
  deleteUser?: Maybe<Scalars['Boolean']['output']>;
  directSubscribeMember: MembershipTransaction;
  login: AuthResponse;
  purchaseMembership: MembershipTransaction;
  rejectSubscriptionRequest: Scalars['Boolean']['output'];
  updateCoachRequest: CoachRequest;
  updateGoal: Goal;
  updateMembership: Membership;
  updateSession: Session;
  updateUser?: Maybe<User>;
};


export type MutationApproveSubscriptionRequestArgs = {
  input: ApproveSubscriptionRequestInput;
};


export type MutationCancelCoachRequestArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCancelMembershipArgs = {
  transactionId: Scalars['ID']['input'];
};


export type MutationCancelSessionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationClientConfirmWeightArgs = {
  sessionLogId: Scalars['ID']['input'];
};


export type MutationCompleteSessionArgs = {
  input: CreateSessionLogInput;
};


export type MutationConfirmSessionCompletionArgs = {
  input: ConfirmSessionCompletionInput;
};


export type MutationCreateCoachRequestArgs = {
  input: CreateCoachRequestInput;
};


export type MutationCreateGoalArgs = {
  input: CreateGoalInput;
};


export type MutationCreateMembershipArgs = {
  input: CreateMembershipInput;
};


export type MutationCreateSessionArgs = {
  input: CreateSessionInput;
};


export type MutationCreateSubscriptionRequestArgs = {
  input: CreateSubscriptionRequestInput;
};


export type MutationCreateUserArgs = {
  input: CreateUserInput;
};


export type MutationDeleteGoalArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteMembershipArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDirectSubscribeMemberArgs = {
  input: DirectSubscribeInput;
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationPurchaseMembershipArgs = {
  input: PurchaseMembershipInput;
};


export type MutationRejectSubscriptionRequestArgs = {
  input: RejectSubscriptionRequestInput;
};


export type MutationUpdateCoachRequestArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCoachRequestInput;
};


export type MutationUpdateGoalArgs = {
  id: Scalars['ID']['input'];
  input: UpdateGoalInput;
};


export type MutationUpdateMembershipArgs = {
  id: Scalars['ID']['input'];
  input: UpdateMembershipInput;
};


export type MutationUpdateSessionArgs = {
  id: Scalars['ID']['input'];
  input: UpdateSessionInput;
};


export type MutationUpdateUserArgs = {
  id: Scalars['ID']['input'];
  input: UpdateUserInput;
};

export type PeriodRevenue = {
  __typename?: 'PeriodRevenue';
  count: Scalars['Int']['output'];
  period: Scalars['String']['output'];
  revenue: Scalars['Float']['output'];
};

export type PurchaseMembershipInput = {
  membershipId: Scalars['ID']['input'];
};

export type Query = {
  __typename?: 'Query';
  getAnalytics?: Maybe<Analytics>;
  getAnalyticsRange: Array<Analytics>;
  getClientRequests: Array<CoachRequest>;
  getClientSessions: Array<Session>;
  getCoachRequests: Array<CoachRequest>;
  getCoachSessions: Array<Session>;
  getCurrentMembership?: Maybe<MembershipTransaction>;
  getGoal?: Maybe<Goal>;
  getGoals: Array<Goal>;
  getMembership?: Maybe<Membership>;
  getMembershipTransaction?: Maybe<MembershipTransaction>;
  getMemberships: Array<Membership>;
  getMySubscriptionRequests: Array<SubscriptionRequest>;
  getPendingCoachRequests: Array<CoachRequest>;
  getPendingSubscriptionRequests: Array<SubscriptionRequest>;
  getRevenueSummary: RevenueSummary;
  getSession?: Maybe<Session>;
  getSessionLogs: Array<SessionLog>;
  getSubscriptionRequest?: Maybe<SubscriptionRequest>;
  getUpcomingSessions: Array<Session>;
  getUser?: Maybe<User>;
  getUsers?: Maybe<Array<Maybe<User>>>;
  getWeightProgress: Array<SessionLog>;
  getWeightProgressChart: Array<WeightProgress>;
};


export type QueryGetAnalyticsArgs = {
  date: Scalars['String']['input'];
};


export type QueryGetAnalyticsRangeArgs = {
  dateRange: DateRangeInput;
};


export type QueryGetClientRequestsArgs = {
  clientId: Scalars['ID']['input'];
  status?: InputMaybe<CoachRequestStatus>;
};


export type QueryGetClientSessionsArgs = {
  clientId: Scalars['ID']['input'];
  status?: InputMaybe<SessionStatus>;
};


export type QueryGetCoachRequestsArgs = {
  coachId: Scalars['ID']['input'];
  status?: InputMaybe<CoachRequestStatus>;
};


export type QueryGetCoachSessionsArgs = {
  coachId: Scalars['ID']['input'];
  status?: InputMaybe<SessionStatus>;
};


export type QueryGetGoalArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetGoalsArgs = {
  clientId: Scalars['ID']['input'];
  status?: InputMaybe<GoalStatus>;
};


export type QueryGetMembershipArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetMembershipTransactionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetMembershipsArgs = {
  status?: InputMaybe<MembershipStatus>;
};


export type QueryGetRevenueSummaryArgs = {
  dateRange?: InputMaybe<DateRangeInput>;
};


export type QueryGetSessionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetSessionLogsArgs = {
  clientId: Scalars['ID']['input'];
};


export type QueryGetSubscriptionRequestArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetUserArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetUsersArgs = {
  role?: InputMaybe<RoleType>;
};


export type QueryGetWeightProgressArgs = {
  clientId: Scalars['ID']['input'];
  goalId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryGetWeightProgressChartArgs = {
  clientId: Scalars['ID']['input'];
  goalId?: InputMaybe<Scalars['ID']['input']>;
};

export type RejectSubscriptionRequestInput = {
  requestId: Scalars['ID']['input'];
};

export type RevenueSummary = {
  __typename?: 'RevenueSummary';
  activeSubscriptions: Scalars['Int']['output'];
  canceledSubscriptions: Scalars['Int']['output'];
  expiredSubscriptions: Scalars['Int']['output'];
  newSubscriptions: Scalars['Int']['output'];
  revenueByMembership: Array<MembershipRevenue>;
  revenueByPeriod: Array<PeriodRevenue>;
  totalRevenue: Scalars['Float']['output'];
};

export enum RoleType {
  Admin = 'admin',
  Coach = 'coach',
  Member = 'member'
}

export type Session = {
  __typename?: 'Session';
  clients?: Maybe<Array<User>>;
  clientsIds: Array<Scalars['ID']['output']>;
  coach?: Maybe<User>;
  coachId: Scalars['ID']['output'];
  createdAt?: Maybe<Scalars['String']['output']>;
  date: Scalars['String']['output'];
  endTime?: Maybe<Scalars['String']['output']>;
  gymArea: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  note?: Maybe<Scalars['String']['output']>;
  startTime: Scalars['String']['output'];
  status: SessionStatus;
  time?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['String']['output']>;
  workoutType?: Maybe<Scalars['String']['output']>;
};

export type SessionLog = {
  __typename?: 'SessionLog';
  client?: Maybe<User>;
  clientConfirmed: Scalars['Boolean']['output'];
  clientId: Scalars['ID']['output'];
  coach?: Maybe<User>;
  coachConfirmed: Scalars['Boolean']['output'];
  coachId: Scalars['ID']['output'];
  completedAt?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  session?: Maybe<Session>;
  sessionId: Scalars['ID']['output'];
  updatedAt?: Maybe<Scalars['String']['output']>;
  weight: Scalars['Float']['output'];
};

export enum SessionStatus {
  Cancelled = 'cancelled',
  Completed = 'completed',
  Scheduled = 'scheduled'
}

export type SubscriptionRequest = {
  __typename?: 'SubscriptionRequest';
  approvedAt?: Maybe<Scalars['String']['output']>;
  approvedBy?: Maybe<User>;
  createdAt?: Maybe<Scalars['String']['output']>;
  expiresAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  member?: Maybe<User>;
  memberId: Scalars['ID']['output'];
  membership?: Maybe<Membership>;
  membershipId: Scalars['ID']['output'];
  rejectedAt?: Maybe<Scalars['String']['output']>;
  rejectedBy?: Maybe<User>;
  requestedAt: Scalars['String']['output'];
  status: SubscriptionRequestStatus;
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export enum SubscriptionRequestStatus {
  Approved = 'APPROVED',
  Expired = 'EXPIRED',
  Pending = 'PENDING',
  Rejected = 'REJECTED'
}

export enum TransactionStatus {
  Active = 'ACTIVE',
  Canceled = 'CANCELED',
  Expired = 'EXPIRED'
}

export type UpdateCoachRequestInput = {
  status: CoachRequestStatus;
};

export type UpdateGoalInput = {
  currentWeight?: InputMaybe<Scalars['Float']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  goalType?: InputMaybe<FitnessGoalType>;
  status?: InputMaybe<GoalStatus>;
  targetDate?: InputMaybe<Scalars['String']['input']>;
  targetWeight?: InputMaybe<Scalars['Float']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateMembershipInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  durationType?: InputMaybe<DurationType>;
  features?: InputMaybe<Array<Scalars['String']['input']>>;
  monthlyPrice?: InputMaybe<Scalars['Float']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<MembershipStatus>;
};

export type UpdateSessionInput = {
  date?: InputMaybe<Scalars['String']['input']>;
  endTime?: InputMaybe<Scalars['String']['input']>;
  gymArea?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  startTime?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<SessionStatus>;
  workoutType?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserInput = {
  agreedToLiabilityWaiver?: InputMaybe<Scalars['Boolean']['input']>;
  agreedToPrivacyPolicy?: InputMaybe<Scalars['Boolean']['input']>;
  agreedToTermsAndConditions?: InputMaybe<Scalars['Boolean']['input']>;
  coachDetails?: InputMaybe<CoachDetailsInput>;
  currentPassword?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  heardFrom?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  membershipDetails?: InputMaybe<MemberDetailsInput>;
  middleName?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  agreedToLiabilityWaiver?: Maybe<Scalars['Boolean']['output']>;
  agreedToPrivacyPolicy?: Maybe<Scalars['Boolean']['output']>;
  agreedToTermsAndConditions?: Maybe<Scalars['Boolean']['output']>;
  coachDetails?: Maybe<CoachDetails>;
  createdAt?: Maybe<Scalars['String']['output']>;
  currentMembership?: Maybe<MembershipTransaction>;
  dateOfBirth?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  gender: Scalars['String']['output'];
  heardFrom?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  id: Scalars['ID']['output'];
  lastName: Scalars['String']['output'];
  membershipDetails?: Maybe<MemberDetails>;
  middleName?: Maybe<Scalars['String']['output']>;
  phoneNumber?: Maybe<Scalars['String']['output']>;
  role: RoleType;
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export type WeightProgress = {
  __typename?: 'WeightProgress';
  date: Scalars['String']['output'];
  sessionId?: Maybe<Scalars['ID']['output']>;
  sessionLogId?: Maybe<Scalars['ID']['output']>;
  weight: Scalars['Float']['output'];
};

export type GetRevenueSummaryQueryVariables = Exact<{
  dateRange?: InputMaybe<DateRangeInput>;
}>;


export type GetRevenueSummaryQuery = { __typename?: 'Query', getRevenueSummary: { __typename?: 'RevenueSummary', totalRevenue: number, activeSubscriptions: number, newSubscriptions: number, canceledSubscriptions: number, expiredSubscriptions: number, revenueByMembership: Array<{ __typename?: 'MembershipRevenue', membershipId: string, membershipName: string, revenue: number, count: number }>, revenueByPeriod: Array<{ __typename?: 'PeriodRevenue', period: string, revenue: number, count: number }> } };

export type GetAnalyticsQueryVariables = Exact<{
  date: Scalars['String']['input'];
}>;


export type GetAnalyticsQuery = { __typename?: 'Query', getAnalytics?: { __typename?: 'Analytics', id: string, date: string, totalRevenue: number, activeSubscriptions: number, newSubscriptions: number, canceledSubscriptions: number, expiredSubscriptions: number, createdAt?: string | null, updatedAt?: string | null, revenueByMembership: Array<{ __typename?: 'MembershipRevenue', membershipId: string, membershipName: string, revenue: number, count: number }> } | null };

export type GetAnalyticsRangeQueryVariables = Exact<{
  dateRange: DateRangeInput;
}>;


export type GetAnalyticsRangeQuery = { __typename?: 'Query', getAnalyticsRange: Array<{ __typename?: 'Analytics', id: string, date: string, totalRevenue: number, activeSubscriptions: number, newSubscriptions: number, canceledSubscriptions: number, expiredSubscriptions: number, createdAt?: string | null, updatedAt?: string | null, revenueByMembership: Array<{ __typename?: 'MembershipRevenue', membershipId: string, membershipName: string, revenue: number, count: number }> }> };

export type GetAllMembershipsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllMembershipsQuery = { __typename?: 'Query', getMemberships: Array<{ __typename?: 'Membership', id: string, name: string, monthlyPrice: number, description?: string | null, features: Array<string>, status: MembershipStatus, durationType: DurationType, createdAt?: string | null, updatedAt?: string | null }> };

export type GetActiveMembershipsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetActiveMembershipsQuery = { __typename?: 'Query', getMemberships: Array<{ __typename?: 'Membership', id: string, name: string, monthlyPrice: number, description?: string | null, features: Array<string>, status: MembershipStatus, durationType: DurationType, createdAt?: string | null, updatedAt?: string | null }> };

export type GetCurrentMembershipQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCurrentMembershipQuery = { __typename?: 'Query', getCurrentMembership?: { __typename?: 'MembershipTransaction', id: string, clientId: string, membershipId: string, priceAtPurchase: number, startedAt: string, expiresAt: string, status: TransactionStatus, createdAt?: string | null, updatedAt?: string | null, membership?: { __typename?: 'Membership', id: string, name: string, monthlyPrice: number, description?: string | null, features: Array<string>, durationType: DurationType } | null } | null };

export type DirectSubscribeMemberMutationVariables = Exact<{
  input: DirectSubscribeInput;
}>;


export type DirectSubscribeMemberMutation = { __typename?: 'Mutation', directSubscribeMember: { __typename?: 'MembershipTransaction', id: string, clientId: string, membershipId: string, priceAtPurchase: number, startedAt: string, expiresAt: string, status: TransactionStatus, createdAt?: string | null, membership?: { __typename?: 'Membership', id: string, name: string, monthlyPrice: number } | null } };

export type GetPendingSubscriptionRequestsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetPendingSubscriptionRequestsQuery = { __typename?: 'Query', getPendingSubscriptionRequests: Array<{ __typename?: 'SubscriptionRequest', id: string, memberId: string, membershipId: string, status: SubscriptionRequestStatus, requestedAt: string, expiresAt: string, createdAt?: string | null, member?: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string } | null, membership?: { __typename?: 'Membership', id: string, name: string, monthlyPrice: number, description?: string | null, features: Array<string>, status: MembershipStatus, durationType: DurationType } | null }> };

export type ApproveSubscriptionRequestMutationVariables = Exact<{
  input: ApproveSubscriptionRequestInput;
}>;


export type ApproveSubscriptionRequestMutation = { __typename?: 'Mutation', approveSubscriptionRequest: { __typename?: 'MembershipTransaction', id: string, clientId: string, priceAtPurchase: number, startedAt: string, expiresAt: string, status: TransactionStatus, membership?: { __typename?: 'Membership', id: string, name: string, monthlyPrice: number } | null } };

export type RejectSubscriptionRequestMutationVariables = Exact<{
  input: RejectSubscriptionRequestInput;
}>;


export type RejectSubscriptionRequestMutation = { __typename?: 'Mutation', rejectSubscriptionRequest: boolean };

export type GetUsersQueryVariables = Exact<{
  role?: InputMaybe<RoleType>;
}>;


export type GetUsersQuery = { __typename?: 'Query', getUsers?: Array<{ __typename?: 'User', id: string, firstName: string, middleName?: string | null, lastName: string, email: string, role: RoleType, phoneNumber?: string | null, dateOfBirth?: string | null, gender: string, heardFrom?: Array<string | null> | null, createdAt?: string | null, updatedAt?: string | null, membershipDetails?: { __typename?: 'MemberDetails', membershipId?: string | null, physiqueGoalType: string, fitnessGoal?: Array<string> | null, workOutTime?: Array<string | null> | null, coachesIds?: Array<string | null> | null, hasEnteredDetails?: boolean | null, membershipTransaction?: { __typename?: 'MembershipTransaction', id: string, membershipId: string, priceAtPurchase: number, startedAt: string, expiresAt: string, status: TransactionStatus, membership?: { __typename?: 'Membership', id: string, name: string, monthlyPrice: number, description?: string | null, features: Array<string>, status: MembershipStatus, durationType: DurationType } | null } | null } | null, currentMembership?: { __typename?: 'MembershipTransaction', id: string, membershipId: string, priceAtPurchase: number, startedAt: string, expiresAt: string, status: TransactionStatus, membership?: { __typename?: 'Membership', id: string, name: string, monthlyPrice: number, description?: string | null, features: Array<string>, status: MembershipStatus, durationType: DurationType } | null } | null, coachDetails?: { __typename?: 'CoachDetails', clientsIds?: Array<string | null> | null, sessionsIds?: Array<string | null> | null, specialization?: Array<string> | null, ratings?: number | null, yearsOfExperience?: number | null, moreDetails?: string | null, teachingDate?: Array<string | null> | null, teachingTime?: Array<string | null> | null, clientLimit?: number | null } | null } | null> | null };

export type GetUserQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetUserQuery = { __typename?: 'Query', getUser?: { __typename?: 'User', id: string, firstName: string, middleName?: string | null, lastName: string, email: string, role: RoleType, phoneNumber?: string | null, dateOfBirth?: string | null, gender: string, heardFrom?: Array<string | null> | null, createdAt?: string | null, updatedAt?: string | null, membershipDetails?: { __typename?: 'MemberDetails', membershipId?: string | null, physiqueGoalType: string, fitnessGoal?: Array<string> | null, workOutTime?: Array<string | null> | null, coachesIds?: Array<string | null> | null, hasEnteredDetails?: boolean | null, membershipTransaction?: { __typename?: 'MembershipTransaction', id: string, membershipId: string, priceAtPurchase: number, startedAt: string, expiresAt: string, status: TransactionStatus, membership?: { __typename?: 'Membership', id: string, name: string, monthlyPrice: number, description?: string | null, features: Array<string>, status: MembershipStatus, durationType: DurationType } | null } | null } | null, currentMembership?: { __typename?: 'MembershipTransaction', id: string, membershipId: string, priceAtPurchase: number, startedAt: string, expiresAt: string, status: TransactionStatus, membership?: { __typename?: 'Membership', id: string, name: string, monthlyPrice: number, description?: string | null, features: Array<string>, status: MembershipStatus, durationType: DurationType } | null } | null, coachDetails?: { __typename?: 'CoachDetails', clientsIds?: Array<string | null> | null, sessionsIds?: Array<string | null> | null, specialization?: Array<string> | null, ratings?: number | null, yearsOfExperience?: number | null, moreDetails?: string | null, teachingDate?: Array<string | null> | null, teachingTime?: Array<string | null> | null, clientLimit?: number | null } | null } | null };

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'AuthResponse', token: string, user: { __typename?: 'User', id: string, firstName: string, middleName?: string | null, lastName: string, email: string, role: RoleType, phoneNumber?: string | null, dateOfBirth?: string | null, gender: string } } };

export type CreateUserMutationVariables = Exact<{
  input: CreateUserInput;
}>;


export type CreateUserMutation = { __typename?: 'Mutation', createUser: { __typename?: 'AuthResponse', token: string, user: { __typename?: 'User', id: string, firstName: string, middleName?: string | null, lastName: string, email: string, role: RoleType, phoneNumber?: string | null, dateOfBirth?: string | null, gender: string } } };

export type UpdateUserMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateUserInput;
}>;


export type UpdateUserMutation = { __typename?: 'Mutation', updateUser?: { __typename?: 'User', id: string, firstName: string, middleName?: string | null, lastName: string, email: string, phoneNumber?: string | null, dateOfBirth?: string | null, gender: string, updatedAt?: string | null, membershipDetails?: { __typename?: 'MemberDetails', membershipId?: string | null, physiqueGoalType: string, fitnessGoal?: Array<string> | null, workOutTime?: Array<string | null> | null, coachesIds?: Array<string | null> | null, hasEnteredDetails?: boolean | null } | null, coachDetails?: { __typename?: 'CoachDetails', clientsIds?: Array<string | null> | null, sessionsIds?: Array<string | null> | null, specialization?: Array<string> | null, ratings?: number | null, yearsOfExperience?: number | null, moreDetails?: string | null, teachingDate?: Array<string | null> | null, teachingTime?: Array<string | null> | null, clientLimit?: number | null } | null } | null };

export type DeleteUserMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteUserMutation = { __typename?: 'Mutation', deleteUser?: boolean | null };

export type CreateMembershipMutationVariables = Exact<{
  input: CreateMembershipInput;
}>;


export type CreateMembershipMutation = { __typename?: 'Mutation', createMembership: { __typename?: 'Membership', id: string, name: string, monthlyPrice: number, description?: string | null, features: Array<string>, status: MembershipStatus, durationType: DurationType, createdAt?: string | null, updatedAt?: string | null } };

export type UpdateMembershipMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateMembershipInput;
}>;


export type UpdateMembershipMutation = { __typename?: 'Mutation', updateMembership: { __typename?: 'Membership', id: string, name: string, monthlyPrice: number, description?: string | null, features: Array<string>, status: MembershipStatus, durationType: DurationType, updatedAt?: string | null } };

export type DeleteMembershipMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteMembershipMutation = { __typename?: 'Mutation', deleteMembership: boolean };

export type PurchaseMembershipMutationVariables = Exact<{
  input: PurchaseMembershipInput;
}>;


export type PurchaseMembershipMutation = { __typename?: 'Mutation', purchaseMembership: { __typename?: 'MembershipTransaction', id: string, clientId: string, membershipId: string, priceAtPurchase: number, startedAt: string, expiresAt: string, status: TransactionStatus, createdAt?: string | null, updatedAt?: string | null, membership?: { __typename?: 'Membership', id: string, name: string, monthlyPrice: number, description?: string | null, features: Array<string> } | null } };

export type CancelMembershipMutationVariables = Exact<{
  transactionId: Scalars['ID']['input'];
}>;


export type CancelMembershipMutation = { __typename?: 'Mutation', cancelMembership: boolean };
