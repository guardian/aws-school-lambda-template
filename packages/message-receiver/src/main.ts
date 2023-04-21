import {SNSHandler, SNSMessage} from "aws-lambda";

interface EventShape {
  source?: string;
  content: string;
}

function safeParse(source: SNSMessage):EventShape {
  try {
    return JSON.parse(source.Message) as EventShape;
  } catch(err) {
    console.error(`Could not parse '${source.Message}' as EventShape: `, err);
    return {
      source: "internal",
      content: "could not parse this message :("
    }
  }
}

export const handler:SNSHandler = (event) => {
  console.log(`Received ${event.Records.length} events`);
  event.Records.forEach((evt, ctr)=>{
    const content = safeParse(evt.Sns);
    console.log(`Message ${ctr}: ${evt.Sns.TopicArn} from ${content.source} at ${evt.Sns.Timestamp}`);
    console.log(content.content);
  });
  if(Math.random()>0.5) {
    throw "Oooh crumbs!";
  }
}
