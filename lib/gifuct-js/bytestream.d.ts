export = ByteStream;
declare function ByteStream(data: any): void;
declare class ByteStream {
    constructor(data: any);
    data: any;
    pos: number;
    readByte(): any;
    peekByte(): any;
    readBytes(n: any): any;
    peekBytes(n: any): any;
    readString(len: any): string;
    readBitArray(): boolean[];
    readUnsigned(littleEndian: any): any;
}
