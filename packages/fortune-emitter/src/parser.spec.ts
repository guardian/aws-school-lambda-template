import {Readable} from "stream";
import {parse} from "./parser";

describe('parse', () => {
  it("should extract EventData objects from the string based on % delimiters", async ()=>{
    const testData = `this is a line
%
this is another line
this is a third line
%`;

    const s = new ReadableStream({
      start(controller) {
        return pump();
        function pump() {
          controller.enqueue(testData);
          controller.close();
          return;
        }
      }
    });


    const data = await parse("test",s);

    expect(data.length).toEqual(2);
    expect(data[0].content).toEqual("this is a line\n");
    expect(data[1].content).toEqual("this is another line\nthis is a third line\n");
  })
});
