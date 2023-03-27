import {Handler} from "aws-lambda";
import {GetObjectCommand, S3Client} from "@aws-sdk/client-s3";

const s3client = new S3Client({region: process.env["AWS_REGION"]});

const handler:Handler = async (event, context) => {
  const bucketName = process.env["BUCKET"];
  const filePath = process.env["PATH"];
  if(!bucketName || !filePath) {
    throw new Error("You need to specify BUCKET and PATH in the environment configuration");
  }

  console.log(`Retrieving file at s3://${bucketName}/${filePath}...`);
  const req = new GetObjectCommand({
    Bucket: bucketName,
    Key: filePath,
  });
  const response = await s3client.send(req);
  console.log(`Found file with size ${response.ContentLength} and possibly checksum ${response.ChecksumSHA256}. Content was last modified at ${response.LastModified}`);
  console.log("File content is: ");
  const fileContent = await response.Body.transformToString();
  console.log(fileContent);

}

export {handler}
