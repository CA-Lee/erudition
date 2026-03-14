import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevtools from 'vite-plugin-vue-devtools'
import { cloudflare } from "@cloudflare/vite-plugin"

// https://vite.dev/config/

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '')
	const allowedHosts = env.VITE_ALLOWED_HOSTS
		? env.VITE_ALLOWED_HOSTS.split(',').map(h => h.trim())
		: []

	return {
		plugins: [
			vue(),
			vueDevtools(),
			cloudflare()
		],
		resolve: {
			alias: {
				'@': fileURLToPath(new URL('./client', import.meta.url))
			},
		},
		server: {
			allowedHosts,
		},
	}
})
