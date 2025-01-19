import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import { RestoreOptions } from "../../types";
import { config } from "../../config/index";
import logger from "../../utils/logger";
import { decompressZipBackup } from "../../utils/compress";
import { createCloudStorageProvider } from "../cloud/storage-factory";

const execPromise = promisify(exec);

export async function restoreDatabase(options: RestoreOptions) {
  try {
    const { db, cloud } = options;
    const globalBackupPath = config.db.backupPath;

    if (!globalBackupPath) {
      throw new Error("Global backup file path is not defined in the config.");
    }

    if (cloud) {
      await downloadFromCloud(cloud);
    }

    const extractToPath = `${globalBackupPath}_extracted`;
    await decompressZipBackup(globalBackupPath, extractToPath);

    const restorePath = fs.existsSync(extractToPath)
      ? extractToPath
      : globalBackupPath;

    if (!fs.existsSync(restorePath)) {
      throw new Error(`Backup file does not exist at path: ${restorePath}`);
    }

    switch (db.toLowerCase()) {
      case "mysql":
        await restoreMySQL(restorePath);
        break;
      case "postgres":
        await restorePostgres(restorePath);
        break;
      case "mongodb":
        await restoreMongoDB(restorePath);
        break;
      case "sqlite":
        await restoreSQLite(restorePath);
        break;
      default:
        throw new Error(`Unsupported database type: ${db}`);
    }

    logger.info("Restore completed successfully");
  } catch (error) {
    logger.error(`Restore failed: ${error}`);
  }
}

async function downloadFromCloud(cloud: {
  bucketName?: string;
  provider?: string;
}) {
  if (!cloud || !cloud.provider) {
    throw new Error("Cloud provider is not specified");
  }

  const cloudStorage = createCloudStorageProvider();
  const provider = cloud.provider.toLowerCase();
  const backupFileName = "backup.gz";
  switch (provider) {
    case "s3":
    case "google":
    case "azure":
      await cloudStorage.download(backupFileName, cloud.bucketName || "");
      break;
    default:
      throw new Error(`Unsupported cloud provider: ${provider}`);
  }
}
async function restoreMySQL(backupPath: string) {
  const { host, user, password, database } = config.db.mysql;

  if (!host || !user || !password || !database) {
    throw new Error("MySQL configuration is not complete.");
  }

  try {
    const command = `mysql -h ${host} -u ${user} -p${password} ${database} < ${backupPath}`;
    const { stdout, stderr } = await execPromise(command);
    if (stdout) logger.info(`MySQL restore output: ${stdout}`);
    if (stderr) logger.error(`MySQL restore error: ${stderr}`);
    logger.info("MySQL database restored successfully");
  } catch (error) {
    logger.error(`MySQL restore failed: ${error}`);
  }
}

async function restorePostgres(backupPath: string) {
  const { host, user, password, database } = config.db.postgres;

  if (!host || !user || !password || !database) {
    throw new Error("PostgreSQL configuration is not complete.");
  }

  try {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file does not exist at path: ${backupPath}`);
    }

    const fileExtension = backupPath.split(".").pop()?.toLowerCase();
    let command: string;

    if (fileExtension === "sql") {
      command = `PGPASSWORD=${password} psql -h ${host} -U ${user} -d ${database} -f ${backupPath}`;
    } else {
      command = `PGPASSWORD=${password} pg_restore -h ${host} -U ${user} -d ${database} ${backupPath}`;
    }

    const { stdout, stderr } = await execPromise(command);
    if (stdout) logger.info(`PostgreSQL restore output: ${stdout}`);
    if (stderr) logger.error(`PostgreSQL restore error: ${stderr}`);
    logger.info("PostgreSQL database restored successfully");
  } catch (error) {
    logger.error(`PostgreSQL restore failed: ${error}`);
    throw error;
  }
}

async function restoreMongoDB(backupPath: string) {
  const uri = config.db.mongodb.uri;

  if (!uri) {
    throw new Error("MongoDB URI is not defined.");
  }

  try {
    const command = `mongorestore --uri="${uri}" ${backupPath}`;
    const { stdout, stderr } = await execPromise(command);
    if (stdout) logger.info(`MongoDB restore output: ${stdout}`);
    if (stderr) logger.error(`MongoDB restore error: ${stderr}`);
    logger.info("MongoDB database restored successfully");
  } catch (error) {
    logger.error(`MongoDB restore failed: ${error}`);
  }
}

async function restoreSQLite(backupPath: string) {
  const filename = config.db.sqlite.filename;

  if (!filename) {
    throw new Error("SQLite filename is not defined.");
  }

  try {
    await new Promise<void>((resolve, reject) => {
      fs.copyFile(backupPath, filename, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    logger.info("SQLite database restored successfully");
  } catch (error) {
    logger.error(`SQLite restore failed: ${error}`);
  }
}
