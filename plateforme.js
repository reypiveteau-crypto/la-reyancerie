// ============================================================
//  JEUX DE LA PLATEFORME
//  Ajouter un jeu = ajouter un bloc ici. Rien d'autre à toucher.
//  "champs" = les cases du formulaire de build propres à ce jeu.
//  "persos" = suggestions dans le formulaire (le membre peut taper
//  n'importe quel nom, la liste sert juste d'aide).
// ============================================================
window.REY_JEUX = [
  {
    slug: "genshin",
    nom: "Genshin Impact",
    court: "Genshin",
    couleur: "#7cc6ff",
    motEntite: "Personnage",
    champs: [
      { cle: "arme", label: "Arme" },
      { cle: "artefacts", label: "Sets d'artefacts" },
      { cle: "stats", label: "Stats principales (sablier / coupe / couronne)" },
      { cle: "talents", label: "Talents (ex : 1 / 9 / 9)" },
      { cle: "constellation", label: "Constellation (C0 à C6)" },
      { cle: "equipe", label: "Équipe" }
    ],
    // Les 119 fiches viennent de data.js (ton site Genshin), chargé avant ce fichier.
    roster: typeof PERSONNAGES !== "undefined" ? PERSONNAGES : null,
    persos: typeof PERSONNAGES !== "undefined" ? PERSONNAGES.map((p) => p.nom) : [],
    ui: {
      theme: "Teyvat",
      libelleElement: "Élément", libelleArme: "Arme",
      elements: "genshin",
      armes: ["Épée", "Claymore", "Lance", "Arc", "Catalyseur"],
      rangs: [5, 4], rang: (n) => "★".repeat(n),
      images: { liste: typeof AVEC_IMAGE !== "undefined" ? AVEC_IMAGE : [], dossier: "" }
    }
  },
  {
    slug: "hsr",
    nom: "Honkai: Star Rail",
    court: "HSR",
    couleur: "#c9a2ff",
    motEntite: "Personnage",
    champs: [
      { cle: "cone", label: "Cône de lumière" },
      { cle: "reliques", label: "Reliques de cavernes" },
      { cle: "ornements", label: "Ornements planaires" },
      { cle: "stats", label: "Stats principales (torse / pieds / sphère / corde)" },
      { cle: "traces", label: "Traces (ex : 6 / 10 / 10 / 10)" },
      { cle: "eidolon", label: "Eidolon (E0 à E6)" },
      { cle: "equipe", label: "Équipe" }
    ],
    roster: typeof PERSONNAGES_HSR !== "undefined" ? PERSONNAGES_HSR : null,
    persos: typeof PERSONNAGES_HSR !== "undefined" ? PERSONNAGES_HSR.map((p) => p.nom) : [],
    ui: {
      theme: "Express astral",
      libelleElement: "Type", libelleArme: "Voie",
      elements: "hsr",
      armes: ["Destruction", "Chasse", "Érudition", "Harmonie", "Nihilité", "Préservation", "Abondance", "Souvenir", "Allégresse"],
      rangs: [5, 4], rang: (n) => "★".repeat(n),
      images: { liste: typeof IMAGES_HSR !== "undefined" ? IMAGES_HSR : [], dossier: "hsr/" }
    }
  },
  {
    slug: "wuwa",
    nom: "Wuthering Waves",
    court: "WuWa",
    couleur: "#5fe0c3",
    motEntite: "Résonateur",
    champs: [
      { cle: "arme", label: "Arme" },
      { cle: "echos", label: "Échos (set + écho principal)" },
      { cle: "stats", label: "Stats principales des échos" },
      { cle: "forte", label: "Forte / compétences prioritaires" },
      { cle: "chaine", label: "Chaîne de résonance (S0 à S6)" },
      { cle: "equipe", label: "Équipe" }
    ],
    roster: typeof PERSONNAGES_WUWA !== "undefined" ? PERSONNAGES_WUWA : null,
    persos: typeof PERSONNAGES_WUWA !== "undefined" ? PERSONNAGES_WUWA.map((p) => p.nom) : [],
    ui: {
      theme: "Solaris-3",
      libelleElement: "Attribut", libelleArme: "Arme",
      elements: "wuwa",
      armes: ["Épée", "Grande lame", "Pistolets", "Gantelets", "Rectifieur"],
      rangs: [5, 4], rang: (n) => "★".repeat(n),
      images: { liste: typeof IMAGES_WUWA !== "undefined" ? IMAGES_WUWA : [], dossier: "wuwa/" }
    }
  },
  {
    slug: "nte",
    nom: "Neverness to Everness",
    court: "NTE",
    couleur: "#ff9a86",
    motEntite: "Personnage",
    // Champs volontairement génériques : à ajuster quand tu fixes
    // le vocabulaire exact du jeu avec ta communauté.
    champs: [
      { cle: "arme", label: "Arme" },
      { cle: "equipement", label: "Équipement" },
      { cle: "stats", label: "Stats prioritaires" },
      { cle: "competences", label: "Compétences prioritaires" },
      { cle: "equipe", label: "Équipe" }
    ],
    roster: typeof PERSONNAGES_NTE !== "undefined" ? PERSONNAGES_NTE : null,
    persos: typeof PERSONNAGES_NTE !== "undefined" ? PERSONNAGES_NTE.map((p) => p.nom) : [],
    ui: {
      theme: "Hethereau",
      libelleElement: "Attribut", libelleArme: "Type d'arc",
      elements: "nte",
      armes: ["Condensat", "Gaz", "Plasma", "Liquide", "Solide"],
      rangs: [5, 4], rang: (n) => (n === 5 ? "S" : n === 4 ? "A" : ""),
      images: { liste: typeof IMAGES_NTE !== "undefined" ? IMAGES_NTE : [], dossier: "nte/" }
    }
  }
];

