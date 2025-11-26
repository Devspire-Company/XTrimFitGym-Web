# 🔴 Real-Time Data Implementation Guide

## ⚡ **Real-Time Requirements**

All applications (Admin Web, Coach App, Client App) must receive **instant updates** when data changes in the database.

---

## 🎯 **Implementation Strategy**

### **Phase 1: Current State (Polling)** ✅
- Dashboard: 30-second auto-refresh
- Manual refresh on mutations
- Cache updates after operations

### **Phase 2: WebSocket Subscriptions** 🔄 (Next)
- Instant updates on data changes
- No polling needed
- Bi-directional communication

---

## 📡 **Real-Time Features Needed**

### **Admin Web App**
1. **Dashboard**
   - ✅ Member count updates (30s polling)
   - 🔄 Instant new member notifications
   - 🔄 Real-time revenue updates
   - 🔄 Live coach activity

2. **Members Page**
   - ✅ Refetch after CRUD operations
   - 🔄 Live status changes (Active/Inactive)
   - 🔄 New member alerts
   - 🔄 Membership expiration warnings

3. **Coaches Page**
   - ✅ Refetch after CRUD operations
   - 🔄 Live coach availability status
   - 🔄 Session updates
   - 🔄 Client assignments

4. **Memberships Page**
   - ✅ Refetch after CRUD operations
   - 🔄 Live subscription counts
   - 🔄 Purchase notifications

5. **Reports Page**
   - ✅ Real-time member data
   - 🔄 Live revenue tracking
   - 🔄 Workout completion updates

### **Coach App**
- 🔄 New client assignments
- 🔄 Session bookings/cancellations
- 🔄 Client progress updates
- 🔄 Messages from clients

### **Client App**
- 🔄 Membership status changes
- 🔄 Session confirmations
- 🔄 Coach feedback
- 🔄 Progress tracking updates

---

## 🛠️ **Implementation Plan**

### **Step 1: Update Backend - Add GraphQL Subscriptions**

#### **Install Dependencies**
```bash
cd XTrimFitGym-Api
npm install graphql-subscriptions graphql-ws ws
```

#### **Create PubSub Instance**
```typescript
// src/graphql/pubsub.ts
import { PubSub } from 'graphql-subscriptions';
export const pubsub = new PubSub();

// Events
export const EVENTS = {
  MEMBER_CREATED: 'MEMBER_CREATED',
  MEMBER_UPDATED: 'MEMBER_UPDATED',
  MEMBER_DELETED: 'MEMBER_DELETED',
  COACH_CREATED: 'COACH_CREATED',
  COACH_UPDATED: 'COACH_UPDATED',
  COACH_DELETED: 'COACH_DELETED',
  MEMBERSHIP_PURCHASED: 'MEMBERSHIP_PURCHASED',
  MEMBERSHIP_CANCELLED: 'MEMBERSHIP_CANCELLED',
  SESSION_CREATED: 'SESSION_CREATED',
  SESSION_UPDATED: 'SESSION_UPDATED',
  SESSION_COMPLETED: 'SESSION_COMPLETED',
};
```

#### **Add Subscription Schema**
```graphql
# user-typeDefs.graphql
extend type Subscription {
  memberCreated: User!
  memberUpdated: User!
  memberDeleted: ID!
  coachCreated: User!
  coachUpdated: User!
  coachDeleted: ID!
}
```

#### **Implement Resolvers**
```typescript
// user-resolvers.ts
import { pubsub, EVENTS } from '../pubsub';

export default {
  Mutation: {
    createUser: async (_, { input }, context) => {
      // ... existing code
      const user = await newUser.save();
      
      // Publish event
      if (user.role === 'member') {
        pubsub.publish(EVENTS.MEMBER_CREATED, { memberCreated: user });
      } else if (user.role === 'coach') {
        pubsub.publish(EVENTS.COACH_CREATED, { coachCreated: user });
      }
      
      return user;
    },
    
    updateUser: async (_, { id, input }, context) => {
      // ... existing code
      const user = await User.findByIdAndUpdate(id, input, { new: true });
      
      // Publish event
      if (user.role === 'member') {
        pubsub.publish(EVENTS.MEMBER_UPDATED, { memberUpdated: user });
      } else if (user.role === 'coach') {
        pubsub.publish(EVENTS.COACH_UPDATED, { coachUpdated: user });
      }
      
      return user;
    },
    
    deleteUser: async (_, { id }, context) => {
      // ... existing code
      const user = await User.findById(id);
      await User.findByIdAndDelete(id);
      
      // Publish event
      if (user.role === 'member') {
        pubsub.publish(EVENTS.MEMBER_DELETED, { memberDeleted: id });
      } else if (user.role === 'coach') {
        pubsub.publish(EVENTS.COACH_DELETED, { coachDeleted: id });
      }
      
      return true;
    },
  },
  
  Subscription: {
    memberCreated: {
      subscribe: () => pubsub.asyncIterator([EVENTS.MEMBER_CREATED]),
    },
    memberUpdated: {
      subscribe: () => pubsub.asyncIterator([EVENTS.MEMBER_UPDATED]),
    },
    memberDeleted: {
      subscribe: () => pubsub.asyncIterator([EVENTS.MEMBER_DELETED]),
    },
    coachCreated: {
      subscribe: () => pubsub.asyncIterator([EVENTS.COACH_CREATED]),
    },
    coachUpdated: {
      subscribe: () => pubsub.asyncIterator([EVENTS.COACH_UPDATED]),
    },
    coachDeleted: {
      subscribe: () => pubsub.asyncIterator([EVENTS.COACH_DELETED]),
    },
  },
};
```

