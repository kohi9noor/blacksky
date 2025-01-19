"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const extra_typings_1 = require("@commander-js/extra-typings");
const dotenv = __importStar(require("dotenv"));
const logger_1 = __importDefault(require("./utils/logger"));
const backup_1 = require("./services/backup/backup");
const backup_list_1 = require("./services/backup/backup-list");
const restore_service_1 = require("./services/restore/restore-service");
const schedule_backup_1 = require("./node-cron/schedule-backup");
const slack_notfication_1 = require("./notifications/slack-notfication");
const config_wizard_1 = require("./utils/config-wizard");
const cli_progress_1 = __importDefault(require("cli-progress"));
dotenv.config();
const program = new extra_typings_1.Command();
program
    .name("blacksky")
    .description("cli tool to, restore, and schedule database backups")
    .version("1.0.0")
    .usage("[command] [options]");
program
    .command("configure")
    .description("Run the configuration wizard for database setup")
    .action(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, config_wizard_1.configWizard)();
    }
    catch (error) {
        logger_1.default.error(`Configuration failed: ${error}`);
    }
}));
program
    .command("backup")
    .description("Backs up the database")
    .requiredOption("-d, --db <db>", "Database type (mysql, postgres, mongodb, sqlite)")
    .option("--cloud-provider <provider>", "Cloud provider (aws, gcp, azure)")
    .option("--cloud-bucket <bucketName>", "Name of the cloud storage bucket")
    .option("--dry-run", "Perform a dry run without actually backing up")
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!options.db) {
            logger_1.default.error("Database type is required for backup");
            process.exit(1);
        }
        const backupOptions = {
            db: options.db,
            cloud: options.cloudProvider && options.cloudBucket
                ? {
                    provider: options.cloudProvider,
                    bucketName: options.cloudBucket,
                }
                : undefined,
            dryRun: options.dryRun,
        };
        const connectionSuccessful = yield (0, backup_1.testDatabaseConnection)(backupOptions);
        if (!connectionSuccessful) {
            logger_1.default.error("Database connection test failed");
            process.exit(1);
        }
        const progressBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
        progressBar.start(100, 0);
        yield (0, backup_1.backupDatabase)(backupOptions, (progress) => {
            progressBar.update(progress);
        });
        progressBar.stop();
        logger_1.default.info("Backup completed successfully");
        yield (0, slack_notfication_1.sendSlackNotification)("Backup completed successfully");
    }
    catch (error) {
        logger_1.default.error(`Backup failed: ${error}`);
        yield (0, slack_notfication_1.sendSlackNotification)("Backup failed");
        process.exit(1);
    }
}))
    .showHelpAfterError("(add --help for additional information)");
/**
 *
 * restore command
 */
program
    .command("restore")
    .description("Restores the database from a backup file or cloud storage")
    .requiredOption("-d, --db <db>", "Database type (mysql, postgres, mongodb, sqlite)")
    .option("--cloud", "Restore from cloud storage")
    .option("--provider <provider>", "Cloud provider (s3, google, azure)")
    .option("--bucket <bucketName>", "Name of the cloud storage bucket")
    .option("--dry-run", "Perform a dry run without actually restoring")
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allowedDatabases = [
            "mysql",
            "postgres",
            "mongodb",
            "sqlite",
        ];
        if (!allowedDatabases.includes(options.db)) {
            logger_1.default.error("Invalid database type. Allowed values are mysql, postgres, mongodb, sqlite");
            process.exit(1);
        }
        let cloudProvider;
        if (options.provider) {
            cloudProvider = options.provider;
        }
        const restoreOptions = {
            db: options.db,
            cloud: options.cloud && cloudProvider && options.bucket
                ? {
                    provider: cloudProvider.provider,
                    bucketName: cloudProvider.bucketName,
                }
                : undefined,
        };
        yield (0, restore_service_1.restoreDatabase)(restoreOptions);
        logger_1.default.info("Restore completed successfully");
        yield (0, slack_notfication_1.sendSlackNotification)("Restore completed successfully");
    }
    catch (error) {
        logger_1.default.error(`Restore failed: ${error}`);
        yield (0, slack_notfication_1.sendSlackNotification)("Restore failed");
    }
}))
    .showHelpAfterError("(add --help for additional information)");
program
    .command("schedule")
    .description("Schedules automatic backups using a cron expression")
    .requiredOption("-t, --time <cronTime>", "Cron expression to schedule backups")
    .requiredOption("-d, --db <db>", "Database type (mysql, postgres, mongodb, sqlite)")
    .option("--cloud-provider <provider>", "Cloud provider (aws, gcp, azure)")
    .option("--cloud-bucket <bucketName>", "Name of the cloud storage bucket")
    .action((options) => {
    try {
        const backupOption = {
            db: options.db,
            cloud: options.cloudProvider && options.cloudBucket
                ? {
                    provider: options.cloudProvider,
                    bucketName: options.cloudBucket,
                }
                : undefined,
            dryRun: options.dryRun,
        };
        const scheduleOptions = {
            time: options.time,
            backupOption,
        };
        (0, schedule_backup_1.scheduleBackup)(scheduleOptions);
        logger_1.default.info(`Backup scheduled with cron time: ${options.time}`);
    }
    catch (error) {
        logger_1.default.error(`Scheduling backup failed: ${error}`);
    }
})
    .showHelpAfterError("(add --help for additional information)");
program
    .command("list")
    .description("List existing backups")
    .option("--cloud", "List backups in cloud storage")
    .option("--provider <provider>", "Cloud provider (aws, gcp, azure)")
    .option("--bucket <bucketName>", "Name of the cloud storage bucket")
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, backup_list_1.listBackups)(options);
    }
    catch (error) {
        logger_1.default.error(`Failed to list backups: ${error}`);
    }
}));
program.showHelpAfterError("(add --help for additional information)");
program.parse(process.argv);
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
