import { ApolloProvider } from '@apollo/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { RouterProvider } from 'react-router';
import { apolloClient } from './lib/apollo/client';
import { store, persistor } from './store';
import { router } from './routes';
import { ToastContainer } from './components/ui/toast';
import { AuthValidator } from './components/AuthValidator';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

if (!clerkPublishableKey) {
	console.error(
		'[App] VITE_CLERK_PUBLISHABLE_KEY is missing. Add it to .env (same value as in the API env).'
	);
}

function App() {
	return (
		<Provider store={store}>
			<PersistGate loading={null} persistor={persistor}>
				<ClerkProvider publishableKey={clerkPublishableKey ?? ''}>
					<ApolloProvider client={apolloClient}>
						<AuthValidator>
							<RouterProvider router={router} />
							<ToastContainer />
						</AuthValidator>
					</ApolloProvider>
				</ClerkProvider>
			</PersistGate>
		</Provider>
	);
}

export default App;
