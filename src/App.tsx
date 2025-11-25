import { ApolloProvider } from '@apollo/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { RouterProvider } from 'react-router';
import { apolloClient } from './lib/apollo/client';
import { store, persistor } from './store';
import { router } from './routes';
import { ToastContainer } from './components/ui/toast';

function App() {
	return (
		<Provider store={store}>
			<PersistGate loading={null} persistor={persistor}>
				<ApolloProvider client={apolloClient}>
					<RouterProvider router={router} />
					<ToastContainer />
				</ApolloProvider>
			</PersistGate>
		</Provider>
	);
}

export default App;
