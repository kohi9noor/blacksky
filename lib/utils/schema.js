"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configOptionsSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.configOptionsSchema = zod_1.default.object({
    db_host: zod_1.default.string(),
    db_port: zod_1.default.number(),
    db_username: zod_1.default.string(),
    db_password: zod_1.default.string(),
    db_type: zod_1.default.enum(["mysql", "postgres", "sqlite", "mongodb"]),
    backup_dir: zod_1.default.string(),
    backup_type: zod_1.default.enum(["local", "cloud"]).default("local"),
    backup_mode: zod_1.default.enum(["full", "schema", "table"]).default("full"),
    specific_schemas: zod_1.default.array(zod_1.default.string()).optional().default([]),
    specific_tables: zod_1.default.array(zod_1.default.string()).optional().default([]),
    backup_interval: zod_1.default
        .enum(["1", "5", "10", "15", "30", "60", "360", "720", "1440"])
        .transform((value) => parseInt(value, 10)),
    slack_webhook_url: zod_1.default
        .string()
        .optional()
        .refine((url) => url === "" || (url && /^https?:\/\/\S+$/.test(url)), {
        message: "Please enter a valid URL or leave blank",
    }),
});
