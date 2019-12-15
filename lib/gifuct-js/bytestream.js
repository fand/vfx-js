"use strict";
function ByteStream(data) {
    this.data = data;
    this.pos = 0;
}
ByteStream.prototype.readByte = function () {
    return this.data[this.pos++];
};
ByteStream.prototype.peekByte = function () {
    return this.data[this.pos];
};
ByteStream.prototype.readBytes = function (n) {
    return this.data.subarray(this.pos, this.pos += n);
};
ByteStream.prototype.peekBytes = function (n) {
    return this.data.subarray(this.pos, this.pos + n);
};
ByteStream.prototype.readString = function (len) {
    var str = '';
    for (var i = 0; i < len; i++) {
        str += String.fromCharCode(this.readByte());
    }
    return str;
};
ByteStream.prototype.readBitArray = function () {
    var arr = [];
    var bite = this.readByte();
    for (var i = 7; i >= 0; i--) {
        arr.push(!!(bite & (1 << i)));
    }
    return arr;
};
ByteStream.prototype.readUnsigned = function (littleEndian) {
    var a = this.readBytes(2);
    if (littleEndian) {
        return (a[1] << 8) + a[0];
    }
    else {
        return (a[0] << 8) + a[1];
    }
};
module.exports = ByteStream;
//# sourceMappingURL=bytestream.js.map