#### **Update Server Configuration**
```typescript
// src/server.ts
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const httpServer = createServer(app);

// WebSocket server for subscriptions
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

useServer(
  {
    schema,
    context: async (ctx) => {
      // Get token from connection params
      const token = ctx.connectionParams?.authorization;
      return { auth: verifyToken(token) };
    },
  },
  wsServer
);

httpServer.listen(4000, () => {
  console.log('🚀 Server ready at http://localhost:4000');
  console.log('🔴 Subscriptions ready at ws://localhost:4000/graphql');
});
```

---

### **Step 2: Update Frontend - Implement Subscriptions**

#### **Install Dependencies**
```bash
cd XTrimFitGym-Web
npm install graphql-ws
```

#### **Update Apollo Client**
```typescript
// src/lib/apollo/client.ts
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { split } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';

// HTTP link for queries and mutations
const httpLink = createHttpLink({
  uri: 'http://localhost:4000/graphql',
});

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:4000/graphql',
    connectionParams: () => {
      const token = localStorage.getItem('authToken');
      return {
        authorization: token ? `Bearer ${token}` : '',
      };
    },
  })
);

// Split based on operation type
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  from([errorLink, authLink, httpLink])
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
```

#### **Create Subscription Hooks**
```typescript
// src/hooks/useRealtimeMembers.ts
import { useSubscription, gql } from '@apollo/client';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';

const MEMBER_CREATED = gql`
  subscription MemberCreated {
    memberCreated {
      id
      firstName
      lastName
      email
    }
  }
`;

const MEMBER_UPDATED = gql`
  subscription MemberUpdated {
    memberUpdated {
      id
      firstName
      lastName
      email
    }
  }
`;

const MEMBER_DELETED = gql`
  subscription MemberDeleted {
    memberDeleted
  }
`;

export function useRealtimeMembers(refetch: () => void) {
  const dispatch = useAppDispatch();

  // Subscribe to new members
  useSubscription(MEMBER_CREATED, {
    onData: ({ data }) => {
      const member = data.data.memberCreated;
      dispatch(
        addToast({
          type: 'info',
          message: `New member joined: ${member.firstName} ${member.lastName}`,
        })
      );
      refetch(); // Refresh the list
    },
  });

  // Subscribe to member updates
  useSubscription(MEMBER_UPDATED, {
    onData: () => {
      refetch(); // Refresh the list
    },
  });

  // Subscribe to member deletions
  useSubscription(MEMBER_DELETED, {
    onData: ({ data }) => {
      const memberId = data.data.memberDeleted;
      dispatch(
        addToast({
          type: 'warning',
          message: 'A member was removed',
        })
      );
      refetch(); // Refresh the list
    },
  });
}
```

#### **Use in Components**
```typescript
// src/pages/Members.tsx
import { useRealtimeMembers } from '@/hooks/useRealtimeMembers';

export function MembersPage() {
  const { data, loading, error, refetch } = useQuery(GET_ALL_MEMBERS);
  
  // Enable real-time updates
  useRealtimeMembers(refetch);
  
  // ... rest of component
}
```

---

## 📊 **Real-Time Data Flow**

```
Database Change
    ↓
MongoDB Update
    ↓
API Resolver (Mutation)
    ↓
PubSub.publish(EVENT)
    ↓
WebSocket Broadcast
    ↓
All Connected Clients
    ↓
Apollo Cache Update
    ↓
UI Re-render
```

---

## 🎯 **Subscription Events to Implement**

### **Priority 1: User Management**
- ✅ `MEMBER_CREATED` - New member registration
- ✅ `MEMBER_UPDATED` - Profile/status changes
- ✅ `MEMBER_DELETED` - Member removed
- ✅ `COACH_CREATED` - New coach added
- ✅ `COACH_UPDATED` - Coach profile updated
- ✅ `COACH_DELETED` - Coach removed

### **Priority 2: Memberships**
- 🔄 `MEMBERSHIP_PURCHASED` - New subscription
- 🔄 `MEMBERSHIP_CANCELLED` - Subscription cancelled
- 🔄 `MEMBERSHIP_EXPIRING` - Expiration warning (7 days)
- 🔄 `MEMBERSHIP_EXPIRED` - Subscription expired

### **Priority 3: Sessions**
- 🔄 `SESSION_CREATED` - New session scheduled
- 🔄 `SESSION_UPDATED` - Session rescheduled
- 🔄 `SESSION_CANCELLED` - Session cancelled
- 🔄 `SESSION_COMPLETED` - Workout completed

