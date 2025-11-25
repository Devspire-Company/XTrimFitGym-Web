# XTrimFitGym Web - Admin Dashboard

A modern TypeScript React web application for managing gym operations, built with Vite, React Router, Apollo Client, Redux Toolkit, and TailwindCSS.

## Features

- 🎯 **Dashboard** - Overview of gym statistics, recent members, coaches, and revenue
- 👥 **Member Management** - CRUD operations for gym members
- 🏋️ **Coach Management** - Manage coaches and their specializations
- 💳 **Membership Management** - Create and manage membership plans
- 📊 **Reports & Analytics** - Comprehensive analytics with Chart.js
- ⚙️ **Settings** - Account, preferences, notifications, and security settings

## Tech Stack

- **Framework**: React 19 + TypeScript (strict mode)
- **Build Tool**: Vite
- **Routing**: React Router v7 (Data API with loaders)
- **State Management**: Redux Toolkit + Redux Persist
- **GraphQL**: Apollo Client with code generation
- **Styling**: TailwindCSS + shadcn/ui components
- **Charts**: Chart.js + react-chartjs-2
- **Testing**: Vitest
- **Linting**: ESLint + Prettier

## Prerequisites

- Node.js 20.x or higher
- npm or yarn
- GraphQL API running at `http://localhost:4000/graphql` (or configure via env)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
VITE_GRAPHQL_URL=http://localhost:4000/graphql
VITE_USE_MOCK=false
```

### 3. Generate GraphQL Types

```bash
npm run codegen
```

This will introspect the GraphQL API and generate TypeScript types in `src/lib/graphql/generated/`.

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### 5. Build for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

### 6. Preview Production Build

```bash
npm run preview
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run typecheck` - Run TypeScript type checking
- `npm run test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run codegen` - Generate GraphQL types
- `npm run codegen:watch` - Watch and regenerate GraphQL types

## Project Structure

```
src/
├── components/          # React components
│   ├── layout/         # Layout components (AdminLayout)
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
│   ├── useSimulation.ts # Business logic hooks
│   └── __tests__/      # Hook tests
├── lib/
│   ├── apollo/         # Apollo Client setup
│   ├── graphql/        # GraphQL queries and generated types
│   └── mock/           # Mock data for development
├── pages/              # Page components
│   ├── Dashboard.tsx
│   ├── Members.tsx
│   ├── Coaches.tsx
│   ├── Memberships.tsx
│   ├── Reports.tsx
│   └── Settings.tsx
├── routes/             # React Router configuration
├── store/              # Redux store and slices
│   ├── slices/         # Redux slices (auth, ui)
│   └── hooks.ts        # Typed Redux hooks
└── test/               # Test setup files
```

## GraphQL API Integration

The app connects to the GraphQL API at `http://localhost:4000/graphql` by default. To change this, update the `VITE_GRAPHQL_URL` environment variable.

### Mock Mode

If the GraphQL API is unavailable, you can enable mock mode by setting `VITE_USE_MOCK=true` in your `.env` file. This will use mock data from `src/lib/mock/data.ts`.

### Authentication

The app uses JWT tokens stored in localStorage. The token is automatically included in GraphQL requests via Apollo Client's auth link.

## State Management

- **Redux Toolkit**: Global state (auth, UI)
- **Redux Persist**: Persists auth state across page refreshes
- **Apollo Client Cache**: GraphQL query caching

## Testing

Tests are written with Vitest and React Testing Library:

```bash
npm run test
```

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push/PR:
- Type checking
- Linting
- Tests
- Build verification

## Migration Notes

This application was migrated from a vanilla JavaScript admin dashboard. Key changes:

1. **Type Safety**: All code is strictly typed with TypeScript
2. **Component Architecture**: Converted to React functional components with hooks
3. **State Management**: Migrated from local state to Redux Toolkit
4. **Data Fetching**: Replaced mock data with GraphQL queries (with fallback)
5. **Styling**: Converted CSS to TailwindCSS utility classes
6. **Routing**: Implemented React Router v7 with Data API
7. **Testing**: Added unit tests for business logic

## Development Tips

- Use `npm run codegen:watch` during development to auto-regenerate GraphQL types
- Enable mock mode (`VITE_USE_MOCK=true`) when API is unavailable
- Use Redux DevTools browser extension for state debugging
- Check browser console for GraphQL query errors

## License

Private - XTrimFitGym
