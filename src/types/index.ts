export interface BackupOptions {
  db: DatabaseType;
  cloud?: {
    provider: string;
    bucketName: string;
  };
  dryRun: boolean | undefined;
}

export interface RestoreOptions {
  db: DatabaseType;
  file?: string;
  cloud?: CloudProvider;
}

export interface ScheduleOptions {
  time: string;
  backupOption: BackupOptions;
}

export interface CloudStorage {
  upload(filePath: string, bucketName: string): Promise<void>;
}

export interface ConfigAnswers {
  dbType: DatabaseType;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  filename?: string;
  useCloud: boolean;
  cloudProvider?: "aws" | "gcp" | "azure";
  cloudBucket?: string;
  backupPath: string;
}

export type DatabaseType = "mysql" | "postgres" | "mongodb" | "sqlite";

export interface CloudProvider {
  provider: "s3" | "google" | "azure";
  bucketName?: string;
}
