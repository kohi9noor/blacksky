import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import mysql from "mysql2/promise";
import { Client } from "pg";
import { MongoClient } from "mongodb";
import sqlite3 from "sqlite3";
import { sendSlackNotification } from "../../notifications/slack-notfication";
import logger from "../../utils/logger";
import { config } from "../../config";
import { BackupOptions, DatabaseType, CloudProvider } from "../../types/index";
import { createZipBackup } from "../../utils/compress";
import { createCloudStorageProvider } from "../cloud/storage-factory";

const execPromise = promisify(exec);

export async function backupDatabase(
  options: BackupOptions,
  progressCallback?: (progress: number) => void
): Promise<void> {
  const { db, cloud } = options;
  const globalBackupPath = config.db.backupPath;

  if (!globalBackupPath) {
    throw new Error("Global backup path is not defined in the config.");
  }

  try {
    await performDatabaseBackup(db, globalBackupPath, progressCallback);

    if (cloud) {
      const typedCloud = cloud as CloudProvider;
      await handleCloudUpload(typedCloud, globalBackupPath, progressCallback);
    }
  } catch (error) {
    logger.error(`Backup failed: ${error}`);
    await sendSlackNotification("Backup failed!");
    throw error;
  }
}

async function performDatabaseBackup(
  db: DatabaseType,
  backupPath: string,
  progressCallback?: (progress: number) => void
): Promise<void> {
  switch (db.toLowerCase()) {
    case "mysql":
      await backupMySQL(backupPath);
      break;
    case "postgres":
      await backupPostgres(backupPath, progressCallback);
      break;
    case "mongodb":
      await backupMongoDB(backupPath);
      break;
    case "sqlite":
      await backupSQLite(backupPath);
      break;
    default:
      throw new Error(`Unsupported database type: ${db}`);
  }
}

async function handleCloudUpload(
  cloud: CloudProvider,
  backupPath: string,
  progressCallback?: (progress: number) => void
): Promise<void> {
  progressCallback?.(90);
  const cloudStorage = createCloudStorageProvider();
  const cloudProvider =
    config.cloud[cloud.provider as keyof typeof config.cloud];

  if (!cloudProvider) {
    throw new Error(`Unsupported cloud provider: ${cloud.provider}`);
  }

  const bucketName = getBucketName(cloud);
  await cloudStorage.upload(backupPath, bucketName);
}

function getBucketName(cloud: CloudProvider): string {
  const provider = config.cloud.provider.toLowerCase();
  switch (provider) {
    case "s3":
      return cloud.bucketName || config.cloud.s3.bucket || "";
    case "google":
      return cloud.bucketName || config.cloud.google.bucket || "";
    case "azure":
      return cloud.bucketName || config.cloud.azure.bucket || "";
    default:
      throw new Error(`Unsupported cloud provider: ${provider}`);
  }
}

async function backupMySQL(backupPath: string): Promise<void> {
  const { host, user, password, database } = config.db.mysql;

  if (!host || !user || !password || !database) {
    throw new Error("MySQL configuration is not complete.");
  }

  try {
    const command = `mysqldump -h ${host} -u ${user} -p${password} ${database} > ${backupPath}`;
    await execPromise(command);
    logger.info("MySQL backup completed successfully");
  } catch (error) {
    logger.error(`MySQL backup failed: ${error}`);
    throw error;
  }
}

async function backupPostgres(
  backupPath: string,
  progressCallback?: (progress: number) => void
): Promise<void> {
  const { host, user, password, database } = config.db.postgres;

  if (!host || !user || !password || !database) {
    throw new Error("PostgreSQL configuration is not complete.");
  }

  try {
    await fs.mkdir(backupPath, { recursive: true });

    const sqlBackupFilePath = path.join(
      backupPath,
      `backup_${new Date().toISOString().split("T")[0]}.sql`
    );
    const zipBackupFilePath = path.join(
      backupPath,
      `backup_${new Date().toISOString().split("T")[0]}.zip`
    );

    const command = `PGPASSWORD=${password} pg_dump -h ${host} -U ${user} -d ${database} -f ${sqlBackupFilePath}`;

    await execPromise(command);
    progressCallback?.(50);

    await createZipBackup(sqlBackupFilePath, zipBackupFilePath);
    await fs.unlink(sqlBackupFilePath);

    progressCallback?.(80);
    logger.info("PostgreSQL backup completed successfully");
  } catch (error) {
    logger.error(`PostgreSQL backup failed: ${error}`);
    throw error;
  }
}