// Types de publications dans la « Mémoire » et les sections personnage.
window.REY_TYPES_POST = {
  souvenir: "Souvenir",
  dessin: "Dessin",
  screenshot: "Screenshot",
  clip: "Clip / vidéo",
  creation: "Autre création"
};

// Pictogrammes génériques (formes simples dessinées pour ce site)
const PICTO = {
  flamme: '<path d="M12 1.6c.6 2.9 2 4.5 3.5 6.1 1.9 2 3.6 4 3.6 7A7.1 7.1 0 0 1 4.9 14.7c0-2 .7-3.7 1.8-5.3.1 1.3.6 2.4 1.5 3.2C8 8.6 9.3 5 12 1.6Z"/>',
  flocon: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6"/></g>',
  eclair: '<path d="M14.2 1.2 3.6 13.9h6.3l-1.4 9.3 10.9-12.9h-6.6l1.4-9.1Z"/>',
  vent: '<path d="M2.5 6.6h9.8a2.3 2.3 0 1 0-2.2-2.9l-2-.4A4.3 4.3 0 1 1 12.3 8.6H2.5V6.6Z"/><path d="M2.5 11.4h13a2.7 2.7 0 1 1-2.6 3.4l-2 .5a4.8 4.8 0 1 0 4.6-6H2.5v2.1Z"/>',
  poing: '<path d="M6 4h9a3 3 0 0 1 3 3v2h1a2 2 0 0 1 2 2v4a6 6 0 0 1-6 6H9a5 5 0 0 1-5-5V6a2 2 0 0 1 2-2Z"/>',
  quantique: '<g fill="none" stroke="currentColor" stroke-width="1.7"><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/></g><circle cx="12" cy="12" r="2"/>',
  prisme: '<path d="M12 2 21 8v8l-9 6-9-6V8l9-6Zm0 3.3L6 9.2v5.6l6 3.9 6-3.9V9.2l-6-3.9Z"/><path d="M12 8.5 15 12l-3 3.5L9 12Z"/>',
  soleil: '<circle cx="12" cy="12" r="4.5"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/></g>',
  spirale: '<path d="M12 2a10 10 0 1 1-9.4 13.4l1.9-.7A8 8 0 1 0 12 4a6 6 0 1 0 5.6 8.1l1.9.7A8 8 0 1 1 12 4V2Z"/><circle cx="12" cy="12" r="2.2"/>',
  goutte: '<path d="M12 1.9c4.4 5.4 6.7 8.7 6.7 11.6a6.7 6.7 0 1 1-13.4 0C5.3 10.6 7.6 7.3 12 1.9Z"/>',
  feuille: '<path d="M11.2 22.4v-6.2c-2.8.2-5-.6-6.5-2.4C3.2 11.9 2.6 9 2.8 5.2c3.8.3 6.6 1.4 8.2 3.4.4.5.7 1 1 1.6.3-.6.6-1.1 1-1.6 1.6-2 4.4-3.1 8.2-3.4.2 3.8-.4 6.7-1.9 8.6-1.5 1.8-3.7 2.6-6.5 2.4v6.2h-1.6Z"/>',
  oeil: '<path d="M12 5c5 0 9 4.5 10 7-1 2.5-5 7-10 7S3 14.5 2 12c1-2.5 5-7 10-7Zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><circle cx="12" cy="12" r="1.8"/>',
  etoile: '<path d="M12 1.4 14.8 9.2 22.6 12l-7.8 2.8L12 22.6 9.2 14.8 1.4 12l7.8-2.8L12 1.4Z"/>',
  sceau: '<path d="M12 2 22 12 12 22 2 12Zm0 4.2L6.2 12 12 17.8 17.8 12 12 6.2Z"/><path d="M12 9.3 14.7 12 12 14.7 9.3 12Z"/>',
  chaos: '<path d="M12 2 14 9l7-2-5 5 5 5-7-2-2 7-2-7-7 2 5-5-5-5 7 2Z"/>'
};
window.REY_ELEMENTS = {
  hsr: {
    "Physique": { c: "#c9ccd6", i: PICTO.poing }, "Feu": { c: "#ff6a4d", i: PICTO.flamme },
    "Glace": { c: "#8fd8ff", i: PICTO.flocon }, "Foudre": { c: "#c77dff", i: PICTO.eclair },
    "Vent": { c: "#5fe0a8", i: PICTO.vent }, "Quantique": { c: "#7b7dff", i: PICTO.quantique },
    "Imaginaire": { c: "#f5d76e", i: PICTO.prisme }
  },
  wuwa: {
    "Glacio": { c: "#6fc8f2", i: PICTO.flocon }, "Fusion": { c: "#ff6b4a", i: PICTO.flamme },
    "Electro": { c: "#b67cff", i: PICTO.eclair }, "Aero": { c: "#55e0b0", i: PICTO.vent },
    "Spectro": { c: "#f2d86b", i: PICTO.soleil }, "Havoc": { c: "#d94f8a", i: PICTO.spirale }
  },
  nte: {
    "Anima": { c: "#6ee0a0", i: PICTO.feuille }, "Chaos": { c: "#ff5577", i: PICTO.chaos },
    "Cosmos": { c: "#8a8cff", i: PICTO.etoile }, "Incantation": { c: "#ffb347", i: PICTO.sceau },
    "Lakshana": { c: "#ff7ad9", i: PICTO.oeil }, "Psyche": { c: "#5fd0ff", i: PICTO.spirale }
  }
};

