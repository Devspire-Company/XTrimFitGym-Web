# XTrimFitGym API Integration Guide

## Overview
The XTrimFitGym-Web application has been fully integrated with the XTrimFitGym-Api GraphQL backend. All pages now fetch real data from the API instead of using mock data.

## Setup Instructions

### 1. Environment Configuration
Create a `.env` file in the project root:

```env
VITE_GRAPHQL_URL=http://localhost:4000/graphql
VITE_USE_MOCK=false
```

- `VITE_GRAPHQL_URL`: The URL of your GraphQL API endpoint
- `VITE_USE_MOCK`: Set to `true` to use mock data (for offline development), `false` to use the real API

### 2. Start the API Server
Navigate to the API directory and start the server:

```bash
cd ../XTrimFitGym-Api
npm run dev
```

The API should be running on `http://localhost:4000/graphql`

### 3. Start the Web Application
In the web project directory:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port Vite assigns)

## Features Implemented

### Authentication
- **Login Page** (`/login`): Users can authenticate using their email and password
- **Protected Routes**: All admin routes require authentication
- **Auto-redirect**: Unauthenticated users are redirected to `/login`
- **Logout**: Clears credentials and redirects to login page

### Dashboard (`/dashboard`)
- **Real-time Stats**: Total members, coaches, revenue, and subscriptions
- **Recent Members**: Latest registered members from the API
- **Coach List**: Active coaches with their specializations
- **Revenue Charts**: Based on membership data
- **Auto-refresh**: Data refreshes every 30 seconds

### Members Page (`/members`)
- **List All Members**: Fetches all users with role `member`
- **Search & Filter**: By name, email, membership type, and status
- **View Details**: Full member profile information
- **Delete Member**: Remove members with confirmation
- **Loading States**: Shows spinner while fetching data
- **Real-time Count**: Displays total number of members

### Coaches Page (`/coaches`)
- **List All Coaches**: Fetches all users with role `coach`
- **Search & Filter**: By name, specialization, and status
- **View Details**: Coach profiles with specializations and experience
- **Delete Coach**: Remove coaches with confirmation
- **Loading States**: Shows spinner while fetching data
- **Real-time Count**: Displays total number of coaches

### Memberships Page (`/memberships`)
- **List All Plans**: Fetches all membership plans from the API
- **Plan Details**: Name, price, duration, features, and status
- **Loading States**: Shows spinner while fetching data
- **Real-time Count**: Displays total number of plans

## GraphQL Operations

### Queries
Located in `src/graphql/operations/queries.ts`:

- `GET_DASHBOARD_STATS`: Fetch members and coaches for dashboard
- `GET_ALL_MEMBERS`: Fetch all members with detailed information
- `GET_ALL_COACHES`: Fetch all coaches with specializations
- `GET_ALL_MEMBERSHIPS`: Fetch all membership plans

### Mutations
Located in `src/graphql/operations/mutations.ts`:

- `LOGIN`: Authenticate user and get token
- `CREATE_USER`: Register a new user (member/coach/admin)
- `UPDATE_USER`: Update user information
- `DELETE_USER`: Remove a user from the system
- `CREATE_MEMBERSHIP`: Add a new membership plan
- `PURCHASE_MEMBERSHIP`: Subscribe a member to a plan
- `CANCEL_MEMBERSHIP`: Cancel a membership subscription

## Data Mapping

### API to Frontend Mapping

#### Members
```typescript
API Response → Frontend Display
---------------------------------
firstName, lastName → name (combined)
email → email
phoneNumber → phone
membershipDetails.membershipTransaction.status → membership status
membershipDetails.fitnessGoal → fitness goals
createdAt → join date
```

#### Coaches
```typescript
API Response → Frontend Display
---------------------------------
firstName, lastName → name (combined)
coachDetails.specialization[0] → primary specialization
coachDetails.yearsOfExperience → years of experience
coachDetails.ratings → rating
coachDetails.clientsIds.length → total clients
```

#### Memberships
```typescript
API Response → Frontend Display
---------------------------------
name → plan name
monthlyPrice → price
durationType → duration (MONTHLY/YEARLY/QUARTERLY)
features → plan features array
status → ACTIVE/INACTIVE/COMING_SOON
```

