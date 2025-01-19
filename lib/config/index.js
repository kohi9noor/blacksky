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
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
exports.config = {
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
