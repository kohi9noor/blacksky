"use strict";
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
exports.listBackups = listBackups;
const fs_1 = __importDefault(require("fs"));
const config_1 = require("../../config");
const storage_factory_1 = require("../cloud/storage-factory");
function listBackups(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { cloud, provider, bucket } = options;
        if (cloud) {
            return listCloudBackups(provider, bucket);
        }
        else {
            return listLocalBackups();
        }
    });
}
function listLocalBackups() {
    return __awaiter(this, void 0, void 0, function* () {
        const backupDir = config_1.config.db.backupPath;
        return new Promise((resolve, reject) => {
            fs_1.default.readdir(backupDir, (err, files) => {
                if (err) {
                    reject(`Error reading backup directory: ${err}`);
                }
                else {
                    resolve(files.filter((file) => file.endsWith(".zip") || file.endsWith(".sql")));
                }
            });
        });
    });
}
function listCloudBackups(provider, bucket) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!provider || !bucket) {
            throw new Error("Cloud provider and bucket name are required for cloud backups");
        }
        const cloudStorage = (0, storage_factory_1.createCloudStorageProvider)();
    });
}
