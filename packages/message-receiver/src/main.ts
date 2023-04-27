import {SNSHandler, SNSMessage} from "aws-lambda";

interface EventShape {
  source?: string;
  content: string;
}

export const handler:SNSHandler = (event) => {
  console.log(`Received ${event.Records.length} events`);
  event.Records.forEach((evt, ctr)=>{
    const content = JSON.parse(evt.Sns.Message) as EventShape;
    console.log(`Message ${ctr}: ${evt.Sns.TopicArn} from ${content.source} at ${evt.Sns.Timestamp}`);
    console.log(content.content);
  });
}
