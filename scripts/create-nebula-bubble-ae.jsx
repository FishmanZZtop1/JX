(function createNebulaBubbleProject() {
  var projectPath = "/Users/a1/Documents/sh网站/.omx/ae/nebula-bubble/nebula-bubble.aep";
  var framePath = "/Users/a1/Documents/sh网站/.omx/ae/nebula-bubble/frames/nebula-bubble_[#####].png";
  var logPath = "/Users/a1/Documents/sh网站/.omx/ae/nebula-bubble/create.log";

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

  function addEllipseMask(layer, name, cx, cy, rx, ry, feather, opacity) {
    var mask = layer.Masks.addProperty("Mask");
    mask.name = name;
    var shape = new Shape();
    var k = 0.5522847498;
    shape.vertices = [
      [cx, cy - ry],
      [cx + rx, cy],
      [cx, cy + ry],
      [cx - rx, cy]
    ];
    shape.inTangents = [
      [-rx * k, 0],
      [0, -ry * k],
      [rx * k, 0],
      [0, ry * k]
    ];
    shape.outTangents = [
      [rx * k, 0],
      [0, ry * k],
      [-rx * k, 0],
      [0, -ry * k]
    ];
    shape.closed = true;
    mask.property("maskShape").setValue(shape);
    mask.property("maskFeather").setValue([feather, feather]);
    mask.property("maskOpacity").setValue(opacity);
    return mask;
  }

  function addSolid(comp, name, color, opacity, blendMode) {
    var layer = comp.layers.addSolid(color, name, comp.width, comp.height, 1, comp.duration);
    layer.property("Opacity").setValue(opacity);
    layer.blendingMode = blendMode;
    return layer;
  }

  function addFractal(layer, contrast, brightness, scale, complexity, evolutionRate) {
    var effects = layer.property("Effects");
    var fractal = effects.addProperty("ADBE Fractal Noise");
    setIfExists(fractal, "Contrast", contrast);
    setIfExists(fractal, "Brightness", brightness);
    setIfExists(fractal, "Complexity", complexity);
    var transform = fractal.property("Transform");
    if (transform) {
      setIfExists(transform, "Scale", scale);
      setExprIfExists(transform, "Offset Turbulence", [
        "var t = time;",
        "[960 + Math.sin(t * 0.17) * 42, 540 + Math.cos(t * 0.13) * 36]"
      ].join("\n"));
    }
    setExprIfExists(fractal, "Evolution", "time * " + evolutionRate);
    return fractal;
  }

  function addTurbulence(layer, amount, size, evolutionRate) {
    var turb = layer.property("Effects").addProperty("ADBE Turbulent Displace");
    setIfExists(turb, "Amount", amount);
    setIfExists(turb, "Size", size);
    setIfExists(turb, "Complexity", 2.2);
    setExprIfExists(turb, "Evolution", "time * " + evolutionRate);
    return turb;
  }

  function addGlow(layer, radius, intensity) {
    var glow = layer.property("Effects").addProperty("ADBE Glo2");
    setIfExists(glow, "Glow Threshold", 52);
    setIfExists(glow, "Glow Radius", radius);
    setIfExists(glow, "Glow Intensity", intensity);
    return glow;
  }

  app.beginUndoGroup("Create SH Nebula Bubble");
  try {
    app.newProject();
    var comp = app.project.items.addComp("SH_Nebula_Bubble_Overlay", 1920, 1080, 1, 10, 30);
    comp.bgColor = [0, 0, 0];

    var base = addSolid(comp, "deep-black-screen-base", [0, 0, 0], 100, BlendingMode.NORMAL);
    base.locked = true;

    var bubble = addSolid(comp, "main-transparent-nebula-bubble", [0.18, 0.48, 0.92], 64, BlendingMode.ADD);
    bubble.property("Scale").expression = [
      "var s = 100 + Math.sin(time * 0.62) * 2.2 + Math.sin(time * 0.21) * 1.6;",
      "[s, s]"
    ].join("\n");
    bubble.property("Rotation").expression = "Math.sin(time * 0.18) * 2.8 + time * 0.65";
    addEllipseMask(bubble, "outer smoke shell", 820, 508, 500, 410, 118, 64);
    addEllipseMask(bubble, "lower wrap plume", 910, 705, 438, 255, 148, 52);
    addFractal(bubble, 142, -36, 330, 6.6, 42);
    addTurbulence(bubble, 32, 168, 38);
    addGlow(bubble, 92, 0.52);

    var rim = addSolid(comp, "magenta-cyan-breathing-rim", [0.88, 0.16, 0.72], 42, BlendingMode.ADD);
    rim.property("Scale").expression = [
      "var sx = 100 + Math.sin(time * 0.42 + 1.7) * 2.4;",
      "var sy = 100 + Math.cos(time * 0.36) * 1.9;",
      "[sx, sy]"
    ].join("\n");
    rim.property("Rotation").expression = "time * -0.42 + Math.sin(time * 0.25) * 3.5";
    addEllipseMask(rim, "thin living rim", 806, 492, 565, 455, 54, 46);
    addEllipseMask(rim, "left sweep", 625, 630, 410, 200, 92, 34);
    addFractal(rim, 220, -74, 205, 5.4, 58);
    addTurbulence(rim, 42, 112, 52);
    addGlow(rim, 118, 0.75);

    var cyan = addSolid(comp, "cyan-inner-ionized-veil", [0.05, 0.72, 1.0], 34, BlendingMode.ADD);
    cyan.property("Position").expression = [
      "var x = 960 + Math.sin(time * 0.23) * 22;",
      "var y = 540 + Math.cos(time * 0.19) * 16;",
      "[x, y]"
    ].join("\n");
    cyan.property("Rotation").expression = "Math.sin(time * 0.31) * 3.4";
    addEllipseMask(cyan, "blue core atmosphere", 870, 530, 410, 330, 165, 54);
    addFractal(cyan, 118, -22, 430, 5.8, 34);
    addTurbulence(cyan, 24, 205, 29);
    addGlow(cyan, 76, 0.36);

    var amber = addSolid(comp, "warm-hydrogen-filament-arc", [1.0, 0.45, 0.16], 30, BlendingMode.ADD);
    amber.property("Rotation").expression = "time * 0.48 + Math.sin(time * 0.33) * 2.0";
    addEllipseMask(amber, "upper amber arc", 765, 444, 520, 170, 76, 45);
    addEllipseMask(amber, "lower hot knot", 848, 750, 300, 120, 80, 36);
    addFractal(amber, 245, -92, 118, 5.1, 72);
    addTurbulence(amber, 46, 90, 68);
    addGlow(amber, 86, 0.66);

    var dust = addSolid(comp, "slow-dark-dust-cutting-through-bubble", [0, 0, 0], 48, BlendingMode.MULTIPLY);
    dust.property("Rotation").expression = "Math.sin(time * 0.2) * 2.0";
    addEllipseMask(dust, "dust bite top", 760, 320, 260, 120, 80, 80);
    addEllipseMask(dust, "dust cut center", 855, 555, 310, 120, 70, 64);
    addEllipseMask(dust, "dust swallow lower", 680, 742, 360, 145, 96, 54);
    addFractal(dust, 182, -62, 168, 5.9, 31);
    addTurbulence(dust, 38, 160, 24);

    var shimmer = addSolid(comp, "fine-surface-particle-shimmer", [1.0, 0.72, 1.0], 28, BlendingMode.ADD);
    addEllipseMask(shimmer, "micro star volume", 865, 540, 605, 482, 210, 42);
    addFractal(shimmer, 410, -188, 42, 3.8, 96);
    addGlow(shimmer, 32, 0.42);

    var adjustment = comp.layers.addSolid([1, 1, 1], "global-soft-video-polish", comp.width, comp.height, 1, comp.duration);
    adjustment.adjustmentLayer = true;
    adjustment.property("Effects").addProperty("ADBE Fast Blur").property("Blurriness").setValue(3.5);

    var rqItem = app.project.renderQueue.items.add(comp);
    rqItem.timeSpanStart = 0;
    rqItem.timeSpanDuration = comp.duration;
    try {
      rqItem.applyTemplate("Best Settings");
    } catch (templateError) {
      log("Render settings template skipped: " + templateError.toString());
    }
    var om = rqItem.outputModule(1);
    try {
      om.applyTemplate("PNG Sequence");
    } catch (pngTemplateError) {
      log("PNG Sequence template skipped: " + pngTemplateError.toString());
    }
    om.file = new File(framePath);

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
