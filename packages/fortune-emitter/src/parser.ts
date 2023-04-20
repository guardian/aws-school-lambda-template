import {Bucket} from "./config";
import {GetObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {TextDecoder} from "util";

const s3Client = new S3Client({region: process.env["AWS_REGION"]});

interface EventData {
  source: string;
  content: string;
}

export async function parse(source:string, rawContent:ReadableStream<Uint8Array>):Promise<EventData[]> {
  const results:EventData[] = [];
  let buffer = "";

  const reader = rawContent.getReader();
  const decoder = new TextDecoder();

  // eslint-disable-next-line no-constant-condition
  while(true) {
    const {done, value} = await reader.read();
    if(done) {
      console.log("All content loaded");
      return results;
    }
    buffer += decoder.decode(value);

    const lines = buffer.split("\n");

    let currentContent = "";
    let lastDelimiter = 0;

    lines.forEach((line, lineNumber)=>{
      const trimmed = line.replace(/^\s+/,"");
      if(trimmed=="%" && currentContent!="") { //we hit a delimiter
        results.push({
          source,
          content: currentContent
        });
        currentContent = "";
        lastDelimiter = lineNumber;
      } else {
        currentContent += trimmed + "\n";  //otherwise accumulate the data
      }
    });

    buffer = lines.slice(lastDelimiter+1).join("\n"); //if we have a partial read, then leave that in the buffer for the next run
  }
}

export async function loadAndParse(s3path:string):Promise<EventData[]> {
  if(!Bucket || Bucket=="") {
    throw "You must specify BUCKET in the environment configuration";
  }

  const req = new GetObjectCommand({
    Bucket,
    Key: s3path,
  });
  const response = await s3Client.send(req);
  console.log(`Loaded in s3://${Bucket}/${s3path}, size is ${response.ContentLength}`);

  const events = await parse(s3path, response.Body.transformToWebStream());
  console.log(`Loaded ${events.length} potential events`);
  return events;
}

export type {EventData};
