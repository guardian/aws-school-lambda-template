import {EventData} from "./parser";
import {PublishCommand, SNSClient} from "@aws-sdk/client-sns";
import {TopicArn} from "./config";

const snsClient = new SNSClient({region: process.env["AWS_REGION"]});

export async function sendMessage(event:EventData) {
  const req = new PublishCommand({
    TopicArn,
    Message: JSON.stringify(event),
  });
  await snsClient.send(req);
}
