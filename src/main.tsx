import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const root = document.getElementById('root')!;

// Dev-only: React StrictMode double-mount can make Clerk send two email verification codes.
createRoot(root).render(
	import.meta.env.DEV ? <App /> : (
		<StrictMode>
			<App />
		</StrictMode>
	)
);
