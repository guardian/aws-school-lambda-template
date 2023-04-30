import {QueryCommand, ScanCommand} from "@aws-sdk/client-dynamodb";
import {ddbClient, MarshalDynamoRecord, TableName} from "./dynamo";
import {DynamoRecord} from "./models";

export async function exampleScanDontDoThis(characterCountLessThan: number):Promise<DynamoRecord[]> {
  const req = new ScanCommand({
    TableName,
    FilterExpression: "CharacterCount < :cc",
    ExpressionAttributeValues: {
      ":cc": {N: characterCountLessThan.toString()}
    }
  });
  const response = await ddbClient.send(req);
  console.log(`We scanned ${response.ScannedCount} items to return a page of ${response.Count}`+
    ` items matching character count less then ${characterCountLessThan}`);
  const records = response.Items ? response.Items.map(MarshalDynamoRecord) : [];

  records.forEach((rec,ctr)=>{
    console.log(`Item ${ctr}: ${JSON.stringify(rec)}`);
  })
  return records;
}

export async function exampleIndexQuery(source:string, characterCountLessThan: number):Promise<DynamoRecord[]> {
  const req = new QueryCommand({
    TableName,
    IndexName: "idxSourceCharcount",
    KeyConditionExpression: "Source = :s AND CharacterCount < :cc",
    ExpressionAttributeValues: {
      ":s": {S: source},
      ":cc": {N: characterCountLessThan.toString()},
    },
  });
  const response = await ddbClient.send(req);
  console.log(`Returned a page of ${response.Count} items`);
  const records = response.Items ? response.Items.map(MarshalDynamoRecord) : [];

  records.forEach((rec,ctr)=>{
    console.log(`Item ${ctr}: ${JSON.stringify(rec)}`);
  })
  return records;
}
