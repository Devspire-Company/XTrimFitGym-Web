import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

const httpLink = createHttpLink({
	uri: import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql',
});

// WebSocket link for real-time subscriptions
const wsLink = new GraphQLWsLink(
	createClient({
		url: import.meta.env.VITE_GRAPHQL_WS_URL || 'ws://localhost:4000/graphql',
		connectionParams: () => {
			const token = localStorage.getItem('authToken');
			return {
				authorization: token ? `Bearer ${token}` : '',
			};
		},
		retryAttempts: 5,
		shouldRetry: () => true,
		on: {
			connected: () => console.log('Real-time connection established'),
			closed: () => console.log('Real-time connection closed'),
			error: (error) => console.error('Real-time connection error:', error),
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

const errorLink = onError(({ graphQLErrors, networkError }) => {
	if (graphQLErrors) {
		graphQLErrors.forEach(({ message, locations, path }) => {
			console.error(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`);
		});
	}

	if (networkError) {
		console.error(`[Network error]: ${networkError}`);
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
