# Blacksky

Blacksky is a CLI tool to backup, restore, and schedule database backups. It supports multiple database types and cloud providers for storage.

## Features

- Backup databases (MySQL, PostgreSQL, MongoDB, SQLite)
- Restore databases from local or cloud storage
- Schedule automatic backups using cron expressions
- Send notifications via Slack

## Installation

1. Clone the repository:

````sh
git clone https://github.com/kohi9noor/blacksky.git
cd blacksky

2. Install dependencies:

```sh
npm install
````

**Configuration**
Run the configuration wizard to setup your database and cloud storage settings:

```sh
npm run config
```

This will create `config.json` file within your project root dir.

Additional Commands
npm run help: Display help information
npm run backup:mysql: Backup MySQL database
npm run backup:postgres: Backup PostgreSQL database
npm run backup:mongodb: Backup MongoDB database
npm run backup:sqlite: Backup SQLite database
npm run restore:file: Restore database from a file
npm run restore:cloud:aws: Restore database from AWS cloud storage
npm run restore:cloud:gcp: Restore database from GCP cloud storage
npm run restore:cloud:azure: Restore database from Azure cloud storage
