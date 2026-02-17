import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

const getGraphQLUrl = (): string => {
	// In production (e.g. Vercel), you MUST set VITE_GRAPHQL_URL to your deployed API URL.
	// Example: https://your-api.railway.app/graphql or https://xtrimfitgym-api.onrender.com/graphql
	const url =
		import.meta.env.VITE_GRAPHQL_URL ||
		(import.meta.env.DEV ? 'http://localhost:8000/graphql' : '');
	if (import.meta.env.DEV) {
		console.log(`[Apollo Client] Connecting to GraphQL endpoint: ${url}`);
	}
	if (!import.meta.env.DEV && !url) {
		console.error(
			'[Apollo Client] VITE_GRAPHQL_URL is not set. Set it in your host (e.g. Vercel Environment Variables) to your deployed API URL, e.g. https://your-api.example.com/graphql'
		);
	}
	return url;
};

const httpLink = createHttpLink({
	uri: getGraphQLUrl(),
	fetchOptions: {
		mode: 'cors',
	},
});

// WebSocket link for real-time subscriptions
const getWebSocketUrl = (): string => {
	// If not set, derive from HTTP URL (http -> ws, https -> wss) so you only need VITE_GRAPHQL_URL in production
	const graphqlUrl = getGraphQLUrl();
	const explicitWs = import.meta.env.VITE_GRAPHQL_WS_URL;
	if (explicitWs) return explicitWs;
	if (graphqlUrl.startsWith('https://')) return graphqlUrl.replace(/^https:\/\//, 'wss://');
	if (graphqlUrl.startsWith('http://')) return graphqlUrl.replace(/^http:\/\//, 'ws://');
	return import.meta.env.DEV ? 'ws://localhost:8000/graphql' : '';
};

const wsLink = new GraphQLWsLink(
	createClient({
		url: getWebSocketUrl(),
		connectionParams: () => {
			const token = localStorage.getItem('authToken');
			return {
				authorization: token ? `Bearer ${token}` : '',
			};
		},
		retryAttempts: 5,
		shouldRetry: () => true,
		on: {
			connected: () => {
				console.log('✅ [WebSocket] Real-time connection established');
			},
			closed: () => {
				console.warn('⚠️ [WebSocket] Real-time connection closed');
			},
			error: (error) => {
				console.error('❌ [WebSocket] Real-time connection error:', error);
			},
			opened: () => {
				console.log('✅ [WebSocket] Connection opened');
			},
		},
	})
);

const authLink = setContext((_, { headers }) => {
	// Get the authentication token from localStorage or Redux store
	const token = localStorage.getItem('authToken');
	return {
		headers: {
			...headers,
			authorization: token ? `Bearer ${token}` : '',
		},
	};
});

const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
	if (graphQLErrors) {
		graphQLErrors.forEach(({ message, locations, path }) => {
			// Only log GraphQL errors that aren't expected (like authorization errors)
			// Analytics queries may fail if user is not admin, which is handled gracefully
			const operationName = operation?.operationName || '';
			const isAnalyticsQuery =
				operationName.includes('Analytics') || operationName.includes('Revenue');

			if (isAnalyticsQuery && message.includes('Unauthorized')) {
				// Silently handle unauthorized analytics errors - they're expected and handled with fallback data
				return;
			}

			if (!message.includes('Unauthorized') && !message.includes('Forbidden')) {
				console.error(
					`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
				);
			}
		});
	}

	if (networkError) {
		const operationName = operation?.operationName || 'unknown';
		const isAnalyticsQuery =
			operationName.includes('Analytics') ||
			operationName.includes('Revenue') ||
			operationName.includes('RevenueSummary');

		// Check if this is a real connectivity issue vs a handled error
		const isRealNetworkError =
			networkError.message.includes('Failed to fetch') ||
			networkError.message.includes('NetworkError') ||
			networkError.message.includes('Network request failed');

		// For analytics queries, suppress network errors - they're handled gracefully with fallback data
		if (isAnalyticsQuery) {
			// Don't log analytics query network errors - they're expected and handled
			return;
		}

		// Only log real network errors for non-analytics queries
		if (isRealNetworkError) {
			const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL;
			console.error(`[Network error]: ${networkError}`);
			console.error(`Failed to connect to GraphQL endpoint: ${graphqlUrl}`);
			console.error('Possible causes:');
			console.error('1. Backend server is not running (check XTrimFitGym-Api)');
			console.error('2. GraphQL endpoint URL is incorrect');
			console.error('3. CORS configuration issue');
			console.error(`4. Check if ${graphqlUrl} is accessible`);
			console.error('5. Make sure the backend server is running on port 8000');
		}
	}
});

// Split link based on operation type
// Use WebSocket for subscriptions, HTTP for queries/mutations
const splitLink = split(
	({ query }) => {
		const definition = getMainDefinition(query);
		return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
	},
	wsLink,
	from([errorLink, authLink, httpLink])
);

export const apolloClient = new ApolloClient({
	link: splitLink,
	cache: new InMemoryCache({
		typePolicies: {
			Query: {
				fields: {
					getUsers: {
						merge(_existing, incoming) {
							return incoming;
						},
					},
					getMemberships: {
						merge(_existing, incoming) {
							return incoming;
						},
					},
				},
			},
		},
	}),
	defaultOptions: {
		watchQuery: {
			errorPolicy: 'all',
		},
		query: {
			errorPolicy: 'all',
		},
	},
});
