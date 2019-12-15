"use strict";
const DataParser = require("./dataparser");
const gifSchema = require("./schema");
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
        var available, clear, code_mask, code_size, count, end_of_information, in_code, old_code, bits, code, i, datum, data_size, first, top, bi, pi;
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
                if (code > available || code == end_of_information) {
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
                    if ((available & code_mask) === 0 &&
                        available < MAX_STACK_SIZE) {
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
            patchData[pos + 3] =
                colorIndex !== image.transparentIndex ? 255 : 0;
        }
        return patchData;
    }
};
GIF.prototype.decompressFrames = function (buildPatch, startFrame, endFrame) {
    if (startFrame === undefined) {
        startFrame = 0;
    }
    if (endFrame === undefined) {
        endFrame = this.raw.frames.length;
    }
    else {
        endFrame = Math.min(endFrame, this.raw.frames.length);
    }
    var frames = [];
    for (var i = startFrame; i < endFrame; i++) {
        var frame = this.raw.frames[i];
        if (frame.image) {
            frames.push(this.decompressFrame(i, buildPatch));
        }
    }
    return frames;
};
module.exports = GIF;
//# sourceMappingURL=gif.js.map