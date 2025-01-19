import * as AWS from "aws-sdk";
import * as fs from "fs";
import * as path from "path";
import { Storage as GoogleStorage } from "@google-cloud/storage";
import { BlobServiceClient } from "@azure/storage-blob";
import { config } from "../../config/";

export function createCloudStorageProvider() {
  const provider = config.cloud.provider.toLowerCase();

  switch (provider) {
    case "s3":
      return createS3Provider();
    case "google":
      return createGoogleCloudProvider();
    case "azure":
      return createAzureProvider();
    default:
      throw new Error(`Unsupported cloud provider: ${provider}`);
  }
}

export function createS3Provider() {
  const s3 = new AWS.S3({
    region: config.cloud.s3.region,
  });

  return {
    upload: (filePath: string, bucketName: string) => {
      return new Promise<void>((resolve, reject) => {
        const fileStream = fs.createReadStream(filePath);
        const params = {
          Bucket: bucketName,
          Key: path.basename(filePath),
          Body: fileStream,
        };

        s3.upload(params, (err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    },

    download: (fileName: string, bucketName: string) => {
      return new Promise<void>((resolve, reject) => {
        const params = { Bucket: bucketName, Key: fileName };
        s3.getObject(params, (err: any, data: AWS.S3.GetObjectOutput) => {
          if (err) {
            reject(err);
          } else if (data.Body) {
            fs.writeFileSync(fileName, data.Body as Buffer);
            resolve();
          } else {
            reject(new Error("No data received from S3"));
          }
        });
      });
    },
  };
}

export function createGoogleCloudProvider() {
  const storage = new GoogleStorage({
    projectId: config.cloud.google.projectId,
  });

  return {
    upload: (filePath: string, bucketName: string) => {
      return new Promise<void>((resolve, reject) => {
        const bucket = storage.bucket(bucketName);
        bucket.upload(filePath, (err: any, file: any) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    },

    download: (fileName: string, bucketName: string) => {
      return new Promise<void>((resolve, reject) => {
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(fileName);

        file.download((err: any, contents: Buffer) => {
          if (err) {
            reject(err);
          } else {
            fs.writeFileSync(fileName, contents);
            resolve();
          }
        });
      });
    },
  };
}

export function createAzureProvider() {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    config.cloud.azure.connectionString
  );

  return {
    upload: async (filePath: string, containerName: string) => {
      const containerClient =
        blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(
        path.basename(filePath)
      );

      await blockBlobClient.uploadFile(filePath);
    },

    download: async (fileName: string, containerName: string) => {
      const containerClient =
        blobServiceClient.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(fileName);

      try {
        const downloadBlockBlobResponse = await blobClient.download();
        const readableStreamBody = downloadBlockBlobResponse.readableStreamBody;

        if (readableStreamBody) {
          const downloadedFile = await streamToBuffer(readableStreamBody);
          fs.writeFileSync(fileName, downloadedFile);
        } else {
          throw new Error("The stream body is undefined");
        }
      } catch (error) {
        throw new Error(`Azure download failed: ${error}`);
      }
    },

    list: async (bucket?: string) => {},
  };
}

// Helper function to convert a ReadableStream to a Buffer
async function streamToBuffer(
  readableStream: NodeJS.ReadableStream
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    readableStream.on("data", (chunk) => chunks.push(chunk));
    readableStream.on("end", () => resolve(Buffer.concat(chunks)));
    readableStream.on("error", reject);
  });
}
function list() {
  throw new Error("Function not implemented.");
}
