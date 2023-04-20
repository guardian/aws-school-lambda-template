import {Bucket} from "./config";
import {GetObjectCommand, S3Client} from "@aws-sdk/client-s3";

const s3Client = new S3Client({region: process.env["AWS_REGION"]});

interface EventData {
  source: string;
  content: string;
}

export async function parse(source:string, rawContent:ReadableStream):Promise<EventData[]> {
  const results:EventData[] = [];
  let buffer = "";

  const reader = rawContent.getReader();

  // eslint-disable-next-line no-constant-condition
  while(true) {
    const {done, value} = await reader.read();
    console.log("DEBUG got ", value);
    if(done) {
      console.log("done");
      return results;
    }
    buffer += value as string;

    console.log(`DEBUG buffer is '${buffer}'`);
    const lines = buffer.split("\n");
    console.log(`DEBUG split into ${lines.length} lines`);
    let currentContent = "";
    let lastDelimiter = 0;

    lines.forEach((line, lineNumber)=>{
      const trimmed = line.replace(/^\s+/,"");
      console.log(`DEBUG ${lineNumber}: '${trimmed}'`);
      if(trimmed=="%" && currentContent!="") { //we hit a delimiter
        console.log("DEBUG hit delimiter on line ", lineNumber);
        results.push({
          source,
          content: currentContent
        });
        currentContent = "";
        lastDelimiter = lineNumber;
      } else {
        currentContent += trimmed + "\n";  //otherwise accumulate the data
        console.log(`DEBUG accumulator is '${currentContent}'`)
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

  return parse(s3path, response.Body.transformToWebStream());
}

export type {EventData};