async function backupMongoDB(backupPath: string): Promise<void> {
  const uri = config.db.mongodb.uri;

  if (!uri) {
    throw new Error("MongoDB URI is not defined.");
  }

  try {
    const command = `mongodump --uri="${uri}" --out=${backupPath}`;
    await execPromise(command);
    logger.info("MongoDB backup completed successfully");
  } catch (error) {
    logger.error(`MongoDB backup failed: ${error}`);
    throw error;
  }
}

async function backupSQLite(backupPath: string): Promise<void> {
  const filename = config.db.sqlite.filename;

  if (!filename) {
    throw new Error("SQLite filename is not defined.");
  }

  try {
    await fs.copyFile(filename, backupPath);
    logger.info("SQLite backup completed successfully");
  } catch (error) {
    logger.error(`SQLite backup failed: ${error}`);
    throw error;
  }
}

export async function testDatabaseConnection(
  options: BackupOptions
): Promise<boolean> {
  const { db } = options;

  try {
    switch (db.toLowerCase()) {
      case "mysql":
        return await testMySQLConnection();
      case "postgres":
        return await testPostgresConnection();
      case "mongodb":
        return await testMongoDBConnection();
      case "sqlite":
        return await testSQLiteConnection();
      default:
        throw new Error(`Unsupported database type: ${db}`);
    }
  } catch (error) {
    logger.error(`Connection test failed: ${error}`);
    return false;
  }
}

async function testMySQLConnection(): Promise<boolean> {
  const connection = await mysql.createConnection(config.db.mysql);
  await connection.end();
  return true;
}

async function testPostgresConnection(): Promise<boolean> {
  const client = new Client(config.db.postgres);
  await client.connect();
  await client.end();
  return true;
}

async function testMongoDBConnection(): Promise<boolean> {
  const client = new MongoClient(config.db.mongodb.uri);
  await client.connect();
  await client.close();
  return true;
}

function testSQLiteConnection(): Promise<boolean> {
  return new Promise((resolve) => {
    const db = new sqlite3.Database(config.db.sqlite.filename, (err) => {
      if (err) {
        resolve(false);
      } else {
        db.close();
        resolve(true);
      }
    });
  });
}

async function incrementalBackupPostgres(
  backupPath: string,
  lastBackupTimestamp: Date
): Promise<void> {
  const { host, user, password, database } = config.db.postgres;

  if (!host || !user || !password || !database) {
    throw new Error("PostgreSQL configuration is not complete.");
  }

  const walFilePath = path.join(backupPath, "wal_files");
  await fs.mkdir(walFilePath, { recursive: true });

  try {
    if (!lastBackupTimestamp) {
      await execPromise(
        `PGPASSWORD=${password} pg_basebackup -h ${host} -U ${user} -D ${backupPath} -Ft -z -P`
      );
    }

    const archiveCommand = `PGPASSWORD=${password} pg_archivecleanup -d ${walFilePath} $(pg_controldata ${backupPath} | grep "Latest checkpoint's REDO WAL file" | awk '{print $NF}')`;
    await execPromise(archiveCommand);

    const incrementalCommand = `PGPASSWORD=${password} pg_receivewal -h ${host} -U ${user} -D ${walFilePath} --if-not-exists`;
    await execPromise(incrementalCommand);

    logger.info("Incremental backup completed successfully");
  } catch (error) {
    logger.error(`Incremental backup failed: ${error}`);
    throw error;
  }
}
