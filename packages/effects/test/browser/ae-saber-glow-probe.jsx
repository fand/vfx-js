// Run with AE DoScript. Writes PNG sweeps to /private/tmp/vfx-js-saber-glow-probe
// on macOS, or Folder.temp/vfx-js-saber-glow-probe elsewhere.
// Uses a temporary 512px comp; restores project bit depth and removes owned items.
(function () {
    // AE cannot create children through macOS's /tmp symlink. Its private
    // TemporaryItems directory is also inaccessible to external analysis tools.
    var tempRoot = $.os.indexOf("Mac") >= 0 ? "/private/tmp" : Folder.temp.fsName;
    var directory = new Folder(tempRoot + "/vfx-js-saber-glow-probe");
    if (!directory.exists && !directory.create()) {
        throw new Error("Cannot create probe directory: " + directory.error);
    }
    var root = directory.fsName;
    var log = new File(root + "/log.txt");
    if (!log.open("w")) throw new Error("Cannot open probe log: " + log.error);
    var c = null,
        solid = null,
        oldBpc = app.project.bitsPerChannel;
    log.writeln(
        "project " +
            oldBpc +
            " " +
            app.project.workingSpace +
            " linearBlend=" +
            app.project.linearBlending
    );
    app.project.bitsPerChannel = 16;
    try {
        app.beginUndoGroup("Measure isolated Saber Glow");
        c = app.project.items.addComp(
            "Saber isolated Glow probe",
            512,
            512,
            1,
            2,
            24
        );
        var layer = c.layers.addSolid(
            [0, 0, 0],
            "Saber Glow probe source",
            512,
            512,
            1,
            2
        );
        solid = layer.source;
        var e = layer
            .property("ADBE Effect Parade")
            .addProperty("VIDEOCOPILOT LightSaber");
        var ids = [
            2, 3, 4, 5, 6, 7, 11, 21, 22, 23, 33, 49, 62, 66, 67, 68, 69, 70,
            71, 72, 73, 74, 75, 76, 85, 86, 87, 89
        ];
        for (var i = 0; i < ids.length; i++) {
            var p = e.property(ids[i]);
            var row = [ids[i], p.name, String(p.value)];
            try {
                row.push(p.minValue, p.maxValue);
            } catch (x) {}
            log.writeln(row.join("\t"));
        }
        var base = {
            2: 1,
            3: [1, 1, 1, 1],
            4: 50,
            5: 0.5,
            6: 0.5,
            7: 1,
            8: [256, 480],
            9: [256, 32],
            11: 1,
            21: 0,
            23: 0,
            26: 0,
            33: 0,
            49: 0,
            62: 0,
            66: 1000,
            67: 1,
            68: 1,
            69: 1,
            70: 20,
            71: 0,
            73: 0,
            75: 0,
            80: 1,
            85: 1,
            86: 0.025,
            87: 1,
            89: 2
        };
        function reset() {
            for (var k in base) e.property(Number(k)).setValue(base[k]);
        }
        function save(name, id, value) {
            reset();
            if (id) e.property(id).setValue(value);
            c.saveFrameToPng(1, new File(root + "/" + name + ".png"));
            log.writeln(
                name +
                    " actual " +
                    [
                        e.property(4).value,
                        e.property(5).value,
                        e.property(6).value,
                        e.property(66).value,
                        e.property(67).value,
                        e.property(68).value
                    ].join(",")
            );
        }
        save("base");
        save("core", 2, 0);
        var sweeps = [
            ["size", 70, [1, 2, 4, 8, 16, 32, 64, 128]],
            ["intensity", 4, [5, 10, 20, 100]],
            ["spread", 5, [0, 0.1, 0.25, 1]],
            ["bias", 6, [0, 0.1, 0.25, 0.75, 1]],
            ["mult", 66, [100, 250, 500]],
            ["size-mult", 67, [0.5, 2, 4]],
            ["layer-intensity", 69, [0.25, 0.5, 2, 4]],
            ["pre-gamma", 68, [0.5, 2, 4]],
            ["core-size", 7, [0.25, 0.5, 2, 4]]
        ];
        for (var i = 0; i < sweeps.length; i++) {
            var s = sweeps[i];
            for (var j = 0; j < s[2].length; j++) {
                save(s[0] + "-" + s[2][j], s[1], s[2][j]);
                log.writeln("saved " + s[0] + " " + s[2][j]);
            }
        }
        for (var i = 1; i < 4; i++) {
            reset();
            e.property(69).setValue(0);
            e.property(69 + 2 * i).setValue(1);
            e.property(70 + 2 * i).setValue(20);
            c.saveFrameToPng(1, new File(root + "/layer-" + (i + 1) + ".png"));
        }
        log.writeln("DONE");
    } catch (err) {
        log.writeln("ERROR " + err.toString() + " line " + err.line);
    } finally {
        if (c) c.remove();
        if (solid && solid.usedIn.length === 0) solid.remove();
        app.project.bitsPerChannel = oldBpc;
        app.endUndoGroup();
        log.close();
    }
})();
