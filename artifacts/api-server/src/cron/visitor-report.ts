// visitor-report.ts — DEPRECATED
// Real-time WeCom notifications have replaced the daily cron report.
// This file is kept empty to avoid import errors during migration.
// It can be safely deleted after confirming the new system works.

import { logger } from "../lib/logger";

export function initVisitorReportCron() {
  logger.info("Visitor report cron is DISABLED — using real-time WeCom notifications instead");
}

export async function runVisitorReport() {
  // No-op: real-time notifications have replaced batch reporting
}
