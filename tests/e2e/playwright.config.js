// Smoke tests for the live site. BASE_URL defaults to production; read-only.
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: '.',
  timeout: 45000,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'https://www.synapsecore.dev',
    channel: process.env.PW_CHANNEL || undefined,
    viewport: { width: 390, height: 844 },
  },
});
