import type { StorybookConfig } from "@storybook/nextjs-vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname =
	typeof __dirname !== "undefined"
		? __dirname
		: path.dirname(fileURLToPath(import.meta.url));
const nextConfigShim = path.join(dirname, "next-config-shim.ts");

const config: StorybookConfig = {
	stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
	addons: [
		"@chromatic-com/storybook",
		"@storybook/addon-docs",
		"@storybook/addon-onboarding",
		"@storybook/addon-a11y",
		"@storybook/addon-vitest",
	],
	framework: {
		name: "@storybook/nextjs-vite",
		options: {},
	},
	staticDirs: ["../public"],
	viteFinal: async (baseConfig) => ({
		...baseConfig,
		build: {
			...baseConfig.build,
			chunkSizeWarningLimit: 1500,
			rolldownOptions: {
				...baseConfig.build?.rolldownOptions,
				checks: {
					...baseConfig.build?.rolldownOptions?.checks,
					pluginTimings: false,
				},
			},
		},
		resolve: {
			...baseConfig.resolve,
			alias: {
				...(baseConfig.resolve?.alias ?? {}),
				"next/config": nextConfigShim,
			},
		},
	}),
};
export default config;
