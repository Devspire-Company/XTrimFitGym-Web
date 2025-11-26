import { ApolloProvider } from '@apollo/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { RouterProvider } from 'react-router';
import { apolloClient } from './lib/apollo/client';
import { store, persistor } from './store';
import { router } from './routes';
import { ToastContainer } from './components/ui/toast';
import { AuthValidator } from './components/AuthValidator';

function App() {
	return (
		<Provider store={store}>
			<PersistGate loading={null} persistor={persistor}>
				<ApolloProvider client={apolloClient}>
					<AuthValidator>
						<RouterProvider router={router} />
						<ToastContainer />
					</AuthValidator>
				</ApolloProvider>
			</PersistGate>
		</Provider>
	);
}

export default App;
