import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';
import framer from 'vite-plugin-framer';

export default defineConfig({ plugins: [mkcert(), framer()] });
