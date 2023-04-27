import {SNSHandler} from "aws-lambda";
import {EventShape} from "./models";
import {DynamoRecordFromEvent, WriteDynamoRecord} from "./dynamo";
import parseISO from "date-fns/parseISO";


export const handler:SNSHandler = async (event) => {
  console.log(`Received ${event.Records.length} events`);
  const results = await Promise.all(
    event.Records.map((evt, ctr)=>{
      const content = JSON.parse(evt.Sns.Message) as EventShape;
      console.log(`Message ${ctr}: ${evt.Sns.TopicArn} from ${content.source} at ${evt.Sns.Timestamp}`);
      const eventTS = parseISO(evt.Sns.Timestamp)
      const rec = DynamoRecordFromEvent(content, eventTS);
      return WriteDynamoRecord(rec);
    })
  );
  console.log("Finished Dynamo write.");
}
