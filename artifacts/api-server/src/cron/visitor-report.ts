import cron from "node-cron";
import { db, siteVisitsTable, settingsTable } from "@workspace/db";
import { sql, eq, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";

export async function runVisitorReport() {
  try {
    logger.info("Checking for pending visitor reports...");

    // Get today's date string (YYYY-MM-DD)
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = String(today.getMonth() + 1).padStart(2, "0");
    const todayDay = String(today.getDate()).padStart(2, "0");
    const todayPrefix = `${todayYear}-${todayMonth}-${todayDay}`;

    // Get all records created before today
    // We can just query everything where createdAt < todayPrefix
    const pastRecords = await db
      .select()
      .from(siteVisitsTable)
      .where(sql`${siteVisitsTable.createdAt} < ${todayPrefix}`);

    if (pastRecords.length === 0) {
      logger.info("No pending visitor records to report.");
      return;
    }

    // Group records by date
    const reportsByDate: Record<string, { ids: number[], realVisitors: Set<string>, googleBots: Set<string> }> = {};

    for (const record of pastRecords) {
      const date = record.createdAt.split("T")[0];
      if (!reportsByDate[date]) {
        reportsByDate[date] = { ids: [], realVisitors: new Set(), googleBots: new Set() };
      }
      reportsByDate[date].ids.push(record.id);

      if (record.isBot) {
        reportsByDate[date].googleBots.add(record.ip);
      } else {
        reportsByDate[date].realVisitors.add(record.ip);
      }
    }

    // Get settings
    const settingsRows = await db.select().from(settingsTable);
    const settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));
    const webhookUrl = settings["wecom_webhook"];
    const enabled = settings["enable_visitor_report"] !== "false";

    let allReportedIds: number[] = [];

    for (const [date, data] of Object.entries(reportsByDate)) {
      if (enabled && webhookUrl) {
        // Send webhook for this date
        const message = {
          msgtype: "text",
          text: {
            content: `📊 数据简报：${date} 网站访问统计\n- 真实独立客户：${data.realVisitors.size} 人\n- Google爬虫：${data.googleBots.size} 次（按IP统计）`,
          },
        };

        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
        });

        if (!response.ok) {
          logger.error({ status: response.status, statusText: response.statusText, date }, "Failed to send wecom webhook");
          // If we fail to send, we probably shouldn't delete the records, but to prevent infinite loops, 
          // let's just log it. We will proceed to delete so it doesn't pile up forever if the webhook is permanently broken.
          // Wait, if it fails due to network, we should retry next time. So let's NOT delete if it fails.
          continue;
        } else {
          logger.info({ date }, "Visitor report sent successfully");
        }
      }
      // Mark as ready to delete (either sent successfully, or sending is disabled)
      allReportedIds = allReportedIds.concat(data.ids);
    }

    // Delete reported records
    if (allReportedIds.length > 0) {
      // Delete in chunks if there are too many, but usually it's fine for small sites.
      const chunkSize = 500;
      for (let i = 0; i < allReportedIds.length; i += chunkSize) {
        const chunk = allReportedIds.slice(i, i + chunkSize);
        await db.delete(siteVisitsTable).where(inArray(siteVisitsTable.id, chunk));
      }
      logger.info(`Deleted ${allReportedIds.length} reported visitor records.`);
    }

  } catch (err) {
    logger.error({ err }, "Error in visitor report logic");
  }
}

export function initVisitorReportCron() {
  // Run every day at 8:00 AM
  cron.schedule("0 8 * * *", () => {
    runVisitorReport();
  });

  logger.info("Visitor report cron job initialized");
}
