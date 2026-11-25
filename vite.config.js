import { defineConfig } from 'vite';

export default defineConfig(() => {
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
  const isProjectPages = process.env.GITHUB_ACTIONS === 'true' && repo && !repo.endsWith('.github.io');
  return {
    base: isProjectPages ? `/${repo}/` : '/',
    server: { host: '0.0.0.0' },
    build: { target: 'es2022', sourcemap: false }
  };
});
