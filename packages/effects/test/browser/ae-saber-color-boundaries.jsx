// AE DoScriptFile: transfer, Screen, and Halo isolation. Independent comps,
// batches of 24, 16-bit PNG. Restores bit depth and existing queue flags.
(function () {
    var root = new Folder(
        ($.os.indexOf("Mac") >= 0 ? "/private/tmp" : Folder.temp.fsName) +
            "/vfx-js-saber-color-boundaries11"
    );
    if (!root.exists && !root.create()) throw new Error(root.error);
    if (!app.project) app.newProject();
    var log = new File(root.fsName + "/manifest.txt");
    if (!log.open("w")) throw new Error(log.error);
    var base = {
        2: 1,
        3: [1, 1, 1, 1],
        4: 50,
        5: 0.5,
        6: 1,
        7: 1,
        8: [256, 480],
        9: [256, 32],
        11: 1,
        21: 0,
        22: 100,
        23: 0,
        26: 0,
        33: 0,
        49: 0,
        62: 0,
        66: 100,
        67: 1,
        68: 1,
        69: 0,
        70: 20,
        71: 0,
        72: 20,
        73: 0,
        74: 20,
        75: 0,
        76: 20,
        80: 1,
        85: 1,
        86: 0.01,
        87: 1,
        89: 2
    };
    var cases = [];
    function add(name, layer, params) {
        for (var j = 0; j < 4; j++)
            if (params[69 + 2 * j] === undefined)
                params[69 + 2 * j] = layer === j + 1 ? 1 : 0;
        cases.push({ name: name, params: params });
    }
    base[86]=0.5; base[4]=50; base[66]=65; base[21]=100; base[22]=100;
    base[72]=20; base[76]=8; base[7]=1.2; base[23]=4;
    base[50]=3; base[51]=0; base[54]=0; base[55]=100; base[56]=1; base[57]=4; base[59]=0; base[60]=0;
    var colors=[[1,1,1,1],[0,0.4,1,1],[1,0.4,0,1]];
    var gammas=[0.5,1,2];
    for(var h=0;h<colors.length;h++)for(var gi=0;gi<gammas.length;gi++)for(var mode=0;mode<4;mode++) {
        var p={3:colors[h],85:gammas[gi],2:mode===0?0:1,71:mode===0?0:1,75:mode===0?0:1,49:mode>=2?20:0,62:mode===3?1:0};
        add('h'+h+'-g'+gammas[gi]+'-m'+mode,0,p);
    }
    var oldDepth = app.project.bitsPerChannel,
        prior = [],
        owned = [],
        comps = [],
        solids = [],
        folder = null;
    app.beginSuppressDialogs();
    try {
        app.project.bitsPerChannel = 16;
        log.writeln(
            "workingSpace=" +
                app.project.workingSpace +
                " linearBlend=" +
                app.project.linearBlending
        );
        for (var i = 1; i <= app.project.renderQueue.numItems; i++) {
            var item = app.project.renderQueue.item(i);
            prior.push([item, item.render]);
            if (item.render) item.render = false;
        }
        folder = app.project.items.addFolder("Saber Glow layer measurement");
        for (var first = 0; first < cases.length; first += 24) {
            for (var n = first; n < Math.min(first + 24, cases.length); n++) {
                var test = cases[n];
                var comp = app.project.items.addComp(
                    test.name,
                    512,
                    512,
                    1,
                    2,
                    24
                );
                comp.parentFolder = folder;
                comps.push(comp);
                var layer = comp.layers.addSolid(
                    [0, 0, 0],
                    "Saber measurement source",
                    512,
                    512,
                    1,
                    2
                );
                layer.source.parentFolder = folder;
                solids.push(layer.source);
                var effect = layer
                    .property("ADBE Effect Parade")
                    .addProperty("VIDEOCOPILOT LightSaber");
                for (var k in base)
                    effect.property(Number(k)).setValue(base[k]);
                for (var k in test.params)
                    effect.property(Number(k)).setValue(test.params[k]);
                log.writeln(test.name);
                for (var k in base) {
                    var property = effect.property(Number(k));
                    log.writeln(
                        String(k) +
                            "\t" +
                            String(property.name) +
                            "\t" +
                            String(property.value)
                    );
                }
                var item = app.project.renderQueue.items.add(comp);
                owned.push(item);
                item.timeSpanStart = 1;
                item.timeSpanDuration = 1 / 24;
                var output = item.outputModule(1);
                // Installed AE 2025 template exports genuine 16-bit PNG, unlike saveFrameToPng.
                output.applyTemplate("_HIDDEN X-Factor 16");
                output.file = new File(
                    root.fsName + "/" + test.name + "_[#####].png"
                );
            }
            app.project.renderQueue.render();
            for (var i = 0; i < owned.length; i++) {
                if (owned[i].status !== RQItemStatus.DONE)
                    throw new Error(
                        "Incomplete render: " + cases[first + i].name
                    );
            }
            for (var i = owned.length - 1; i >= 0; i--) owned[i].remove();
            for (var i = comps.length - 1; i >= 0; i--) comps[i].remove();
            for (var i = solids.length - 1; i >= 0; i--)
                if (solids[i].usedIn.length === 0) solids[i].remove();
            owned = [];
            comps = [];
            solids = [];
        }
        log.writeln("DONE " + cases.length);
    } catch (err) {
        log.writeln("ERROR " + err.toString() + " line " + err.line);
    } finally {
        for (var i = owned.length - 1; i >= 0; i--) owned[i].remove();
        for (var i = comps.length - 1; i >= 0; i--) comps[i].remove();
        for (var i = solids.length - 1; i >= 0; i--)
            if (solids[i].usedIn.length === 0) solids[i].remove();
        if (folder) folder.remove();
        for (var i = 0; i < prior.length; i++) {
            try {
                prior[i][0].render = prior[i][1];
            } catch (ignore) {}
        }
        app.project.bitsPerChannel = oldDepth;
        app.endSuppressDialogs(false);
        log.close();
    }
})();
