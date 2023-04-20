import {Handler} from "aws-lambda";
import {loadAndParse} from "./parser";
import {FileName} from "./config";
import {sendMessage} from "./sns";

let possibleEvents = [];
loadAndParse(FileName)
  .then((loadedEvents)=>{
    possibleEvents = loadedEvents;
  })
  .catch((err)=>{
    console.error(`Could not load in events from '${FileName}': `, err);
    throw err;
  });

function asyncDelay():Promise<void>  {
  return new Promise((resolve)=>setTimeout(()=>resolve, 200));
}

function getRandomInt(max:number) {
  return Math.floor(Math.random() * max);
}

export const handler:Handler = async ()=> {
  while(possibleEvents.length==0) {
    console.log("Warning, still waiting for events to load...");
    await asyncDelay();
  }

  console.log(`Randomly selecting from ${possibleEvents.length} possible events`);
  const selected = getRandomInt(possibleEvents.length);
  console.log(`Selected event ${selected}`);
  await sendMessage(possibleEvents[selected]);
}
