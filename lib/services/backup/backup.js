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
exports.backupDatabase = backupDatabase;
exports.testDatabaseConnection = testDatabaseConnection;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const promise_1 = __importDefault(require("mysql2/promise"));
const pg_1 = require("pg");
const mongodb_1 = require("mongodb");
const sqlite3_1 = __importDefault(require("sqlite3"));
const slack_notfication_1 = require("../../notifications/slack-notfication");
const logger_1 = __importDefault(require("../../utils/logger"));
const config_1 = require("../../config");
const compress_1 = require("../../utils/compress");
const storage_factory_1 = require("../cloud/storage-factory");
const execPromise = (0, util_1.promisify)(child_process_1.exec);
function backupDatabase(options, progressCallback) {
    return __awaiter(this, void 0, void 0, function* () {
        const { db, cloud } = options;
        const globalBackupPath = config_1.config.db.backupPath;
        if (!globalBackupPath) {
            throw new Error("Global backup path is not defined in the config.");
        }
        try {
            yield performDatabaseBackup(db, globalBackupPath, progressCallback);
            if (cloud) {
                const typedCloud = cloud;
                yield handleCloudUpload(typedCloud, globalBackupPath, progressCallback);
            }
        }
        catch (error) {
            logger_1.default.error(`Backup failed: ${error}`);
            yield (0, slack_notfication_1.sendSlackNotification)("Backup failed!");
            throw error;
        }
    });
}
function performDatabaseBackup(db, backupPath, progressCallback) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (db.toLowerCase()) {
            case "mysql":
                yield backupMySQL(backupPath);
                break;
            case "postgres":
                yield backupPostgres(backupPath, progressCallback);
                break;
            case "mongodb":
                yield backupMongoDB(backupPath);
                break;
            case "sqlite":
                yield backupSQLite(backupPath);
                break;
            default:
                throw new Error(`Unsupported database type: ${db}`);
        }
    });
}
function handleCloudUpload(cloud, backupPath, progressCallback) {
    return __awaiter(this, void 0, void 0, function* () {
        progressCallback === null || progressCallback === void 0 ? void 0 : progressCallback(90);
        const cloudStorage = (0, storage_factory_1.createCloudStorageProvider)();
        const cloudProvider = config_1.config.cloud[cloud.provider];
        if (!cloudProvider) {
            throw new Error(`Unsupported cloud provider: ${cloud.provider}`);
        }
        const bucketName = getBucketName(cloud);
        yield cloudStorage.upload(backupPath, bucketName);
    });
}
function getBucketName(cloud) {
    const provider = config_1.config.cloud.provider.toLowerCase();
    switch (provider) {
        case "s3":
            return cloud.bucketName || config_1.config.cloud.s3.bucket || "";
        case "google":
            return cloud.bucketName || config_1.config.cloud.google.bucket || "";
        case "azure":
            return cloud.bucketName || config_1.config.cloud.azure.bucket || "";
        default:
            throw new Error(`Unsupported cloud provider: ${provider}`);
    }
}
function backupMySQL(backupPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const { host, user, password, database } = config_1.config.db.mysql;
        if (!host || !user || !password || !database) {
            throw new Error("MySQL configuration is not complete.");
        }
        try {
            const command = `mysqldump -h ${host} -u ${user} -p${password} ${database} > ${backupPath}`;
            yield execPromise(command);
            logger_1.default.info("MySQL backup completed successfully");
        }
        catch (error) {
            logger_1.default.error(`MySQL backup failed: ${error}`);
            throw error;
        }
    });
}
function backupPostgres(backupPath, progressCallback) {
    return __awaiter(this, void 0, void 0, function* () {
        const { host, user, password, database } = config_1.config.db.postgres;
        if (!host || !user || !password || !database) {
            throw new Error("PostgreSQL configuration is not complete.");
        }
        try {
            yield fs.mkdir(backupPath, { recursive: true });
            const sqlBackupFilePath = path.join(backupPath, `backup_${new Date().toISOString().split("T")[0]}.sql`);
            const zipBackupFilePath = path.join(backupPath, `backup_${new Date().toISOString().split("T")[0]}.zip`);
            const command = `PGPASSWORD=${password} pg_dump -h ${host} -U ${user} -d ${database} -f ${sqlBackupFilePath}`;
            yield execPromise(command);
            progressCallback === null || progressCallback === void 0 ? void 0 : progressCallback(50);
            yield (0, compress_1.createZipBackup)(sqlBackupFilePath, zipBackupFilePath);
            yield fs.unlink(sqlBackupFilePath);
            progressCallback === null || progressCallback === void 0 ? void 0 : progressCallback(80);
            logger_1.default.info("PostgreSQL backup completed successfully");
        }
        catch (error) {
            logger_1.default.error(`PostgreSQL backup failed: ${error}`);
            throw error;
        }
    });
}
function backupMongoDB(backupPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const uri = config_1.config.db.mongodb.uri;
        if (!uri) {
            throw new Error("MongoDB URI is not defined.");
        }
        try {
            const command = `mongodump --uri="${uri}" --out=${backupPath}`;
            yield execPromise(command);
            logger_1.default.info("MongoDB backup completed successfully");
        }
        catch (error) {
            logger_1.default.error(`MongoDB backup failed: ${error}`);
            throw error;
        }
    });
}
function backupSQLite(backupPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const filename = config_1.config.db.sqlite.filename;
        if (!filename) {
            throw new Error("SQLite filename is not defined.");
        }
        try {
            yield fs.copyFile(filename, backupPath);
            logger_1.default.info("SQLite backup completed successfully");
        }
        catch (error) {
            logger_1.default.error(`SQLite backup failed: ${error}`);
            throw error;
        }
    });
}
function testDatabaseConnection(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { db } = options;
        try {
            switch (db.toLowerCase()) {
                case "mysql":
                    return yield testMySQLConnection();
                case "postgres":
                    return yield testPostgresConnection();
                case "mongodb":
                    return yield testMongoDBConnection();
                case "sqlite":
                    return yield testSQLiteConnection();
                default:
                    throw new Error(`Unsupported database type: ${db}`);
            }
        }
        catch (error) {
            logger_1.default.error(`Connection test failed: ${error}`);
            return false;
        }
    });
}
function testMySQLConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        const connection = yield promise_1.default.createConnection(config_1.config.db.mysql);
        yield connection.end();
        return true;
    });
}
function testPostgresConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = new pg_1.Client(config_1.config.db.postgres);
        yield client.connect();
        yield client.end();
        return true;
    });
}
function testMongoDBConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = new mongodb_1.MongoClient(config_1.config.db.mongodb.uri);
        yield client.connect();
        yield client.close();
        return true;
    });
}
function testSQLiteConnection() {
    return new Promise((resolve) => {
        const db = new sqlite3_1.default.Database(config_1.config.db.sqlite.filename, (err) => {
            if (err) {
                resolve(false);
            }
            else {
                db.close();
                resolve(true);
            }
        });
    });
}
function incrementalBackupPostgres(backupPath, lastBackupTimestamp) {
    return __awaiter(this, void 0, void 0, function* () {
        const { host, user, password, database } = config_1.config.db.postgres;
        if (!host || !user || !password || !database) {
            throw new Error("PostgreSQL configuration is not complete.");
        }
        const walFilePath = path.join(backupPath, "wal_files");
        yield fs.mkdir(walFilePath, { recursive: true });
        try {
            if (!lastBackupTimestamp) {
                yield execPromise(`PGPASSWORD=${password} pg_basebackup -h ${host} -U ${user} -D ${backupPath} -Ft -z -P`);
            }
            const archiveCommand = `PGPASSWORD=${password} pg_archivecleanup -d ${walFilePath} $(pg_controldata ${backupPath} | grep "Latest checkpoint's REDO WAL file" | awk '{print $NF}')`;
            yield execPromise(archiveCommand);
            const incrementalCommand = `PGPASSWORD=${password} pg_receivewal -h ${host} -U ${user} -D ${walFilePath} --if-not-exists`;
            yield execPromise(incrementalCommand);
            logger_1.default.info("Incremental backup completed successfully");
        }
        catch (error) {
            logger_1.default.error(`Incremental backup failed: ${error}`);
            throw error;
        }
    });
}
