// Measure the same direct visible canvas used by the artifact-bound survey.
// This avoids treating the separate worker/compositor path as the product runtime.
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['tools/capture-built-survey.mjs'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    SURVEY_PERF: '1',
    SURVEY_LOAD_TIMEOUT_MS: process.env.SURVEY_LOAD_TIMEOUT_MS || '600000',
  },
});
process.exit(result.status ?? 1);
