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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCloudStorageProvider = createCloudStorageProvider;
exports.createS3Provider = createS3Provider;
exports.createGoogleCloudProvider = createGoogleCloudProvider;
exports.createAzureProvider = createAzureProvider;
const AWS = __importStar(require("aws-sdk"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const storage_1 = require("@google-cloud/storage");
const storage_blob_1 = require("@azure/storage-blob");
const config_1 = require("../../config/");
function createCloudStorageProvider() {
    const provider = config_1.config.cloud.provider.toLowerCase();
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
function createS3Provider() {
    const s3 = new AWS.S3({
        region: config_1.config.cloud.s3.region,
    });
    return {
        upload: (filePath, bucketName) => {
            return new Promise((resolve, reject) => {
                const fileStream = fs.createReadStream(filePath);
                const params = {
                    Bucket: bucketName,
                    Key: path.basename(filePath),
                    Body: fileStream,
                };
                s3.upload(params, (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        },
        download: (fileName, bucketName) => {
            return new Promise((resolve, reject) => {
                const params = { Bucket: bucketName, Key: fileName };
                s3.getObject(params, (err, data) => {
                    if (err) {
                        reject(err);
                    }
                    else if (data.Body) {
                        fs.writeFileSync(fileName, data.Body);
                        resolve();
                    }
                    else {
                        reject(new Error("No data received from S3"));
                    }
                });
            });
        },
    };
}
function createGoogleCloudProvider() {
    const storage = new storage_1.Storage({
        projectId: config_1.config.cloud.google.projectId,
    });
    return {
        upload: (filePath, bucketName) => {
            return new Promise((resolve, reject) => {
                const bucket = storage.bucket(bucketName);
                bucket.upload(filePath, (err, file) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        },
        download: (fileName, bucketName) => {
            return new Promise((resolve, reject) => {
                const bucket = storage.bucket(bucketName);
                const file = bucket.file(fileName);
                file.download((err, contents) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        fs.writeFileSync(fileName, contents);
                        resolve();
                    }
                });
            });
        },
    };
}
function createAzureProvider() {
    const blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(config_1.config.cloud.azure.connectionString);
    return {
        upload: (filePath, containerName) => __awaiter(this, void 0, void 0, function* () {
            const containerClient = blobServiceClient.getContainerClient(containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(path.basename(filePath));
            yield blockBlobClient.uploadFile(filePath);
        }),
        download: (fileName, containerName) => __awaiter(this, void 0, void 0, function* () {
            const containerClient = blobServiceClient.getContainerClient(containerName);
            const blobClient = containerClient.getBlobClient(fileName);
            try {
                const downloadBlockBlobResponse = yield blobClient.download();
                const readableStreamBody = downloadBlockBlobResponse.readableStreamBody;
                if (readableStreamBody) {
                    const downloadedFile = yield streamToBuffer(readableStreamBody);
                    fs.writeFileSync(fileName, downloadedFile);
                }
                else {
                    throw new Error("The stream body is undefined");
                }
            }
            catch (error) {
                throw new Error(`Azure download failed: ${error}`);
            }
        }),
        list: (bucket) => __awaiter(this, void 0, void 0, function* () { }),
    };
}
// Helper function to convert a ReadableStream to a Buffer
function streamToBuffer(readableStream) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const chunks = [];
            readableStream.on("data", (chunk) => chunks.push(chunk));
            readableStream.on("end", () => resolve(Buffer.concat(chunks)));
            readableStream.on("error", reject);
        });
    });
}
function list() {
    throw new Error("Function not implemented.");
}
