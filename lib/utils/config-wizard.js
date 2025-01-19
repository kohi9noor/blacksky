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
exports.configWizard = configWizard;
const inquirer_1 = __importDefault(require("inquirer"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function configWizard() {
    return __awaiter(this, void 0, void 0, function* () {
        const questions = [
            {
                type: "list",
                name: "dbType",
                message: "Select your database type:",
                choices: ["mysql", "postgres", "mongodb", "sqlite"],
            },
            {
                type: "input",
                name: "host",
                message: "Enter your database host:",
                when: (answers) => answers.dbType !== "sqlite",
                validate: (input) => {
                    if (!input) {
                        return "Host cannot be empty.";
                    }
                    return true;
                },
            },
            {
                type: "input",
                name: "port",
                message: "Enter your database port:",
                when: (answers) => answers.dbType !== "sqlite",
                default: (answers) => {
                    switch (answers.dbType) {
                        case "mysql":
                            return 3306;
                        case "postgres":
                            return 5432;
                        case "mongodb":
                            return 27017;
                        default:
                            return undefined;
                    }
                },
                validate: (input) => {
                    const port = parseInt(input, 10);
                    if (isNaN(port) || port <= 0 || port > 65535) {
                        return "Please enter a valid port number.";
                    }
                    return true;
                },
            },
            {
                type: "input",
                name: "username",
                message: "Enter your database username:",
                when: (answers) => answers.dbType !== "sqlite",
                validate: (input) => {
                    if (!input) {
                        return "Username cannot be empty.";
                    }
                    return true;
                },
            },
            {
                type: "password",
                name: "password",
                message: "Enter your database password:",
                when: (answers) => answers.dbType !== "sqlite",
                mask: "*",
                validate: (input) => {
                    if (!input) {
                        return "Password cannot be empty.";
                    }
                    return true;
                },
            },
            {
                type: "input",
                name: "database",
                message: "Enter your database name:",
                when: (answers) => answers.dbType !== "sqlite",
                validate: (input) => {
                    if (!input) {
                        return "Database name cannot be empty.";
                    }
                    return true;
                },
            },
            {
                type: "input",
                name: "filename",
                message: "Enter the path to your SQLite database file:",
                when: (answers) => answers.dbType === "sqlite",
                validate: (input) => {
                    if (!input) {
                        return "Filename cannot be empty.";
                    }
                    if (!fs.existsSync(input)) {
                        return "File does not exist. Please enter a valid path.";
                    }
                    return true;
                },
            },
            {
                type: "confirm",
                name: "useCloud",
                message: "Do you want to use cloud storage?",
                default: false,
            },
            {
                type: "list",
                name: "cloudProvider",
                message: "Select your cloud provider:",
                choices: ["aws", "gcp", "azure"],
                when: (answers) => answers.useCloud,
            },
            {
                type: "input",
                name: "cloudBucket",
                message: "Enter your cloud storage bucket name:",
                when: (answers) => answers.useCloud,
                validate: (input) => {
                    if (!input) {
                        return "Bucket name cannot be empty.";
                    }
                    return true;
                },
            },
            {
                type: "input",
                name: "backupPath",
                message: "Enter the local path for storing backups:",
                default: path.join(process.cwd(), "backups"),
                validate: (input) => {
                    if (!input) {
                        return "Backup path cannot be empty.";
                    }
                    return true;
                },
            },
            {
                type: "input",
                name: "slackUsers",
                message: "Enter Slack handles or email addresses for notifications (comma-separated):",
                validate: (input) => {
                    if (!input) {
                        return "At least one Slack handle or email address is required.";
                    }
                    return true;
                },
            },
        ];
        const answers = yield inquirer_1.default.prompt(questions);
        const config = {
            db: Object.assign({ type: answers.dbType }, (answers.dbType === "sqlite"
                ? { filename: answers.filename }
                : {
                    host: answers.host,
                    port: answers.port,
                    username: answers.username,
                    password: answers.password,
                    database: answers.database,
                })),
            cloud: answers.useCloud
                ? {
                    provider: answers.cloudProvider,
                    bucket: answers.cloudBucket,
                }
                : undefined,
            backupPath: answers.backupPath,
            slackUsers: answers.slackUsers.split(",").map((user) => user.trim()),
        };
        const configPath = path.join(process.cwd(), "config.json");
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`Configuration saved to ${configPath}`);
    });
}
