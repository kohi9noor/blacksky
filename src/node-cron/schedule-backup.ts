import * as cron from "node-cron";
import { backupDatabase } from "../services/backup/backup";
import { ScheduleOptions } from "../types";

export function scheduleBackup(options: ScheduleOptions) {
  const { backupOption, time } = options;
  cron.schedule(time, () => {
    backupDatabase(backupOption);
  });
}
