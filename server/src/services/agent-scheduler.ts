import { config } from '../config.js';
import { db } from '../db/knex.js';
import { runStoreAudit } from './agent.js';

let running = false;

function enabled(value: unknown) {
  return value === true || value === 1 || value === '1';
}

/**
 * Starts a low-frequency health audit. The scheduler only creates analysis and
 * activity records; it never executes money-related actions. `unref` prevents
 * the timer from keeping short-lived local scripts alive.
 */
export function startAgentScheduler() {
  const minutes = config.ai.auditIntervalMinutes;
  if (!Number.isFinite(minutes) || minutes <= 0) return;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      const settings = await db('agent_settings').first();
      if (!settings || enabled(settings.enabled)) {
        await runStoreAudit('system agent');
      }
    } catch (error) {
      console.error('[agent] scheduled audit failed:', error);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(run, minutes * 60_000);
  timer.unref?.();
  console.log(`[agent] scheduled store audits every ${minutes} minute(s); money actions remain approval-gated`);
}
