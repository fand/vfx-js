// AE DoScriptFile: transfer, Screen, and Halo isolation. Independent comps,
// batches of 24, 16-bit PNG. Restores bit depth and existing queue flags.
(function () {
    var root = new Folder(
        ($.os.indexOf("Mac") >= 0 ? "/private/tmp" : Folder.temp.fsName) +
            "/vfx-js-saber-glow-transfer"
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
    var gains = [10, 25, 50, 75, 100, 150, 200, 300, 400];
    for (var l = 1; l <= 4; l++)
        for (var i = 0; i < gains.length; i++)
            add("L" + l + "-gain" + gains[i], l, {
                66: gains[i],
                21: l === 4 ? 100 : 0
            });
    var factors = [0.1, 0.2, 0.4, 1, 2];
    for (var i = 0; i < factors.length; i++) {
        var v = factors[i];
        add("GI-match" + v, 2, { 4: 50 * v, 66: 100 / v });
        add("LI-match" + v, 2, { 71: v, 66: 100 / v });
    }
    var gains = [20, 100, 300],
        brightness = [0.005, 0.05, 0.5];
    for (var l = 1; l <= 2; l++)
        for (var i = 0; i < gains.length; i++)
            for (var j = 0; j < brightness.length; j++)
                add("L" + l + "-gain" + gains[i] + "-out" + brightness[j], l, {
                    66: gains[i],
                    86: brightness[j]
                });
    var halos = [0, 25, 50, 100, 200, 400];
    for (var i = 0; i < halos.length; i++) {
        var h = halos[i];
        add("halo" + h + "-none", 0, { 21: h, 86: 0.1 });
        add("halo" + h + "-L4", 4, { 21: h, 86: 0.1 });
        add("halo" + h + "-disabled", 0, { 21: h, 2: 0, 86: 0.1 });
    }
    var sizes = [0, 1, 10, 50, 100, 200],
        layers = [1, 5, 20, 80];
    for (var i = 0; i < sizes.length; i++)
        for (var j = 0; j < layers.length; j++)
            add("haloSize" + sizes[i] + "-layerSize" + layers[j], 4, {
                21: 100,
                22: sizes[i],
                76: layers[j],
                86: 0.1
            });
    for (var l = 1; l <= 3; l++)
        for (var h = 100; h <= 400; h *= 4)
            add("L" + l + "-halo" + h, l, { 21: h });
    var slots = [1, 2, 4],
        colors = [0.25, 0.5, 1],
        gains = [50, 100, 200],
        gammas = [0.5, 2];
    for (var k = 0; k < slots.length; k++) {
        var l = slots[k];
        for (var i = 0; i < colors.length; i++)
            for (var j = 0; j < gains.length; j++)
                add("L" + l + "-color" + colors[i] + "-gain" + gains[j], l, {
                    3: [colors[i], colors[i], colors[i], 1],
                    66: gains[j],
                    21: 100
                });
        for (var i = 0; i < gammas.length; i++)
            for (var j = 0; j < gains.length; j++)
                add("L" + l + "-gamma" + gammas[i] + "-gain" + gains[j], l, {
                    68: gammas[i],
                    66: gains[j],
                    21: 100
                });
    }
    for (var i = 0; i < gains.length; i++) {
        add("all-gain" + gains[i], 0, {
            66: gains[i],
            21: 100,
            69: 1,
            71: 1,
            73: 1,
            75: 1
        });
        add("pair-gain" + gains[i], 0, { 66: gains[i], 21: 100, 69: 1, 71: 1 });
        add("none-gain" + gains[i], 0, { 66: gains[i], 21: 100 });
    }
    // Held-out radii and amplitudes, plus output-grade / distortion probes.
    var brightness = [0.01, 0.1, 0.5, 1],
        gammas = [0.5, 1, 2];
    for (var i = 0; i < brightness.length; i++)
        for (var j = 0; j < gammas.length; j++)
            add(
                "validation-brightness" + brightness[i] + "-gamma" + gammas[j],
                4,
                { 21: 100, 86: brightness[i], 85: gammas[j] }
            );
    var sizes = [8, 32, 64],
        gains = [25, 75, 150, 300];
    for (var k = 0; k < slots.length; k++)
        for (var i = 0; i < sizes.length; i++)
            for (var j = 0; j < gains.length; j++) {
                var l = slots[k],
                    params = { 21: 100, 66: gains[j], 86: 0.01 };
                params[70 + 2 * (l - 1)] = sizes[i];
                add(
                    "validation-L" +
                        l +
                        "-size" +
                        sizes[i] +
                        "-gain" +
                        gains[j],
                    l,
                    params
                );
            }
    var slots = [1, 4],
        amounts = [0, 50],
        types = [1, 3];
    for (var k = 0; k < slots.length; k++)
        for (var i = 0; i < amounts.length; i++)
            for (var j = 0; j < types.length; j++)
                add(
                    "validation-L" +
                        slots[k] +
                        "-distort" +
                        amounts[i] +
                        "-type" +
                        types[j],
                    slots[k],
                    { 21: 100, 33: amounts[i], 34: types[j], 86: 0.5 }
                );
    var halos = [50, 100, 200],
        gains = [50, 100, 200];
    for (var i = 0; i < halos.length; i++)
        for (var j = 0; j < gains.length; j++)
            add("validation-halo" + halos[i] + "-gain" + gains[j], 4, {
                21: halos[i],
                66: gains[j],
                86: 0.1
            });
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