// Genshin : couleurs et pictogrammes d'éléments (repris de ton site)
window.REY_GENSHIN = {
  couleurs: { Pyro: "#ff6b47", Hydro: "#3db7e4", Anemo: "#4dd8b0", Electro: "#b57bd4", Dendro: "#9bd13b", Cryo: "#7fdef0", Geo: "#e8b33c", Polyvalent: "#d9b96b" },
  icones: {
    Pyro: '<path fill-rule="evenodd" d="M12 1.6c.6 2.9 2 4.5 3.5 6.1 1.9 2 3.6 4 3.6 7A7.1 7.1 0 0 1 4.9 14.7c0-2 .7-3.7 1.8-5.3.1 1.3.6 2.4 1.5 3.2C8 8.6 9.3 5 12 1.6Z"/>',
    Hydro: '<path fill-rule="evenodd" d="M12 1.9c4.4 5.4 6.7 8.7 6.7 11.6a6.7 6.7 0 1 1-13.4 0C5.3 10.6 7.6 7.3 12 1.9ZM9.2 13.2a1 1 0 0 0-2 0 5 5 0 0 0 5 5 1 1 0 0 0 0-2 3 3 0 0 1-3-3Z"/>',
    Anemo: '<path d="M2.5 6.6h9.8a2.3 2.3 0 1 0-2.2-2.9l-2-.4A4.3 4.3 0 1 1 12.3 8.6H2.5V6.6Z"/><path d="M2.5 11.4h13a2.7 2.7 0 1 1-2.6 3.4l-2 .5a4.8 4.8 0 1 0 4.6-6H2.5v2.1Z"/>',
    Electro: '<path d="M14.2 1.2 3.6 13.9h6.3l-1.4 9.3 10.9-12.9h-6.6l1.4-9.1Z"/>',
    Dendro: '<path d="M11.2 22.4v-6.2c-2.8.2-5-.6-6.5-2.4C3.2 11.9 2.6 9 2.8 5.2c3.8.3 6.6 1.4 8.2 3.4.4.5.7 1 1 1.6.3-.6.6-1.1 1-1.6 1.6-2 4.4-3.1 8.2-3.4.2 3.8-.4 6.7-1.9 8.6-1.5 1.8-3.7 2.6-6.5 2.4v6.2h-1.6Z"/>',
    Cryo: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6"/></g>',
    Geo: '<path d="M7.3 1.8h9.4l4.6 6.5L12 22.6 2.7 8.3l4.6-6.5Z"/>',
    Polyvalent: '<path d="M12 1.4 14.8 9.2 22.6 12l-7.8 2.8L12 22.6 9.2 14.8 1.4 12l7.8-2.8L12 1.4Z"/>'
  },
  armes: ["Épée", "Claymore", "Lance", "Arc", "Catalyseur"]
};
window.REY_ELEMENTS.genshin = Object.fromEntries(Object.keys(window.REY_GENSHIN.couleurs).map((k) => [k, { c: window.REY_GENSHIN.couleurs[k], i: window.REY_GENSHIN.icones[k] }]));

