"use strict";
(function e(t, n, r) {
    function s(o, u) {
        if (!n[o]) {
            if (!t[o]) {
                var a = typeof require == "function" && require;
                if (!u && a)
                    return a(o, !0);
                if (i)
                    return i(o, !0);
                var f = new Error("Cannot find module '" + o + "'");
                throw f.code = "MODULE_NOT_FOUND", f;
            }
            var l = n[o] = { exports: {} };
            t[o][0].call(l.exports, function (e) { var n = t[o][1][e]; return s(n ? n : e); }, l, l.exports, e, t, n, r);
        }
        return n[o].exports;
    }
    var i = typeof require == "function" && require;
    for (var o = 0; o < r.length; o++)
        s(r[o]);
    return s;
})({
    1: [function (require, module, exports) {
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
                var bytes = new Array(n);
                for (var i = 0; i < n; i++) {
                    bytes[i] = this.readByte();
                }
                return bytes;
            };
            ByteStream.prototype.peekBytes = function (n) {
                var bytes = new Array(n);
                for (var i = 0; i < n; i++) {
                    bytes[i] = this.data[this.pos + i];
                }
                return bytes;
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
        }, {}], 2: [function (require, module, exports) {
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
        }, { "./bytestream": 1 }], 3: [function (require, module, exports) {
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
        }, {}], 4: [function (require, module, exports) {
            var GIF = window.GIF || {};
            GIF = require('./gif');
            window.GIF = GIF;
        }, { "./gif": 5 }], 5: [function (require, module, exports) {
            var DataParser = require('../bower_components/js-binary-schema-parser/src/dataparser');
            var gifSchema = require('./schema');
            function GIF(arrayBuffer) {
                var byteData = new Uint8Array(arrayBuffer);
                var parser = new DataParser(byteData);
                this.raw = parser.parse(gifSchema);
                this.raw.hasImages = false;
                for (var f = 0; f < this.raw.frames.length; f++) {
                    if (this.raw.frames[f].image) {
                        this.raw.hasImages = true;
                        break;
                    }
                }
            }
            GIF.prototype.decompressFrame = function (index, buildPatch) {
                if (index >= this.raw.frames.length) {
                    return null;
                }
                var frame = this.raw.frames[index];
                if (frame.image) {
                    var totalPixels = frame.image.descriptor.width * frame.image.descriptor.height;
                    var pixels = lzw(frame.image.data.minCodeSize, frame.image.data.blocks, totalPixels);
                    if (frame.image.descriptor.lct.interlaced) {
                        pixels = deinterlace(pixels, frame.image.descriptor.width);
                    }
                    var image = {
                        pixels: pixels,
                        dims: {
                            top: frame.image.descriptor.top,
                            left: frame.image.descriptor.left,
                            width: frame.image.descriptor.width,
                            height: frame.image.descriptor.height
                        }
                    };
                    if (frame.image.descriptor.lct && frame.image.descriptor.lct.exists) {
                        image.colorTable = frame.image.lct;
                    }
                    else {
                        image.colorTable = this.raw.gct;
                    }
                    if (frame.gce) {
                        image.delay = (frame.gce.delay || 10) * 10;
                        image.disposalType = frame.gce.extras.disposal;
                        if (frame.gce.extras.transparentColorGiven) {
                            image.transparentIndex = frame.gce.transparentColorIndex;
                        }
                    }
                    if (buildPatch) {
                        image.patch = generatePatch(image);
                    }
                    return image;
                }
                return null;
                function lzw(minCodeSize, data, pixelCount) {
                    var MAX_STACK_SIZE = 4096;
                    var nullCode = -1;
                    var npix = pixelCount;
                    var available, clear, code_mask, code_size, end_of_information, in_code, old_code, bits, code, i, datum, data_size, first, top, bi, pi;
                    var dstPixels = new Array(pixelCount);
                    var prefix = new Array(MAX_STACK_SIZE);
                    var suffix = new Array(MAX_STACK_SIZE);
                    var pixelStack = new Array(MAX_STACK_SIZE + 1);
                    data_size = minCodeSize;
                    clear = 1 << data_size;
                    end_of_information = clear + 1;
                    available = clear + 2;
                    old_code = nullCode;
                    code_size = data_size + 1;
                    code_mask = (1 << code_size) - 1;
                    for (code = 0; code < clear; code++) {
                        prefix[code] = 0;
                        suffix[code] = code;
                    }
                    datum = bits = count = first = top = pi = bi = 0;
                    for (i = 0; i < npix;) {
                        if (top === 0) {
                            if (bits < code_size) {
                                datum += data[bi] << bits;
                                bits += 8;
                                bi++;
                                continue;
                            }
                            code = datum & code_mask;
                            datum >>= code_size;
                            bits -= code_size;
                            if ((code > available) || (code == end_of_information)) {
                                break;
                            }
                            if (code == clear) {
                                code_size = data_size + 1;
                                code_mask = (1 << code_size) - 1;
                                available = clear + 2;
                                old_code = nullCode;
                                continue;
                            }
                            if (old_code == nullCode) {
                                pixelStack[top++] = suffix[code];
                                old_code = code;
                                first = code;
                                continue;
                            }
                            in_code = code;
                            if (code == available) {
                                pixelStack[top++] = first;
                                code = old_code;
                            }
                            while (code > clear) {
                                pixelStack[top++] = suffix[code];
                                code = prefix[code];
                            }
                            first = suffix[code] & 0xff;
                            pixelStack[top++] = first;
                            if (available < MAX_STACK_SIZE) {
                                prefix[available] = old_code;
                                suffix[available] = first;
                                available++;
                                if (((available & code_mask) === 0) && (available < MAX_STACK_SIZE)) {
                                    code_size++;
                                    code_mask += available;
                                }
                            }
                            old_code = in_code;
                        }
                        top--;
                        dstPixels[pi++] = pixelStack[top];
                        i++;
                    }
                    for (i = pi; i < npix; i++) {
                        dstPixels[i] = 0;
                    }
                    return dstPixels;
                }
                function deinterlace(pixels, width) {
                    var newPixels = new Array(pixels.length);
                    var rows = pixels.length / width;
                    var cpRow = function (toRow, fromRow) {
                        var fromPixels = pixels.slice(fromRow * width, (fromRow + 1) * width);
                        newPixels.splice.apply(newPixels, [toRow * width, width].concat(fromPixels));
                    };
                    var offsets = [0, 4, 2, 1];
                    var steps = [8, 8, 4, 2];
                    var fromRow = 0;
                    for (var pass = 0; pass < 4; pass++) {
                        for (var toRow = offsets[pass]; toRow < rows; toRow += steps[pass]) {
                            cpRow(toRow, fromRow);
                            fromRow++;
                        }
                    }
                    return newPixels;
                }
                function generatePatch(image) {
                    var totalPixels = image.pixels.length;
                    var patchData = new Uint8ClampedArray(totalPixels * 4);
                    for (var i = 0; i < totalPixels; i++) {
                        var pos = i * 4;
                        var colorIndex = image.pixels[i];
                        var color = image.colorTable[colorIndex];
                        patchData[pos] = color[0];
                        patchData[pos + 1] = color[1];
                        patchData[pos + 2] = color[2];
                        patchData[pos + 3] = colorIndex !== image.transparentIndex ? 255 : 0;
                    }
                    return patchData;
                }
            };
            GIF.prototype.decompressFrames = function (buildPatch) {
                var frames = [];
                for (var i = 0; i < this.raw.frames.length; i++) {
                    var frame = this.raw.frames[i];
                    if (frame.image) {
                        frames.push(this.decompressFrame(i, buildPatch));
                    }
                }
                return frames;
            };
            module.exports = GIF;
        }, { "../bower_components/js-binary-schema-parser/src/dataparser": 2, "./schema": 6 }], 6: [function (require, module, exports) {
            var Parsers = require('../bower_components/js-binary-schema-parser/src/parsers');
            var subBlocks = {
                label: 'blocks',
                parser: function (stream) {
                    var out = [];
                    var terminator = 0x00;
                    for (var size = stream.readByte(); size !== terminator; size = stream.readByte()) {
                        out = out.concat(stream.readBytes(size));
                    }
                    return out;
                }
            };
            var gce = {
                label: 'gce',
                requires: function (stream) {
                    var codes = stream.peekBytes(2);
                    return codes[0] === 0x21 && codes[1] === 0xF9;
                },
                parts: [
                    { label: 'codes', parser: Parsers.readBytes(2), skip: true },
                    { label: 'byteSize', parser: Parsers.readByte() },
                    { label: 'extras', bits: {
                            future: { index: 0, length: 3 },
                            disposal: { index: 3, length: 3 },
                            userInput: { index: 6 },
                            transparentColorGiven: { index: 7 }
                        } },
                    { label: 'delay', parser: Parsers.readUnsigned(true) },
                    { label: 'transparentColorIndex', parser: Parsers.readByte() },
                    { label: 'terminator', parser: Parsers.readByte(), skip: true }
                ]
            };
            var image = {
                label: 'image',
                requires: function (stream) {
                    var code = stream.peekByte();
                    return code === 0x2C;
                },
                parts: [
                    { label: 'code', parser: Parsers.readByte(), skip: true },
                    {
                        label: 'descriptor',
                        parts: [
                            { label: 'left', parser: Parsers.readUnsigned(true) },
                            { label: 'top', parser: Parsers.readUnsigned(true) },
                            { label: 'width', parser: Parsers.readUnsigned(true) },
                            { label: 'height', parser: Parsers.readUnsigned(true) },
                            { label: 'lct', bits: {
                                    exists: { index: 0 },
                                    interlaced: { index: 1 },
                                    sort: { index: 2 },
                                    future: { index: 3, length: 2 },
                                    size: { index: 5, length: 3 }
                                } }
                        ]
                    }, {
                        label: 'lct',
                        requires: function (stream, obj, parent) {
                            return parent.descriptor.lct.exists;
                        },
                        parser: Parsers.readArray(3, function (stream, obj, parent) {
                            return Math.pow(2, parent.descriptor.lct.size + 1);
                        })
                    }, {
                        label: 'data',
                        parts: [
                            { label: 'minCodeSize', parser: Parsers.readByte() },
                            subBlocks
                        ]
                    }
                ]
            };
            var text = {
                label: 'text',
                requires: function (stream) {
                    var codes = stream.peekBytes(2);
                    return codes[0] === 0x21 && codes[1] === 0x01;
                },
                parts: [
                    { label: 'codes', parser: Parsers.readBytes(2), skip: true },
                    { label: 'blockSize', parser: Parsers.readByte() },
                    {
                        label: 'preData',
                        parser: function (stream, obj, parent) {
                            return stream.readBytes(parent.text.blockSize);
                        }
                    },
                    subBlocks
                ]
            };
            var application = {
                label: 'application',
                requires: function (stream, obj, parent) {
                    var codes = stream.peekBytes(2);
                    return codes[0] === 0x21 && codes[1] === 0xFF;
                },
                parts: [
                    { label: 'codes', parser: Parsers.readBytes(2), skip: true },
                    { label: 'blockSize', parser: Parsers.readByte() },
                    {
                        label: 'id',
                        parser: function (stream, obj, parent) {
                            return stream.readString(parent.blockSize);
                        }
                    },
                    subBlocks
                ]
            };
            var comment = {
                label: 'comment',
                requires: function (stream, obj, parent) {
                    var codes = stream.peekBytes(2);
                    return codes[0] === 0x21 && codes[1] === 0xFE;
                },
                parts: [
                    { label: 'codes', parser: Parsers.readBytes(2), skip: true },
                    subBlocks
                ]
            };
            var frames = {
                label: 'frames',
                parts: [
                    gce,
                    application,
                    comment,
                    image,
                    text
                ],
                loop: function (stream) {
                    var nextCode = stream.peekByte();
                    return nextCode === 0x21 || nextCode === 0x2C;
                }
            };
            var schemaGIF = [
                {
                    label: 'header',
                    parts: [
                        { label: 'signature', parser: Parsers.readString(3) },
                        { label: 'version', parser: Parsers.readString(3) }
                    ]
                }, {
                    label: 'lsd',
                    parts: [
                        { label: 'width', parser: Parsers.readUnsigned(true) },
                        { label: 'height', parser: Parsers.readUnsigned(true) },
                        { label: 'gct', bits: {
                                exists: { index: 0 },
                                resolution: { index: 1, length: 3 },
                                sort: { index: 4 },
                                size: { index: 5, length: 3 }
                            } },
                        { label: 'backgroundColorIndex', parser: Parsers.readByte() },
                        { label: 'pixelAspectRatio', parser: Parsers.readByte() }
                    ]
                }, {
                    label: 'gct',
                    requires: function (stream, obj) {
                        return obj.lsd.gct.exists;
                    },
                    parser: Parsers.readArray(3, function (stream, obj) {
                        return Math.pow(2, obj.lsd.gct.size + 1);
                    })
                },
                frames
            ];
            module.exports = schemaGIF;
        }, { "../bower_components/js-binary-schema-parser/src/parsers": 3 }]
}, {}, [4]);
//# sourceMappingURL=gifuct-js.js.map