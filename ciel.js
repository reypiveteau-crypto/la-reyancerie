/* ===== La Reyancerie — le ciel =====
   Deux canvas superposés :
     #aurore : les rideaux d'aurore boréale (flou appliqué en CSS)
     #ciel   : les étoiles, la Voie lactée et les étoiles filantes (net)

   Tous les réglages sont dans REGLAGES ci-dessous. */

const REGLAGES = {
  /* --- étoiles --- */
  densite: 4200,        // 1 étoile par N pixels² — plus petit = plus d'étoiles
  maxEtoiles: 1100,
  scintillantes: 110,
  voieLactee: true,

  /* --- étoiles filantes --- */
  filantes: true,
  filanteMin: 1200,     // délai minimum entre deux départs (ms)
  filanteMax: 4200,     // délai maximum
  filantesSimultanees: 4,

  /* --- aurores --- */
  aurores: true,
  vitesseAurore: 1.0,   // 0.5 = deux fois plus lent, 2 = deux fois plus rapide
  intensite: 1.0        // luminosité générale des rideaux
};

/* Les rideaux. Un objet = un rideau.
   y     : hauteur de départ (0 = haut de l'écran, 1 = bas)
   h     : hauteur du rideau, en fraction de l'écran
   amp   : amplitude de l'ondulation, en fraction de l'écran
   freq  : nombre d'ondulations sur la largeur
   vit   : vitesse de dérive horizontale
   c     : couleur du rideau, [r,g,b]
   frange: couleur de la frange basse (facultatif) */
const RIDEAUX = [
  { y:.30, h:.46, amp:.075, freq:1.7, vit:.055, alpha:.80, c:[ 64,235,170], frange:[214,110,190] },
  { y:.20, h:.38, amp:.095, freq:2.4, vit:-.038, alpha:.62, c:[150,110,235], frange:null },
  { y:.40, h:.34, amp:.060, freq:1.2, vit:.078, alpha:.55, c:[ 70,190,240], frange:null },
  { y:.14, h:.26, amp:.110, freq:3.1, vit:-.062, alpha:.40, c:[120,240,215], frange:null }
];

