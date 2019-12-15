export = DataParser;
declare function DataParser(data: any): void;
declare class DataParser {
    constructor(data: any);
    stream: import("./bytestream");
    output: {};
    parse(schema: any): {};
    parseParts(obj: any, schema: any): void;
    parsePart(obj: any, part: any): void;
    parseBits(details: any): {};
}
