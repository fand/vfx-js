// AE: isolated Fluid/Energy density at two scales and seeds, with 1–4 octaves.
// batches of 24, 16-bit PNG. Restores bit depth and existing queue flags.
(function () {
    // Run once at1, then at2. The even samples reveal native interpolation.
    var renderScale = 1;
    var root = new Folder(
        ($.os.indexOf("Mac") >= 0 ? "/private/tmp" : Folder.temp.fsName) +
            "/vfx-js-saber-fire-fields16" + (renderScale === 1 ? "" : "-x2")
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
    base[8]=[256 * renderScale,480 * renderScale]; base[9]=[256 * renderScale,32 * renderScale];
    base[2]=1; base[86]=1; base[7]=1; base[11]=1; base[23]=0;
    base[4]=500; base[71]=100; base[72]=200 * renderScale;
    base[33]=100; base[34]=2; base[35]=2; base[36]=0;
    base[37]=0; base[38]=0; base[39]=0; base[40]=178;
    base[41]=1; base[42]=4; base[43]=1.29; base[44]=0; base[45]=5000; base[46]=0;
    add('base',2,{33:0,71:100});
    var scales=[25,178], complexities=[1,2,3,4];
    for(var type=2;type<=3;type++)for(var si=0;si<2;si++)for(var ci=0;ci<complexities.length;ci++)for(var seed=0;seed<2;seed++){
        add('t'+type+'-s'+scales[si]+'-c'+complexities[ci]+'-seed'+seed,2,{34:type,40:scales[si] * renderScale,42:complexities[ci],45:5000+100*seed,71:100});
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
                    512 * renderScale,
                    512 * renderScale,
                    1,
                    2,
                    24
                );
                comp.parentFolder = folder;
                comps.push(comp);
                var layer = comp.layers.addSolid(
                    [0, 0, 0],
                    "Saber measurement source",
                    512 * renderScale,
                    512 * renderScale,
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
                log.writeln("masks="+layer.property("ADBE Mask Parade").numProperties);
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