### **Priority 4: Analytics**
- 🔄 `REVENUE_UPDATED` - Real-time revenue tracking
- 🔄 `PROGRESS_LOGGED` - Client progress update
- 🔄 `GOAL_ACHIEVED` - Client reached goal

---

## 🔧 **Optimizations**

### **1. Debouncing**
Prevent too many updates in short time:
```typescript
import { debounce } from 'lodash';

const debouncedRefetch = debounce(refetch, 1000);
```

### **2. Selective Subscriptions**
Only subscribe to relevant data:
```typescript
// Admin: Subscribe to all
useRealtimeMembers(refetch);
useRealtimeCoaches(refetch);
useRealtimeMemberships(refetch);

// Coach: Only their clients
useRealtimeCoachClients(coachId, refetch);

// Client: Only their data
useRealtimeClientData(clientId, refetch);
```

### **3. Connection Management**
Handle reconnection gracefully:
```typescript
const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:4000/graphql',
    retryAttempts: 5,
    connectionAckWaitTimeout: 30000,
    on: {
      connected: () => console.log('🔴 WebSocket connected'),
      closed: () => console.log('⚫ WebSocket disconnected'),
      error: (error) => console.error('❌ WebSocket error:', error),
    },
  })
);
```

### **4. Cache Updates**
Update cache directly without refetch:
```typescript
useSubscription(MEMBER_CREATED, {
  onData: ({ data, client }) => {
    const newMember = data.data.memberCreated;
    
    // Update cache
    client.cache.modify({
      fields: {
        getUsers(existingUsers = []) {
          const newMemberRef = client.cache.writeFragment({
            data: newMember,
            fragment: gql`
              fragment NewMember on User {
                id
                firstName
                lastName
                email
              }
            `,
          });
          return [...existingUsers, newMemberRef];
        },
      },
    });
  },
});
```

---

## 🚀 **Performance Considerations**

### **Bandwidth**
- Use field-level subscriptions (only changed fields)
- Implement pagination for large datasets
- Compress WebSocket messages

### **Scalability**
- Use Redis PubSub for multiple API instances
- Implement connection pooling
- Add rate limiting per user

### **Battery/Resources**
- Pause subscriptions when app in background
- Use smart polling fallback if WebSocket fails
- Implement connection keepalive pings

---

## 📱 **Mobile App Considerations**

### **React Native**
```typescript
// Use same Apollo Client setup
import { ApolloClient } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';

// Handle app state changes
import { AppState } from 'react-native';

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    // Reconnect WebSocket
    wsLink.client.reconnect();
  } else {
    // Close connection to save battery
    wsLink.client.close();
  }
});
```

---

## ✅ **Testing Real-Time Features**

### **Test Scenarios**
1. **Two browsers open**
   - Update member in Browser A
   - Should instantly appear in Browser B

2. **Mobile + Web**
   - Create session on mobile
   - Should appear on admin dashboard instantly

3. **Network interruption**
   - Disconnect WiFi
   - Reconnect
   - Subscriptions should resume

### **Test Tools**
- GraphQL Playground (Subscriptions tab)
- Multiple browser windows
- Network throttling in DevTools

---

## 🎯 **Current vs Target State**

### **Current (Polling)**
- ⏱️ 30-second delay for dashboard
- 🔄 Manual refresh needed
- 📊 Higher server load
- ❌ Not truly real-time

### **Target (Subscriptions)**
- ⚡ Instant updates (<1s)
- 🔄 Automatic synchronization
- 📊 Lower server load
- ✅ True real-time experience

---

## 📋 **Implementation Checklist**

### **Backend**
- [ ] Install graphql-subscriptions & graphql-ws
- [ ] Create PubSub instance
- [ ] Add subscription typeDefs
- [ ] Implement subscription resolvers
- [ ] Publish events in mutations
- [ ] Configure WebSocket server
- [ ] Test subscriptions in Playground

### **Frontend**
- [ ] Install graphql-ws
- [ ] Update Apollo Client with split link
- [ ] Create subscription hooks
- [ ] Implement in all pages
- [ ] Add connection status indicator
- [ ] Handle reconnection
- [ ] Test across multiple clients

### **Testing**
- [ ] Test member CRUD real-time updates
- [ ] Test coach CRUD real-time updates
- [ ] Test membership purchase notifications
- [ ] Test multi-device synchronization
- [ ] Test offline/reconnection scenarios
- [ ] Performance testing with many connections

---

## 🔐 **Security**

### **Authentication**
- ✅ Verify JWT token in connectionParams
- ✅ Re-validate on each subscription
- ✅ Disconnect unauthorized users

### **Authorization**
- ✅ Filter subscription data by role
- ✅ Admin sees all events
- ✅ Coaches see only their clients
- ✅ Clients see only their data

---

## 📚 **Resources**

- [Apollo Subscriptions](https://www.apollographql.com/docs/react/data/subscriptions/)
- [GraphQL WS](https://github.com/enisdenjo/graphql-ws)
- [PubSub](https://www.apollographql.com/docs/apollo-server/data/subscriptions/)

---

**Status:** 📋 Ready for Implementation  
**Priority:** 🔴 High  
**Estimated Time:** 2-3 days  
**Impact:** ⚡ Real-time updates across all apps

