type RuntimeConfig = {
	serverRuntimeConfig?: Record<string, unknown>;
	publicRuntimeConfig?: Record<string, unknown>;
};

let runtimeConfig: RuntimeConfig = {
	serverRuntimeConfig: {},
	publicRuntimeConfig: {},
};

export function setConfig(config?: RuntimeConfig) {
	runtimeConfig = config ?? {
		serverRuntimeConfig: {},
		publicRuntimeConfig: {},
	};
}

export default function getConfig() {
	return runtimeConfig;
}
