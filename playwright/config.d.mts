import type { PlaywrightTestConfig } from '@playwright/test'

/** The e2e preset of the sites, extended with `defineConfig(preset, { … })`. */
declare const preset: PlaywrightTestConfig

export default preset
