import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
	const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
	const base = mode === 'production' && repoName ? `/${repoName}/` : '/';

	return {
		base,
		build: {
			chunkSizeWarningLimit: 2000,
		},
	};
});
