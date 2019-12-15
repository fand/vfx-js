"use strict";
var Parsers = {
    readByte: function () {
        return function (stream) {
            return stream.readByte();
        };
    },
    readBytes: function (length) {
        return function (stream) {
            return stream.readBytes(length);
        };
    },
    readString: function (length) {
        return function (stream) {
            return stream.readString(length);
        };
    },
    readUnsigned: function (littleEndian) {
        return function (stream) {
            return stream.readUnsigned(littleEndian);
        };
    },
    readArray: function (size, countFunc) {
        return function (stream, obj, parent) {
            var count = countFunc(stream, obj, parent);
            var arr = new Array(count);
            for (var i = 0; i < count; i++) {
                arr[i] = stream.readBytes(size);
            }
            return arr;
        };
    }
};
module.exports = Parsers;
//# sourceMappingURL=parsers.js.map