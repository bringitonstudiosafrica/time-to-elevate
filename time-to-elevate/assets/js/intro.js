/* ============================================================
   The 3D invitation folder (Three.js r128).
   Intro.prepare() builds the scene while the riddle is on screen.
   controller.begin(onDone) plays it: glide in, wait for a tap,
   crack the seal, open the cover, lift the card, flash, reveal.
   ============================================================ */
(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);

  function webglAvailable() {
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) {
      return false;
    }
  }

  async function waitForFonts() {
    if (!document.fonts || !document.fonts.load) return;
    try {
      await Promise.race([
        Promise.all([
          document.fonts.load('italic 400 200px "Bodoni Moda"'),
          document.fonts.load('500 200px "Bodoni Moda"'),
          document.fonts.load('400 40px "DM Mono"')
        ]),
        new Promise((r) => setTimeout(r, 2500))
      ]);
    } catch (e) { /* fall back to system fonts */ }
  }

  /* ---------------- Canvas textures ---------------- */
  const W = 2.4, H = 3.2, T = 0.035;
  const TW = 1024, TH = Math.round(1024 * H / W);

  function canvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w || TW; c.height = h || TH;
    return [c, c.getContext("2d")];
  }
  function foil(ctx, x0, y0, x1, y1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, "#8f6a2e"); g.addColorStop(.25, "#e2bf72"); g.addColorStop(.45, "#fbe9b4");
    g.addColorStop(.6, "#d8b26a"); g.addColorStop(.85, "#9c7535"); g.addColorStop(1, "#e8c77f");
    return g;
  }
  function grain(ctx, w, h, amount) {
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - .5) * amount;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  }
  function spaced(ctx, text, cx, y, spacing) {
    const chars = Array.from(text);
    const widths = chars.map((ch) => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let x = cx - total / 2;
    const align = ctx.textAlign;
    ctx.textAlign = "left";
    chars.forEach((ch, i) => { ctx.fillText(ch, x, y); x += widths[i] + spacing; });
    ctx.textAlign = align;
  }
  function decoCorner(ctx, x, y, sx, sy, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
    for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(0, 0, s * i / 4, 0, Math.PI / 2); ctx.stroke(); }
    for (let i = 0; i <= 6; i++) { const a = i * Math.PI / 12; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s); ctx.stroke(); }
    ctx.restore();
  }
  function chevrons(ctx, cx, y, n, size) {
    // three stacked chevrons pointing up: the "elevate" mark
    ctx.lineWidth = 3;
    for (let i = 0; i < n; i++) {
      const yy = y - i * size * .55;
      ctx.beginPath();
      ctx.moveTo(cx - size, yy + size * .45);
      ctx.lineTo(cx, yy - size * .1);
      ctx.lineTo(cx + size, yy + size * .45);
      ctx.stroke();
    }
  }

  // mode: "color" | "metal" | "rough". The masks make the gold foil reflective.
  function drawCover(mode) {
    const [c, x] = canvas();
    const ink = mode === "color" ? foil(x, 0, 0, TW, TH) : mode === "metal" ? "#fff" : "#3a3a3a";
    if (mode === "color") {
      const g = x.createLinearGradient(0, 0, TW, TH);
      g.addColorStop(0, "#3a1840"); g.addColorStop(.55, "#230e29"); g.addColorStop(1, "#140818");
      x.fillStyle = g; x.fillRect(0, 0, TW, TH);
      grain(x, TW, TH, 22);
      const v = x.createRadialGradient(TW / 2, TH * .45, TW * .1, TW / 2, TH / 2, TW * .9);
      v.addColorStop(0, "rgba(255,220,240,.06)"); v.addColorStop(1, "rgba(0,0,0,.45)");
      x.fillStyle = v; x.fillRect(0, 0, TW, TH);
    } else {
      x.fillStyle = mode === "metal" ? "#000" : "#c8c8c8";
      x.fillRect(0, 0, TW, TH);
    }
    x.strokeStyle = ink; x.fillStyle = ink;
    x.lineWidth = 6; x.strokeRect(54, 54, TW - 108, TH - 108);
    x.lineWidth = 2; x.strokeRect(74, 74, TW - 148, TH - 148);
    x.lineWidth = 2.2;
    decoCorner(x, 74, 74, 1, 1, 120); decoCorner(x, TW - 74, 74, -1, 1, 120);
    decoCorner(x, 74, TH - 74, 1, -1, 120); decoCorner(x, TW - 74, TH - 74, -1, -1, 120);

    x.textAlign = "center"; x.textBaseline = "middle";
    x.font = '500 30px "DM Mono", monospace';
    spaced(x, "YOU ARE INVITED", TW / 2, 250, 12);
    chevrons(x, TW / 2, 360, 3, 34);
    x.font = 'italic 400 420px "Bodoni Moda", Georgia, serif';
    x.fillText("30", TW / 2, 600);
    x.font = '500 34px "DM Mono", monospace';
    spaced(x, "TIME TO", TW / 2, 830, 22);
    x.font = 'italic 400 128px "Bodoni Moda", Georgia, serif';
    x.fillText("Elevate", TW / 2, 930);
    x.lineWidth = 2;
    x.beginPath(); x.moveTo(TW / 2 - 180, 1050); x.lineTo(TW / 2 - 24, 1050); x.moveTo(TW / 2 + 24, 1050); x.lineTo(TW / 2 + 180, 1050); x.stroke();
    x.save(); x.translate(TW / 2, 1050); x.rotate(Math.PI / 4); x.fillRect(-9, -9, 18, 18); x.restore();
    x.font = '400 26px "DM Mono", monospace';
    spaced(x, "IAN KANYI · 27 · XI · MMXXVI", TW / 2, 1140, 8);
    return c;
  }

  function drawLining(mode) {
    const [c, x] = canvas();
    if (mode === "color") {
      x.fillStyle = "#22102a"; x.fillRect(0, 0, TW, TH); grain(x, TW, TH, 14);
      x.strokeStyle = "rgba(216,178,106,.55)";
    } else {
      x.fillStyle = mode === "metal" ? "#000" : "#d0d0d0"; x.fillRect(0, 0, TW, TH);
      x.strokeStyle = mode === "metal" ? "#bbb" : "#444";
    }
    x.lineWidth = 2;
    const s = 110;
    for (let row = 0; row * s / 2 < TH + s; row++) {
      for (let col = -1; col * s < TW + s; col++) {
        const cx = col * s + (row % 2 ? s / 2 : 0), cy = row * s / 2;
        for (let k = 1; k <= 3; k++) { x.beginPath(); x.arc(cx, cy, s / 2 * k / 3, Math.PI, 0); x.stroke(); }
      }
    }
    return c;
  }

  function drawCard() {
    const [c, x] = canvas();
    const g = x.createLinearGradient(0, 0, TW, TH);
    g.addColorStop(0, "#faf4e8"); g.addColorStop(1, "#eadcc2");
    x.fillStyle = g; x.fillRect(0, 0, TW, TH); grain(x, TW, TH, 10);
    const gold = x.createLinearGradient(0, 0, TW, TH);
    gold.addColorStop(0, "#a9802f"); gold.addColorStop(.5, "#7a5520"); gold.addColorStop(1, "#a9802f");
    x.strokeStyle = gold;
    x.lineWidth = 3; x.strokeRect(50, 50, TW - 100, TH - 100);
    x.lineWidth = 1.5; x.strokeRect(66, 66, TW - 132, TH - 132);
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillStyle = "#8f6a2e"; x.font = '500 28px "DM Mono", monospace';
    spaced(x, "IAN KANYI TURNS 30", TW / 2, 210, 10);
    x.fillStyle = "#2a1620"; x.font = '500 200px "Bodoni Moda", Georgia, serif';
    x.fillText("Admit", TW / 2, 440);
    x.fillStyle = gold; x.font = 'italic 400 200px "Bodoni Moda", Georgia, serif';
    x.fillText("One", TW / 2, 640);
    x.fillStyle = "#5a4048"; x.font = '400 30px "DM Mono", monospace';
    spaced(x, "FRIDAY 27 NOVEMBER 2026", TW / 2, 860, 6);
    x.font = 'italic 400 64px "Bodoni Moda", Georgia, serif'; x.fillStyle = "#7a2033";
    x.fillText("7 PM till midnight", TW / 2, 970);
    x.fillStyle = "#8f6a2e"; x.font = '400 24px "DM Mono", monospace';
    spaced(x, "TIME TO ELEVATE · PLEASE BE ON TIME", TW / 2, 1150, 6);
    return c;
  }

  function drawSeal() {
    const [c, x] = canvas(512, 512);
    const g = x.createRadialGradient(220, 200, 20, 256, 256, 260);
    g.addColorStop(0, "#8a1f30"); g.addColorStop(.6, "#5a0d1a"); g.addColorStop(1, "#2e030a");
    x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    x.strokeStyle = "rgba(40,0,8,.55)"; x.lineWidth = 10; x.beginPath(); x.arc(256, 256, 190, 0, 6.283); x.stroke();
    x.strokeStyle = "rgba(255,170,180,.25)"; x.lineWidth = 3; x.beginPath(); x.arc(252, 250, 194, 0, 6.283); x.stroke();
    x.textAlign = "center"; x.textBaseline = "middle";
    x.font = 'italic 500 200px "Bodoni Moda", Georgia, serif';
    x.fillStyle = "rgba(30,0,6,.6)"; x.fillText("IK", 256, 252);
    x.fillStyle = "rgba(255,180,190,.28)"; x.fillText("IK", 250, 244);
    grain(x, 512, 512, 18);
    return c;
  }

  /* ---------------- Scene ---------------- */
  async function prepare() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof window.THREE === "undefined" || !webglAvailable()) return null;
    await waitForFonts();

    const THREE = window.THREE;
    const intro = $("#intro");
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      return null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    intro.insertBefore(renderer.domElement, intro.firstChild);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x140b1a, 9, 20);
    const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.05, 60);

    // Simple studio environment so the foil reflects warm light.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ color: 0x1d0f24, side: THREE.BackSide })));
    [[0xfff1cf, 0, 6, 4, 8, 3], [0xffd58a, -6, 1, 3, 3, 6], [0xc77dff, 6, -1, 2, 2, 5], [0xffffff, 3, 4, 6, 3, 2]].forEach(([col, px, py, pz, pw, ph]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
      m.position.set(px, py, pz); m.lookAt(0, 0, 0); envScene.add(m);
    });
    const envRT = pmrem.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const tex = (cnv, srgb) => {
      const t = new THREE.CanvasTexture(cnv);
      if (srgb !== false) t.encoding = THREE.sRGBEncoding;
      t.anisotropy = maxAniso;
      return t;
    };

    const coverMat = new THREE.MeshStandardMaterial({ map: tex(drawCover("color")), metalnessMap: tex(drawCover("metal"), false), roughnessMap: tex(drawCover("rough"), false), metalness: 1, roughness: 1, envMapIntensity: 1.4 });
    const liningMat = new THREE.MeshStandardMaterial({ map: tex(drawLining("color")), metalnessMap: tex(drawLining("metal"), false), roughnessMap: tex(drawLining("rough"), false), metalness: 1, roughness: 1, envMapIntensity: .9 });
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xd8b26a, metalness: 1, roughness: .28, envMapIntensity: 1.6 });
    const cardMat = new THREE.MeshStandardMaterial({ map: tex(drawCard()), roughness: .75, metalness: 0 });
    const cardBack = new THREE.MeshStandardMaterial({ color: 0xeadcc2, roughness: .8 });
    const sealTex = tex(drawSeal());
    sealTex.center.set(.5, .5);
    sealTex.rotation = Math.PI / 2; // the seal's cap UVs are turned a quarter; this sets "IK" upright
    const sealMat = new THREE.MeshStandardMaterial({ map: sealTex, roughness: .5, metalness: .05, envMapIntensity: .45 });
    const sealSide = new THREE.MeshStandardMaterial({ color: 0x4e0b17, roughness: .5, envMapIntensity: .45 });
    const ribbonMat = new THREE.MeshStandardMaterial({ color: 0x7a1a2c, roughness: .35, metalness: .25, envMapIntensity: .8 });

    // Folder
    const folder = new THREE.Group();
    scene.add(folder);

    const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), [edgeMat, edgeMat, edgeMat, edgeMat, liningMat, coverMat]);
    back.position.z = -T; back.receiveShadow = true; folder.add(back);

    const cardGroup = new THREE.Group();
    const card = new THREE.Mesh(new THREE.BoxGeometry(W * .86, H * .86, .008), [cardBack, cardBack, cardBack, cardBack, cardMat, cardBack]);
    card.castShadow = true; card.receiveShadow = true;
    cardGroup.add(card);
    const cardRestZ = -T / 2 + .012;
    cardGroup.position.z = cardRestZ;
    folder.add(cardGroup);

    const hinge = new THREE.Group();
    hinge.position.set(-W / 2, 0, .006);
    folder.add(hinge);
    const front = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), [edgeMat, edgeMat, edgeMat, edgeMat, coverMat, liningMat]);
    front.position.set(W / 2, 0, T / 2); front.castShadow = true;
    hinge.add(front);

    const spine = new THREE.Mesh(new THREE.CylinderGeometry(T * 1.1, T * 1.1, H, 16), edgeMat);
    spine.position.set(-W / 2, 0, 0);
    folder.add(spine);

    // Wax seal in two halves, over the cover's opening edge
    const sealR = .3, sealH = .07;
    const sealGroup = new THREE.Group();
    sealGroup.position.set(W / 2 - .02, -0.05, T + sealH / 2 + .002);
    folder.add(sealGroup);
    const halves = [0, 1].map((i) => {
      const geo = new THREE.CylinderGeometry(sealR, sealR * 1.04, sealH, 48, 1, false, i * Math.PI, Math.PI);
      const m = new THREE.Mesh(geo, [sealSide, sealMat, sealSide]);
      m.rotation.x = Math.PI / 2; m.castShadow = true;
      const holder = new THREE.Group();
      holder.add(m); sealGroup.add(holder);
      return holder;
    });
    const drip = new THREE.Mesh(new THREE.TorusGeometry(sealR * 1.02, .03, 10, 48), sealSide);
    drip.position.z = -sealH / 2 + .01;
    sealGroup.add(drip);
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(.34, .14, .01), ribbonMat);
    ribbon.position.set(W / 2 - .2, -0.05, T + .008);
    folder.add(ribbon);

    // Lights
    scene.add(new THREE.AmbientLight(0x8a6a9a, .35));
    const key = new THREE.DirectionalLight(0xffe7c4, 1.6);
    key.position.set(2.5, 3.5, 5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 });
    key.shadow.bias = -.0005;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xb784ff, .6);
    rim.position.set(-4, 1, -3); scene.add(rim);
    const glint = new THREE.PointLight(0xffd890, 2.4, 8, 2);
    scene.add(glint);

    // Gold dust, always rising
    const [dc, dx] = canvas(64, 64);
    const dg = dx.createRadialGradient(32, 32, 0, 32, 32, 32);
    dg.addColorStop(0, "rgba(255,245,215,1)"); dg.addColorStop(.25, "rgba(247,227,168,.8)"); dg.addColorStop(1, "rgba(216,178,106,0)");
    dx.fillStyle = dg; dx.fillRect(0, 0, 64, 64);
    const dot = new THREE.CanvasTexture(dc);

    const DUST = window.innerWidth < 600 ? 500 : 1100;
    const dGeo = new THREE.BufferGeometry();
    const dPos = new Float32Array(DUST * 3), dSpd = new Float32Array(DUST);
    for (let i = 0; i < DUST; i++) {
      dPos[i * 3] = (Math.random() - .5) * 14; dPos[i * 3 + 1] = (Math.random() - .5) * 10; dPos[i * 3 + 2] = (Math.random() - .5) * 10 - 1;
      dSpd[i] = Math.random() * .004 + .001;
    }
    dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
    const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ map: dot, size: .06, transparent: true, opacity: .75, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xf7e3a8 }));
    scene.add(dust);

    // Sparks when the seal breaks
    const BURST = 420;
    const bGeo = new THREE.BufferGeometry();
    const bPos = new Float32Array(BURST * 3);
    const bVel = [];
    for (let i = 0; i < BURST; i++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI - Math.PI / 2, s = Math.random() * .06 + .015;
      bVel.push(new THREE.Vector3(Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + .012, Math.sin(a) * Math.cos(e) * s * .6 + .02));
    }
    bGeo.setAttribute("position", new THREE.BufferAttribute(bPos, 3));
    const burstMat = new THREE.PointsMaterial({ map: dot, size: .09, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe6a6 });
    const burst = new THREE.Points(bGeo, burstMat);
    burst.visible = false;
    scene.add(burst);

    // Framing: fit the folder on any screen shape
    let baseZ = 7;
    function frame() {
      const a = window.innerWidth / window.innerHeight;
      camera.aspect = a;
      camera.updateProjectionMatrix();
      const half = Math.tan(camera.fov * Math.PI / 360);
      baseZ = Math.max((H * 1.45) / 2 / half, (W * 1.55) / 2 / (half * a));
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    frame();
    window.addEventListener("resize", frame);

    // Render one still frame so the canvas isn't empty behind the riddle fade.
    camera.position.set(0, .3, baseZ + 3);
    camera.lookAt(0, 0, 0);
    folder.rotation.set(-.18, .32, .04);
    renderer.render(scene, camera);

    /* ---------------- Timeline ---------------- */
    const ease = {
      io: (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
      out: (t) => 1 - Math.pow(1 - t, 3)
    };
    const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
    const mouse = { x: 0, y: 0 };
    const onMove = (e) => { mouse.x = e.clientX / window.innerWidth * 2 - 1; mouse.y = e.clientY / window.innerHeight * 2 - 1; };

    let started = false, opened = false, finished = false;
    let t0 = 0, openAt = 0, raf = 0, autoTimer = 0, hintTimer = 0, onDoneCb = null;

    function open() {
      if (!started || opened) return;
      opened = true;
      openAt = performance.now();
      clearTimeout(autoTimer);
      $("#hint").classList.add("hide");
      const p = new THREE.Vector3();
      sealGroup.getWorldPosition(p);
      for (let i = 0; i < BURST; i++) { bPos[i * 3] = p.x; bPos[i * 3 + 1] = p.y; bPos[i * 3 + 2] = p.z; }
      bGeo.attributes.position.needsUpdate = true;
      burst.visible = true;
    }
    const onKey = (e) => {
      if (started && !opened && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(); }
    };

    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(autoTimer); clearTimeout(hintTimer);
      if (onDoneCb) onDoneCb();
    }

    function loop(now) {
      raf = requestAnimationFrame(loop);
      const t = (now - t0) / 1000;
      const ent = ease.out(seg(t, 0, 2.2));
      let camZ = baseZ + 3 * (1 - ent);
      const camY = .3 * (1 - ent);
      const idle = opened ? 0 : 1;

      folder.position.y = Math.sin(t * 1.1) * .05 * idle;
      let ry = (.32 - .22 * ent) + mouse.x * .12 * idle + Math.sin(t * .6) * .04 * idle;
      let rx = (-.18 + .1 * ent) + mouse.y * .08 * idle;
      const rz = .04 * (1 - ent);
      glint.position.set(Math.sin(t * .7) * 2.2, Math.cos(t * .5) * 1.4, 2.2);

      if (opened) {
        const o = (now - openAt) / 1000;
        // 1. the seal cracks and falls away
        const s1 = seg(o, 0, .9);
        halves[0].position.set(-.05 - s1 * .35, -s1 * s1 * 1.2, s1 * .25);
        halves[0].rotation.set(s1 * 1.2, -s1 * .8, s1 * .9);
        halves[1].position.set(.05 + s1 * .45, -s1 * s1 * 1.4, s1 * .3);
        halves[1].rotation.set(-s1 * 1.1, s1 * .9, -s1 * 1.2);
        sealGroup.visible = s1 < 1;
        drip.visible = o < .08;
        ribbon.scale.x = Math.max(.001, 1 - ease.io(seg(o, .05, .5)));
        ribbon.visible = ribbon.scale.x > .02;

        // sparks rise (elevate!)
        burstMat.opacity = o < 2.2 ? (1 - seg(o, 0, 2.2)) * .95 : 0;
        if (o < 2.2) {
          for (let i = 0; i < BURST; i++) {
            bPos[i * 3] += bVel[i].x; bPos[i * 3 + 1] += bVel[i].y; bPos[i * 3 + 2] += bVel[i].z;
            bVel[i].multiplyScalar(.985);
            bVel[i].y += .0004;
          }
          bGeo.attributes.position.needsUpdate = true;
        } else {
          burst.visible = false;
        }

        // 2. square up and swing the cover open
        const sq = ease.io(seg(o, .2, 1.4));
        ry *= 1 - sq; rx *= 1 - sq;
        const sw = ease.io(seg(o, .45, 2.1));
        hinge.rotation.y = -sw * 2.75;
        folder.position.x = sw * W * .42;

        // 3. the card rises, then flies to the camera
        const up = ease.out(seg(o, 1.7, 2.6));
        const fly = ease.io(seg(o, 2.4, 3.7));
        cardGroup.position.set(-fly * W * .42, up * .55 - fly * .55, cardRestZ + up * .3 + fly * (camZ - 3.0));
        cardGroup.rotation.set(-up * .08 * (1 - fly), 0, up * .03 * (1 - fly));
        camZ -= ease.io(seg(o, .6, 2.6)) * .6;

        // 4. flash and reveal
        if (o > 3.1) $("#flash").classList.add("on");
        if (o > 3.6) finish();
      }

      folder.rotation.set(rx, ry, rz);
      camera.position.set(mouse.x * .15 * idle, camY - mouse.y * .1 * idle, camZ);
      camera.lookAt(0, 0, 0);

      for (let i = 0; i < DUST; i++) {
        dPos[i * 3 + 1] += dSpd[i];
        if (dPos[i * 3 + 1] > 5) dPos[i * 3 + 1] = -5;
      }
      dGeo.attributes.position.needsUpdate = true;
      dust.rotation.y = t * .02;

      renderer.render(scene, camera);
    }

    function dispose() {
      cancelAnimationFrame(raf);
      clearTimeout(autoTimer); clearTimeout(hintTimer);
      window.removeEventListener("resize", frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
      const disposed = new Set();
      scene.traverse((obj) => {
        if (obj.geometry && !disposed.has(obj.geometry)) { obj.geometry.dispose(); disposed.add(obj.geometry); }
        const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
        mats.forEach((m) => {
          if (disposed.has(m)) return;
          disposed.add(m);
          Object.keys(m).forEach((k) => { if (m[k] && m[k].isTexture && !disposed.has(m[k])) { m[k].dispose(); disposed.add(m[k]); } });
          m.dispose();
        });
      });
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    }

    return {
      begin(onDone) {
        if (started) return;
        started = true;
        onDoneCb = onDone;
        t0 = performance.now();
        window.addEventListener("pointermove", onMove);
        window.addEventListener("keydown", onKey);
        renderer.domElement.addEventListener("click", open);
        hintTimer = setTimeout(() => $("#hint").classList.remove("hide"), 1600);
        autoTimer = setTimeout(open, 10000);
        raf = requestAnimationFrame(loop);
      },
      dispose
    };
  }

  window.Intro = { prepare };
})();
