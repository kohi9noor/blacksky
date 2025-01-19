import { IncomingWebhook } from "@slack/webhook";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config();

export async function sendSlackNotification(message: string) {
  const config = JSON.parse(fs.readFileSync("./config.json", "utf-8"));
  const slackUsers = config.slackUsers;

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error(
      "SLACK_WEBHOOK_URL is not defined in the environment variables"
    );
  }

  const webhook = new IncomingWebhook(webhookUrl);
  for (const user of slackUsers) {
    await webhook.send({
      text: `${message} @${user}`,
    });
  }
}
