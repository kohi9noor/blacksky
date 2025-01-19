"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptQuestions = void 0;
exports.promptQuestions = [
    {
        name: "db_host",
        type: "input",
        message: "Database Host: ",
        default: "localhost",
    },
    {
        name: "db_port",
        type: "input",
        message: "Database Port: ",
        validate: (input) => !isNaN(parseInt(input)) ? true : "Please enter a valid number",
    },
    { name: "db_username", type: "input", message: "Database Username: " },
    {
        name: "db_password",
        type: "password",
        message: "Database Password: ",
        mask: "*",
    },
    {
        name: "db_type",
        type: "list",
        message: "Database Type: ",
        choices: ["mysql", "postgres", "sqlite", "mongodb"],
    },
    { name: "backup_dir", type: "input", message: "Backup Directory: " },
    {
        name: "backup_type",
        type: "list",
        message: "Backup Type: ",
        choices: ["local", "cloud"],
    },
    {
        name: "backup_mode",
        type: "list",
        message: "Backup Mode: ",
        choices: ["full", "schema", "table"],
    },
    {
        name: "specific_schemas",
        type: "input",
        message: "Specify schemas (comma-separated, leave blank if none): ",
        when: (answers) => answers.backup_mode === "schema",
        filter: (input) => input
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
    },
    {
        name: "specific_tables",
        type: "input",
        message: "Specify tables (comma-separated, leave blank if none): ",
        when: (answers) => answers.backup_mode === "table",
        filter: (input) => input
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
    },
    {
        name: "backup_interval",
        type: "list",
        message: "Select the backup interval:",
        choices: [
            { name: "Every 1 minutes", value: "1" },
            { name: "Every 5 minutes", value: "5" },
            { name: "Every 10 minutes", value: "10" },
            { name: "Every 15 minutes", value: "15" },
            { name: "Every 30 minutes", value: "30" },
            { name: "Every 1 hour", value: "60" },
            { name: "Every 6 hours", value: "360" },
            { name: "Every 12 hours", value: "720" },
            { name: "Every 1 day", value: "1440" },
        ],
        default: "60",
    },
    {
        name: "slack_webhook_url",
        type: "input",
        message: "Slack Webhook URL for notifications (leave blank if none): ",
        validate: (input) => input === "" || /^https?:\/\/\S+$/.test(input)
            ? true
            : "Please enter a valid URL or leave blank",
    },
];
