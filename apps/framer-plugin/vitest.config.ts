import { defineConfig } from 'vitest/config';

// Tests need neither the Framer dev server nor local HTTPS certificates.
export default defineConfig({ test: { include: ['src/**/*.test.ts'] } });
