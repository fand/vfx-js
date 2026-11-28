// AE DoScriptFile: independent 16-bpc line probes; no preset fitting.
// PNG output: /private/tmp/vfx-js-saber-glow-layers on macOS.
(function () {
    var root = new Folder(($.os.indexOf("Mac") >= 0 ? "/private/tmp" : Folder.temp.fsName) + "/vfx-js-saber-glow-layers");
    if (!root.exists && !root.create()) throw new Error(root.error);
    if (!app.project) app.newProject();
    var log = new File(root.fsName + "/manifest.txt");
    if (!log.open("w")) throw new Error(log.error);
    var base = {
        2: 1, 3: [1, 1, 1, 1], 4: 5, 5: 0.5, 6: 1, 7: 1,
        8: [256, 480], 9: [256, 32], 11: 1, 21: 100, 22: 100,
        23: 0, 26: 0, 33: 0, 49: 0, 62: 0, 66: 100, 67: 1,
        68: 1, 69: 0, 70: 20, 71: 0, 72: 20, 73: 0, 74: 20,
        75: 0, 76: 20, 80: 1, 85: 1, 86: 0.1, 87: 1, 89: 2
    };
    var cases = [];
    function add(name, weights, params) {
        for (var i = 0; i < 4; i++) params[69 + i * 2] = weights[i];
        cases.push({ name: name, params: params });
    }
    var biases = [0, 0.1, 0.25, 0.5, 0.6, 0.75, 1, 1.5, 2, 3, 4];
    for (var i = 0; i < 4; i++) {
        var w = [0, 0, 0, 0]; w[i] = 1;
        for (var b = 0; b < biases.length; b++) add("L" + (i + 1) + "-bias-" + biases[b], w, { 6: biases[b] });
    }
    var combinations = [
        ["none", [0, 0, 0, 0]], ["L1", [1, 0, 0, 0]],
        ["L2", [0, 1, 0, 0]], ["L3", [0, 0, 1, 0]],
        ["L4", [0, 0, 0, 1]], ["all", [1, 1, 1, 1]],
        ["half2", [0, 0.5, 0, 0]], ["half3", [0, 0, 0.5, 0]],
        ["split23", [0, 0.5, 0.5, 0]], ["pair23", [0, 1, 1, 0]]
    ];
    var gammas = [0.5, 1, 2];
    for (var g = 0; g < gammas.length; g++) {
        for (var i = 0; i < combinations.length; i++) {
            add(combinations[i][0] + "-gamma-" + gammas[g], combinations[i][1], { 4: 50, 68: gammas[g] });
        }
    }
    for (var h = 0; h <= 100; h += 100) {
        add("halo-" + h + "-none", [0, 0, 0, 0], { 21: h });
        add("halo-" + h + "-L4", [0, 0, 0, 100], { 21: h });
    }
    var oldDepth = app.project.bitsPerChannel, prior = [], owned = [], comps = [], solids = [], folder = null;
    app.beginSuppressDialogs();
    try {
        app.project.bitsPerChannel = 16;
        log.writeln("workingSpace=" + app.project.workingSpace + " linearBlend=" + app.project.linearBlending);
        for (var i = 1; i <= app.project.renderQueue.numItems; i++) {
            var item = app.project.renderQueue.item(i);
            prior.push([item, item.render]); if (item.render) item.render = false;
        }
        folder = app.project.items.addFolder("Saber Glow layer measurement");
        for (var n = 0; n < cases.length; n++) {
            var test = cases[n];
            var comp = app.project.items.addComp(test.name, 512, 512, 1, 2, 24);
            comp.parentFolder = folder; comps.push(comp);
            var layer = comp.layers.addSolid([0, 0, 0], "Saber measurement source", 512, 512, 1, 2);
            layer.source.parentFolder = folder; solids.push(layer.source);
            var effect = layer.property("ADBE Effect Parade").addProperty("VIDEOCOPILOT LightSaber");
            for (var k in base) effect.property(Number(k)).setValue(base[k]);
            for (var k in test.params) effect.property(Number(k)).setValue(test.params[k]);
            log.writeln(test.name);
            for (var k in base) log.writeln(k + "\t" + effect.property(Number(k)).name + "\t" + effect.property(Number(k)).value);
            var item = app.project.renderQueue.items.add(comp); owned.push(item);
            item.timeSpanStart = 1; item.timeSpanDuration = 1 / 24;
            var output = item.outputModule(1);
            // Installed AE 2025 template exports genuine 16-bit PNG, unlike saveFrameToPng.
            output.applyTemplate("_HIDDEN X-Factor 16");
            output.file = new File(root.fsName + "/" + test.name + "_[#####].png");
        }
        app.project.renderQueue.render();
        for (var i = 0; i < owned.length; i++) {
            if (owned[i].status !== RQItemStatus.DONE) throw new Error("Incomplete render: " + cases[i].name);
        }
        log.writeln("DONE " + cases.length);
    } catch (err) {
        log.writeln("ERROR " + err.toString() + " line " + err.line);
    } finally {
        for (var i = owned.length - 1; i >= 0; i--) owned[i].remove();
        for (var i = comps.length - 1; i >= 0; i--) comps[i].remove();
        for (var i = solids.length - 1; i >= 0; i--) if (solids[i].usedIn.length === 0) solids[i].remove();
        if (folder) folder.remove();
        for (var i = 0; i < prior.length; i++) { try { prior[i][0].render = prior[i][1]; } catch (ignore) {} }
        app.project.bitsPerChannel = oldDepth;
        app.endSuppressDialogs(false);
        log.close();
    }
}());
