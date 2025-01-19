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
exports.restoreDatabase = restoreDatabase;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
const index_1 = require("../../config/index");
const logger_1 = __importDefault(require("../../utils/logger"));
const compress_1 = require("../../utils/compress");
const storage_factory_1 = require("../cloud/storage-factory");
const execPromise = (0, util_1.promisify)(child_process_1.exec);
function restoreDatabase(options) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { db, cloud } = options;
            const globalBackupPath = index_1.config.db.backupPath;
            if (!globalBackupPath) {
                throw new Error("Global backup file path is not defined in the config.");
            }
            if (cloud) {
                yield downloadFromCloud(cloud);
            }
            const extractToPath = `${globalBackupPath}_extracted`;
            yield (0, compress_1.decompressZipBackup)(globalBackupPath, extractToPath);
            const restorePath = fs.existsSync(extractToPath)
                ? extractToPath
                : globalBackupPath;
            if (!fs.existsSync(restorePath)) {
                throw new Error(`Backup file does not exist at path: ${restorePath}`);
            }
            switch (db.toLowerCase()) {
                case "mysql":
                    yield restoreMySQL(restorePath);
                    break;
                case "postgres":
                    yield restorePostgres(restorePath);
                    break;
                case "mongodb":
                    yield restoreMongoDB(restorePath);
                    break;
                case "sqlite":
                    yield restoreSQLite(restorePath);
                    break;
                default:
                    throw new Error(`Unsupported database type: ${db}`);
            }
            logger_1.default.info("Restore completed successfully");
        }
        catch (error) {
            logger_1.default.error(`Restore failed: ${error}`);
        }
    });
}
function downloadFromCloud(cloud) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!cloud || !cloud.provider) {
            throw new Error("Cloud provider is not specified");
        }
        const cloudStorage = (0, storage_factory_1.createCloudStorageProvider)();
        const provider = cloud.provider.toLowerCase();
        const backupFileName = "backup.gz";
        switch (provider) {
            case "s3":
            case "google":
            case "azure":
                yield cloudStorage.download(backupFileName, cloud.bucketName || "");
                break;
            default:
                throw new Error(`Unsupported cloud provider: ${provider}`);
        }
    });
}
function restoreMySQL(backupPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const { host, user, password, database } = index_1.config.db.mysql;
        if (!host || !user || !password || !database) {
            throw new Error("MySQL configuration is not complete.");
        }
        try {
            const command = `mysql -h ${host} -u ${user} -p${password} ${database} < ${backupPath}`;
            const { stdout, stderr } = yield execPromise(command);
            if (stdout)
                logger_1.default.info(`MySQL restore output: ${stdout}`);
            if (stderr)
                logger_1.default.error(`MySQL restore error: ${stderr}`);
            logger_1.default.info("MySQL database restored successfully");
        }
        catch (error) {
            logger_1.default.error(`MySQL restore failed: ${error}`);
        }
    });
}
function restorePostgres(backupPath) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { host, user, password, database } = index_1.config.db.postgres;
        if (!host || !user || !password || !database) {
            throw new Error("PostgreSQL configuration is not complete.");
        }
        try {
            if (!fs.existsSync(backupPath)) {
                throw new Error(`Backup file does not exist at path: ${backupPath}`);
            }
            const fileExtension = (_a = backupPath.split(".").pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            let command;
            if (fileExtension === "sql") {
                command = `PGPASSWORD=${password} psql -h ${host} -U ${user} -d ${database} -f ${backupPath}`;
            }
            else {
                command = `PGPASSWORD=${password} pg_restore -h ${host} -U ${user} -d ${database} ${backupPath}`;
            }
            const { stdout, stderr } = yield execPromise(command);
            if (stdout)
                logger_1.default.info(`PostgreSQL restore output: ${stdout}`);
            if (stderr)
                logger_1.default.error(`PostgreSQL restore error: ${stderr}`);
            logger_1.default.info("PostgreSQL database restored successfully");
        }
        catch (error) {
            logger_1.default.error(`PostgreSQL restore failed: ${error}`);
            throw error;
        }
    });
}
function restoreMongoDB(backupPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const uri = index_1.config.db.mongodb.uri;
        if (!uri) {
            throw new Error("MongoDB URI is not defined.");
        }
        try {
            const command = `mongorestore --uri="${uri}" ${backupPath}`;
            const { stdout, stderr } = yield execPromise(command);
            if (stdout)
                logger_1.default.info(`MongoDB restore output: ${stdout}`);
            if (stderr)
                logger_1.default.error(`MongoDB restore error: ${stderr}`);
            logger_1.default.info("MongoDB database restored successfully");
        }
        catch (error) {
            logger_1.default.error(`MongoDB restore failed: ${error}`);
        }
    });
}
function restoreSQLite(backupPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const filename = index_1.config.db.sqlite.filename;
        if (!filename) {
            throw new Error("SQLite filename is not defined.");
        }
        try {
            yield new Promise((resolve, reject) => {
                fs.copyFile(backupPath, filename, (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
            logger_1.default.info("SQLite database restored successfully");
        }
        catch (error) {
            logger_1.default.error(`SQLite restore failed: ${error}`);
        }
    });
}
