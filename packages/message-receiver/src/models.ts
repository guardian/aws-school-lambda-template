interface EventShape {
  source?: string;
  content: string;
}

interface DynamoRecord {
  contentHash:string;
  timestamp:Date;
  source:string;
  content:string;
  characterCount:number;
}

export type {EventShape, DynamoRecord}
