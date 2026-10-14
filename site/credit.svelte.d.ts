import type { Component } from 'svelte'

// credit.svelte is plain JS, so svelte-check in a TypeScript site sees its import as `any`
// and fails. This declaration gives it the props.
declare const Credit: Component<{
	/** The site source, shown as a link with the GitHub mark. */
	repo?: string
	/** Puts the copyright year first, on by default. */
	copyright?: boolean
	/** `spread` puts the source on the right edge of the container, `center` keeps both
	 * parts in the middle. */
	align?: 'spread' | 'center'
	class?: string
}>

export default Credit
