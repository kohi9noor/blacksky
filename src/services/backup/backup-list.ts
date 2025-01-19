import fs from "fs";
import path from "path";
import { config } from "../../config";
import { createCloudStorageProvider } from "../cloud/storage-factory";

export async function listBackups(options: {
  cloud?: boolean;
  provider?: string;
  bucket?: string;
}) {
  const { cloud, provider, bucket } = options;

  if (cloud) {
    return listCloudBackups(provider, bucket);
  } else {
    return listLocalBackups();
  }
}

async function listLocalBackups(): Promise<string[]> {
  const backupDir = config.db.backupPath;
  return new Promise((resolve, reject) => {
    fs.readdir(backupDir, (err, files) => {
      if (err) {
        reject(`Error reading backup directory: ${err}`);
      } else {
        resolve(
          files.filter((file) => file.endsWith(".zip") || file.endsWith(".sql"))
        );
      }
    });
  });
}

async function listCloudBackups(provider?: string, bucket?: string) {
  if (!provider || !bucket) {
    throw new Error(
      "Cloud provider and bucket name are required for cloud backups"
    );
  }

  const cloudStorage = createCloudStorageProvider();
}
