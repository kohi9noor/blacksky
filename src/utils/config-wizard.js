import inquirer from "inquirer";
import * as fs from "fs";
import * as path from "path";

export async function configWizard() {
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
      message:
        "Enter Slack handles or email addresses for notifications (comma-separated):",
      validate: (input) => {
        if (!input) {
          return "At least one Slack handle or email address is required.";
        }
        return true;
      },
    },
  ];

  const answers = await inquirer.prompt(questions);

  const config = {
    db: {
      type: answers.dbType,
      ...(answers.dbType === "sqlite"
        ? { filename: answers.filename }
        : {
            host: answers.host,
            port: answers.port,
            username: answers.username,
            password: answers.password,
            database: answers.database,
          }),
    },
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
}
