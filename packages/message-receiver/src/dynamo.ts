import {DynamoDBClient, PutItemCommand} from "@aws-sdk/client-dynamodb"
import * as process from "process";
import {DynamoRecord, EventShape} from "./models";
import {createHash} from "crypto";
import formatISO from "date-fns/formatISO";

const TableName = process.env["TABLE_NAME"];
const ddbClient = new DynamoDBClient({region: process.env["region"]});

export function DynamoRecordFromEvent(event:EventShape, timestamp:Date|undefined):DynamoRecord {
  return {
    characterCount: event.content.length,
    content: event.content,
    contentHash: createHash("sha256").update(event.content).digest('hex'),
    source: event.source ?? "unknown",
    timestamp: timestamp ?? new Date(),
  }
}

export async function WriteDynamoRecord(rec:DynamoRecord) {
  const req = new PutItemCommand({
    TableName,
    Item: {
      CharacterCount: {N: rec.characterCount.toString()},
      Content: {S: rec.content},
      ContentHash: {S: rec.contentHash},
      Source: {S: rec.source},
      Timestamp: {S: formatISO(rec.timestamp) as string}
    }
  });
  return ddbClient.send(req);
}