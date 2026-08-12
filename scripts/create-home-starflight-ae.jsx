(function createHomeStarflightProject() {
  var root = "/Users/a1/Documents/sh网站";
  var imagePath = root + "/public/scene-assets/home-nebula-bg.png";
  var projectPath = root + "/.omx/ae/home-starflight/home-starflight.aep";
  var renderRoot = root + "/.omx/ae/home-starflight/frames";
  var logPath = root + "/.omx/ae/home-starflight/create.log";

  function log(message) {
    var file = new File(logPath);
    file.parent.create();
    file.open("a");
    file.writeln(new Date().toISOString() + " " + message);
    file.close();
  }

  function setIfExists(group, key, value) {
    var prop = group.property(key);
    if (prop) {
      prop.setValue(value);
    }
  }

  function setExprIfExists(group, key, expression) {
    var prop = group.property(key);
    if (prop && prop.canSetExpression) {
      prop.expression = expression;
    }
  }

  function addGlow(layer, radius, intensity, threshold) {
    var glow = layer.property("Effects").addProperty("ADBE Glo2");
    setIfExists(glow, "Glow Threshold", threshold);
    setIfExists(glow, "Glow Radius", radius);
    setIfExists(glow, "Glow Intensity", intensity);
    return glow;
  }

  function addComp(name, duration) {
    var comp = app.project.items.addComp(name, 3840, 2160, 1, duration, 60);
    comp.bgColor = [0.01, 0.008, 0.025];
    return comp;
  }

  function importNebula() {
    var file = new File(imagePath);
    if (!file.exists) {
      throw new Error("Missing nebula image: " + imagePath);
    }
    return app.project.importFile(new ImportOptions(file));
  }

  function addNebulaPlate(comp, footage, name, flight) {
    var layer = comp.layers.add(footage);
    layer.name = name;
    layer.threeDLayer = false;
    layer.property("Position").setValue([comp.width / 2, comp.height / 2]);
    layer.property("Scale").setValue([232, 232]);
    layer.property("Opacity").setValue(100);
    layer.property("Scale").expression = flight
      ? "var p=time/thisComp.duration; var e=1-Math.pow(1-p,3); var s=232+e*76; [s,s];"
      : "var s=238+Math.sin(time*0.42)*2.4+Math.sin(time*0.17+1.4)*1.8; [s,s];";
    layer.property("Position").expression = flight
      ? "[thisComp.width/2 - ease(time,0,thisComp.duration,0,168), thisComp.height/2 - ease(time,0,thisComp.duration,0,42)]"
      : "[thisComp.width/2 + Math.sin(time*0.12)*30, thisComp.height/2 + Math.cos(time*0.1)*20]";
    addGlow(layer, 22, 0.22, 72);
    return layer;
  }

  function addStarBurst(comp, name, flight, reverse) {
    var solid = comp.layers.addSolid([1, 1, 1], name, comp.width, comp.height, 1, comp.duration);
    solid.blendingMode = BlendingMode.ADD;
    solid.property("Opacity").setValue(flight ? 84 : 28);

    var starBurst = solid.property("Effects").addProperty("CC Star Burst");
    if (starBurst) {
      setIfExists(starBurst, "Scatter", flight ? 620 : 230);
      setIfExists(starBurst, "Speed", flight ? 1.0 : 0.12);
      setIfExists(starBurst, "Grid Spacing", flight ? 18 : 30);
      setIfExists(starBurst, "Size", flight ? 90 : 22);
      setIfExists(starBurst, "Center", [comp.width * 0.52, comp.height * 0.48]);
      var speedExpression = "0.1 + Math.sin(time*0.2)*0.025";
      if (reverse) {
        speedExpression = "linear(time,0,thisComp.duration,1.0,0.18)";
      } else if (flight) {
        speedExpression = "linear(time,0,thisComp.duration,0.18,1.0)";
      }
      setExprIfExists(starBurst, "Speed", speedExpression);
    }

    var blur = solid.property("Effects").addProperty("ADBE Directional Blur");
    setIfExists(blur, "Direction", 0);
    setIfExists(blur, "Blur Length", flight ? 16 : 2);
    addGlow(solid, flight ? 26 : 14, flight ? 0.46 : 0.22, 61);
    return solid;
  }

  function addColorPolish(comp) {
    var polish = comp.layers.addSolid([0.18, 0.08, 0.38], "magenta-cyan-breathing-polish", comp.width, comp.height, 1, comp.duration);
    polish.blendingMode = BlendingMode.SCREEN;
    polish.property("Opacity").expression = "38 + Math.sin(time*0.42)*6";
    var fractal = polish.property("Effects").addProperty("ADBE Fractal Noise");
    setIfExists(fractal, "Contrast", 86);
    setIfExists(fractal, "Brightness", -46);
    setIfExists(fractal, "Complexity", 4.5);
    setExprIfExists(fractal, "Evolution", "time*36");
    var blur = polish.property("Effects").addProperty("ADBE Fast Blur");
    setIfExists(blur, "Blurriness", 42);

    var vignette = comp.layers.addSolid([0, 0, 0], "cinematic-edge-vignette", comp.width, comp.height, 1, comp.duration);
    vignette.adjustmentLayer = false;
    vignette.property("Opacity").setValue(22);
    vignette.blendingMode = BlendingMode.MULTIPLY;
    return polish;
  }

  function queue(comp, folder, duration) {
    var rqItem = app.project.renderQueue.items.add(comp);
    rqItem.timeSpanStart = 0;
    rqItem.timeSpanDuration = duration;
    try {
      rqItem.applyTemplate("Best Settings");
    } catch (templateError) {
      log("Render settings template skipped: " + templateError.toString());
    }
    var output = rqItem.outputModule(1);
    try {
      output.applyTemplate("PNG Sequence");
    } catch (pngTemplateError) {
      log("PNG Sequence template skipped: " + pngTemplateError.toString());
    }
    output.file = new File(renderRoot + "/" + folder + "/" + folder + "_[#####].png");
  }

  app.beginUndoGroup("Create SH Home Starflight");
  try {
    app.newProject();
    var footage = importNebula();

    var idle = addComp("SH_HOME_STARFLIGHT_IDLE_4K60", 12);
    addNebulaPlate(idle, footage, "home-nebula-plate-idle", false);
    addStarBurst(idle, "cc-star-burst-idle", false, false);
    addColorPolish(idle);
    queue(idle, "idle", 12);

    var flight = addComp("SH_HOME_STARFLIGHT_FLIGHT_4K60", 10);
    addNebulaPlate(flight, footage, "home-nebula-plate-flight", true);
    addStarBurst(flight, "cc-star-burst-flight", true, false);
    addColorPolish(flight);
    queue(flight, "flight", 10);

    var reverse = addComp("SH_HOME_STARFLIGHT_REVERSE_4K60", 10);
    addNebulaPlate(reverse, footage, "home-nebula-plate-reverse", true);
    addStarBurst(reverse, "cc-star-burst-reverse", true, true);
    addColorPolish(reverse);
    queue(reverse, "reverse", 10);

    var projectFile = new File(projectPath);
    projectFile.parent.create();
    app.project.save(projectFile);
    log("Created project: " + projectPath);
  } catch (error) {
    log("ERROR: " + error.toString());
    throw error;
  } finally {
    app.endUndoGroup();
    app.quit();
  }
})();
