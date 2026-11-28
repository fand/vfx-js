// AE: Fire text, isolate Core width, Bias, and wind blur at four octaves.
// batches of 24, 16-bit PNG. Restores bit depth and existing queue flags.
(function () {
    var root = new Folder(
        ($.os.indexOf("Mac") >= 0 ? "/private/tmp" : Folder.temp.fsName) +
            "/vfx-js-saber-fire-core14"
    );
    if (!root.exists && !root.create()) throw new Error(root.error);
    if (!app.project) app.newProject();
    var log = new File(root.fsName + "/manifest.txt");
    if (!log.open("w")) throw new Error(log.error);
    var base = {};
    var cases = [];
    function add(name, params) { cases.push({ name:name, params:params }); }
    add('native-full4',{1:10,42:4,57:4,89:2});
    var widths=[1,10.3];
    for(var i=0;i<widths.length;i++) {
        add('core'+widths[i]+'-steady',{1:10,2:0,49:0,57:4,7:widths[i],89:2});
        add('core'+widths[i]+'-blur',{1:10,2:0,57:4,7:widths[i],89:2});
        add('core'+widths[i]+'-sharp',{1:10,2:0,57:4,7:widths[i],59:0,89:2});
        add('core'+widths[i]+'-bias1',{1:10,2:0,57:4,7:widths[i],56:1,59:0,89:2});
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
                    960,
                    540,
                    1,
                    3,
                    24
                );
                comp.parentFolder = folder;
                comps.push(comp);
                var layer = comp.layers.addSolid(
                    [0, 0, 0],
                    "Saber measurement source",
                    960,
                    540,
                    1,
                    3
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
                var txt = comp.layers.addText("Saber");
                var tp = txt.property("ADBE Text Properties").property("ADBE Text Document"), td=tp.value;
                td.font="Helvetica-Bold"; td.fontSize=160; td.applyFill=true; td.fillColor=[1,1,1]; td.applyStroke=false; tp.setValue(td);
                var rect=txt.sourceRectAtTime(0,false);txt.property("ADBE Transform Group").property("ADBE Position").setValue([480-rect.left-rect.width/2,270-rect.top-rect.height/2]);
                effect.property(11).setValue(3);effect.property(12).setValue(txt.index);txt.enabled=false;
                log.writeln(test.name);
                for (var k=1;k<94;k++) {
                    var property = effect.property(Number(k));
                    if(property.propertyType !== PropertyType.PROPERTY || property.propertyValueType === PropertyValueType.NO_VALUE) continue;
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
                item.timeSpanStart = 2;
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
