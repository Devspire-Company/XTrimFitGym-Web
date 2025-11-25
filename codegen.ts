import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
	schema: 'http://localhost:4000/graphql',
	documents: ['src/**/*.{ts,tsx}', 'src/**/*.graphql'],
	generates: {
		'./src/graphql/generated/': {
			preset: 'client',
			plugins: [],
			presetConfig: {
				gqlTagName: 'gql',
			},
		},
		'./src/graphql/generated/types.ts': {
			plugins: ['typescript', 'typescript-operations'],
			config: {
				scalars: {
					DateTime: 'string',
				},
			},
		},
	},
	ignoreNoDocuments: true,
};

export default config;

