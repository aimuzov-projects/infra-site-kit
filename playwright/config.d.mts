import type { PlaywrightTestConfig } from '@playwright/test'

/**
 * E2e-пресет для сайтов.
 *
 * Гоняет тесты из `e2e/` в Chromium против `astro build && astro preview`,
 * сайт расширяет его через `defineConfig(preset, { ... })`.
 */
declare const preset: PlaywrightTestConfig

export default preset
