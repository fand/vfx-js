// Schema for the js file parser to use to parse gif files
// For js object convenience (re-use), the schema objects are approximately reverse ordered

// common parsers available
var Parsers = require("./parsers");

// a set of 0x00 terminated subblocks
var subBlocks = {
    label: "blocks",
    parser: function(stream) {
        var views = [];
        var total = 0;
        var terminator = 0x00;
        for (
            var size = stream.readByte();
            size !== terminator;
            size = stream.readByte()
        ) {
            views.push(stream.readBytes(size));
            total += size;
        }
        var out = new Uint8Array(total);
        total = 0;
        for (var i = 0; i < views.length; i++) {
            out.set(views[i], total);
            total += views[i].length;
        }
        return out;
    }
};

// global control extension
var gce = {
    label: "gce",
    requires: function(stream) {
        // just peek at the top two bytes, and if true do this
        var codes = stream.peekBytes(2);
        return codes[0] === 0x21 && codes[1] === 0xf9;
    },
    parts: [
        { label: "codes", parser: Parsers.readBytes(2), skip: true },
        { label: "byteSize", parser: Parsers.readByte() },
        {
            label: "extras",
            bits: {
                future: { index: 0, length: 3 },
                disposal: { index: 3, length: 3 },
                userInput: { index: 6 },
                transparentColorGiven: { index: 7 }
            }
        },
        { label: "delay", parser: Parsers.readUnsigned(true) },
        { label: "transparentColorIndex", parser: Parsers.readByte() },
        { label: "terminator", parser: Parsers.readByte(), skip: true }
    ]
};

// image pipeline block
var image = {
    label: "image",
    requires: function(stream) {
        // peek at the next byte
        var code = stream.peekByte();
        return code === 0x2c;
    },
    parts: [
        { label: "code", parser: Parsers.readByte(), skip: true },
        {
            label: "descriptor", // image descriptor
            parts: [
                { label: "left", parser: Parsers.readUnsigned(true) },
                { label: "top", parser: Parsers.readUnsigned(true) },
                { label: "width", parser: Parsers.readUnsigned(true) },
                { label: "height", parser: Parsers.readUnsigned(true) },
                {
                    label: "lct",
                    bits: {
                        exists: { index: 0 },
                        interlaced: { index: 1 },
                        sort: { index: 2 },
                        future: { index: 3, length: 2 },
                        size: { index: 5, length: 3 }
                    }
                }
            ]
        },
        {
            label: "lct", // optional local color table
            requires: function(stream, obj, parent) {
                return parent.descriptor.lct.exists;
            },
            parser: Parsers.readArray(3, function(stream, obj, parent) {
                return Math.pow(2, parent.descriptor.lct.size + 1);
            })
        },
        {
            label: "data", // the image data blocks
            parts: [
                { label: "minCodeSize", parser: Parsers.readByte() },
                subBlocks
            ]
        }
    ]
};

// plain text block
var text = {
    label: "text",
    requires: function(stream) {
        // just peek at the top two bytes, and if true do this
        var codes = stream.peekBytes(2);
        return codes[0] === 0x21 && codes[1] === 0x01;
    },
    parts: [
        { label: "codes", parser: Parsers.readBytes(2), skip: true },
        { label: "blockSize", parser: Parsers.readByte() },
        {
            label: "preData",
            parser: function(stream, obj, parent) {
                return stream.readBytes(parent.text.blockSize);
            }
        },
        subBlocks
    ]
};

// application block
var application = {
    label: "application",
    requires: function(stream, obj, parent) {
        // make sure this frame doesn't already have a gce, text, comment, or image
        // as that means this block should be attached to the next frame
        //if(parent.gce || parent.text || parent.image || parent.comment){ return false; }

        // peek at the top two bytes
        var codes = stream.peekBytes(2);
        return codes[0] === 0x21 && codes[1] === 0xff;
    },
    parts: [
        { label: "codes", parser: Parsers.readBytes(2), skip: true },
        { label: "blockSize", parser: Parsers.readByte() },
        {
            label: "id",
            parser: function(stream, obj, parent) {
                return stream.readString(parent.blockSize);
            }
        },
        subBlocks
    ]
};

// comment block
var comment = {
    label: "comment",
    requires: function(stream, obj, parent) {
        // make sure this frame doesn't already have a gce, text, comment, or image
        // as that means this block should be attached to the next frame
        //if(parent.gce || parent.text || parent.image || parent.comment){ return false; }

        // peek at the top two bytes
        var codes = stream.peekBytes(2);
        return codes[0] === 0x21 && codes[1] === 0xfe;
    },
    parts: [
        { label: "codes", parser: Parsers.readBytes(2), skip: true },
        subBlocks
    ]
};

// frames of ext and image data
var frames = {
    label: "frames",
    parts: [gce, application, comment, image, text],
    loop: function(stream) {
        var nextCode = stream.peekByte();
        // rather than check for a terminator, we should check for the existence
        // of an ext or image block to avoid infinite loops
        //var terminator = 0x3B;
        //return nextCode !== terminator;
        return nextCode === 0x21 || nextCode === 0x2c;
    }
};

// main GIF schema
var schemaGIF = [
    {
        label: "header", // gif header
        parts: [
            { label: "signature", parser: Parsers.readString(3) },
            { label: "version", parser: Parsers.readString(3) }
        ]
    },
    {
        label: "lsd", // local screen descriptor
        parts: [
            { label: "width", parser: Parsers.readUnsigned(true) },
            { label: "height", parser: Parsers.readUnsigned(true) },
            {
                label: "gct",
                bits: {
                    exists: { index: 0 },
                    resolution: { index: 1, length: 3 },
                    sort: { index: 4 },
                    size: { index: 5, length: 3 }
                }
            },
            { label: "backgroundColorIndex", parser: Parsers.readByte() },
            { label: "pixelAspectRatio", parser: Parsers.readByte() }
        ]
    },
    {
        label: "gct", // global color table
        requires: function(stream, obj) {
            return obj.lsd.gct.exists;
        },
        parser: Parsers.readArray(3, function(stream, obj) {
            return Math.pow(2, obj.lsd.gct.size + 1);
        })
    },
    frames // content frames
];

module.exports = schemaGIF;