(function () {
  const cvA = document.getElementById("aurore");
  const cvC = document.getElementById("ciel");
  if (!cvC) return;
  const ctxA = cvA ? cvA.getContext("2d") : null;
  const ctx = cvC.getContext("2d");
  const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let L = 0, H = 0, dpr = 1;
  let etoiles = [], scintille = [], fond = null;
  let filantes = [], prochaine = 0;
  let bandes = [];   // rideaux pré-rendus (une colonne de dégradé chacun)
  let frame = 0;

  const rnd = (a, b) => a + Math.random() * (b - a);

  const TEINTES = [
    [223,230,255],[223,230,255],[223,230,255],
    [255,217,168],[168,216,255],[217,185,107]
  ];

  /* ---------- pré-rendu d'un rideau : une colonne de 1px de large ---------- */
  function bande(r) {
    const hh = Math.max(60, Math.round(r.h * H));
    const c = document.createElement("canvas");
    c.width = 1; c.height = hh;
    const g = c.getContext("2d");
    const [R, G, B] = r.c;
    const grd = g.createLinearGradient(0, 0, 0, hh);
    grd.addColorStop(0.00, `rgba(${R},${G},${B},0)`);
    grd.addColorStop(0.32, `rgba(${R},${G},${B},0.10)`);
    grd.addColorStop(0.68, `rgba(${R},${G},${B},0.42)`);
    grd.addColorStop(0.90, `rgba(${R},${G},${B},0.95)`);
    grd.addColorStop(1.00, `rgba(${R},${G},${B},0.25)`);
    g.fillStyle = grd; g.fillRect(0, 0, 1, hh);
    // frange colorée sur le bord bas, comme sur les vraies aurores
    if (r.frange) {
      const [fr, fg, fb] = r.frange;
      const f = g.createLinearGradient(0, hh * 0.80, 0, hh);
      f.addColorStop(0, `rgba(${fr},${fg},${fb},0)`);
      f.addColorStop(1, `rgba(${fr},${fg},${fb},0.75)`);
      g.globalCompositeOperation = "lighter";
      g.fillStyle = f; g.fillRect(0, hh * 0.80, 1, hh * 0.20);
    }
    return { img: c, hh, ...r };
  }

  /* ---------- création / redimensionnement ---------- */
  function creer() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    L = window.innerWidth; H = window.innerHeight;

    for (const cv of [cvA, cvC]) {
      if (!cv) continue;
      cv.width = L * dpr; cv.height = H * dpr;
      cv.style.width = L + "px"; cv.style.height = H + "px";
      cv.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    bandes = RIDEAUX.map(bande);

    const n = Math.min(Math.round((L * H) / REGLAGES.densite), REGLAGES.maxEtoiles);
    etoiles = [];
    for (let i = 0; i < n; i++) {
      let x = Math.random() * L, y = Math.random() * H;
      if (REGLAGES.voieLactee && Math.random() < 0.42) {
        const t = Math.random();
        x = t * L;
        y = (0.16 + t * 0.52) * H + rnd(-0.10, 0.10) * H;
        if (y < 0 || y > H) y = Math.random() * H;
      }
      const grosse = Math.random() < 0.05;
      etoiles.push({
        x, y,
        r: grosse ? rnd(1.1, 2.0) : rnd(0.35, 1.0),
        a: grosse ? rnd(0.7, 1) : rnd(0.18, 0.75),
        c: TEINTES[(Math.random() * TEINTES.length) | 0],
        halo: grosse
      });
    }
    scintille = [];
    const pool = etoiles.slice().sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(REGLAGES.scintillantes, pool.length); i++) {
      const e = pool[i];
      scintille.push({ e, base: e.a, phase: Math.random() * 6.2832, vit: rnd(0.5, 1.6) });
    }
    const mobiles = new Set(scintille.map(s => s.e));

    fond = document.createElement("canvas");
    fond.width = cvC.width; fond.height = cvC.height;
    const fc = fond.getContext("2d");
    fc.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const e of etoiles) if (!mobiles.has(e)) etoile(fc, e, e.a);
  }

  function etoile(c, e, alpha) {
    const [r, g, b] = e.c;
    if (e.halo) {
      const grd = c.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 5);
      grd.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.5})`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      c.fillStyle = grd;
      c.beginPath(); c.arc(e.x, e.y, e.r * 5, 0, 6.2832); c.fill();
    }
    c.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    c.beginPath(); c.arc(e.x, e.y, e.r, 0, 6.2832); c.fill();
  }

  /* ---------- les rideaux d'aurore ---------- */
  function dessinerAurores(t) {
    if (!ctxA) return;
    ctxA.clearRect(0, 0, L, H);
    if (!REGLAGES.aurores) return;
    ctxA.globalCompositeOperation = "lighter";

    const pas = L > 900 ? 9 : 7;             // largeur d'une tranche, en px
    const s = t * 0.001 * REGLAGES.vitesseAurore;

    for (const b of bandes) {
      const yb = b.y * H, amp = b.amp * H;
      for (let x = -pas; x < L + pas; x += pas) {
        const u = x / L;
        // la ligne de base ondule : deux sinus de périodes différentes
        const y = yb
          + Math.sin(u * b.freq * 6.2832 + s * b.vit * 22) * amp
          + Math.sin(u * b.freq * 2.3 * 6.2832 - s * b.vit * 13) * amp * 0.42;
        // les striations verticales : c'est ce qui donne l'aspect « rideau »
        const stri = 0.34 + 0.66 * Math.abs(Math.sin(u * 27 + s * b.vit * 9 + b.freq));
        // respiration lente du rideau entier
        const souffle = 0.62 + 0.38 * Math.sin(s * 0.33 * b.vit * 10 + b.y * 9);
        // hauteur variable d'une tranche à l'autre
        const ech = 0.72 + 0.42 * Math.sin(u * 11 - s * b.vit * 6);

        ctxA.globalAlpha = Math.max(0, b.alpha * stri * souffle * REGLAGES.intensite);
        ctxA.drawImage(b.img, 0, 0, 1, b.hh, x, y, pas + 1.5, b.hh * ech);
      }
    }
    ctxA.globalAlpha = 1;
    ctxA.globalCompositeOperation = "source-over";
  }

  /* ---------- étoiles filantes ---------- */
  function lancerFilante() {
    const gauche = Math.random() < 0.5;
    const v = rnd(8, 16);
    const pente = rnd(0.22, 0.55);
    filantes.push({
      x: gauche ? rnd(-80, L * 0.45) : rnd(L * 0.55, L + 80),
      y: rnd(-40, H * 0.55),
      vx: (gauche ? 1 : -1) * v,
      vy: v * pente,
      long: rnd(9, 16),
      ep: rnd(1.1, 2.2),
      vie: 0,
      duree: rnd(45, 90)
    });
  }

  function dessinerFilantes() {
    for (let i = filantes.length - 1; i >= 0; i--) {
      const f = filantes[i];
      const op = Math.sin(Math.PI * (f.vie / f.duree));
      const qx = f.x - f.vx * f.long, qy = f.y - f.vy * f.long;
      const grd = ctx.createLinearGradient(f.x, f.y, qx, qy);
      grd.addColorStop(0, `rgba(240,245,255,${0.92 * op})`);
      grd.addColorStop(0.35, `rgba(200,220,255,${0.45 * op})`);
      grd.addColorStop(1, "rgba(200,220,255,0)");
      ctx.strokeStyle = grd; ctx.lineWidth = f.ep; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(qx, qy); ctx.stroke();
      // petite tête lumineuse
      ctx.fillStyle = `rgba(255,255,255,${0.85 * op})`;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.ep * 0.8, 0, 6.2832); ctx.fill();

      f.x += f.vx; f.y += f.vy; f.vie++;
      if (f.vie > f.duree || f.x < -200 || f.x > L + 200 || f.y > H + 200) filantes.splice(i, 1);
    }
  }

  /* ---------- boucle ---------- */
  function dessiner(t) {
    ctx.clearRect(0, 0, L, H);
    if (fond) ctx.drawImage(fond, 0, 0, L, H);

    for (const s of scintille) {
      const a = calme ? s.base
        : s.base * (0.40 + 0.60 * (0.5 + 0.5 * Math.sin(t * 0.0012 * s.vit + s.phase)));
      etoile(ctx, s.e, a);
    }

    if (!calme) {
      if (REGLAGES.filantes && t > prochaine && filantes.length < REGLAGES.filantesSimultanees) {
        lancerFilante();
        prochaine = t + rnd(REGLAGES.filanteMin, REGLAGES.filanteMax);
      }
      dessinerFilantes();
    }
  }

  function boucle(t) {
    dessiner(t);
    if (frame++ % 2 === 0) dessinerAurores(t);   // aurores à ~30 images/s, suffisant
    requestAnimationFrame(boucle);
  }

  let redim;
  window.addEventListener("resize", () => {
    clearTimeout(redim);
    redim = setTimeout(() => { creer(); dessinerAurores(performance.now()); if (calme) dessiner(0); }, 180);
  });

  creer();
  if (calme) { dessiner(0); dessinerAurores(0); }
  else { prochaine = 1500; requestAnimationFrame(boucle); }
})();
