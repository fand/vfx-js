// Story-only stand-in for SvelteKit's `$app/state`.
// Storybook aliases `$app/state` to this file.

export const page = $state({ url: new URL("http://localhost/") });
