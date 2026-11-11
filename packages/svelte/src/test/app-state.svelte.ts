// Stands in for SvelteKit's `$app/state` in tests.

export const page = $state({ url: new URL("http://localhost/") });
