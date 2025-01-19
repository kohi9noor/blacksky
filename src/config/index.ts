import * as dotenv from "dotenv";

dotenv.config();

export const config = {
  db: {
    backupPath: process.env.BACKUP_PATH || "_backup",

    mysql: {
      host: process.env.MYSQL_HOST || "localhost",
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DATABASE || "test",
    },
    postgres: {
      host: process.env.POSTGRES_HOST || "localhost",
      user: process.env.POSTGRES_USER || "user",
      password: process.env.POSTGRES_PASSWORD || "password",
      database: process.env.POSTGRES_DATABASE || "test",
    },
    mongodb: {
      uri: process.env.MONGODB_URI || "mongodb://localhost:27017",
    },
    sqlite: {
      filename: process.env.SQLITE_DATABASE || "test.db",
    },
  },
  cloud: {
    provider: process.env.CLOUD_PROVIDER || "s3",
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION,
    },
    google: {
      bucket: process.env.GCS_BUCKET,
      projectId: process.env.GCS_PROJECT_ID,
    },
    azure: {
      bucket: process.env.AZURE_CONTAINER || "",
      connectionString: process.env.AZURE_CONNECTION_STRING || "",
    },
  },
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
  },
};
