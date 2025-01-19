import { Command } from "@commander-js/extra-typings";

import * as dotenv from "dotenv";

import logger from "./utils/logger";

import {
  backupDatabase,
  testDatabaseConnection,
} from "./services/backup/backup";

import { listBackups } from "./services/backup/backup-list";

import { restoreDatabase } from "./services/restore/restore-service";

import { scheduleBackup } from "./node-cron/schedule-backup";

import { sendSlackNotification } from "./notifications/slack-notfication";

import { configWizard } from "./utils/config-wizard";

import {
  BackupOptions,
  RestoreOptions,
  ScheduleOptions,
  DatabaseType,
  CloudProvider,
} from "./types";
import cliProgress from "cli-progress";

dotenv.config();

const program = new Command();
program
  .name("blacksky")
  .description("cli tool to, restore, and schedule database backups")
  .version("1.0.0")
  .usage("[command] [options]");

program
  .command("configure")
  .description("Run the configuration wizard for database setup")
  .action(async () => {
    try {
      await configWizard();
    } catch (error) {
      logger.error(`Configuration failed: ${error}`);
    }
  });

program
  .command("backup")
  .description("Backs up the database")
  .requiredOption(
    "-d, --db <db>",
    "Database type (mysql, postgres, mongodb, sqlite)"
  )
  .option("--cloud-provider <provider>", "Cloud provider (aws, gcp, azure)")
  .option("--cloud-bucket <bucketName>", "Name of the cloud storage bucket")
  .option("--dry-run", "Perform a dry run without actually backing up")
  .action(
    async (options: {
      db: string;
      cloudProvider?: string;
      cloudBucket?: string;
      dryRun?: boolean;
    }) => {
      try {
        if (!options.db) {
          logger.error("Database type is required for backup");
          process.exit(1);
        }

        const backupOptions: BackupOptions = {
          db: options.db as DatabaseType,
          cloud:
            options.cloudProvider && options.cloudBucket
              ? {
                  provider: options.cloudProvider,
                  bucketName: options.cloudBucket,
                }
              : undefined,
          dryRun: options.dryRun,
        };

        const connectionSuccessful = await testDatabaseConnection(
          backupOptions
        );
        if (!connectionSuccessful) {
          logger.error("Database connection test failed");
          process.exit(1);
        }

        const progressBar = new cliProgress.SingleBar(
          {},
          cliProgress.Presets.shades_classic
        );
        progressBar.start(100, 0);

        await backupDatabase(backupOptions, (progress) => {
          progressBar.update(progress);
        });

        progressBar.stop();
        logger.info("Backup completed successfully");
        await sendSlackNotification("Backup completed successfully");
      } catch (error) {
        logger.error(`Backup failed: ${error}`);
        await sendSlackNotification("Backup failed");
        process.exit(1);
      }
    }
  )
  .showHelpAfterError("(add --help for additional information)");

/**
 *
 * restore command
 */
program
  .command("restore")
  .description("Restores the database from a backup file or cloud storage")
  .requiredOption(
    "-d, --db <db>",
    "Database type (mysql, postgres, mongodb, sqlite)"
  )
  .option("--cloud", "Restore from cloud storage")
  .option("--provider <provider>", "Cloud provider (s3, google, azure)")
  .option("--bucket <bucketName>", "Name of the cloud storage bucket")
  .option("--dry-run", "Perform a dry run without actually restoring")
  .action(
    async (options: {
      db: string;
      cloud?: boolean;
      provider?: string;
      bucket?: string;
      dryRun?: boolean;
    }) => {
      try {
        const allowedDatabases: DatabaseType[] = [
          "mysql",
          "postgres",
          "mongodb",
          "sqlite",
        ];
        if (!allowedDatabases.includes(options.db as DatabaseType)) {
          logger.error(
            "Invalid database type. Allowed values are mysql, postgres, mongodb, sqlite"
          );
          process.exit(1);
        }

        let cloudProvider: CloudProvider | undefined;
        if (options.provider) {
          cloudProvider = options.provider as unknown as CloudProvider;
        }

        const restoreOptions: RestoreOptions = {
          db: options.db as DatabaseType,
          cloud:
            options.cloud && cloudProvider && options.bucket
              ? {
                  provider: cloudProvider.provider,
                  bucketName: cloudProvider.bucketName,
                }
              : undefined,
        };

        await restoreDatabase(restoreOptions);
        logger.info("Restore completed successfully");
        await sendSlackNotification("Restore completed successfully");
      } catch (error) {
        logger.error(`Restore failed: ${error}`);
        await sendSlackNotification("Restore failed");
      }
    }
  )
  .showHelpAfterError("(add --help for additional information)");

program
  .command("schedule")
  .description("Schedules automatic backups using a cron expression")
  .requiredOption(
    "-t, --time <cronTime>",
    "cron expression to schedule backups"
  )
  .requiredOption(
    "-d, --db <db>",
    "Database type (mysql, postgres, mongodb, sqlite)"
  )
  .option("--cloud-provider <provider>", "Cloud provider (aws, gcp, azure)")
  .option("--cloud-bucket <bucketName>", "Name of the cloud storage bucket")
  .action(
    (options: {
      time: string;
      db: string;
      cloudProvider?: string;
      cloudBucket?: string;
      dryRun?: boolean;
    }) => {
      try {
        const backupOption: BackupOptions = {
          db: options.db as DatabaseType,
          cloud:
            options.cloudProvider && options.cloudBucket
              ? {
                  provider: options.cloudProvider,
                  bucketName: options.cloudBucket,
                }
              : undefined,
          dryRun: options.dryRun,
        };

        const scheduleOptions: ScheduleOptions = {
          time: options.time,
          backupOption,
        };

        scheduleBackup(scheduleOptions);
        logger.info(`Backup scheduled with cron time: ${options.time}`);
      } catch (error) {
        logger.error(`Scheduling backup failed: ${error}`);
      }
    }
  )
  .showHelpAfterError("(add --help for additional information)");

program
  .command("list")
  .description("List existing backups")
  .option("--cloud", "List backups in cloud storage")
  .option("--provider <provider>", "Cloud provider (aws, gcp, azure)")
  .option("--bucket <bucketName>", "Name of the cloud storage bucket")
  .action(
    async (options: {
      cloud?: boolean;
      provider?: string;
      bucket?: string;
    }) => {
      try {
        await listBackups(options);
      } catch (error) {
        logger.error(`Failed to list backups: ${error}`);
      }
    }
  );

program.showHelpAfterError("(add --help for additional information)");

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