window.REY_TYPES_EVENEMENT = {
  giveaway: { label: "Giveaway", icone: "🎁" },
  live: { label: "Live", icone: "🔴" },
  concours: { label: "Concours", icone: "🏆" },
  defi: { label: "Défi", icone: "🎯" }
};

// Badges calculés automatiquement à partir de l'activité.
window.REY_BADGES = [
  { id: "fondateur", label: "Pionnier", desc: "Parmi les 20 premiers membres", test: (s) => s.rang <= 20 },
  { id: "batisseur", label: "Bâtisseur", desc: "3 builds publiés", test: (s) => s.builds >= 3 },
  { id: "archiviste", label: "Archiviste", desc: "3 souvenirs partagés", test: (s) => s.souvenirs >= 3 },
  { id: "fidele", label: "Fidèle", desc: "A participé à 3 événements", test: (s) => s.participations >= 3 },
  { id: "polyvalent", label: "Polyvalent", desc: "Suit les 4 jeux", test: (s) => s.jeux >= 4 },
  { id: "moderation", label: "Équipe", desc: "Modérateur ou admin", test: (s) => s.role !== "membre" }
];

// ============================================================
//  DONNÉES DE DÉMONSTRATION (utilisées seulement en mode démo)
// ============================================================
window.REY_DEMO = (function () {
  // Fausse capture d'écran pour la démo (les vrais membres envoient les leurs)
  const capture = (titre, couleur, ligne) => "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#1c1533"/>` +
    `<rect x="40" y="40" width="460" height="640" rx="24" fill="${couleur}" opacity=".35"/>` +
    `<g fill="#3a2d63">${[0, 1, 2, 3, 4].map((i) => `<rect x="540" y="${60 + i * 110}" width="700" height="86" rx="14"/>`).join("")}</g>` +
    `<text x="270" y="380" font-family="sans-serif" font-size="46" font-weight="700" fill="#fff" text-anchor="middle">${titre}</text>` +
    `<text x="890" y="690" font-family="sans-serif" font-size="26" fill="#a99cc9" text-anchor="middle">${ligne || "Exemple de capture de build"}</text></svg>`);
  const j = (n) => new Date(Date.now() - n * 86400000).toISOString();
  const futur = (h) => new Date(Date.now() + h * 3600000).toISOString();
  const profils = [
    { id: "u1", username: "Rey", avatar_url: "", games: ["genshin", "hsr", "wuwa", "nte"], bio: "Fondateur de la Reyancerie.", role: "admin", created_at: j(400) },
    { id: "u2", username: "Lina", avatar_url: "", games: ["genshin", "wuwa"], bio: "Main Hydro, toujours partante pour la coop.", role: "modo", created_at: j(350) },
    { id: "u3", username: "Kaito", avatar_url: "", games: ["hsr", "genshin"], bio: "Theorycraft et Univers virtuel.", role: "membre", created_at: j(300) },
    { id: "u4", username: "Sora", avatar_url: "", games: ["wuwa", "nte"], bio: "Screenshots et exploration.", role: "membre", created_at: j(120) },
    { id: "u5", username: "Maé", avatar_url: "", games: ["genshin"], bio: "F2P fière.", role: "membre", created_at: j(40) }
  ];
  const builds = [
    { id: "b1", author_id: "u2", game: "genshin", character: "Furina", title: "Furina soutien full PV", fields: { arme: "Épée de Favonius", artefacts: "Troupe dorée 4p", stats: "PV% / PV% / Taux CRIT", talents: "1 / 10 / 10", constellation: "C0", equipe: "Neuvillette, Kazuha, Baizhu" }, notes: "Ne pas négliger la recharge : viser ~180 %.", created_at: j(2), likes: ["u1", "u3", "u5"], statut: "approuve", images: [capture("Furina", "#3db7e4"), capture("Furina", "#3db7e4", "Artefacts")] },
    { id: "b2", author_id: "u3", game: "hsr", character: "Achéron", title: "Acheron hypercarry", fields: { cone: "Son cône signature", reliques: "Set Foudre 4p", ornements: "Set ornement CRIT", stats: "DGT CRIT / ATQ% / Bonus DGT Foudre / ATQ%", traces: "6 / 10 / 10 / 10", eidolon: "E0", equipe: "Pela, Silver Wolf, Aventurine" }, notes: "Deux débuffeurs pour lancer l'ultime au bon moment.", created_at: j(1), likes: ["u1"], statut: "approuve", images: [capture("Acheron", "#c9a2ff")] },
    { id: "b3", author_id: "u4", game: "wuwa", character: "Jiyan", title: "Jiyan double DPS", fields: { arme: "Son arme signature", echos: "Set Aero 5p + écho principal Aero", stats: "4-4-3-1-1, Taux CRIT", forte: "Libération > Forte > Compétence", chaine: "S0", equipe: "Mortefi, Verina" }, notes: "", created_at: j(4), likes: ["u2"], statut: "approuve", images: [capture("Jiyan", "#5fe0c3")] },
    { id: "b4", author_id: "u5", game: "genshin", character: "Xiangling", title: "Xiangling F2P avec La Prise", fields: { arme: "La Prise", artefacts: "Emblème du destin brisé 4p", stats: "Recharge / Bonus DGT Pyro / Taux CRIT", talents: "1 / 8 / 9", constellation: "C6", equipe: "Bennett, Xingqiu, Sucrose" }, notes: "Build 100 % gratuit, largement suffisant pour l'Abîme.", created_at: j(7), likes: ["u1", "u2"], statut: "approuve", images: [capture("Xiangling", "#ff6b47")] },
    { id: "b6", author_id: "u3", game: "genshin", character: "Furina", title: "Furina DPS hors terrain", fields: { arme: "Épée de Favonius", artefacts: "Troupe dorée 4p", stats: "PV% / Bonus DGT Hydro / DGT CRIT", talents: "1 / 10 / 9", constellation: "C1", equipe: "Neuvillette, Kaedehara Kazuha, Baizhu" }, notes: "Exemple de deuxième build sur le même personnage.", created_at: j(5), likes: ["u2"], statut: "approuve", images: [capture("Furina", "#3db7e4")] },
    { id: "b7", author_id: "u5", game: "genshin", character: "Navia", title: "Ma Navia (en attente de validation)", fields: {}, notes: "Exemple de build qui attend la modération.", created_at: j(0.1), likes: [], statut: "en_attente", images: [capture("Navia", "#e8b33c", "En attente de modération")] },
    { id: "b5", author_id: "u1", game: "nte", character: "Zankou", title: "Zankou, premier build NTE", fields: { arme: "", equipement: "", stats: "", competences: "", equipe: "" }, notes: "On définit ensemble le vocabulaire du jeu sur Discord.", created_at: j(0.3), likes: [], statut: "approuve", images: [capture("NTE", "#ff9a86")] }
  ];
  const evenements = [
    { id: "e1", game: "genshin", type: "giveaway", title: "Giveaway #07 — Noël", description: "Une Bénédiction de la lune à gagner chaque soir de la semaine.", starts_at: j(270), ends_at: j(263), winners: "Lina, Kaito, Maé", live_url: "", created_by: "u1", participants: ["u2", "u3", "u5"] },
    { id: "e2", game: "hsr", type: "defi", title: "Défi : Univers virtuel sans perdre de PV", description: "Screenshot du résultat à poster en souvenir.", starts_at: j(30), ends_at: j(23), winners: "Kaito", live_url: "", created_by: "u2", participants: ["u3", "u1"] },
    { id: "e3", game: null, type: "live", title: "Live communautaire — review de vos comptes", description: "On regarde vos comptes en direct et on vous dit quoi monter en priorité.", starts_at: futur(8), ends_at: futur(11), winners: "", live_url: "", created_by: "u1", participants: ["u2", "u4"] },
    { id: "e4", game: "wuwa", type: "concours", title: "Concours photo : le plus beau paysage", description: "Un screenshot par membre, vote sur Discord.", starts_at: j(1), ends_at: futur(96), winners: "", live_url: "", created_by: "u2", participants: ["u4"] }
  ];
  const souvenirs = [
    { id: "m5", kind: "dessin", character: "Furina", author_id: "u5", game: "genshin", event_id: null, title: "Furina au tribunal (dessin)", description: "Exemple de création : un dessin posté par un membre.", image_url: "", link_url: "", happened_on: j(1).slice(0, 10), created_at: j(1), likes: ["u1", "u2"] },
    { id: "m7", kind: "screenshot", character: "Jiyan", author_id: "u4", game: "wuwa", event_id: null, title: "Screenshot à vérifier", description: "Exemple de souvenir signalé deux fois.", image_url: capture("Jiyan", "#5fe0c3", "Signalé 2 fois"), link_url: "", happened_on: j(0.2).slice(0, 10), created_at: j(0.2), likes: [], statut: "approuve" },
    { id: "m6", kind: "screenshot", character: "Xiangling", author_id: "u2", game: "genshin", event_id: null, title: "Guoba en pleine forme", description: "", image_url: "", link_url: "", happened_on: j(6).slice(0, 10), created_at: j(6), likes: [] },
    { id: "m1", kind: "souvenir", character: "", author_id: "u2", game: "genshin", event_id: "e1", title: "Le tirage du Giveaway #07", description: "213 participants, record battu.", image_url: "", link_url: "", happened_on: j(263).slice(0, 10), created_at: j(263), likes: ["u1", "u5"] },
    { id: "m2", author_id: "u3", game: "hsr", event_id: "e2", title: "Univers virtuel en 0 dégât", description: "Personne n'y croyait.", image_url: "", link_url: "", happened_on: j(24).slice(0, 10), created_at: j(24), likes: ["u1"] },
    { id: "m3", author_id: "u4", game: "wuwa", event_id: null, title: "Coucher de soleil à Jinzhou", description: "", image_url: "", link_url: "", happened_on: j(3).slice(0, 10), created_at: j(3), likes: ["u2", "u3"] },
    { id: "m4", author_id: "u1", game: null, event_id: null, title: "Le serveur passe les 500 membres", description: "Merci à tous.", image_url: "", link_url: "", happened_on: j(90).slice(0, 10), created_at: j(90), likes: ["u2", "u3", "u4", "u5"] }
  ];
  souvenirs.forEach((m) => { if (!m.statut) m.statut = "approuve"; });
  const signalements = [
    { target_type: "memory", target_id: "m7", user_id: "u2", reason: "Hors sujet", created_at: j(0.1) },
    { target_type: "memory", target_id: "m7", user_id: "u3", reason: "Inapproprié", created_at: j(0.05) }
  ];
  return { profils, builds, evenements, souvenirs, signalements };
})();
