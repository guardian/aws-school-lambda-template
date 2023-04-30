import process from "process";
import promptFactory from "prompt-sync";
import {
  AttributeValue,
  BatchWriteItemCommand, BatchWriteItemCommandOutput,
  DynamoDBClient,
  QueryCommand,
  WriteRequest
} from "@aws-sdk/client-dynamodb";

const prompt = promptFactory();
const ddbClient = new DynamoDBClient({region: process.env["AWS_REGION"] ?? "eu-west-1"});

interface PageResult {
  LastScannedKey?: Record<string,AttributeValue>;
  KeysToDelete: string[];
}

async function retrievePage(TableName:string, sourceToDelete:string, lastScannedKey?: Record<string,AttributeValue>):Promise<PageResult> {
  console.log(`DEBUG Retrieving next page of ${sourceToDelete} from ${TableName}`);
  const req = new QueryCommand({
    TableName,
    IndexName: "idxSourceTimestamp",
    KeyConditionExpression: "#src = :s",
    ExpressionAttributeNames: {
      "#src": "Source",
    },
    ExpressionAttributeValues: {
      ":s": {S: sourceToDelete },
    },
    ProjectionExpression: "ContentHash",
    ExclusiveStartKey: lastScannedKey,
    Limit: 25,
  });
  const response = await ddbClient.send(req);
  console.log(`DEBUG Retrieved a page of ${response.Count} items`);
  return {
    LastScannedKey: response.LastEvaluatedKey,
    KeysToDelete: response.Items?.map(record=>record["ContentHash"].S as string) ?? []
  }
}

async function performDeletion(TableName: string, keysToDelete: string[]):Promise<BatchWriteItemCommandOutput> {
  const deleteOps:Record<string, WriteRequest[]> = {};
  deleteOps[TableName] = keysToDelete.map(contentHash=>({
    DeleteRequest: {
      Key: {
        "ContentHash": {S: contentHash},
      }
    }
  }))

  const processingLoop:(RequestItems:Record<string,WriteRequest[]>)=>Promise<BatchWriteItemCommandOutput> = async (RequestItems:Record<string,WriteRequest[]>) => new Promise((resolve, reject)=> {
      ddbClient.send(new BatchWriteItemCommand({
        RequestItems,
        ReturnConsumedCapacity: "TOTAL",
      })).then(response=>{
        console.log(`Deleted a page from Dynamo`);
        if(!response.UnprocessedItems) {
          resolve(response);
        } else {
          if(Object.keys(response.UnprocessedItems).length === 0) {
            resolve(response)
          } else {
            console.log(`There were ${Object.keys(response.UnprocessedItems).length} items left unprocessed, trying again...`);
            setTimeout(()=>{
              processingLoop(response.UnprocessedItems ?? {}).then(resolve).catch(reject)
            })
          }
        }
      }).catch(reject)
    });

  return processingLoop(deleteOps)
}

async function TimedPromise(timeout:number) {
  console.log(`Waiting ${timeout/1000} seconds...`);
  return new Promise<void>((resolve)=>setTimeout(resolve, timeout));
}

async function main() {
  const args = process.argv.slice(2);

  if(args.length<2 || (args[0]=="" && args[1]=="")) {
    throw "You must specify the table to delete from as your first argument and the Source to delete as your second";
  }
  const tableName = args[0];
  const source = args[1];

  console.log(`I will delete all records of Source ${source} from table ${tableName}`);
  const response = prompt("OK to continue (y/n)? ");
  if(response.toLowerCase()!="y") process.exit(2);

  const iteratePage:(p:PageResult,retries:number)=>Promise<void|BatchWriteItemCommandOutput> = async (lastPage:PageResult, retries:number)=> {
    if(retries>0) await TimedPromise(1000*retries);
    try {
      const nextPage = await retrievePage(tableName, source, lastPage.LastScannedKey);
      let result;
      if(nextPage.KeysToDelete.length > 0) {
        result = await performDeletion(tableName, nextPage.KeysToDelete);
        console.log(`DEBUG Our consumed capacity for that page was: ${result.ConsumedCapacity ? JSON.stringify(result.ConsumedCapacity) : "undefined"}`);
      } else {
        console.log(`WARN Nothing found to delete!`);
      }

      if (!!nextPage.LastScannedKey) {
        return iteratePage(nextPage, 0);
      } else {
        return result;
      }
    } catch(err) {
      if((err as Error).name==="ProvisionedThroughputExceededException") {
        console.log("We got a ProvisionedThroughputException, holding off...");
        return iteratePage(lastPage, retries+1)
      } else {
        throw err
      }
    }
  }

  return iteratePage({KeysToDelete: []}, 0);
}

main()
  .then(()=>process.exit(0))
  .catch(err=>{
    console.error(err);
    process.exit(1);
  })