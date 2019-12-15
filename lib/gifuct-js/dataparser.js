"use strict";
var ByteStream = require('./bytestream');
function DataParser(data) {
    this.stream = new ByteStream(data);
    this.output = {};
}
DataParser.prototype.parse = function (schema) {
    this.parseParts(this.output, schema);
    return this.output;
};
DataParser.prototype.parseParts = function (obj, schema) {
    for (var i = 0; i < schema.length; i++) {
        var part = schema[i];
        this.parsePart(obj, part);
    }
};
DataParser.prototype.parsePart = function (obj, part) {
    var name = part.label;
    var value;
    if (part.requires && !part.requires(this.stream, this.output, obj)) {
        return;
    }
    if (part.loop) {
        var items = [];
        while (part.loop(this.stream)) {
            var item = {};
            this.parseParts(item, part.parts);
            items.push(item);
        }
        obj[name] = items;
    }
    else if (part.parts) {
        value = {};
        this.parseParts(value, part.parts);
        obj[name] = value;
    }
    else if (part.parser) {
        value = part.parser(this.stream, this.output, obj);
        if (!part.skip) {
            obj[name] = value;
        }
    }
    else if (part.bits) {
        obj[name] = this.parseBits(part.bits);
    }
};
function bitsToNum(bitArray) {
    return bitArray.reduce(function (s, n) { return s * 2 + n; }, 0);
}
DataParser.prototype.parseBits = function (details) {
    var out = {};
    var bits = this.stream.readBitArray();
    for (var key in details) {
        var item = details[key];
        if (item.length) {
            out[key] = bitsToNum(bits.slice(item.index, item.index + item.length));
        }
        else {
            out[key] = bits[item.index];
        }
    }
    return out;
};
module.exports = DataParser;
//# sourceMappingURL=dataparser.js.map