## Error Handling

### Fallback to Mock Data
If the API is unavailable or returns an error, the application automatically falls back to mock data to ensure continued functionality during development.

### Toast Notifications
- Success messages for completed actions (create, update, delete)
- Error messages with details when operations fail
- Network error handling with user-friendly messages

### Loading States
All pages show a loading spinner while fetching data from the API.

## Authentication Flow

1. **User visits protected route** → Redirected to `/login`
2. **User enters credentials** → `LOGIN` mutation sent to API
3. **API validates** → Returns user object and JWT token
4. **Frontend stores** → Token saved in Redux store and localStorage
5. **User redirected** → Dashboard page with full access
6. **Subsequent requests** → Token included in Authorization header

## Apollo Client Configuration

Located in `src/lib/apollo/client.ts`:

```typescript
// Authentication headers automatically added
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('authToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});
```

## Type Safety

### GraphQL Code Generation
Types are automatically generated from the GraphQL schema:

```bash
npm run codegen
```

This creates TypeScript types in `src/graphql/generated/` based on:
- GraphQL schema from the API
- GraphQL operations defined in the frontend

### Usage Example
```typescript
import { useQuery } from '@apollo/client';
import { GET_ALL_MEMBERS } from '@/graphql/operations/queries';

const { data, loading, error } = useQuery(GET_ALL_MEMBERS);
// data, loading, and error are fully typed
```

## Future Enhancements

### Pending Features
1. **Create/Update Forms**: Add UI for creating and updating members, coaches, and memberships
2. **Advanced Filters**: More filtering options (date ranges, custom fields)
3. **Batch Operations**: Select multiple items for bulk actions
4. **Real-time Updates**: WebSocket integration for live data updates
5. **Export Functionality**: Export data to CSV/Excel
6. **Advanced Reports**: More detailed analytics and charts

### API Extensions Needed
- Session logs for member progress tracking
- Goals API for fitness goal management
- Coach requests for client-coach relationships
- Notification system
- File uploads for profile pictures

## Troubleshooting

### API Connection Issues
1. Ensure the API server is running on `http://localhost:4000`
2. Check the `.env` file has correct `VITE_GRAPHQL_URL`
3. Verify no CORS issues in browser console
4. Check API server logs for errors

### Authentication Issues
1. Clear localStorage: `localStorage.clear()`
2. Clear Redux persist: Delete `persist:root` from localStorage
3. Restart both API and web servers
4. Check token expiration settings in the API

### Data Not Showing
1. Check browser console for GraphQL errors
2. Verify the API has data (use GraphQL Playground)
3. Check network tab for failed requests
4. Enable mock data: Set `VITE_USE_MOCK=true` in `.env`

### Type Errors
1. Run `npm run codegen` to regenerate types
2. Ensure API is running (codegen fetches schema from it)
3. Check for schema changes in the API

## Testing

### Manual Testing Checklist
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should show error)
- [ ] Dashboard loads with real data
- [ ] Members page shows all members
- [ ] Search and filter members works
- [ ] View member details modal
- [ ] Delete member with confirmation
- [ ] Coaches page shows all coaches
- [ ] Memberships page shows all plans
- [ ] Logout redirects to login page
- [ ] Protected routes require authentication
- [ ] Fallback to mock data when API is down

## Development Mode

### Using Mock Data
Set `VITE_USE_MOCK=true` in `.env` to use mock data. This is useful for:
- Offline development
- Testing UI without database changes
- Rapid prototyping

### Using Real API
Set `VITE_USE_MOCK=false` in `.env` to use the real API. This is required for:
- Testing actual data flows
- Integration testing
- Production deployment

## Deployment Considerations

### Environment Variables
Set these in your production environment:

```env
VITE_GRAPHQL_URL=https://api.xtrimfitgym.com/graphql
VITE_USE_MOCK=false
```

### API Deployment
Ensure the API is deployed and accessible from the web application domain.

### CORS Configuration
The API must allow requests from the web application domain.

### Build Process
```bash
npm run build
```

This creates optimized production files in `dist/`

## Support
For issues or questions, contact the development team or create an issue in the repository.

