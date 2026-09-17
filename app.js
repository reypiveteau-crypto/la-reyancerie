// ============================================================
//  LA REYANCERIE — APPLICATION
// ============================================================
(function () {
  const S = window.REY_STORE;
  const JEUX = window.REY_JEUX;
  const TYPES = window.REY_TYPES_EVENEMENT;
  const CFG = window.REY_CONFIG;
  const $app = document.getElementById("app");
  let ME = null;

  // ---------- utilitaires
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const jeu = (slug) => JEUX.find((g) => g.slug === slug);
  const G = window.REY_GENSHIN;
  const TYPES_POST = window.REY_TYPES_POST;
  const IMGS = window.REY_IMAGES || {}; // images embarquées (aperçu uniquement)
  const EXT = [".png", ".jpg", ".jpeg", ".webp"];
  const slugNom = (nom) => String(nom).toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[«»]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  // Retrouve une fiche du roster par id ou par nom (« Kazuha » trouve « Kaedehara Kazuha »)
  function persoDe(slugJeu, cle) {
    const g = jeu(slugJeu);
    if (!g || !g.roster || !cle) return null;
    return g.roster.find((p) => p.id === cle || p.nom === cle)
      || g.roster.find((p) => p.nom.endsWith(" " + cle)) || null;
  }
  // Portrait : Genshin à la racine du dépôt, les autres jeux dans leur dossier (hsr/, wuwa/, nte/)
  function srcPortrait(g, p) {
    const dossier = (g.ui && g.ui.images && g.ui.images.dossier) || "";
    if (IMGS[dossier + p.id]) return IMGS[dossier + p.id];
    if (p.image) return p.image;
    const liste = (g.ui && g.ui.images && g.ui.images.liste) || [];
    const e = liste.find((x) => x === p.id || x.startsWith(p.id + "."));
    return e ? dossier + (e.includes(".") ? e : e + ".png") : "";
  }
  const PALETTES = window.REY_ELEMENTS || {};
  const palette = (g) => PALETTES[(g.ui && g.ui.elements) || ""] || {};
  const srcIcone = (dossier, nom) => IMGS[dossier + "/" + slugNom(nom)] || dossier + "/" + slugNom(nom) + ".png";
  const couleurPerso = (g, p) => ((palette(g)[p.element] || {}).c || g.couleur);
  const iconeEl = (g, el, t) => `<svg viewBox="0 0 24 24" width="${t || 16}" height="${t || 16}" fill="currentColor" aria-hidden="true">${(palette(g)[el] || {}).i || ""}</svg>`;
  const etoiles = (g, n) => (n ? `<span class="etoiles r${n}">${g.ui ? g.ui.rang(n) : "★".repeat(n)}</span>` : "");
  // « de Furina » / « d'Achéron »
  const de = (nom) => (/^[aeiouyhàâéèêëîïôöûüœ]/i.test(nom) ? "d'" : "de ") + esc(nom);
  const estSouvenir = (m) => !m.kind || m.kind === "souvenir";
  const MAX_IMAGES_BUILD = 4;
  const MAX_OCTETS = 5 * 1024 * 1024;
  const TYPES_IMAGE = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  const RAISONS = ["Contenu inapproprié", "Contenu choquant ou violent", "Hors sujet", "Spam ou publicité", "Image volée"];
  const enAttente = (o) => o.statut === "en_attente";
  const pastilleAttente = (o) => enAttente(o) ? `<span class="attente" title="Visible seulement par toi et l'équipe tant qu'un modérateur ne l'a pas validée">En attente de validation</span>` : "";
  function verifierImages(fichiers, max) {
    if (fichiers.length > max) throw new Error(max + " image" + (max > 1 ? "s" : "") + " maximum");
    fichiers.forEach((f) => {
      if (!TYPES_IMAGE.includes(f.type)) throw new Error("« " + f.name + " » n'est pas une image PNG, JPEG, WebP ou GIF");
      if (f.size > MAX_OCTETS) throw new Error("« " + f.name + " » dépasse 5 Mo");
    });
  }
  // Bouton « Signaler » : un premier clic ouvre le choix du motif
  const boutonSignaler = (type, id, auteur) => ME && ME.id !== auteur
    ? `<details class="signaler"><summary>Signaler</summary><div class="signaler-choix">${RAISONS.map((r) => `<button type="button" data-signaler="${type}" data-id="${esc(id)}" data-raison="${esc(r)}">${esc(r)}</button>`).join("")}</div></details>`
    : "";

  let themeCourant = "";

  // Image absente : on essaie les autres extensions, puis on retire l'image proprement.
  document.addEventListener("error", (ev) => {
    const img = ev.target;
    if (!(img instanceof HTMLImageElement) || !img.dataset.repli) return;
    const src = img.getAttribute("src") || "";
    const i = src.lastIndexOf(".");
    const ext = i > -1 ? src.slice(i).toLowerCase() : "";
    const suivante = EXT[EXT.indexOf(ext) + 1];
    if (EXT.includes(ext) && suivante) { img.setAttribute("src", src.slice(0, i) + suivante); return; }
    if (img.dataset.repli === "banniere") {
      // pas d'image : on garde la bannière dessinée
      const ban = document.getElementById("banniere-accueil");
      ban.classList.remove("avec-image");
      img.remove();
      return;
    }
    if (img.dataset.repli === "vide") img.parentElement && img.parentElement.classList.add("icone-vide");
    img.remove();
  }, true);

  const urlSure = (u) => (/^(https?:|data:image\/)/i.test(u || "") ? u : "");
  const dateFr = (iso, heure) => {
    if (!iso) return "";
    const d = new Date(iso);
    const o = { day: "numeric", month: "long", year: "numeric" };
    if (heure) Object.assign(o, { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("fr-FR", o);
  };
  const ilYa = (iso) => {
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 60) return "à l'instant";
    if (s < 3600) return "il y a " + Math.floor(s / 60) + " min";
    if (s < 86400) return "il y a " + Math.floor(s / 3600) + " h";
    const j = Math.floor(s / 86400);
    return j === 1 ? "hier" : j < 30 ? "il y a " + j + " jours" : dateFr(iso);
  };
  const statut = (e) => {
    const n = Date.now(), d = new Date(e.starts_at), f = e.ends_at ? new Date(e.ends_at) : new Date(+d + 3 * 3600000);
    return n < d ? "avenir" : n > f ? "termine" : "encours";
  };
  const STATUT_LABEL = { avenir: "À venir", encours: "En cours", termine: "Terminé" };

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  function avatar(p, taille) {
    const cls = "avatar" + (taille ? " avatar-" + taille : "");
    if (p && urlSure(p.avatar_url)) return `<img class="${cls}" src="${esc(p.avatar_url)}" alt="">`;
    const nom = (p && p.username) || "?";
    let h = 0; for (const c of nom) h = (h * 31 + c.charCodeAt(0)) % 360;
    return `<span class="${cls}" style="--h:${h}" aria-hidden="true">${esc(nom[0].toUpperCase())}</span>`;
  }
  const pastilleJeu = (slug) => {
    const g = jeu(slug);
    return g ? `<span class="jeu-tag" style="--c:${g.couleur}">${esc(g.court)}</span>` : `<span class="jeu-tag jeu-tag-tous">Communauté</span>`;
  };
  const vide = (msg, action) => `<div class="vide"><p>${msg}</p>${action || ""}</div>`;
  const doitSeConnecter = () => `<div class="vide"><p>Connecte-toi avec Discord pour faire ça.</p><button class="btn btn-discord" data-action="login">Se connecter avec Discord</button></div>`;
  const estEquipe = () => ME && (ME.role === "admin" || ME.role === "modo");

  async function profilsParId() {
    const m = {};
    (await S.profiles()).forEach((p) => (m[p.id] = p));
    return m;
  }

  // ---------- emblèmes des jeux (dessins originaux, pas les logos officiels)
  const EMBLEMES = {
    // Étoile de Teyvat : rose des vents à 8 branches dans un cercle gravé
    genshin: `<circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="1.5 4"/>
      <g class="em-tourne">
        <path d="M50 22 53 47 78 50 53 53 50 78 47 53 22 50 47 47Z" transform="rotate(45 50 50)" fill="currentColor" opacity=".45"/>
        <path d="M50 6 56 44 94 50 56 56 50 94 44 56 6 50 44 44Z" fill="currentColor"/>
      </g>
      <circle cx="50" cy="50" r="7" fill="#fff"/><circle cx="50" cy="50" r="3" fill="currentColor"/>
      <g fill="currentColor"><path d="M50 1l2 3-2 3-2-3z"/><path d="M50 93l2 3-2 3-2-3z"/><path d="M1 50l3-2 3 2-3 2z"/><path d="M93 50l3-2 3 2-3 2z"/></g>`,
    // Rail stellaire : planète à anneau, rail de lumière et étoile
    hsr: `<path d="M4 96 C30 78 58 52 96 8" fill="none" stroke="currentColor" stroke-width="10" stroke-dasharray="1.6 5.5" opacity=".55"/>
      <path d="M4 96 C30 78 58 52 96 8" fill="none" stroke="#fff" stroke-width="1.4"/>
      <circle cx="44" cy="46" r="21" fill="currentColor"/>
      <path d="M31 36a20 20 0 0 1 20-10" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/>
      <ellipse cx="44" cy="46" rx="38" ry="11" transform="rotate(-22 44 46)" fill="none" stroke="currentColor" stroke-width="3"/>
      <path d="M44 25a21 21 0 0 1 0 42" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="10" opacity=".4"/>
      <path class="em-scintille" d="M82 70l2.5 7 7 2.5-7 2.5-2.5 7-2.5-7-7-2.5 7-2.5z" fill="#fff"/>
      <circle cx="18" cy="18" r="1.8" fill="#fff"/><circle cx="72" cy="22" r="1.2" fill="#fff"/>`,
    // Onde de résonance : cristal central, arcs d'écho et vague
    wuwa: `<g fill="none" stroke="currentColor" stroke-linecap="round">
        <path class="em-onde1" d="M30 24a36 36 0 0 0 0 52M70 24a36 36 0 0 1 0 52" stroke-width="3"/>
        <path class="em-onde2" d="M18 12a52 52 0 0 0 0 76M82 12a52 52 0 0 1 0 76" stroke-width="2" opacity=".6"/>
        <path d="M4 94c6-6 10-6 16 0s10 6 16 0 10-6 16 0 10 6 16 0 10-6 16 0 10 6 16 0" stroke-width="2.4"/>
      </g>
      <path d="M50 14 64 48 50 82 36 48Z" fill="currentColor"/>
      <path d="M50 14 50 82 36 48Z" fill="#fff" opacity=".35"/>
      <path d="M50 30 56 48 50 66 44 48Z" fill="#fff" opacity=".8"/>`,
    // Néon urbain : ligne de toits, anneau néon et éclair
    nte: `<circle class="em-neon" cx="64" cy="30" r="20" fill="none" stroke="currentColor" stroke-width="4"/>
      <circle cx="64" cy="30" r="12" fill="none" stroke="#fff" stroke-width="1.2" opacity=".7"/>
      <path d="M4 96V62h12V48h10v22h8V36h16v28h8V52h14v12h8V44h16v52Z" fill="currentColor" opacity=".9"/>
      <g fill="#fff" opacity=".85"><rect x="40" y="42" width="3" height="3"/><rect x="45" y="50" width="3" height="3"/><rect x="40" y="58" width="3" height="3"/><rect x="8" y="68" width="3" height="3"/><rect x="72" y="58" width="3" height="3"/><rect x="86" y="52" width="3" height="3"/><rect x="86" y="62" width="3" height="3"/><rect x="17" y="56" width="3" height="3"/></g>
      <path class="em-eclair" d="M24 6 14 26h8l-4 14 14-22h-9l5-12z" fill="#ffe14d"/>`
  };
  // Image de fond d'une tuile de jeu : jeux/<slug>.png (ou .jpg/.jpeg/.webp), facultative
  const fondTuile = (g) => `<img class="tuile-fond" src="${esc(IMGS["jeux/" + g.slug] || "jeux/" + g.slug + ".png")}" alt="" loading="lazy" data-repli="cacher">`;
  const embleme = (g) => EMBLEMES[g.slug] ? `<svg class="tuile-embleme" viewBox="0 0 100 100" aria-hidden="true">${EMBLEMES[g.slug]}</svg>` : "";

  // ---------- cartes
  function carteBuild(b, auteurs) {
    const g = jeu(b.game), a = auteurs[b.author_id];
    const champs = g ? g.champs.filter((c) => b.fields && b.fields[c.cle]).slice(0, 2) : [];
    const img = urlSure((b.images || [])[0]);
    const nb = (b.images || []).length;
    return `<a class="carte carte-build" data-tilt href="#/build/${esc(b.id)}" style="--c:${g ? g.couleur : "#fff"}">
      <div class="build-visuel">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : `<span>${esc(b.character)}</span>`}${nb > 1 ? `<span class="nb-images">${nb} images</span>` : ""}</div>
      <div class="carte-haut">${pastilleJeu(b.game)}${pastilleAttente(b)}<span class="coeur ${b.liked ? "on" : ""}">♥ ${b.like_count}</span></div>
      <div class="build-perso">${esc(b.character)}</div>
      <div class="build-titre">${esc(b.title)}</div>
      <dl class="mini-champs">${champs.map((c) => `<dt>${esc(c.label.split(" (")[0])}</dt><dd>${esc(b.fields[c.cle])}</dd>`).join("")}</dl>
      <div class="carte-bas">${avatar(a, "s")}<span>${esc(a ? a.username : "Membre")}</span><span class="faible">· ${ilYa(b.created_at)}</span></div>
    </a>`;
  }

  function carteSouvenir(m, auteurs) {
    const g = jeu(m.game), a = auteurs[m.author_id];
    const img = urlSure(m.image_url);
    const perso = m.character ? persoDe(m.game, m.character) : null;
    const typeLabel = estSouvenir(m) ? "" : (TYPES_POST[m.kind] || "Création");
    return `<article class="carte souvenir" style="--c:${g ? g.couleur : "#f5c86b"}">
      <div class="souvenir-visuel">${img ? `<img src="${esc(img)}" alt="${esc(m.title)}" loading="lazy" data-zoom>` : `<span class="souvenir-date">${esc(typeLabel || dateFr(m.happened_on))}</span>`}</div>
      <div class="souvenir-corps">
        <div class="carte-haut"><span class="tags">${pastilleJeu(m.game)}${typeLabel ? `<span class="type-tag">${esc(typeLabel)}</span>` : ""}${m.character ? (perso ? `<a class="perso-tag" href="#/jeu/${esc(m.game)}/${esc(perso.id)}">${esc(m.character)}</a>` : `<span class="perso-tag">${esc(m.character)}</span>`) : ""}</span><button class="coeur ${m.liked ? "on" : ""}" data-like="memory" data-id="${esc(m.id)}" aria-label="J'aime">♥ ${m.like_count}</button></div>
        ${pastilleAttente(m)}
        <h3>${esc(m.title)}</h3>
        ${m.description ? `<p>${esc(m.description)}</p>` : ""}
        ${urlSure(m.link_url) && !/^data:/.test(m.link_url) ? `<p><a class="lien" href="${esc(m.link_url)}" target="_blank" rel="noopener">Voir le clip / lien ↗</a></p>` : ""}
        <div class="carte-bas">${avatar(a, "s")}<a href="#/membre/${esc(m.author_id)}">${esc(a ? a.username : "Membre")}</a><span class="faible">· ${esc(dateFr(m.happened_on))}</span>
        ${ME && (ME.id === m.author_id || estEquipe()) ? `<button class="lien-discret" data-suppr-souvenir="${esc(m.id)}">Supprimer</button>` : ""}</div>
        ${img ? boutonSignaler("memory", m.id, m.author_id) : ""}
      </div>
    </article>`;
  }

  function carteEvenement(e) {
    const t = TYPES[e.type] || { label: e.type, icone: "•" };
    const st = statut(e);
    return `<a class="carte evt evt-${st}" href="#/evenement/${esc(e.id)}">
      <div class="evt-date"><span>${new Date(e.starts_at).toLocaleDateString("fr-FR", { day: "2-digit" })}</span><small>${new Date(e.starts_at).toLocaleDateString("fr-FR", { month: "short" })}</small></div>
      <div class="evt-corps">
        <div class="carte-haut"><span class="evt-type">${t.icone} ${esc(t.label)}</span><span class="statut statut-${st}">${STATUT_LABEL[st]}</span></div>
        <h3>${esc(e.title)}</h3>
        <div class="faible">${pastilleJeu(e.game)} · ${e.participant_count} participant${e.participant_count > 1 ? "s" : ""}${e.winners ? " · Gagnants : " + esc(e.winners) : ""}</div>
      </div>
    </a>`;
  }

  // ---------- PAGES
  const pages = {};

  pages.accueil = async () => {
    const [builds, mems, evts, auteurs] = await Promise.all([S.builds(), S.memories(), S.events(), profilsParId()]);
    const jour = Date.now() - 86400000;
    const buildsJour = builds.filter((b) => +new Date(b.created_at) > jour).length;
    const memsSemaine = mems.filter((m) => +new Date(m.created_at) > Date.now() - 7 * 86400000).length;
    const actifs = evts.filter((e) => statut(e) !== "termine").sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    const top = builds.slice().sort((a, b) => b.like_count - a.like_count)[0];
    const mesJeux = ME && ME.games && ME.games.length ? ME.games : JEUX.map((g) => g.slug);
    const nbMembres = Object.keys(auteurs).length;
    const nbPersos = JEUX.reduce((t, g) => t + (g.roster ? g.roster.length : 0), 0);
    const fil = [
      ...builds.slice(0, 6).map((b) => ({ d: b.created_at, h: `<a href="#/build/${esc(b.id)}">${pastilleJeu(b.game)} <b>${esc((auteurs[b.author_id] || {}).username || "Un membre")}</b> a partagé son build ${de(b.character)}</a>` })),
      ...mems.slice(0, 6).map((m) => ({ d: m.created_at, h: `<span>${pastilleJeu(m.game)} <b>${esc((auteurs[m.author_id] || {}).username || "Un membre")}</b> a ajouté « ${esc(m.title)} »</span>` }))
    ].sort((a, b) => b.d.localeCompare(a.d)).slice(0, 8).map((x) => x.h);
    const infos = [
      ...actifs.slice(0, 2).map((e) => `<a class="fil-fort fil-${statut(e)}" href="#/evenement/${esc(e.id)}">${(TYPES[e.type] || {}).icone || ""} <b>${statut(e) === "encours" ? "En cours" : "Bientôt"}</b> ${esc(e.title)}${statut(e) === "encours" ? "" : ` <small>${esc(dateFr(e.starts_at, true))}</small>`}</a>`),
      `<span class="fil-fort"><b>${buildsJour}</b> nouveau${buildsJour > 1 ? "x" : ""} build${buildsJour > 1 ? "s" : ""} aujourd'hui</span>`,
      `<span class="fil-fort"><b>${memsSemaine}</b> souvenir${memsSemaine > 1 ? "s" : ""} cette semaine</span>`,
      top ? `<a class="fil-fort" href="#/build/${esc(top.id)}"><b>♥ ${top.like_count}</b> Build le plus aimé : ${esc(top.character)}</a>` : ""
    ].filter(Boolean);
    const elements = [...infos, ...fil].map((h) => `<span class="fil-item">${h}<i aria-hidden="true">✦</i></span>`).join("");
    const bandeau = `<span class="fil-etiquette">En direct</span><div class="fil-piste"><div class="fil-defile">${elements}${elements.replace(/<a /g, '<a tabindex="-1" ')}</div></div>`;

    return { apres: () => { const f = document.getElementById("fil-direct"); f.innerHTML = bandeau; }, html: `
    <section class="accueil-tete">
      <h1 class="sr">${esc(CFG.NOM_SITE)}</h1>
      ${ME ? `<p class="bienvenue">Content de te revoir, <b>${esc(ME.username)}</b></p>` : `<button class="btn btn-discord" data-action="login">Se connecter avec Discord</button>`}
    </section>

    <section class="bloc">
      <div class="bloc-tete"><h2>${ME ? "Tes jeux" : "Les jeux"}</h2><a href="#/jeux" class="lien">Tous les jeux →</a></div>
      <div class="grille grille-jeux">
        ${mesJeux.map((s) => { const g = jeu(s); if (!g) return ""; const n = builds.filter((b) => b.game === s).length; return `<a class="tuile-jeu tuile-${g.slug}" data-tilt href="#/jeu/${g.slug}" style="--c:${g.couleur}">${fondTuile(g)}${embleme(g)}<span class="tuile-nom">${esc(g.nom)}</span><span class="tuile-chiffre">${n} build${n > 1 ? "s" : ""}</span></a>`; }).join("")}
      </div>
    </section>

    <section class="bloc">
      <div class="bloc-tete"><h2>Derniers builds</h2><a href="#/nouveau-build" class="btn btn-petit">+ Publier un build</a></div>
      <div class="grille">${builds.slice(0, 6).map((b) => carteBuild(b, auteurs)).join("") || vide("Aucun build pour l'instant.")}</div>
    </section>

    <section class="bloc">
      <div class="bloc-tete"><h2>Souvenirs et créations récents</h2><a href="#/memoire" class="lien">Toute la mémoire →</a></div>
      <div class="grille">${mems.slice(0, 3).map((m) => carteSouvenir(m, auteurs)).join("") || vide("Aucun souvenir pour l'instant.")}</div>
    </section>

    <section class="compteurs-accueil" aria-label="La communauté en chiffres">
      ${[
        ["membres", nbMembres, "Membres", "M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm-9 10a9 9 0 0 1 18 0Z"],
        ["builds", builds.length, "Builds partagés", "M4 4h10l6 6v10H4Zm9 1v6h6"],
        ["souvenirs", mems.length, "Souvenirs & créations", "M3 5h18v14H3Zm2 12h14l-4.5-6-3.5 4.5-2.5-3Z"],
        ["persos", nbPersos, "Personnages répertoriés", "M12 2l2.9 6.9L22 10l-5.5 4.8L18.2 22 12 18.3 5.8 22l1.7-7.2L2 10l7.1-1.1Z"]
      ].map(([k, n, l, d], i) => `<div class="compteur-c" style="--i:${i}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="currentColor"/></svg><b data-compte="${n}">${n}</b><span>${l}</span></div>`).join("")}
    </section>` };
  };

  pages.memoire = async (_, q) => {
    const filtre = q.get("jeu") || "";
    const [mems, evts, auteurs] = await Promise.all([S.memories(filtre ? { game: filtre } : {}), S.events(filtre ? { game: filtre } : {}), profilsParId()]);
    // Timeline : souvenirs + événements terminés, groupés par mois
    const items = [
      ...mems.filter(estSouvenir).map((m) => ({ date: m.happened_on, html: carteSouvenir(m, auteurs) })),
      ...evts.filter((e) => statut(e) === "termine").map((e) => ({ date: (e.ends_at || e.starts_at).slice(0, 10), html: carteEvenement(e) }))
    ].sort((a, b) => b.date.localeCompare(a.date));
    const mois = {};
    items.forEach((i) => { const k = i.date.slice(0, 7); (mois[k] = mois[k] || []).push(i); });

    return `
    <section class="page-tete">
      <p class="surtitre">Mémoire</p>
      <h1>Ce qu'on a vécu ensemble</h1>
      <p class="chapo">Moments marquants et archives des événements, du plus récent au plus ancien. Les dessins et screenshots d'un personnage sont rangés dans sa section.</p>
      <div class="actions"><a class="btn" href="#/nouveau-souvenir">+ Ajouter un souvenir</a></div>
    </section>
    ${filtresJeux("#/memoire", filtre)}
    <div class="timeline">
      ${Object.keys(mois).map((k) => `
        <section class="mois">
          <h2 class="mois-titre">${new Date(k + "-01T12:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h2>
          <div class="grille">${mois[k].map((i) => i.html).join("")}</div>
        </section>`).join("") || vide("Rien dans la mémoire pour ce filtre.")}
    </div>`;
  };

  function filtresJeux(base, actif) {
    return `<nav class="filtres" aria-label="Filtrer par jeu">
      <a href="${base}" class="${!actif ? "on" : ""}">Tout</a>
      ${JEUX.map((g) => `<a href="${base}?jeu=${g.slug}" class="${actif === g.slug ? "on" : ""}" style="--c:${g.couleur}">${esc(g.court)}</a>`).join("")}
    </nav>`;
  }

  pages.communaute = async () => {
    const [profils, builds, mems] = await Promise.all([S.profiles(), S.builds(), S.memories()]);
    return `
    <section class="page-tete">
      <p class="surtitre">Communauté</p>
      <h1>${profils.length} membre${profils.length > 1 ? "s" : ""}</h1>
      <p class="chapo">Chaque membre a son profil : ses jeux, ses builds, ses souvenirs et ses badges.</p>
    </section>
    <div class="grille grille-membres">
      ${profils.map((p) => {
        const nb = builds.filter((b) => b.author_id === p.id).length, ns = mems.filter((m) => m.author_id === p.id).length;
        return `<a class="carte membre" href="#/membre/${esc(p.id)}">
          ${avatar(p, "m")}
          <div><div class="membre-nom">${esc(p.username)} ${p.role !== "membre" ? `<span class="role">${p.role === "admin" ? "Admin" : "Modo"}</span>` : ""}</div>
          <div class="jeux-mini">${(p.games || []).map(pastilleJeu).join("")}</div>
          <div class="faible">${nb} build${nb > 1 ? "s" : ""} · ${ns} souvenir${ns > 1 ? "s" : ""}</div></div>
        </a>`;
      }).join("")}
    </div>`;
  };

  pages.membre = async ([id]) => {
    const p = await S.profile(id);
    if (!p) return vide("Ce membre n'existe pas.");
    const [builds, mems, profils, nbPart, auteurs] = await Promise.all([S.builds({ author: id }), S.memories({ author: id }), S.profiles(), S.participationCount(id), profilsParId()]);
    const rang = profils.slice().sort((a, b) => a.created_at.localeCompare(b.created_at)).findIndex((x) => x.id === id) + 1;
    const stats = { rang, builds: builds.length, souvenirs: mems.length, participations: nbPart, jeux: (p.games || []).length, role: p.role };
    const badges = window.REY_BADGES.filter((b) => b.test(stats));
    const activite = [
      ...builds.map((b) => ({ d: b.created_at, t: `Build de <a href="#/build/${esc(b.id)}">${esc(b.character)}</a>`, g: b.game })),
      ...mems.map((m) => ({ d: m.created_at, t: `Souvenir : ${esc(m.title)}`, g: m.game }))
    ].sort((a, b) => b.d.localeCompare(a.d)).slice(0, 6);
    const moi = ME && ME.id === id;

    return `
    <section class="profil-tete">
      ${avatar(p, "l")}
      <div>
        <p class="surtitre">Membre depuis ${new Date(p.created_at).getFullYear()}${p.role !== "membre" ? " · " + (p.role === "admin" ? "Admin" : "Modérateur") : ""}</p>
        <h1>${esc(p.username)}</h1>
        ${p.bio ? `<p class="chapo">${esc(p.bio)}</p>` : ""}
        <div class="jeux-mini">${(p.games || []).map(pastilleJeu).join("") || '<span class="faible">Aucun jeu suivi</span>'}</div>
        ${moi ? `<div class="actions"><a class="btn btn-petit" href="#/moi">Modifier mon profil</a></div>` : ""}
      </div>
    </section>
    <section class="compteurs">
      <div><b>${builds.length}</b><span>builds</span></div>
      <div><b>${mems.length}</b><span>souvenirs</span></div>
      <div><b>${nbPart}</b><span>événements</span></div>
      <div><b>#${rang}</b><span>arrivée</span></div>
    </section>
    <section class="bloc">
      <h2>Badges</h2>
      <div class="badges">${badges.map((b) => `<span class="badge" title="${esc(b.desc)}">${esc(b.label)}<small>${esc(b.desc)}</small></span>`).join("") || '<p class="faible">Pas encore de badge.</p>'}</div>
    </section>
    <section class="bloc">
      <h2>Dernière activité</h2>
      <ul class="activite">${activite.map((a) => `<li>${pastilleJeu(a.g)} ${a.t} <span class="faible">· ${ilYa(a.d)}</span></li>`).join("") || '<li class="faible">Rien pour l\'instant.</li>'}</ul>
    </section>
    <section class="bloc"><h2>Bibliothèque de builds</h2><div class="grille">${builds.map((b) => carteBuild(b, auteurs)).join("") || '<p class="faible">Aucun build publié.</p>'}</div></section>
    <section class="bloc"><h2>Souvenirs et créations</h2><div class="grille">${mems.map((m) => carteSouvenir(m, auteurs)).join("") || '<p class="faible">Aucun souvenir partagé.</p>'}</div></section>`;
  };

  pages.jeux = async () => {
    const [builds, mems, profils] = await Promise.all([S.builds(), S.memories(), S.profiles()]);
    return `
    <section class="page-tete"><p class="surtitre">Jeux</p><h1>${JEUX.length} jeux, une communauté</h1></section>
    <div class="grille grille-jeux-grands">
      ${JEUX.map((g) => {
        const nb = builds.filter((b) => b.game === g.slug).length, ns = mems.filter((m) => m.game === g.slug).length, nj = profils.filter((p) => (p.games || []).includes(g.slug)).length;
        return `<a class="tuile-jeu tuile-grande tuile-${g.slug}" data-tilt href="#/jeu/${g.slug}" style="--c:${g.couleur}">${fondTuile(g)}${embleme(g)}
          <span class="tuile-nom">${esc(g.nom)}</span>
          <span class="tuile-stats"><span><b>${nj}</b> joueur${nj > 1 ? "s" : ""}</span><span><b>${nb}</b> build${nb > 1 ? "s" : ""}</span><span><b>${ns}</b> souvenir${ns > 1 ? "s" : ""}</span></span>
        </a>`;
      }).join("")}
    </div>`;
  };

  pages.jeu = async ([slug, idPerso], q) => {
    const g = jeu(slug);
    if (!g) return vide("Ce jeu n'est pas (encore) sur la plateforme.");
    themeCourant = g.slug;
    if (g.roster && idPerso) return pagePerso(g, idPerso);
    if (g.roster) return pageRoster(g);
    const perso = q.get("perso") || "";
    const [builds, mems, evts, profils, auteurs] = await Promise.all([S.builds({ game: slug }), S.memories({ game: slug }), S.events({ game: slug }), S.profiles(), profilsParId()]);
    const joueurs = profils.filter((p) => (p.games || []).includes(slug));
    const parPerso = {};
    builds.forEach((b) => (parPerso[b.character] = (parPerso[b.character] || 0) + 1));
    const liste = perso ? builds.filter((b) => b.character === perso) : builds;

    return `
    <section class="page-tete jeu-tete" style="--c:${g.couleur}">
      <p class="surtitre">Jeu</p>
      <h1>${esc(g.nom)}</h1>
      <p class="chapo">${joueurs.length} membre${joueurs.length > 1 ? "s" : ""} y joue${joueurs.length > 1 ? "nt" : ""} · ${builds.length} build${builds.length > 1 ? "s" : ""} communautaire${builds.length > 1 ? "s" : ""}</p>
      <div class="actions"><a class="btn" href="#/nouveau-build?jeu=${g.slug}">+ Publier un build ${esc(g.court)}</a></div>
    </section>

    <section class="bloc">
      <h2>${esc(g.motEntite)}s partagés par la communauté</h2>
      <nav class="filtres">
        <a href="#/jeu/${g.slug}" class="${!perso ? "on" : ""}" style="--c:${g.couleur}">Tous</a>
        ${Object.keys(parPerso).sort().map((n) => `<a href="#/jeu/${g.slug}?perso=${encodeURIComponent(n)}" class="${perso === n ? "on" : ""}" style="--c:${g.couleur}">${esc(n)} <small>${parPerso[n]}</small></a>`).join("")}
      </nav>
      ${perso ? `<p class="chapo">${parPerso[perso] || 0} membre${(parPerso[perso] || 0) > 1 ? "s ont" : " a"} publié son build de ${esc(perso)}.</p>` : ""}
      <div class="grille">${liste.map((b) => carteBuild(b, auteurs)).join("") || vide("Aucun build pour l'instant. Sois le premier.", `<a class="btn" href="#/nouveau-build?jeu=${g.slug}">Publier un build</a>`)}</div>
    </section>

    <section class="bloc">
      <h2>Qui joue à ${esc(g.court)} ?</h2>
      <div class="joueurs">${joueurs.map((p) => `<a href="#/membre/${esc(p.id)}" class="joueur">${avatar(p, "s")}${esc(p.username)}</a>`).join("") || '<p class="faible">Personne pour l\'instant.</p>'}</div>
    </section>

    <section class="bloc"><h2>Événements ${esc(g.court)}</h2><div class="liste-evt">${evts.map(carteEvenement).join("") || '<p class="faible">Aucun événement.</p>'}</div></section>
    <section class="bloc"><h2>Souvenirs ${esc(g.court)}</h2><div class="grille">${mems.map((m) => carteSouvenir(m, auteurs)).join("") || '<p class="faible">Aucun souvenir.</p>'}</div></section>`;
  };

  // ======== JEU AVEC ROSTER (Genshin) : grille de tous les personnages
  const filtresRoster = { q: "", el: "", arme: "", rar: "" };
  let rosterOuvert = false;
  const RANGEES_VISIBLES = 2; // rangées affichées avant « Plus de personnages »

  // Barre pour passer d'un jeu à l'autre, en haut de chaque espace jeu
  const ongletsJeux = (actif) => `<nav class="onglets-jeux" aria-label="Changer de jeu">${JEUX.map((x) => `<a href="#/jeu/${x.slug}" class="${x.slug === actif ? "on" : ""}" style="--c:${x.couleur}">${esc(x.court)}</a>`).join("")}</nav>`;

  async function pageRoster(g) {
    themeCourant = g.slug;
    // Les filtres sont propres à chaque jeu : on repart de zéro en changeant de jeu
    if (filtresRoster.jeu !== g.slug) { Object.assign(filtresRoster, { jeu: g.slug, q: "", el: "", arme: "", rar: "" }); rosterOuvert = false; }
    const [builds, mems, evts, profils, auteurs] = await Promise.all([S.builds({ game: g.slug }), S.memories({ game: g.slug }), S.events({ game: g.slug }), S.profiles(), profilsParId()]);
    const compte = {};
    const ajoute = (nom) => { const p = persoDe(g.slug, nom); if (p) compte[p.id] = (compte[p.id] || 0) + 1; };
    builds.forEach((b) => ajoute(b.character));
    mems.forEach((m) => m.character && ajoute(m.character));
    const roster = g.roster.slice().sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    const pal = palette(g);
    const elements = Object.keys(pal).filter((e) => roster.some((p) => p.element === e));
    const armes = g.ui.armes.filter((a) => roster.some((p) => p.arme === a));
    const joueurs = profils.filter((p) => (p.games || []).includes(g.slug));
    const creations = mems.filter((m) => !estSouvenir(m));
    const puce = (groupe, val, html, couleur) => `<button type="button" class="puce ${filtresRoster[groupe] === val ? "on" : ""}" data-filtre="${groupe}" data-val="${esc(val)}"${couleur ? ` style="--c:${couleur}"` : ""}>${html}</button>`;

    return {
      html: `
      ${ongletsJeux(g.slug)}
      <section class="page-tete jeu-tete" style="--c:${g.couleur}">
        <p class="surtitre">${esc(g.ui.theme)}</p>
        <h1>${esc(g.nom)}</h1>
        <p class="chapo">${roster.length} personnages · ${builds.length} build${builds.length > 1 ? "s" : ""} et ${creations.length} création${creations.length > 1 ? "s" : ""} partagés par ${joueurs.length} membre${joueurs.length > 1 ? "s" : ""}. Clique sur un personnage pour voir son guide et tout ce que la communauté a publié sur lui.</p>
      </section>

      <section class="bloc">
        <div class="filtres-roster">
          <label class="sr" for="f-roster-q">Chercher un personnage</label>
          <input type="search" id="f-roster-q" placeholder="Chercher un personnage…" value="${esc(filtresRoster.q)}" autocomplete="off">
          <div class="puces" aria-label="${esc(g.ui.libelleElement)}">${elements.map((e) => puce("el", e, iconeEl(g, e) + `<span>${esc(e)}</span>`, pal[e].c)).join("")}</div>
          <div class="puces" aria-label="${esc(g.ui.libelleArme)}">${armes.map((a) => puce("arme", a, esc(a))).join("")}${g.ui.rangs.map((n) => puce("rar", String(n), esc(g.ui.rang(n) === "★".repeat(n) ? n + "★" : "Rang " + g.ui.rang(n)), n === 5 ? "var(--rang5)" : "var(--rang4)")).join("")}</div>
          <p class="faible roster-info"><span id="roster-compte"></span> <button type="button" class="lien-discret" data-filtre="reset">Effacer les filtres</button></p>
        </div>
        <div class="grille-persos" id="grille-persos">
          ${roster.map((p, i) => cartePerso(g, p, compte[p.id] || 0).replace('style="', `style="--i:${Math.min(i, 24)};`)).join("")}
        </div>
        <p class="vide" id="roster-vide" hidden>Aucun personnage ne correspond à ces filtres.</p>
        <button type="button" class="deroulant" id="roster-plus" data-roster-plus aria-expanded="false" aria-controls="grille-persos" hidden>
          <span class="deroulant-texte">Plus de personnages</span> <span class="deroulant-nb"></span> <span class="chevron" aria-hidden="true">▾</span>
        </button>
      </section>

      <section class="bloc">
        <div class="bloc-tete"><h2>Derniers builds de la communauté</h2><a class="btn btn-petit" href="#/nouveau-build?jeu=${g.slug}">+ Publier un build</a></div>
        <div class="grille">${builds.slice(0, 6).map((b) => carteBuild(b, auteurs)).join("") || vide("Aucun build pour l'instant.")}</div>
      </section>
      <section class="bloc">
        <div class="bloc-tete"><h2>Dernières créations</h2><a class="btn btn-petit btn-fantome" href="#/nouveau-souvenir?type=dessin&jeu=${g.slug}">+ Partager une création</a></div>
        <div class="grille">${creations.slice(0, 6).map((m) => carteSouvenir(m, auteurs)).join("") || vide("Aucune création pour l'instant.")}</div>
      </section>
      <section class="bloc">
        <h2>Qui joue à ${esc(g.court)} ?</h2>
        <div class="joueurs">${joueurs.map((p) => `<a href="#/membre/${esc(p.id)}" class="joueur">${avatar(p, "s")}${esc(p.username)}</a>`).join("") || '<p class="faible">Personne pour l\'instant.</p>'}</div>
      </section>
      <section class="bloc"><h2>Événements ${esc(g.court)}</h2><div class="liste-evt">${evts.map(carteEvenement).join("") || '<p class="faible">Aucun événement.</p>'}</div></section>`,
      apres: appliquerFiltresRoster
    };
  }

  function cartePerso(g, p, n) {
    const src = srcPortrait(g, p);
    // « Dan Heng • Imbibitor Lunae » : la variante passe sur une 2e ligne, plus petite
    const [base, ...reste] = p.nom.split(" • ");
    const variante = reste.join(" • ");
    return `<a class="perso" data-tilt title="${esc(p.nom)}" href="#/jeu/${g.slug}/${esc(p.id)}" data-el="${esc(p.element)}" data-arme="${esc(p.arme)}" data-rar="${p.rarete || ""}" data-nom="${esc(slugNom(p.nom))}" style="--el:${couleurPerso(g, p)}">
      <span class="perso-initiale" aria-hidden="true">${esc(p.nom[0])}</span>
      ${src ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async" data-repli="cacher">` : ""}
      <span class="perso-el" title="${esc(p.element)}">${iconeEl(g, p.element, 15)}</span>
      ${n ? `<span class="perso-compte" title="${n} publication${n > 1 ? "s" : ""} de la communauté">${n}</span>` : ""}
      <span class="perso-bas"><span class="perso-nom">${esc(base)}${variante ? `<small class="perso-variante">${esc(variante)}</small>` : ""}</span>${etoiles(g, p.rarete)}</span>
      <span class="reflet" aria-hidden="true"></span>
    </a>`;
  }

  function appliquerFiltresRoster() {
    const grille = document.getElementById("grille-persos");
    if (!grille) return;
    const f = filtresRoster, q = slugNom(f.q);
    const filtre = !!(f.el || f.arme || f.rar || q);
    const cartes = [...grille.querySelectorAll(".perso")];
    const ok = cartes.filter((c) => (!f.el || c.dataset.el === f.el) && (!f.arme || c.dataset.arme === f.arme) && (!f.rar || c.dataset.rar === f.rar) && (!q || c.dataset.nom.includes(q)));
    const n = ok.length;
    // Sans filtre : seules les premières rangées sont visibles, le reste est dans le menu déroulant.
    const colonnes = getComputedStyle(grille).gridTemplateColumns.split(" ").filter(Boolean).length || 1;
    const limite = filtre || rosterOuvert ? Infinity : colonnes * RANGEES_VISIBLES;
    cartes.forEach((c) => (c.hidden = true));
    ok.forEach((c, i) => (c.hidden = i >= limite));
    const plus = document.getElementById("roster-plus");
    plus.hidden = filtre || n <= colonnes * RANGEES_VISIBLES;
    plus.setAttribute("aria-expanded", String(rosterOuvert));
    plus.querySelector(".deroulant-texte").textContent = rosterOuvert ? "Moins de personnages" : "Plus de personnages";
    plus.querySelector(".deroulant-nb").textContent = rosterOuvert ? "" : "(" + (n - colonnes * RANGEES_VISIBLES) + ")";
    document.getElementById("roster-compte").textContent = n + " personnage" + (n > 1 ? "s" : "");
    document.getElementById("roster-vide").hidden = n > 0;
    document.querySelectorAll("[data-filtre][data-val]").forEach((b) => b.classList.toggle("on", f[b.dataset.filtre] === b.dataset.val));
  }

  // ======== SECTION D'UN PERSONNAGE
  const RANGS = ["Meilleur choix", "Bonne alternative", "Correct aussi", "Dépannage"];
  const PAS_UN_SET = /^(ATQ|PV|DEF|Bonus\b|Maîtrise élémentaire|Recharge|Taux CRIT|DGT CRIT)/i;

  function lireSet(txt) {
    let corps = txt, note = null, pieces = null;
    const par = corps.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    if (par) {
      corps = par[1];
      const pm = par[2].match(/^(\d)\s*p(?:ièces?)?\s*(?:,\s*(.*))?$/i);
      if (pm) { pieces = +pm[1]; note = pm[2] || null; } else note = par[2];
    }
    const morceaux = corps.split(/\s\+\s/).map((b) => {
      const m = b.match(/^(\d)\s*p(?:ièces?)?\s+(.*)$/i);
      return m ? { n: +m[1], nom: m[2] } : { n: pieces, nom: b };
    });
    return { morceaux, note };
  }
  const icone = (dossier, nom) => `<span class="icone"><img src="${esc(srcIcone(dossier, nom))}" alt="" loading="lazy" width="40" height="40" data-repli="vide"></span>`;

  function guideDe(g, p) {
    const b = p.build;
    if (!b) {
      if (g.slug !== "genshin") {
        return `<dl class="carte-identite">
          <div><dt>${esc(g.ui.libelleElement)}</dt><dd><span class="meta-el">${iconeEl(g, p.element, 18)} ${esc(p.element)}</span></dd></div>
          <div><dt>${esc(g.ui.libelleArme)}</dt><dd>${esc(p.arme || "—")}</dd></div>
          <div><dt>Rareté</dt><dd>${p.rarete ? etoiles(g, p.rarete) : "Non confirmée"}</dd></div>
          ${p.role ? `<div><dt>Rôle</dt><dd>${esc(p.role)}</dd></div>` : ""}
        </dl>
        <div class="vide"><p><b>Guide de référence à venir</b></p><p>Aucun guide n'est affiché tant qu'il n'a pas été vérifié. En attendant, les builds des membres juste en dessous sont la meilleure source.</p></div>`;
      }
      return `<div class="vide"><p><b>${p.note ? "Pourquoi pas de build ici" : "Build de référence en préparation"}</b></p><p>${esc(p.note || "Ce build n'a pas encore été vérifié : rien n'est affiché plutôt que quelque chose de faux. En attendant, regarde les builds des membres juste en dessous.")}</p></div>`;
    }
    const seq = (arr) => (arr || []).map((x, i) => `${i ? '<span class="seq-fleche">›</span>' : ""}<span class="seq-item">${esc(x)}</span>`).join("");
    const ligneSet = (txt, i) => {
      const { morceaux, note } = lireSet(txt);
      return `<li class="${i === 0 ? "meilleur" : ""}"><span class="rang">${RANGS[Math.min(i, 3)]}</span>
        <span class="set-ligne">${morceaux.map((m) => `<span class="set-bloc">${PAS_UN_SET.test(m.nom) ? "" : icone("artefacts", m.nom)}${m.n ? `<b class="pieces">${m.n}p</b>` : ""}<span>${esc(m.nom)}</span></span>`).join('<span class="seq-fleche">+</span>')}</span>
        ${note ? `<small class="faible">${esc(note)}</small>` : ""}</li>`;
    };
    const equipier = (nom) => {
      const q = persoDe(g.slug, nom);
      const src = q ? srcPortrait(g, q) : "";
      const contenu = `<span class="equipier-img" style="--el:${q ? couleurPerso(g, q) : g.couleur}"><span aria-hidden="true">${esc(nom[0])}</span>${src ? `<img src="${esc(src)}" alt="" loading="lazy" data-repli="cacher">` : ""}</span><span>${esc(nom)}</span>`;
      if (q && q.id === p.id) return `<span class="equipier soi">${contenu}</span>`;
      return q ? `<a class="equipier" href="#/jeu/${g.slug}/${esc(q.id)}">${contenu}</a>` : `<span class="equipier">${contenu}</span>`;
    };
    return `
      ${b.conseil ? `<aside class="conseil"><b>À retenir</b><p>${esc(b.conseil)}</p></aside>` : ""}
      <div class="panneaux">
        <section class="panneau"><h3>Armes recommandées</h3>
          <ol class="liste-icones">${(b.armes || []).map((a, i) => `<li class="${i === 0 ? "meilleur" : ""}">${icone("armes", a.replace(/\s*\([^)]*\)\s*$/, ""))}<span>${esc(a)}</span></li>`).join("")}</ol>
        </section>
        <section class="panneau"><h3>Sets d'artefacts</h3>
          <ol class="liste-sets">${(b.artefacts || []).map(ligneSet).join("")}</ol>
        </section>
        <section class="panneau"><h3>Stats principales</h3>
          <dl class="stats-principales">${b.stats ? ["sablier", "coupe", "couronne"].map((k) => `<div><dt>${k[0].toUpperCase() + k.slice(1)}</dt><dd>${esc(b.stats[k] || "—")}</dd></div>`).join("") : ""}</dl>
          <h4>Substats, par priorité</h4><div class="seq">${seq(b.substats)}</div>
          <h4>Montée des talents</h4><div class="seq">${seq(b.talents)}</div>
        </section>
        <section class="panneau panneau-large"><h3>Équipes recommandées</h3>
          <div class="equipes">${(b.equipes || []).map((t) => `<div class="equipe"><div class="equipe-nom">${esc(t.nom)}</div><div class="equipiers">${t.membres.map(equipier).join("")}</div></div>`).join("")}</div>
        </section>
      </div>`;
  }

  async function pagePerso(g, id) {
    themeCourant = g.slug;
    const p = persoDe(g.slug, id);
    if (!p) return vide("Ce personnage n'existe pas.", `<a class="btn" href="#/jeu/${g.slug}">Tous les personnages</a>`);
    const [builds, mems, auteurs] = await Promise.all([S.builds({ game: g.slug, character: p.nom }), S.memories({ game: g.slug, character: p.nom }), profilsParId()]);
    const creations = mems.filter((m) => !estSouvenir(m));
    const souvenirs = mems.filter(estSouvenir);
    const idsMembres = [...new Set([...builds.map((b) => b.author_id), ...mems.map((m) => m.author_id)])];
    const src = srcPortrait(g, p);
    const nomUrl = encodeURIComponent(p.nom);
    const ancre = (cible, label, n) => `<button type="button" class="ancre" data-ancre="${cible}">${label}${n != null ? ` <small>${n}</small>` : ""}</button>`;

    return `
    <article class="fiche-perso" style="--el:${couleurPerso(g, p)}">
      <a class="lien" href="#/jeu/${g.slug}">← Tous les personnages ${esc(g.court)}</a>
      <header class="perso-tete">
        <div class="portrait-zone"><span class="aura" aria-hidden="true"></span><div class="perso-portrait" data-tilt data-rar="${p.rarete || ""}"><span class="perso-initiale" aria-hidden="true">${esc(p.nom[0])}</span>${src ? `<img src="${esc(src)}" alt="Portrait de ${esc(p.nom)}" data-repli="cacher">` : ""}<span class="reflet" aria-hidden="true"></span><span class="portrait-deco" aria-hidden="true"></span><span class="portrait-legende" aria-hidden="true"><b>${esc(p.nom)}</b><small>${esc(p.element)} · ${esc(p.arme)}</small></span></div></div>
        <div class="perso-id">
          <p class="surtitre">${esc(p.region || g.ui.theme)} · ${esc(g.nom)}</p>
          <h1>${esc(p.nom)}</h1>
          <div class="perso-meta">
            ${etoiles(g, p.rarete)}
            <span class="meta-el">${iconeEl(g, p.element, 18)} ${esc(p.element)}</span>
            <span title="${esc(g.ui.libelleArme)}">${esc(p.arme)}</span>
            ${p.role ? `<span>${esc(p.role)}</span>` : ""}
            ${p.tier ? `<span class="tier">${esc(p.tier)}</span>` : ""}
          </div>
          ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ""}
          <div class="actions">
            <a class="btn" href="#/nouveau-build?jeu=${g.slug}&perso=${nomUrl}">+ Publier mon build ${de(p.nom)}</a>
            <a class="btn btn-fantome" href="#/nouveau-souvenir?type=dessin&jeu=${g.slug}&perso=${nomUrl}">+ Partager un dessin ou un screenshot</a>
          </div>
        </div>
      </header>

      <nav class="sous-nav" aria-label="Sections du personnage">
        ${ancre("s-guide", "Guide")}${ancre("s-builds", "Builds des membres", builds.length)}${ancre("s-creations", "Créations", creations.length)}${ancre("s-souvenirs", "Souvenirs", souvenirs.length)}${ancre("s-membres", "Membres", idsMembres.length)}
      </nav>

      <section class="bloc" id="s-guide"><h2>Le guide ${de(p.nom)}</h2>${guideDe(g, p)}</section>

      <section class="bloc" id="s-builds">
        <div class="bloc-tete"><h2>Builds des membres</h2><a class="btn btn-petit" href="#/nouveau-build?jeu=${g.slug}&perso=${nomUrl}">+ Publier le mien</a></div>
        <div class="grille">${builds.map((b) => carteBuild(b, auteurs)).join("") || vide(`Personne n'a encore partagé son build ${de(p.nom)}.`)}</div>
      </section>

      <section class="bloc" id="s-creations">
        <div class="bloc-tete"><h2>Dessins, screenshots et clips</h2><a class="btn btn-petit btn-fantome" href="#/nouveau-souvenir?type=dessin&jeu=${g.slug}&perso=${nomUrl}">+ Partager une création</a></div>
        <div class="grille">${creations.map((m) => carteSouvenir(m, auteurs)).join("") || vide(`Aucune création sur ${esc(p.nom)} pour l'instant.`)}</div>
      </section>

      <section class="bloc" id="s-souvenirs">
        <h2>Souvenirs avec ${esc(p.nom)}</h2>
        <div class="grille">${souvenirs.map((m) => carteSouvenir(m, auteurs)).join("") || '<p class="faible">Aucun souvenir lié à ce personnage.</p>'}</div>
      </section>

      <section class="bloc" id="s-membres">
        <h2>Membres qui ont partagé ${esc(p.nom)}</h2>
        <div class="joueurs">${idsMembres.map((i) => auteurs[i]).filter(Boolean).map((a) => `<a href="#/membre/${esc(a.id)}" class="joueur">${avatar(a, "s")}${esc(a.username)}</a>`).join("") || '<p class="faible">Personne pour l\'instant.</p>'}</div>
      </section>
    </article>`;
  }

  pages.build = async ([id]) => {
    const b = await S.build(id);
    if (!b) return vide("Ce build n'existe pas ou a été supprimé.");
    const g = jeu(b.game), a = await S.profile(b.author_id);
    const peutSuppr = ME && (ME.id === b.author_id || estEquipe());
    const perso = persoDe(b.game, b.character);
    themeCourant = b.game;
    const champsRemplis = (g ? g.champs : []).filter((c) => b.fields && b.fields[c.cle]);
    return `
    <article class="fiche-build" style="--c:${g ? g.couleur : "#fff"}">
      <a class="lien" href="#/jeu/${esc(b.game)}${perso ? "/" + esc(perso.id) : ""}">← ${esc(perso ? perso.nom : g ? g.nom : "Jeu")}</a>
      <header>
        <p class="surtitre">${esc(g ? g.motEntite : "Personnage")} · ${esc(g ? g.court : "")}</p>
        <h1>${esc(b.character)}</h1>
        <p class="chapo">${esc(b.title)}</p>
        <div class="carte-bas">${avatar(a, "s")}<a href="#/membre/${esc(b.author_id)}">${esc(a ? a.username : "Membre")}</a><span class="faible">· ${esc(dateFr(b.created_at))}</span></div>
      </header>
      ${enAttente(b) ? `<p class="bandeau-attente">Ce build attend la validation d'un modérateur : pour l'instant, seuls toi et l'équipe le voyez.</p>` : ""}
      <section class="galerie">
        ${(b.images || []).map(urlSure).filter(Boolean).map((u, i) => `<button type="button" class="galerie-item" data-zoom-src="${esc(u)}" aria-label="Agrandir l'image ${i + 1}"><img src="${esc(u)}" alt="Capture ${i + 1} du build ${de(b.character)}" loading="lazy"></button>`).join("") || '<p class="faible">Pas d\'image pour ce build.</p>'}
      </section>
      ${champsRemplis.length ? `<dl class="champs">${champsRemplis.map((c) => `<div class="champ"><dt>${esc(c.label)}</dt><dd>${esc(b.fields[c.cle])}</dd></div>`).join("")}</dl>` : ""}
      ${b.notes ? `<section class="notes"><h2>Conseils de l'auteur</h2><p>${esc(b.notes)}</p></section>` : ""}
      <div class="actions">
        <button class="btn ${b.liked ? "btn-on" : ""}" data-like="build" data-id="${esc(b.id)}">♥ ${b.like_count} ${b.liked ? "Tu aimes" : "J'aime"}</button>
        <button class="btn btn-fantome" data-copier>Copier le lien</button>
        ${peutSuppr ? `<button class="btn btn-danger" data-suppr-build="${esc(b.id)}">Supprimer</button>` : ""}
        ${boutonSignaler("build", b.id, b.author_id)}
      </div>
    </article>`;
  };

  pages.evenements = async (_, q) => {
    const filtre = q.get("jeu") || "";
    const evts = await S.events(filtre ? { game: filtre } : {});
    const groupes = { encours: [], avenir: [], termine: [] };
    evts.forEach((e) => groupes[statut(e)].push(e));
    groupes.avenir.reverse();
    return `
    <section class="page-tete">
      <p class="surtitre">Événements</p>
      <h1>Giveaways, lives, concours, défis</h1>
      ${estEquipe() ? `<div class="actions"><a class="btn" href="#/nouvel-evenement">+ Créer un événement</a></div>` : ""}
    </section>
    ${filtresJeux("#/evenements", filtre)}
    ${["encours", "avenir", "termine"].map((k) => `<section class="bloc"><h2>${k === "termine" ? "Archives" : STATUT_LABEL[k]}</h2><div class="liste-evt">${groupes[k].map(carteEvenement).join("") || '<p class="faible">Rien ici.</p>'}</div></section>`).join("")}`;
  };

  pages.evenement = async ([id]) => {
    const e = await S.event(id);
    if (!e) return vide("Cet événement n'existe pas.");
    const [parts, mems, auteurs] = await Promise.all([S.participants(id), S.memories({ event: id }), profilsParId()]);
    const t = TYPES[e.type] || { label: e.type, icone: "" };
    const st = statut(e);
    return `
    <article class="fiche-evt">
      <a class="lien" href="#/evenements">← Événements</a>
      <p class="surtitre">${t.icone} ${esc(t.label)} · <span class="statut statut-${st}">${STATUT_LABEL[st]}</span></p>
      <h1>${esc(e.title)}</h1>
      <p class="faible">${pastilleJeu(e.game)} · ${esc(dateFr(e.starts_at, true))}${e.ends_at ? " → " + esc(dateFr(e.ends_at, true)) : ""}</p>
      ${e.description ? `<p class="chapo">${esc(e.description)}</p>` : ""}
      <section class="compteurs">
        <div><b>${e.participant_count}</b><span>participants</span></div>
        <div><b>${e.winners ? e.winners.split(",").length : "—"}</b><span>gagnants</span></div>
        <div><b>${mems.length}</b><span>souvenirs</span></div>
      </section>
      ${e.winners ? `<p><b>Gagnants :</b> ${esc(e.winners)}</p>` : ""}
      <div class="actions">
        ${st !== "termine" ? (ME ? `<button class="btn ${e.joined ? "btn-on" : ""}" data-join="${esc(e.id)}">${e.joined ? "✓ Tu participes" : "Je participe"}</button>` : `<button class="btn btn-discord" data-action="login">Se connecter pour participer</button>`) : ""}
        ${urlSure(e.live_url) ? `<a class="btn btn-fantome" href="${esc(e.live_url)}" target="_blank" rel="noopener">Voir le live ↗</a>` : ""}
        ${ME ? `<a class="btn btn-fantome" href="#/nouveau-souvenir?evenement=${esc(e.id)}">+ Ajouter un souvenir</a>` : ""}
      </div>
      ${estEquipe() && st === "termine" && !e.winners ? `<form class="form form-ligne" data-form="gagnants" data-id="${esc(e.id)}"><label for="f-gagnants">Annoncer les gagnants</label><input id="f-gagnants" name="winners" placeholder="Pseudo1, Pseudo2"><button class="btn btn-petit">Enregistrer</button></form>` : ""}
      <section class="bloc"><h2>Participants</h2><div class="joueurs">${parts.map((p) => `<a href="#/membre/${esc(p.id)}" class="joueur">${avatar(p, "s")}${esc(p.username)}</a>`).join("") || '<p class="faible">Personne pour l\'instant.</p>'}</div></section>
      <section class="bloc"><h2>Souvenirs de l'événement</h2><div class="grille">${mems.map((m) => carteSouvenir(m, auteurs)).join("") || '<p class="faible">Aucun souvenir encore.</p>'}</div></section>
    </article>`;
  };

  // ---------- MODÉRATION (équipe uniquement)
  pages.moderation = async () => {
    if (!ME) return doitSeConnecter();
    if (!estEquipe()) return vide("Cette page est réservée aux modérateurs et admins.");
    const [file, auteurs] = await Promise.all([S.moderation(), profilsParId()]);
    const bloc = (o) => {
      const a = auteurs[o.author_id];
      const imgs = (o.type === "build" ? o.images || [] : [o.image_url]).map(urlSure).filter(Boolean);
      const lien = o.type === "build" ? `#/build/${esc(o.id)}` : "";
      return `<article class="carte modo-item ${o.signalements.length ? "modo-signale" : ""}">
        <div class="modo-images">${imgs.map((u) => `<button type="button" class="galerie-item" data-zoom-src="${esc(u)}" aria-label="Agrandir"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join("") || '<p class="faible">Sans image</p>'}</div>
        <div class="modo-corps">
          <div class="tags">${pastilleJeu(o.game)}<span class="type-tag">${o.type === "build" ? "Build" : esc(TYPES_POST[o.kind] || "Souvenir")}</span>${enAttente(o) ? '<span class="attente">En attente</span>' : '<span class="type-tag">Déjà en ligne</span>'}</div>
          <h3>${lien ? `<a href="${lien}">${esc(o.title)}</a>` : esc(o.title)}</h3>
          <p class="faible">${esc(o.character || "")} · par <a href="#/membre/${esc(o.author_id)}">${esc(a ? a.username : "Membre")}</a> · ${ilYa(o.created_at)}</p>
          ${o.signalements.length ? `<div class="modo-signalements"><b>${o.signalements.length} signalement${o.signalements.length > 1 ? "s" : ""}</b><ul>${o.signalements.map((r) => `<li>${esc(r.reason)} <span class="faible">— ${esc(auteurs[r.user_id] ? auteurs[r.user_id].username : "membre")}</span></li>`).join("")}</ul></div>` : ""}
          <div class="actions">
            <button class="btn btn-petit" data-moderer="approve" data-type="${o.type}" data-id="${esc(o.id)}">${enAttente(o) ? "Approuver" : "Garder en ligne"}</button>
            <button class="btn btn-petit btn-danger" data-moderer="reject" data-type="${o.type}" data-id="${esc(o.id)}">Supprimer définitivement</button>
          </div>
        </div>
      </article>`;
    };
    return `
    <section class="page-tete">
      <p class="surtitre">Équipe</p>
      <h1>Modération</h1>
      <p class="chapo">Toute image envoyée par un membre attend ici avant d'être visible. Une publication signalée 3 fois est retirée automatiquement et revient ici. Les plus signalées sont en haut.</p>
    </section>
    <div class="liste-modo">${file.map(bloc).join("") || vide("Rien à vérifier. Tout est en ordre.")}</div>`;
  };

  // ---------- FORMULAIRES
  pages.moi = async () => {
    if (!ME) return doitSeConnecter();
    return `
    <section class="page-tete"><p class="surtitre">Mon compte</p><h1>${esc(ME.username)}</h1>
      <div class="actions"><a class="btn btn-fantome btn-petit" href="#/membre/${esc(ME.id)}">Voir mon profil public</a></div></section>
    <form class="form" data-form="profil">
      <fieldset>
        <legend>Quels jeux suis-tu ?</legend>
        <p class="aide">La page d'accueil s'adapte à tes choix.</p>
        <div class="coches">${JEUX.map((g) => `<label class="coche" style="--c:${g.couleur}"><input type="checkbox" name="games" id="f-jeu-${g.slug}" value="${g.slug}" ${(ME.games || []).includes(g.slug) ? "checked" : ""}><span>${esc(g.nom)}</span></label>`).join("")}</div>
      </fieldset>
      <label for="f-bio">Bio</label>
      <textarea id="f-bio" name="bio" rows="3" maxlength="280" placeholder="Ton main, ton style de jeu…">${esc(ME.bio || "")}</textarea>
      <button class="btn">Enregistrer</button>
    </form>
    <section class="bloc raccourcis">
      <a class="btn btn-fantome" href="#/nouveau-build">+ Publier un build</a>
      <a class="btn btn-fantome" href="#/nouveau-souvenir">+ Ajouter un souvenir</a>
      ${estEquipe() ? `<a class="btn btn-fantome" href="#/nouvel-evenement">+ Créer un événement</a>` : ""}
      <button class="btn btn-fantome" data-action="logout">Se déconnecter</button>
    </section>`;
  };

  pages["nouveau-build"] = async (_, q) => {
    if (!ME) return doitSeConnecter();
    const slug = q.get("jeu") || (ME.games && ME.games[0]) || JEUX[0].slug;
    const g = jeu(slug) || JEUX[0];
    themeCourant = g.slug;
    const persoChoisi = q.get("perso") || "";
    const champPerso = g.roster
      ? `<select id="f-perso" name="character" required><option value="">Choisis un personnage</option>${g.roster.slice().sort((a, b) => a.nom.localeCompare(b.nom, "fr")).map((p) => `<option ${p.nom === persoChoisi ? "selected" : ""}>${esc(p.nom)}</option>`).join("")}</select>`
      : `<input id="f-perso" name="character" required list="l-persos" maxlength="60" value="${esc(persoChoisi)}" placeholder="${esc(g.persos[0] || "Nom")}">`;
    return `
    <section class="page-tete"><p class="surtitre">Nouveau build</p><h1>Partage ton build${persoChoisi ? " " + de(persoChoisi) : ""}</h1></section>
    <nav class="filtres">${JEUX.map((x) => `<a href="#/nouveau-build?jeu=${x.slug}" class="${x.slug === g.slug ? "on" : ""}" style="--c:${x.couleur}">${esc(x.court)}</a>`).join("")}</nav>
    <form class="form" data-form="build" data-jeu="${g.slug}" style="--c:${g.couleur}">
      <label for="f-perso">${esc(g.motEntite)} *</label>
      ${champPerso}
      <datalist id="l-persos">${g.persos.map((p) => `<option value="${esc(p)}">`).join("")}</datalist>
      <label for="f-titre">Titre du build *</label>
      <input id="f-titre" name="title" required maxlength="80" placeholder="ex : ${esc(persoChoisi || g.persos[0] || "Mon perso")} soutien full PV">
      <label for="f-images">Captures de ton build * <span class="aide">(1 à ${MAX_IMAGES_BUILD} images, 5 Mo max chacune)</span></label>
      <input id="f-images" type="file" name="images" accept="${TYPES_IMAGE.join(",")}" multiple required>
      <div class="apercus" id="apercus"></div>
      <p class="aide">Écran du personnage, de l'arme, des artefacts… Chaque image est vérifiée par un modérateur avant d'être visible par tout le monde. Pas de contenu choquant, sexuel ou volé : les images refusées sont supprimées.</p>
      <label for="f-notes">Conseils</label>
      <textarea id="f-notes" name="notes" rows="3" maxlength="1500" placeholder="Pourquoi ces choix, les alternatives, les pièges à éviter…"></textarea>
      <details class="details-form">
        <summary>Détailler par écrit (facultatif)</summary>
        <div class="deux-col">
          ${g.champs.map((c) => `<div><label for="f-${c.cle}">${esc(c.label)}</label><input id="f-${c.cle}" name="f_${c.cle}" maxlength="160"></div>`).join("")}
        </div>
      </details>
      <button class="btn">Publier le build</button>
    </form>`;
  };

  pages["nouveau-souvenir"] = async (_, q) => {
    if (!ME) return doitSeConnecter();
    const evts = await S.events();
    const evtSel = q.get("evenement") || "";
    const evtObj = evts.find((e) => e.id === evtSel);
    const type = TYPES_POST[q.get("type")] ? q.get("type") : "souvenir";
    const jeuSel = q.get("jeu") || (evtObj && evtObj.game) || "";
    const persoSel = q.get("perso") || "";
    const gSel = jeu(jeuSel);
    return `
    <section class="page-tete"><p class="surtitre">${type === "souvenir" ? "Mémoire" : "Création"}</p><h1>${type === "souvenir" ? "Ajouter un souvenir" : "Partager une création"}${persoSel ? " · " + esc(persoSel) : ""}</h1>
      <p class="chapo">Un dessin, un screenshot ou un clip lié à un personnage apparaît dans la section de ce personnage.</p></section>
    <form class="form" data-form="souvenir">
      <div class="deux-col">
        <div><label for="f-s-type">Type</label>
          <select id="f-s-type" name="kind">${Object.entries(TYPES_POST).map(([k, v]) => `<option value="${k}" ${k === type ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></div>
        <div><label for="f-s-perso">Personnage concerné</label>
          <input id="f-s-perso" name="character" list="l-persos-souvenir" maxlength="60" value="${esc(persoSel)}" placeholder="Facultatif">
          <datalist id="l-persos-souvenir">${(gSel ? gSel.persos : []).map((n) => `<option value="${esc(n)}">`).join("")}</datalist></div>
      </div>
      <label for="f-s-titre">Titre *</label>
      <input id="f-s-titre" name="title" required maxlength="100" placeholder="ex : Le tirage du Giveaway #08">
      <label for="f-s-desc">Ce qui s'est passé</label>
      <textarea id="f-s-desc" name="description" rows="3" maxlength="600"></textarea>
      <div class="deux-col">
        <div><label for="f-s-jeu">Jeu</label>
          <select id="f-s-jeu" name="game"><option value="">Toute la communauté</option>${JEUX.map((g) => `<option value="${g.slug}" ${jeuSel === g.slug ? "selected" : ""}>${esc(g.nom)}</option>`).join("")}</select></div>
        <div><label for="f-s-evt">Événement lié</label>
          <select id="f-s-evt" name="event_id"><option value="">Aucun</option>${evts.map((e) => `<option value="${esc(e.id)}" ${e.id === evtSel ? "selected" : ""}>${esc(e.title)}</option>`).join("")}</select></div>
        <div><label for="f-s-date">Date</label><input id="f-s-date" type="date" name="happened_on" value="${new Date().toISOString().slice(0, 10)}" required></div>
        <div><label for="f-s-lien">Lien (clip, VOD…)</label><input id="f-s-lien" type="url" name="link_url" placeholder="https://"></div>
      </div>
      <label for="f-s-img">Image (5 Mo max)</label>
      <input id="f-s-img" type="file" name="image" accept="image/png,image/jpeg,image/webp,image/gif">
      <button class="btn">Ajouter à la mémoire</button>
    </form>`;
  };

  pages["nouvel-evenement"] = async () => {
    if (!ME) return doitSeConnecter();
    if (!estEquipe()) return vide("Seuls les modérateurs et admins peuvent créer un événement.");
    return `
    <section class="page-tete"><p class="surtitre">Événements</p><h1>Créer un événement</h1></section>
    <form class="form" data-form="evenement">
      <div class="deux-col">
        <div><label for="f-e-type">Type</label><select id="f-e-type" name="type">${Object.entries(TYPES).map(([k, t]) => `<option value="${k}">${t.icone} ${esc(t.label)}</option>`).join("")}</select></div>
        <div><label for="f-e-jeu">Jeu</label><select id="f-e-jeu" name="game"><option value="">Toute la communauté</option>${JEUX.map((g) => `<option value="${g.slug}">${esc(g.nom)}</option>`).join("")}</select></div>
      </div>
      <label for="f-e-titre">Titre *</label>
      <input id="f-e-titre" name="title" required maxlength="100" placeholder="ex : Giveaway #08">
      <label for="f-e-desc">Description</label>
      <textarea id="f-e-desc" name="description" rows="3" maxlength="1000"></textarea>
      <div class="deux-col">
        <div><label for="f-e-debut">Début *</label><input id="f-e-debut" type="datetime-local" name="starts_at" required></div>
        <div><label for="f-e-fin">Fin</label><input id="f-e-fin" type="datetime-local" name="ends_at"></div>
      </div>
      <label for="f-e-live">Lien du live (Twitch, YouTube…)</label>
      <input id="f-e-live" type="url" name="live_url" placeholder="https://">
      <button class="btn">Créer l'événement</button>
    </form>`;
  };

  // ---------- routeur
  const ROUTES = {
    "": "accueil", memoire: "memoire", communaute: "communaute", membre: "membre", jeux: "jeux", jeu: "jeu",
    build: "build", evenements: "evenements", evenement: "evenement", moi: "moi",
    "nouveau-build": "nouveau-build", moderation: "moderation", "nouveau-souvenir": "nouveau-souvenir", "nouvel-evenement": "nouvel-evenement"
  };

  async function rendre() {
    const brut = location.hash.replace(/^#\/?/, "");
    const [chemin, qs] = brut.split("?");
    const parts = chemin.split("/").filter(Boolean).map(decodeURIComponent);
    const nom = ROUTES[parts[0] || ""] || null;
    const rubrique = parts[0] === "jeu" ? "jeux" : (parts[0] || "");
    document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("on", a.dataset.page === rubrique));
    themeCourant = "";
    if (!nom) { $app.innerHTML = vide("Page introuvable.", `<a class="btn" href="#/">Retour à l'accueil</a>`); return; }
    $app.setAttribute("aria-busy", "true");
    try {
      const r = await pages[nom](parts.slice(1), new URLSearchParams(qs || ""));
      $app.innerHTML = typeof r === "string" ? r : r.html;
      if (r && r.apres) r.apres();
      Effets.apresRendu();
    } catch (err) {
      themeCourant = "";
      console.error(err);
      $app.innerHTML = vide("Impossible de charger cette page : " + esc(err.message) + ". Réessaie dans un instant.");
    }
    $app.removeAttribute("aria-busy");
    // Chaque jeu a son propre habillage (voir styles.css, [data-jeu="..."])
    if (themeCourant) document.documentElement.dataset.jeu = themeCourant;
    else delete document.documentElement.dataset.jeu;
    if (themeCourant === "genshin") DecorGenshin.allumer(); else DecorGenshin.eteindre();
    if (themeCourant === "hsr") DecorHSR.allumer(); else DecorHSR.eteindre();
    if (themeCourant === "wuwa") DecorWuwa.allumer(); else DecorWuwa.eteindre();
    if (themeCourant === "nte") DecorNTE.allumer(); else DecorNTE.eteindre();
    document.getElementById("banniere-accueil").hidden = nom !== "accueil";
    document.getElementById("fil-direct").hidden = nom !== "accueil";
    // hors des espaces jeux : décor animé de la plateforme
    if (!themeCourant) { document.documentElement.dataset.decor = "accueil"; DecorAccueil.allumer(); }
    else { delete document.documentElement.dataset.decor; DecorAccueil.eteindre(); }
    document.title = CFG.NOM_SITE + (nom === "accueil" ? "" : " · " + (($app.querySelector("h1") || {}).textContent || ""));
    if (!rendre.memeEcran) window.scrollTo(0, 0);
    rendre.memeEcran = false;
  }
  const rafraichir = () => { rendre.memeEcran = true; return rendre(); };

  // ---------- actions
  document.addEventListener("click", async (ev) => {
    const f = ev.target.closest("[data-filtre]");
    if (f) {
      if (f.dataset.filtre === "reset") { Object.assign(filtresRoster, { q: "", el: "", arme: "", rar: "" }); const i = document.getElementById("f-roster-q"); if (i) i.value = ""; }
      else filtresRoster[f.dataset.filtre] = filtresRoster[f.dataset.filtre] === f.dataset.val ? "" : f.dataset.val;
      return appliquerFiltresRoster();
    }
    if (ev.target.closest("[data-roster-plus]")) {
      rosterOuvert = !rosterOuvert;
      appliquerFiltresRoster();
      if (!rosterOuvert) document.getElementById("grille-persos").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const z = ev.target.closest("[data-zoom-src],img[data-zoom]");
    if (z) { ouvrirZoom(z.dataset.zoomSrc || z.getAttribute("src")); return; }
    if (ev.target.closest(".zoom")) { fermerZoom(); return; }
    const a = ev.target.closest("[data-ancre]");
    if (a) { const cible = document.getElementById(a.dataset.ancre); if (cible) cible.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    const el = ev.target.closest("[data-action],[data-like],[data-join],[data-suppr-build],[data-suppr-souvenir],[data-copier],[data-signaler],[data-moderer]");
    if (!el) return;
    ev.preventDefault();
    try {
      if (el.dataset.action === "login") return S.signIn();
      if (el.dataset.action === "logout") return S.signOut();
      if (el.dataset.action === "reset") return S.reset();
      if (el.dataset.action === "role-demo") return S.changerRoleDemo();
      if (!ME) return toast("Connecte-toi avec Discord d'abord.");
      if (el.dataset.like) { await S.toggleLike(el.dataset.like, el.dataset.id); return rafraichir(); }
      if (el.dataset.join) { await S.toggleJoin(el.dataset.join); toast("Participation mise à jour"); return rafraichir(); }
      if (el.dataset.supprBuild && confirmer("Supprimer ce build ?", el)) { await S.deleteBuild(el.dataset.supprBuild); toast("Build supprimé"); location.hash = "#/moi"; }
      if (el.dataset.supprSouvenir && confirmer("Supprimer ce souvenir ?", el)) { await S.deleteMemory(el.dataset.supprSouvenir); toast("Souvenir supprimé"); return rafraichir(); }
      if (el.dataset.signaler) {
        await S.report(el.dataset.signaler, el.dataset.id, el.dataset.raison);
        toast("Merci, l'équipe va vérifier");
        const d = el.closest("details"); if (d) d.open = false;
        return;
      }
      if (el.dataset.moderer) {
        if (el.dataset.moderer === "reject" && !confirmer("", el)) return;
        await S[el.dataset.moderer](el.dataset.type, el.dataset.id);
        toast(el.dataset.moderer === "approve" ? "Approuvé : visible par tous" : "Supprimé");
        await majCompteurModeration();
        return rafraichir();
      }
      if ("copier" in el.dataset) { await navigator.clipboard.writeText(location.href); toast("Lien copié"); }
    } catch (err) { toast("Erreur : " + err.message); }
  });

  function ouvrirZoom(src) {
    if (!urlSure(src)) return;
    fermerZoom();
    const z = document.createElement("div");
    z.className = "zoom"; z.setAttribute("role", "dialog"); z.setAttribute("aria-label", "Image agrandie");
    z.innerHTML = `<img src="${esc(src)}" alt=""><button type="button" class="zoom-fermer" aria-label="Fermer">×</button>`;
    document.body.appendChild(z);
  }
  function fermerZoom() { document.querySelectorAll(".zoom").forEach((z) => z.remove()); }
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") fermerZoom(); });

  async function majCompteurModeration() {
    const lien = document.getElementById("nav-moderation");
    if (!lien) return;
    try {
      const n = (await S.moderation()).length;
      lien.querySelector("b").textContent = n || "";
      lien.querySelector("b").hidden = !n;
    } catch (e) { /* le compteur n'est qu'un plus */ }
  }

  let attenteResize;
  window.addEventListener("resize", () => { clearTimeout(attenteResize); attenteResize = setTimeout(appliquerFiltresRoster, 120); });
  document.addEventListener("input", (ev) => {
    if (ev.target.id === "f-roster-q") { filtresRoster.q = ev.target.value; appliquerFiltresRoster(); }
  });
  document.addEventListener("change", (ev) => {
    if (ev.target.id === "f-images") {
      const zone = document.getElementById("apercus");
      const fichiers = [...ev.target.files];
      zone.innerHTML = "";
      try { verifierImages(fichiers, MAX_IMAGES_BUILD); } catch (err) { toast(err.message); ev.target.value = ""; return; }
      fichiers.forEach((f) => { const i = document.createElement("img"); i.alt = ""; i.src = URL.createObjectURL(f); zone.appendChild(i); });
    }
    if (ev.target.id === "f-s-jeu") {
      const g = jeu(ev.target.value);
      const dl = document.getElementById("l-persos-souvenir");
      if (dl) dl.innerHTML = (g ? g.persos : []).map((n) => `<option value="${esc(n)}">`).join("");
    }
  });

  // Confirmation en deux clics (pas de boîte de dialogue bloquante).
  function confirmer(msg, el) {
    if (el.dataset.arme === "1") return true;
    el.dataset.arme = "1";
    const txt = el.textContent;
    el.textContent = "Clique encore pour confirmer";
    setTimeout(() => { el.dataset.arme = ""; el.textContent = txt; }, 3000);
    return false;
  }

  document.addEventListener("submit", async (ev) => {
    const f = ev.target.closest("form[data-form]");
    if (!f) return;
    ev.preventDefault();
    const btn = f.querySelector("button");
    btn.disabled = true;
    const d = new FormData(f);
    const txt = (k) => String(d.get(k) || "").trim();
    try {
      switch (f.dataset.form) {
        case "profil":
          ME = await S.updateProfile({ games: d.getAll("games"), bio: txt("bio") });
          toast("Profil enregistré");
          break;
        case "build": {
          const g = jeu(f.dataset.jeu), fields = {};
          g.champs.forEach((c) => (fields[c.cle] = txt("f_" + c.cle)));
          const fichiers = d.getAll("images").filter((x) => x && x.size > 0);
          if (!fichiers.length) throw new Error("ajoute au moins une capture de ton build");
          verifierImages(fichiers, MAX_IMAGES_BUILD);
          btn.textContent = "Envoi des images…";
          const b = await S.createBuild({ game: g.slug, character: txt("character"), title: txt("title"), fields, notes: txt("notes") }, fichiers);
          toast(estEquipe() ? "Build publié" : "Build envoyé : il sera visible après validation");
          location.hash = "#/build/" + b.id;
          break;
        }
        case "souvenir": {
          const fichier = d.get("image");
          const aFichier = fichier && fichier.size > 0;
          if (aFichier) verifierImages([fichier], 1);
          const game = txt("game") || null;
          let character = txt("character");
          const g = jeu(game);
          let perso = null;
          if (character && g && g.roster) {
            perso = persoDe(game, character);
            if (!perso) throw new Error("personnage « " + character + " » introuvable : choisis-le dans la liste proposée");
            character = perso.nom;
          }
          if (character && !game) throw new Error("choisis le jeu du personnage");
          const kind = txt("kind") || "souvenir";
          await S.createMemory({
            kind, character, title: txt("title"), description: txt("description"), game,
            event_id: txt("event_id") || null, happened_on: txt("happened_on"), link_url: txt("link_url")
          }, aFichier ? fichier : null);
          toast(aFichier && !estEquipe() ? "Envoyé : visible après validation d'un modérateur" : kind === "souvenir" ? "Souvenir ajouté à la mémoire" : "Création publiée");
          location.hash = perso ? "#/jeu/" + game + "/" + perso.id : kind === "souvenir" ? "#/memoire" : "#/jeu/" + (game || "");
          if (!perso && kind !== "souvenir" && !game) location.hash = "#/moi";
          break;
        }
        case "evenement": {
          const e = await S.createEvent({
            type: txt("type"), game: txt("game") || null, title: txt("title"), description: txt("description"),
            starts_at: new Date(txt("starts_at")).toISOString(), ends_at: txt("ends_at") ? new Date(txt("ends_at")).toISOString() : null,
            live_url: txt("live_url"), winners: ""
          });
          toast("Événement créé");
          location.hash = "#/evenement/" + e.id;
          break;
        }
        case "gagnants":
          await S.updateEvent(f.dataset.id, { winners: txt("winners") });
          toast("Gagnants enregistrés");
          await rafraichir();
          break;
      }
    } catch (err) {
      toast("Erreur : " + err.message);
    }
    btn.disabled = false;
    if (f.dataset.form === "build") btn.textContent = "Publier le build";
  });

  // ============================================================
  //  DÉCOR ANIMÉ DE L'ESPACE GENSHIN — « Nuit sur Teyvat »
  //  Ciel dégradé, lune, étoiles scintillantes et constellation,
  //  voiles d'aurore, île céleste, trois chaînes de montagnes
  //  (parallaxe au défilement) et lucioles aux couleurs des 7 éléments.
  //  Tout est dessiné en code : aucune image à télécharger.
  // ============================================================
  const DecorGenshin = (() => {
    let cv, ctx, W = 0, H = 0, dpr = 1, actif = false, raf = 0, dernier = 0;
    let fondFixe, montagnes, etoiles = [], lucioles = [];
    const calme = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ELEM = ["#ff6b47", "#3db7e4", "#4dd8b0", "#b57bd4", "#9bd13b", "#7fdef0", "#e8b33c"];
    let graine = 7;
    const alea = () => ((graine = (graine * 16807) % 2147483647) - 1) / 2147483646;

    function toile(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

    function peindreFond() {
      fondFixe = toile(W * dpr, H * dpr);
      const g = fondFixe.getContext("2d"); g.scale(dpr, dpr);
      // ciel
      const ciel = g.createLinearGradient(0, 0, 0, H);
      ciel.addColorStop(0, "#070a22"); ciel.addColorStop(.45, "#141b48");
      ciel.addColorStop(.75, "#2b2b63"); ciel.addColorStop(1, "#4a3a6e");
      g.fillStyle = ciel; g.fillRect(0, 0, W, H);
      // lueur chaude à l'horizon
      const lueur = g.createRadialGradient(W * .35, H * 1.05, 0, W * .35, H * 1.05, H * .9);
      lueur.addColorStop(0, "rgba(232,168,90,.35)"); lueur.addColorStop(1, "rgba(232,168,90,0)");
      g.fillStyle = lueur; g.fillRect(0, 0, W, H);
      // voie lactée
      g.save(); g.translate(W * .5, H * .3); g.rotate(-.35);
      const vl = g.createLinearGradient(0, -H * .12, 0, H * .12);
      vl.addColorStop(0, "rgba(150,160,255,0)"); vl.addColorStop(.5, "rgba(190,185,255,.10)"); vl.addColorStop(1, "rgba(150,160,255,0)");
      g.fillStyle = vl; g.fillRect(-W, -H * .12, W * 2, H * .24);
      graine = 11;
      for (let i = 0; i < 700; i++) {
        const x = (alea() - .5) * W * 2, y = (alea() - .5) * (alea()) * H * .22;
        g.fillStyle = `rgba(230,230,255,${alea() * .35})`; g.fillRect(x, y, 1, 1);
      }
      g.restore();
      // lune et halo
      const mx = W * .82, my = H * .17, mr = Math.max(26, Math.min(W, H) * .045);
      const halo = g.createRadialGradient(mx, my, mr * .8, mx, my, mr * 6);
      halo.addColorStop(0, "rgba(255,240,205,.35)"); halo.addColorStop(1, "rgba(255,240,205,0)");
      g.fillStyle = halo; g.beginPath(); g.arc(mx, my, mr * 6, 0, 7); g.fill();
      const lune = g.createRadialGradient(mx - mr * .3, my - mr * .3, mr * .1, mx, my, mr);
      lune.addColorStop(0, "#fffaf0"); lune.addColorStop(1, "#e9dcc0");
      g.fillStyle = lune; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill();
      g.fillStyle = "rgba(190,175,150,.25)";
      [[-.3, -.1, .18], [.25, .2, .12], [.05, -.45, .09]].forEach(([a, b, r]) => { g.beginPath(); g.arc(mx + a * mr, my + b * mr, r * mr, 0, 7); g.fill(); });
      // île céleste suspendue, avec sa lumière
      const ix = W * .16, iy = H * .2, is = Math.min(W, H) * .07;
      const li = g.createRadialGradient(ix, iy - is * .4, 0, ix, iy - is * .4, is * 2.2);
      li.addColorStop(0, "rgba(255,226,150,.35)"); li.addColorStop(1, "rgba(255,226,150,0)");
      g.fillStyle = li; g.beginPath(); g.arc(ix, iy - is * .4, is * 2.2, 0, 7); g.fill();
      g.fillStyle = "#1a1d44";
      g.beginPath(); g.moveTo(ix - is, iy);
      g.quadraticCurveTo(ix - is * .5, iy + is * 1.4, ix, iy + is * 1.9);
      g.quadraticCurveTo(ix + is * .5, iy + is * 1.3, ix + is, iy);
      g.closePath(); g.fill();
      g.fillRect(ix - is * .08, iy - is * .9, is * .16, is * .9);
      g.beginPath(); g.moveTo(ix - is * .35, iy); g.lineTo(ix, iy - is * .35); g.lineTo(ix + is * .35, iy); g.fill();
      g.fillStyle = "rgba(255,230,160,.95)"; g.beginPath(); g.arc(ix, iy - is * .95, is * .07, 0, 7); g.fill();
      // constellation (esprit « constellations » du jeu)
      const pts = [[.55, .09], [.6, .14], [.66, .12], [.7, .19], [.64, .24], [.58, .21]].map(([a, b]) => [a * W, b * H]);
      g.strokeStyle = "rgba(211,188,142,.28)"; g.lineWidth = 1;
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
      pts.forEach(([x, y]) => { g.fillStyle = "rgba(255,236,190,.9)"; g.beginPath(); g.arc(x, y, 1.8, 0, 7); g.fill(); g.strokeStyle = "rgba(211,188,142,.35)"; g.beginPath(); g.arc(x, y, 5, 0, 7); g.stroke(); });

      // montagnes : trois plans générés
      montagnes = [];
      const plans = [
        { base: .72, amp: .16, coul: ["#2a2c63", "#232553"], seed: 3 },
        { base: .8, amp: .13, coul: ["#1c1e48", "#16183a"], seed: 5 },
        { base: .9, amp: .1, coul: ["#10122c", "#0b0c20"], seed: 9 }
      ];
      plans.forEach((pl, n) => {
        const hauteur = H * 1.25;
        const c = toile(W * dpr, hauteur * dpr); const m = c.getContext("2d"); m.scale(dpr, dpr);
        graine = pl.seed;
        const pics = []; let x = -40;
        while (x < W + 80) { pics.push([x, H * (pl.base - alea() * pl.amp)]); x += 60 + alea() * 140; }
        const grad = m.createLinearGradient(0, H * (pl.base - pl.amp), 0, hauteur);
        grad.addColorStop(0, pl.coul[0]); grad.addColorStop(1, pl.coul[1]);
        m.fillStyle = grad; m.beginPath(); m.moveTo(-40, hauteur);
        pics.forEach(([px, py], i) => {
          if (!i) { m.lineTo(px, py); return; }
          const [qx, qy] = pics[i - 1];
          m.lineTo((qx + px) / 2, Math.max(qy, py) + 18 + alea() * 20); m.lineTo(px, py);
        });
        m.lineTo(W + 80, hauteur); m.closePath(); m.fill();
        // liseré de lune sur les crêtes
        m.strokeStyle = `rgba(200,200,255,${.12 - n * .03})`; m.lineWidth = 1.2; m.stroke();
        // brume au pied de chaque plan
        const br = m.createLinearGradient(0, H * pl.base, 0, H * (pl.base + .12));
        br.addColorStop(0, "rgba(120,110,190,0)"); br.addColorStop(1, `rgba(120,110,190,${.18 - n * .04})`);
        m.fillStyle = br; m.fillRect(0, H * pl.base, W, H * .3);
        // quelques fenêtres éclairées sur le plan du milieu (village lointain)
        if (n === 1) {
          graine = 21;
          for (let k = 0; k < 14; k++) {
            const [px, py] = pics[Math.floor(alea() * pics.length)];
            m.fillStyle = `rgba(255,200,120,${.5 + alea() * .4})`;
            m.fillRect(px + (alea() - .5) * 30, py + 30 + alea() * 40, 2, 2);
          }
        }
        montagnes.push({ c, vitesse: .06 + n * .07 });
      });

      // étoiles animées
      graine = 99;
      etoiles = Array.from({ length: Math.round(W * H / 5200) }, () => ({
        x: alea() * W, y: alea() * H * .7, r: alea() * 1.3 + .2,
        p: alea() * 6.28, v: .6 + alea() * 1.8, croix: alea() < .06
      }));
      lucioles = Array.from({ length: Math.min(70, Math.round(W / 22)) }, () => nouvelleLuciole(true));
    }

    function nouvelleLuciole(partout) {
      return {
        x: Math.random() * W, y: partout ? H * (.45 + Math.random() * .55) : H + 10,
        r: 1 + Math.random() * 2.2, c: ELEM[Math.floor(Math.random() * ELEM.length)],
        vy: .15 + Math.random() * .35, ph: Math.random() * 6.28, vie: 1
      };
    }

    function aurore(t) {
      const bandes = [["rgba(77,216,176,", .23, .09], ["rgba(181,123,212,", .3, .07], ["rgba(61,183,228,", .36, .05]];
      bandes.forEach(([coul, yb, a], i) => {
        const g = ctx.createLinearGradient(0, H * (yb - .08), 0, H * (yb + .1));
        g.addColorStop(0, coul + "0)"); g.addColorStop(.5, coul + a + ")"); g.addColorStop(1, coul + "0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, H * (yb + .1));
        for (let x = 0; x <= W; x += 24) ctx.lineTo(x, H * yb + Math.sin(x * .004 + t * .00012 * (i + 1) + i) * H * .04 + Math.sin(x * .011 + t * .0002) * H * .012);
        ctx.lineTo(W, H * (yb + .1)); ctx.closePath(); ctx.fill();
      });
    }

    function dessiner(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(fondFixe, 0, 0, W, H);
      aurore(t);
      for (const e of etoiles) {
        const a = .35 + .65 * (.5 + .5 * Math.sin(e.p + t * .001 * e.v));
        ctx.fillStyle = `rgba(255,248,230,${a})`;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 7); ctx.fill();
        if (e.croix) {
          ctx.strokeStyle = `rgba(255,240,200,${a * .7})`; ctx.lineWidth = .8;
          const l = 5 + a * 5;
          ctx.beginPath(); ctx.moveTo(e.x - l, e.y); ctx.lineTo(e.x + l, e.y); ctx.moveTo(e.x, e.y - l); ctx.lineTo(e.x, e.y + l); ctx.stroke();
        }
      }
      const defil = Math.min(window.scrollY || 0, 1500);
      montagnes.forEach((m) => ctx.drawImage(m.c, 0, -defil * m.vitesse, W, m.c.height / dpr));
      ctx.globalCompositeOperation = "lighter";
      for (const l of lucioles) {
        l.y -= calme ? 0 : l.vy; l.x += Math.sin(t * .0008 + l.ph) * .3;
        const clign = .45 + .55 * Math.sin(t * .002 + l.ph);
        if (l.y < H * .35) l.vie -= .01;
        if (l.vie <= 0) Object.assign(l, nouvelleLuciole(false));
        const a = Math.max(0, clign * l.vie);
        const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 6);
        g.addColorStop(0, l.c); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = a * .8; ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(l.x, l.y, l.r * 6, 0, 7); ctx.fill();
        ctx.globalAlpha = a; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(l.x, l.y, l.r * .5, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      // voile sombre pour garder le texte lisible
      const voile = ctx.createLinearGradient(0, 0, 0, H);
      voile.addColorStop(0, "rgba(10,12,30,.25)"); voile.addColorStop(1, "rgba(10,12,30,.45)");
      ctx.fillStyle = voile; ctx.fillRect(0, 0, W, H);
    }

    function boucle(t) {
      if (!actif) return;
      if (t - dernier > 33) { dessiner(t); dernier = t; } // ~30 images/s
      raf = requestAnimationFrame(boucle);
    }

    function dimensionner() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      peindreFond();
      dessiner(performance.now());
    }

    let attente;
    function allumer() {
      if (!cv) {
        cv = document.createElement("canvas");
        cv.id = "decor-genshin"; cv.setAttribute("aria-hidden", "true");
        document.body.prepend(cv);
        ctx = cv.getContext("2d");
        window.addEventListener("resize", () => { if (!actif) return; clearTimeout(attente); attente = setTimeout(dimensionner, 150); });
        window.addEventListener("scroll", () => { if (actif && calme) dessiner(performance.now()); }, { passive: true });
        document.addEventListener("visibilitychange", () => { if (actif && !document.hidden && !calme) { cancelAnimationFrame(raf); raf = requestAnimationFrame(boucle); } });
      }
      if (actif) return;
      actif = true; cv.hidden = false;
      dimensionner();
      if (!calme) raf = requestAnimationFrame(boucle);
    }
    function eteindre() {
      actif = false; cancelAnimationFrame(raf);
      if (cv) cv.hidden = true;
    }
    return { allumer, eteindre };
  })();

  // ============================================================
  //  DÉCOR ANIMÉ DE LA PLATEFORME — « Carrefour des mondes »
  //  (accueil, mémoire, événements, communauté…)
  //  Nuit violette, quatre halos aux couleurs des jeux qui dérivent,
  //  réseau de points lumineux qui se relient entre eux (la
  //  communauté), poussière d'or. Dessiné en code.
  // ============================================================
  const DecorAccueil = (() => {
    let cv, ctx, W = 0, H = 0, dpr = 1, actif = false, raf = 0, dernier = 0;
    let fond, points = [], poussiere = [];
    const calme = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const HALOS = [["124,198,255", .18, .25], ["201,162,255", .82, .2], ["95,224,195", .15, .8], ["255,122,160", .85, .78]];

    function peindre() {
      fond = document.createElement("canvas"); fond.width = W * dpr; fond.height = H * dpr;
      const g = fond.getContext("2d"); g.scale(dpr, dpr);
      const ciel = g.createLinearGradient(0, 0, 0, H);
      ciel.addColorStop(0, "#0d0822"); ciel.addColorStop(.55, "#170f33"); ciel.addColorStop(1, "#1f1236");
      g.fillStyle = ciel; g.fillRect(0, 0, W, H);
      // rayons de lumière venant du haut
      g.save(); g.globalCompositeOperation = "lighter";
      for (let k = 0; k < 6; k++) {
        const x = W * (.15 + k * .15);
        const r = g.createLinearGradient(x, 0, x + W * .08, H * .9);
        r.addColorStop(0, "rgba(245,200,107,.07)"); r.addColorStop(1, "rgba(245,200,107,0)");
        g.fillStyle = r; g.beginPath();
        g.moveTo(x - 20, 0); g.lineTo(x + 30, 0); g.lineTo(x + W * .16, H); g.lineTo(x + W * .02, H); g.closePath(); g.fill();
      }
      g.restore();
      for (let i = 0; i < W * H / 1400; i++) {
        g.fillStyle = `rgba(255,245,225,${Math.random() * .45})`;
        g.fillRect(Math.random() * W, Math.random() * H, 1, 1);
      }
      const n = Math.min(90, Math.round(W * H / 16000));
      points = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25,
        c: HALOS[Math.floor(Math.random() * 4)][0], r: 1 + Math.random() * 1.6
      }));
      poussiere = Array.from({ length: 40 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: .1 + Math.random() * .3, p: Math.random() * 6.28 }));
    }

    function dessiner(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(fond, 0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      HALOS.forEach(([c, x, y], i) => {
        const cx = W * x + Math.sin(t * .00007 + i * 1.7) * W * .08;
        const cy = H * y + Math.cos(t * .00009 + i) * H * .08;
        const r = Math.max(W, H) * (.32 + .04 * Math.sin(t * .0003 + i));
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `rgba(${c},.22)`); g.addColorStop(.5, `rgba(${c},.06)`); g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      });
      // réseau
      const dmax = Math.min(170, W * .16);
      for (const a of points) {
        if (!calme) {
          a.x += a.vx; a.y += a.vy;
          if (a.x < 0 || a.x > W) a.vx *= -1;
          if (a.y < 0 || a.y > H) a.vy *= -1;
        }
      }
      ctx.lineWidth = .8;
      for (let i = 0; i < points.length; i++) {
        const a = points[i];
        for (let j = i + 1; j < points.length; j++) {
          const b = points[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
          if (d < dmax) {
            ctx.strokeStyle = `rgba(${a.c},${(1 - d / dmax) * .28})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (const a of points) {
        const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.r * 5);
        g.addColorStop(0, `rgba(${a.c},.9)`); g.addColorStop(1, `rgba(${a.c},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * 5, 0, 7); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * .6, 0, 7); ctx.fill();
      }
      for (const d of poussiere) {
        if (!calme) { d.y -= d.v; if (d.y < -5) { d.y = H + 5; d.x = Math.random() * W; } }
        const al = .3 + .5 * (.5 + .5 * Math.sin(t * .002 + d.p));
        ctx.fillStyle = `rgba(245,200,107,${al})`;
        ctx.beginPath(); ctx.arc(d.x + Math.sin(t * .001 + d.p) * 6, d.y, 1.2, 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      const voile = ctx.createLinearGradient(0, 0, 0, H);
      voile.addColorStop(0, "rgba(13,8,34,.15)"); voile.addColorStop(1, "rgba(13,8,34,.4)");
      ctx.fillStyle = voile; ctx.fillRect(0, 0, W, H);
    }
    function boucle(t) {
      if (!actif) return;
      if (t - dernier > 33) { dessiner(t); dernier = t; }
      raf = requestAnimationFrame(boucle);
    }
    function dimensionner() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      peindre(); dessiner(performance.now());
    }
    let attente;
    function allumer() {
      if (!cv) {
        cv = document.createElement("canvas");
        cv.id = "decor-accueil"; cv.setAttribute("aria-hidden", "true");
        document.body.prepend(cv);
        ctx = cv.getContext("2d");
        window.addEventListener("resize", () => { if (!actif) return; clearTimeout(attente); attente = setTimeout(dimensionner, 150); });
        document.addEventListener("visibilitychange", () => { if (actif && !document.hidden && !calme) { cancelAnimationFrame(raf); raf = requestAnimationFrame(boucle); } });
      }
      if (actif) return;
      actif = true; cv.hidden = false;
      dimensionner();
      if (!calme) raf = requestAnimationFrame(boucle);
    }
    function eteindre() { actif = false; cancelAnimationFrame(raf); if (cv) cv.hidden = true; }
    return { allumer, eteindre };
  })();

  // ============================================================
  //  DÉCOR ANIMÉ DE L'ESPACE HSR — « Voie de l'Express astral »
  //  Nébuleuses, champ d'étoiles en dérive (effet de voyage),
  //  planète à anneaux, rail de lumière dorée que parcourt un
  //  train stylisé, étoiles filantes. Dessiné en code.
  // ============================================================
  const DecorHSR = (() => {
    let cv, ctx, W = 0, H = 0, dpr = 1, actif = false, raf = 0, dernier = 0;
    let fond, planete, proches = [], filantes = [];
    const calme = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    let graine = 3;
    const alea = () => ((graine = (graine * 16807) % 2147483647) - 1) / 2147483646;
    const toile = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

    // courbe du rail (bézier cubique), en proportion de l'écran
    const rail = () => [[W * 1.08, H * .78], [W * .7, H * .5], [W * .35, H * .52], [-W * .08, H * .12]];
    function pointRail(t) {
      const [a, b, c, d] = rail(), u = 1 - t;
      const x = u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0];
      const y = u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1];
      return [x, y];
    }

    function peindre() {
      fond = toile(W * dpr, H * dpr);
      const g = fond.getContext("2d"); g.scale(dpr, dpr);
      const ciel = g.createLinearGradient(0, 0, W, H);
      ciel.addColorStop(0, "#03050f"); ciel.addColorStop(.5, "#0a0f2e"); ciel.addColorStop(1, "#150b2c");
      g.fillStyle = ciel; g.fillRect(0, 0, W, H);
      // nébuleuses
      graine = 5;
      const nebs = [["107,76,255", .72, .3, .55, .22], ["47,208,200", .2, .62, .45, .12], ["255,95,168", .9, .75, .35, .12], ["233,207,143", .45, .15, .3, .07]];
      nebs.forEach(([c, x, y, r, a]) => {
        for (let k = 0; k < 7; k++) {
          const cx = W * (x + (alea() - .5) * .25), cy = H * (y + (alea() - .5) * .2), rr = Math.max(W, H) * r * (.4 + alea() * .6);
          const n = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
          n.addColorStop(0, `rgba(${c},${a * (.5 + alea() * .5)})`); n.addColorStop(1, `rgba(${c},0)`);
          g.fillStyle = n; g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.fill();
        }
      });
      // poussière d'étoiles fixe
      graine = 17;
      for (let i = 0; i < W * H / 900; i++) {
        g.fillStyle = `rgba(${alea() < .15 ? "233,207,143" : alea() < .3 ? "185,164,255" : "235,240,255"},${alea() * .7})`;
        g.fillRect(alea() * W, alea() * H, alea() < .9 ? 1 : 1.6, alea() < .9 ? 1 : 1.6);
      }
      // petite planète lointaine
      const px = W * .86, py = H * .16, pr = Math.min(W, H) * .035;
      const sp = g.createRadialGradient(px - pr * .4, py - pr * .4, pr * .1, px, py, pr);
      sp.addColorStop(0, "#9fe7ff"); sp.addColorStop(1, "#23407a");
      g.fillStyle = sp; g.beginPath(); g.arc(px, py, pr, 0, 7); g.fill();
      const hs = g.createRadialGradient(px, py, pr, px, py, pr * 3);
      hs.addColorStop(0, "rgba(120,200,255,.25)"); hs.addColorStop(1, "rgba(120,200,255,0)");
      g.fillStyle = hs; g.beginPath(); g.arc(px, py, pr * 3, 0, 7); g.fill();

      // grande planète à anneaux (calque séparé pour la parallaxe)
      const R = Math.min(W, H) * .32;
      planete = toile(Math.ceil(R * 5 * dpr), Math.ceil(R * 3 * dpr));
      const p = planete.getContext("2d"); p.scale(dpr, dpr);
      const cx = R * 2.5, cy = R * 1.5;
      const anneau = (devant) => {
        p.save(); p.translate(cx, cy); p.rotate(-.28);
        for (let k = 0; k < 5; k++) {
          p.beginPath();
          p.ellipse(0, 0, R * (1.55 + k * .12), R * (.36 + k * .03), 0, devant ? 0 : Math.PI, devant ? Math.PI : Math.PI * 2);
          p.strokeStyle = `rgba(233,207,143,${[.55, .25, .45, .15, .3][k]})`; p.lineWidth = R * (k === 0 ? .05 : .03); p.stroke();
        }
        p.restore();
      };
      anneau(false);
      const corps = p.createRadialGradient(cx - R * .4, cy - R * .5, R * .1, cx, cy, R);
      corps.addColorStop(0, "#c9a2ff"); corps.addColorStop(.45, "#5b3fae"); corps.addColorStop(1, "#1a1040");
      p.fillStyle = corps; p.beginPath(); p.arc(cx, cy, R, 0, 7); p.fill();
      p.save(); p.beginPath(); p.arc(cx, cy, R, 0, 7); p.clip();
      graine = 23;
      for (let k = 0; k < 9; k++) {
        p.fillStyle = `rgba(${alea() < .5 ? "255,255,255" : "40,20,90"},${.05 + alea() * .07})`;
        p.fillRect(cx - R, cy - R + alea() * R * 2, R * 2, R * (.04 + alea() * .1));
      }
      const ombre = p.createRadialGradient(cx + R * .6, cy + R * .6, R * .2, cx + R * .3, cy + R * .3, R * 1.3);
      ombre.addColorStop(0, "rgba(3,5,15,.85)"); ombre.addColorStop(1, "rgba(3,5,15,0)");
      p.fillStyle = ombre; p.fillRect(cx - R, cy - R, R * 2, R * 2);
      p.restore();
      p.strokeStyle = "rgba(201,162,255,.5)"; p.lineWidth = 1.5; p.beginPath(); p.arc(cx, cy, R, Math.PI * .9, Math.PI * 1.6); p.stroke();
      anneau(true);

      graine = 41;
      proches = Array.from({ length: Math.round(W * H / 9000) }, () => ({
        x: alea() * W, y: alea() * H, z: .3 + alea() * 1.2, p: alea() * 6.28
      }));
    }

    function dessinerRail(t) {
      const [a, b, c, d] = rail();
      // rail : halo + filet doré + traverses
      ctx.save();
      ctx.lineCap = "round";
      [[14, "rgba(233,207,143,.06)"], [6, "rgba(233,207,143,.12)"], [1.6, "rgba(255,236,190,.75)"]].forEach(([l, c2]) => {
        ctx.strokeStyle = c2; ctx.lineWidth = l;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.bezierCurveTo(b[0], b[1], c[0], c[1], d[0], d[1]); ctx.stroke();
      });
      ctx.fillStyle = "rgba(255,236,190,.5)";
      for (let k = 0; k <= 60; k++) {
        const [x, y] = pointRail(k / 60);
        ctx.beginPath(); ctx.arc(x, y, 1.2 + .8 * Math.sin(t * .003 - k * .5) ** 2, 0, 7); ctx.fill();
      }
      // le train : parcourt le rail en 18 s, puis 6 s de pause
      const cycle = (t % 24000) / 18000;
      if (cycle <= 1) {
        const tt = cycle;
        const voitures = 4;
        // traînée lumineuse
        for (let k = 0; k < 40; k++) {
          const q = tt - k * .004; if (q < 0) break;
          const [x, y] = pointRail(q);
          ctx.fillStyle = `rgba(255,220,150,${.35 * (1 - k / 40)})`;
          ctx.beginPath(); ctx.arc(x, y, 3.5 * (1 - k / 40), 0, 7); ctx.fill();
        }
        for (let v = 0; v < voitures; v++) {
          const q = tt - .012 - v * .026;
          if (q < 0) continue;
          const [x, y] = pointRail(q);
          const [x2, y2] = pointRail(Math.min(1, q + .002));
          const ang = Math.atan2(y2 - y, x2 - x);
          const echelle = Math.max(1.3, Math.min(W, H) / 420);
          ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(echelle, echelle);
          const l = v === 0 ? 30 : 24, h = 10;
          ctx.fillStyle = v === 0 ? "#f3e2b3" : "#e2e6f5";
          ctx.beginPath(); ctx.roundRect(-l / 2, -h - 1, l, h, v === 0 ? [3, 8, 3, 3] : 3); ctx.fill();
          ctx.fillStyle = "#6b3a2c"; ctx.fillRect(-l / 2, -3.5, l, 2);
          ctx.fillStyle = "rgba(255,210,120,.95)";
          for (let w = -l / 2 + 4; w < l / 2 - 4; w += 6) ctx.fillRect(w, -h + 1.5, 3, 3);
          if (v === 0) {
            const phare = ctx.createRadialGradient(l / 2 + 2, -6, 0, l / 2 + 2, -6, 26);
            phare.addColorStop(0, "rgba(255,240,200,.9)"); phare.addColorStop(1, "rgba(255,240,200,0)");
            ctx.fillStyle = phare; ctx.beginPath(); ctx.arc(l / 2 + 2, -6, 26, 0, 7); ctx.fill();
          }
          ctx.restore();
        }
      }
      ctx.restore();
    }

    function dessiner(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(fond, 0, 0, W, H);
      const defil = Math.min(window.scrollY || 0, 2000);
      const R = Math.min(W, H) * .32;
      ctx.drawImage(planete, -R * 1.6, H - R * 1.35 - defil * .12, planete.width / dpr, planete.height / dpr);
      // étoiles proches : dérive vers la gauche, comme vues du train
      for (const e of proches) {
        if (!calme) { e.x -= e.z * .35; if (e.x < -10) { e.x = W + 10; e.y = Math.random() * H; } }
        const a = .4 + .6 * (.5 + .5 * Math.sin(e.p + t * .0015 * e.z));
        const y = e.y - defil * .05 * e.z;
        ctx.fillStyle = `rgba(240,244,255,${a})`;
        ctx.fillRect(e.x, ((y % H) + H) % H, e.z * 1.4, e.z * 1.4);
        if (e.z > 1.3) { ctx.fillStyle = `rgba(240,244,255,${a * .25})`; ctx.fillRect(e.x, ((y % H) + H) % H + e.z * .5, e.z * 7, .6); }
      }
      dessinerRail(t);
      // étoiles filantes
      if (!calme && Math.random() < .006 && filantes.length < 2) filantes.push({ x: Math.random() * W, y: Math.random() * H * .4, v: 9 + Math.random() * 6, vie: 1 });
      filantes = filantes.filter((f) => f.vie > 0);
      for (const f of filantes) {
        f.x -= f.v; f.y += f.v * .45; f.vie -= .025;
        const g = ctx.createLinearGradient(f.x, f.y, f.x + 90, f.y - 40);
        g.addColorStop(0, `rgba(255,245,220,${f.vie})`); g.addColorStop(1, "rgba(255,245,220,0)");
        ctx.strokeStyle = g; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + 90, f.y - 40); ctx.stroke();
      }
      const voile = ctx.createLinearGradient(0, 0, 0, H);
      voile.addColorStop(0, "rgba(3,5,15,.2)"); voile.addColorStop(1, "rgba(3,5,15,.45)");
      ctx.fillStyle = voile; ctx.fillRect(0, 0, W, H);
    }

    function boucle(t) {
      if (!actif) return;
      if (t - dernier > 33) { dessiner(t); dernier = t; }
      raf = requestAnimationFrame(boucle);
    }
    function dimensionner() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      peindre(); dessiner(calme ? 3000 : performance.now());
    }
    let attente;
    function allumer() {
      if (!cv) {
        cv = document.createElement("canvas");
        cv.id = "decor-hsr"; cv.className = "decor"; cv.setAttribute("aria-hidden", "true");
        document.body.prepend(cv);
        ctx = cv.getContext("2d");
        window.addEventListener("resize", () => { if (!actif) return; clearTimeout(attente); attente = setTimeout(dimensionner, 150); });
        window.addEventListener("scroll", () => { if (actif && calme) dessiner(3000); }, { passive: true });
        document.addEventListener("visibilitychange", () => { if (actif && !document.hidden && !calme) { cancelAnimationFrame(raf); raf = requestAnimationFrame(boucle); } });
      }
      if (actif) return;
      actif = true; cv.hidden = false;
      dimensionner();
      if (!calme) raf = requestAnimationFrame(boucle);
    }
    function eteindre() { actif = false; cancelAnimationFrame(raf); if (cv) cv.hidden = true; }
    return { allumer, eteindre };
  })();

  // ============================================================
  //  FABRIQUE DE DÉCORS (toile plein écran, 30 images/s, pause
  //  quand l'onglet est caché, immobile si « animations réduites »)
  // ============================================================
  function creerDecor(id, scene) {
    let cv, ctx, actif = false, raf = 0, dernier = 0, attente;
    const etat = { W: 0, H: 0, dpr: 1, calme: !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) };
    const dessiner = (t) => { ctx.setTransform(etat.dpr, 0, 0, etat.dpr, 0, 0); scene.dessiner(ctx, etat, t); };
    function boucle(t) { if (!actif) return; if (t - dernier > 33) { dessiner(t); dernier = t; } raf = requestAnimationFrame(boucle); }
    function dimensionner() {
      etat.dpr = Math.min(window.devicePixelRatio || 1, 2);
      etat.W = window.innerWidth; etat.H = window.innerHeight;
      cv.width = etat.W * etat.dpr; cv.height = etat.H * etat.dpr;
      scene.peindre(etat); dessiner(etat.calme ? 4000 : performance.now());
    }
    return {
      allumer() {
        if (!cv) {
          cv = document.createElement("canvas"); cv.id = id; cv.className = "decor"; cv.setAttribute("aria-hidden", "true");
          document.body.prepend(cv); ctx = cv.getContext("2d");
          window.addEventListener("resize", () => { if (!actif) return; clearTimeout(attente); attente = setTimeout(dimensionner, 150); });
          window.addEventListener("scroll", () => { if (actif && etat.calme) dessiner(4000); }, { passive: true });
          document.addEventListener("visibilitychange", () => { if (actif && !document.hidden && !etat.calme) { cancelAnimationFrame(raf); raf = requestAnimationFrame(boucle); } });
        }
        if (actif) return;
        actif = true; cv.hidden = false; dimensionner();
        if (!etat.calme) raf = requestAnimationFrame(boucle);
      },
      eteindre() { actif = false; cancelAnimationFrame(raf); if (cv) cv.hidden = true; }
    };
  }
  const toileHors = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

  // ------------------------------------------------------------
  //  WUTHERING WAVES — « Champ de résonance »
  //  Éclipse à couronne turquoise, spectre sonore ondulant, sol
  //  quadrillé en perspective qui défile, fragments numériques et
  //  parasites de signal.
  // ------------------------------------------------------------
  const DecorWuwa = creerDecor("decor-wuwa", (() => {
    let fond, fragments = [], glitch = 0;
    return {
      peindre({ W, H, dpr }) {
        fond = toileHors(W * dpr, H * dpr);
        const g = fond.getContext("2d"); g.scale(dpr, dpr);
        const ciel = g.createLinearGradient(0, 0, 0, H);
        ciel.addColorStop(0, "#010403"); ciel.addColorStop(.6, "#041210"); ciel.addColorStop(1, "#08201c");
        g.fillStyle = ciel; g.fillRect(0, 0, W, H);
        for (let i = 0; i < W * H / 2500; i++) { g.fillStyle = `rgba(180,255,235,${Math.random() * .35})`; g.fillRect(Math.random() * W, Math.random() * H * .7, 1, 1); }
        const ho = g.createLinearGradient(0, H * .55, 0, H * .75);
        ho.addColorStop(0, "rgba(62,230,193,0)"); ho.addColorStop(.6, "rgba(62,230,193,.16)"); ho.addColorStop(1, "rgba(62,230,193,0)");
        g.fillStyle = ho; g.fillRect(0, H * .55, W, H * .2);
        fragments = Array.from({ length: Math.min(80, Math.round(W / 18)) }, () => ({ x: Math.random() * W, y: Math.random() * H, v: .2 + Math.random() * .6, s: 1 + Math.random() * 3, a: Math.random() }));
      },
      dessiner(ctx, { W, H, calme }, t) {
        ctx.drawImage(fond, 0, 0, W, H);
        const defil = Math.min(window.scrollY || 0, 1500);
        // éclipse
        const ex = W * (W > 900 ? .86 : .8), ey = H * .24 - defil * .08, er = Math.min(W, H) * (W > 900 ? .15 : .12);
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        const cor = ctx.createRadialGradient(ex, ey, er * .9, ex, ey, er * 2.4);
        cor.addColorStop(0, "rgba(120,255,225,.55)"); cor.addColorStop(.25, "rgba(62,230,193,.18)"); cor.addColorStop(1, "rgba(62,230,193,0)");
        ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(ex, ey, er * 2.4, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(160,255,235,.25)"; ctx.lineWidth = 1;
        for (let k = 0; k < 48; k++) {
          const a = k / 48 * Math.PI * 2 + t * .00005, l = er * (1.15 + .35 * (.5 + .5 * Math.sin(k * 3.1 + t * .002)));
          ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * er * 1.02, ey + Math.sin(a) * er * 1.02); ctx.lineTo(ex + Math.cos(a) * l, ey + Math.sin(a) * l); ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = "#010403"; ctx.beginPath(); ctx.arc(ex, ey, er, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(210,255,245,.95)"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(ex, ey, er, 0, 7); ctx.stroke();
        ctx.strokeStyle = "rgba(62,230,193,.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ex, ey, er * .8, t * .0004, t * .0004 + 4.2); ctx.stroke();
        // sol en perspective
        const hz = H * .7;
        ctx.strokeStyle = "rgba(62,230,193,.22)"; ctx.lineWidth = 1;
        for (let k = -14; k <= 14; k++) { ctx.beginPath(); ctx.moveTo(W / 2 + k * 18, hz); ctx.lineTo(W / 2 + k * W * .16, H); ctx.stroke(); }
        const avance = calme ? 0 : (t * .00025) % 1;
        for (let k = 0; k < 12; k++) {
          const q = (k + avance) / 12, y = hz + (H - hz) * q * q;
          ctx.globalAlpha = q; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // spectre sonore
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        for (let l = 0; l < 14; l++) {
          const base = H * (.52 + l * .012);
          ctx.strokeStyle = `rgba(${l % 3 ? "62,230,193" : "169,139,255"},${.08 + (l % 4) * .04})`; ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let x = 0; x <= W; x += 8) {
            const env = Math.exp(-Math.pow((x - W * .45) / (W * .28), 2));
            const y = base + env * (Math.sin(x * .02 + t * .002 + l) * 18 + Math.sin(x * .053 - t * .003 + l * 2) * 8) * (1 + .4 * Math.sin(t * .0011 + l));
            x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
        // fragments numériques qui montent
        for (const f of fragments) {
          if (!calme) { f.y -= f.v; if (f.y < -5) { f.y = H + 5; f.x = Math.random() * W; } }
          const a = .25 + .5 * (.5 + .5 * Math.sin(t * .003 + f.a * 9));
          ctx.fillStyle = `rgba(120,255,225,${a})`; ctx.fillRect(f.x, f.y, f.s, f.s);
        }
        ctx.restore();
        // parasites de signal
        if (!calme && Math.random() < .012) glitch = 6;
        if (glitch > 0) {
          glitch--;
          const y = Math.random() * H, h = 4 + Math.random() * 20;
          ctx.fillStyle = "rgba(62,230,193,.08)"; ctx.fillRect(0, y, W, h);
          ctx.drawImage(ctx.canvas, 0, y * (ctx.canvas.width / W), ctx.canvas.width, h * (ctx.canvas.width / W), (Math.random() - .5) * 30, y, W, h);
        }
        const v = ctx.createLinearGradient(0, 0, 0, H);
        v.addColorStop(0, "rgba(1,4,3,.25)"); v.addColorStop(1, "rgba(1,4,3,.5)");
        ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
      }
    };
  })());

  // ------------------------------------------------------------
  //  NEVERNESS TO EVERNESS — « Hethereau sous la pluie »
  //  Trois plans d'immeubles aux fenêtres qui s'allument, enseignes
  //  néon qui grésillent, pluie oblique, véhicules volants et reflets
  //  sur la chaussée mouillée.
  // ------------------------------------------------------------
  const DecorNTE = creerDecor("decor-nte", (() => {
    let fond, plans = [], enseignes = [], pluie = [], vols = [];
    const NEON = ["#ff3d8b", "#7ee8ff", "#ffe14d", "#b67cff"];
    return {
      peindre({ W, H, dpr }) {
        fond = toileHors(W * dpr, H * dpr);
        const g = fond.getContext("2d"); g.scale(dpr, dpr);
        const ciel = g.createLinearGradient(0, 0, 0, H);
        ciel.addColorStop(0, "#07030d"); ciel.addColorStop(.55, "#1a0a26"); ciel.addColorStop(1, "#3a0f3f");
        g.fillStyle = ciel; g.fillRect(0, 0, W, H);
        const halo = g.createRadialGradient(W * .5, H * .85, 0, W * .5, H * .85, W * .7);
        halo.addColorStop(0, "rgba(255,61,139,.35)"); halo.addColorStop(1, "rgba(255,61,139,0)");
        g.fillStyle = halo; g.fillRect(0, 0, W, H);
        // lune derrière la brume
        const lu = g.createRadialGradient(W * .2, H * .18, 0, W * .2, H * .18, H * .12);
        lu.addColorStop(0, "rgba(255,230,250,.9)"); lu.addColorStop(.3, "rgba(255,190,230,.35)"); lu.addColorStop(1, "rgba(255,190,230,0)");
        g.fillStyle = lu; g.beginPath(); g.arc(W * .2, H * .18, H * .12, 0, 7); g.fill();
        plans = []; enseignes = [];
        [[.42, .28, "#1b0d2b", 50, .05], [.55, .22, "#130820", 70, .1], [.68, .2, "#0a0512", 95, .18]].forEach(([hautMin, var_, coul, larg, vit], n) => {
          const bat = []; let x = -20;
          while (x < W + 20) {
            const w = larg * (.6 + Math.random() * .9), h = H * (1 - hautMin - Math.random() * var_);
            bat.push({ x, w, top: H - h, fen: [] });
            x += w + (n === 2 ? 4 : 2);
          }
          bat.forEach((b) => {
            for (let fy = b.top + 10; fy < H - 10; fy += 12 + n * 2) for (let fx = b.x + 6; fx < b.x + b.w - 6; fx += 10 + n * 2)
              if (Math.random() < .28) b.fen.push({ x: fx, y: fy, on: Math.random() < .7, c: Math.random() < .8 ? "255,210,150" : "126,232,255" });
            if (n > 0 && Math.random() < .35) enseignes.push({ plan: n, x: b.x + b.w * .2, y: b.top + 20 + Math.random() * 60, w: Math.max(14, b.w * .5), h: 6 + Math.random() * 10, c: NEON[Math.floor(Math.random() * 4)], p: Math.random() * 100 });
            if (Math.random() < .3) b.antenne = 10 + Math.random() * 30;
          });
          plans.push({ bat, coul, vit });
        });
        pluie = Array.from({ length: Math.round(W * H / 6000) }, () => ({ x: Math.random() * W, y: Math.random() * H, l: 8 + Math.random() * 14, v: 8 + Math.random() * 6 }));
        vols = Array.from({ length: 3 }, (_, i) => ({ x: Math.random() * W, y: H * (.2 + i * .1), v: (i % 2 ? -1 : 1) * (.6 + Math.random()) }));
      },
      dessiner(ctx, { W, H, calme }, t) {
        ctx.drawImage(fond, 0, 0, W, H);
        const defil = Math.min(window.scrollY || 0, 1500);
        // véhicules volants
        for (const v of vols) {
          if (!calme) { v.x += v.v; if (v.x > W + 40) v.x = -40; if (v.x < -40) v.x = W + 40; }
          const y = v.y + Math.sin(t * .001 + v.y) * 4;
          ctx.fillStyle = "rgba(255,240,250,.95)"; ctx.fillRect(v.x, y, 3, 1.5);
          ctx.fillStyle = "rgba(255,61,139,.9)"; ctx.fillRect(v.x - (v.v > 0 ? 6 : -6), y, 2, 1.5);
          const tr = ctx.createLinearGradient(v.x, y, v.x - v.v * 40, y);
          tr.addColorStop(0, "rgba(255,200,230,.35)"); tr.addColorStop(1, "rgba(255,200,230,0)");
          ctx.fillStyle = tr; ctx.fillRect(Math.min(v.x, v.x - v.v * 40), y, Math.abs(v.v * 40), 1);
        }
        plans.forEach((pl, n) => {
          const dy = -defil * pl.vit;
          ctx.fillStyle = pl.coul;
          for (const b of pl.bat) {
            ctx.fillRect(b.x, b.top + dy, b.w, H - b.top + 200);
            if (b.antenne) { ctx.fillRect(b.x + b.w / 2, b.top + dy - b.antenne, 2, b.antenne); if (Math.sin(t * .004 + b.x) > .6) { ctx.fillStyle = "#ff3d8b"; ctx.fillRect(b.x + b.w / 2 - 1, b.top + dy - b.antenne - 2, 4, 3); ctx.fillStyle = pl.coul; } }
            for (const f of b.fen) {
              if (!calme && Math.random() < .0008) f.on = !f.on;
              if (f.on) { ctx.fillStyle = `rgba(${f.c},${.35 + n * .2})`; ctx.fillRect(f.x, f.y + dy, 3 + n, 4 + n); }
            }
            ctx.fillStyle = pl.coul;
          }
          ctx.save(); ctx.globalCompositeOperation = "lighter";
          for (const e of enseignes) {
            if (e.plan !== n) continue;
            const scint = Math.sin(t * .01 + e.p) > -.92 ? 1 : .15;
            ctx.shadowColor = e.c; ctx.shadowBlur = 16; ctx.globalAlpha = .9 * scint;
            ctx.strokeStyle = e.c; ctx.lineWidth = 2; ctx.strokeRect(e.x, e.y + dy, e.w, e.h);
            ctx.fillStyle = e.c; ctx.globalAlpha = .35 * scint; ctx.fillRect(e.x + 3, e.y + dy + 2, e.w - 6, Math.max(1, e.h - 4));
          }
          ctx.restore();
        });
        // chaussée mouillée et reflets
        const sol = H * .9;
        const rf = ctx.createLinearGradient(0, sol, 0, H);
        rf.addColorStop(0, "rgba(40,10,50,.85)"); rf.addColorStop(1, "rgba(10,3,15,.95)");
        ctx.fillStyle = rf; ctx.fillRect(0, sol, W, H - sol);
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        for (const e of enseignes) {
          const g = ctx.createLinearGradient(0, sol, 0, H);
          g.addColorStop(0, e.c + "55"); g.addColorStop(1, e.c + "00");
          ctx.fillStyle = g; ctx.fillRect(e.x + Math.sin(t * .002 + e.p) * 2, sol, Math.max(3, e.w * .4), H - sol);
        }
        // pluie
        ctx.strokeStyle = "rgba(190,220,255,.28)"; ctx.lineWidth = 1;
        ctx.beginPath();
        for (const r of pluie) {
          if (!calme) { r.y += r.v; r.x -= r.v * .25; if (r.y > H) { r.y = -r.l; r.x = Math.random() * W * 1.2; } }
          ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - r.l * .25, r.y + r.l);
        }
        ctx.stroke();
        ctx.restore();
        const v = ctx.createLinearGradient(0, 0, 0, H);
        v.addColorStop(0, "rgba(7,3,13,.2)"); v.addColorStop(1, "rgba(7,3,13,.45)");
        ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
      }
    };
  })());

  // ============================================================
  //  EFFETS : inclinaison 3D + reflet, étincelles au clic, barre
  //  de lecture, en-tête compact, compteurs animés.
  // ============================================================
  const Effets = (() => {
    const calme = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tactile = window.matchMedia && matchMedia("(hover: none)").matches;
    let cible = null;
    if (!calme && !tactile) {
      document.addEventListener("pointermove", (ev) => {
        const el = ev.target.closest && ev.target.closest("[data-tilt]");
        if (cible && cible !== el) { cible.style.transform = ""; cible.classList.remove("incline"); cible = null; }
        if (!el) return;
        const r = el.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width, py = (ev.clientY - r.top) / r.height;
        const force = el.classList.contains("perso-portrait") ? 10 : el.classList.contains("perso") ? 14 : 6;
        el.style.transform = `perspective(800px) rotateX(${(.5 - py) * force}deg) rotateY(${(px - .5) * force}deg) translateY(-3px)`;
        el.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
        el.style.setProperty("--my", (py * 100).toFixed(1) + "%");
        el.classList.add("incline");
        cible = el;
      }, { passive: true });
      document.addEventListener("pointerdown", (ev) => {
        if (ev.button !== 0) return;
        const couleur = getComputedStyle(document.documentElement).getPropertyValue("--or").trim() || "#f5c86b";
        for (let k = 0; k < 10; k++) {
          const e = document.createElement("span");
          e.className = "etincelle";
          const a = (k / 10) * Math.PI * 2 + Math.random() * .4, d = 24 + Math.random() * 26;
          e.style.cssText = `left:${ev.clientX}px;top:${ev.clientY}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;background:${k % 3 ? couleur : "#fff"}`;
          document.body.appendChild(e);
          setTimeout(() => e.remove(), 700);
        }
      });
    }
    const barre = document.createElement("div");
    barre.className = "barre-lecture"; barre.setAttribute("aria-hidden", "true");
    document.body.appendChild(barre);
    const majDefil = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      barre.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`;
      document.body.classList.toggle("defile", scrollY > 40);
    };
    window.addEventListener("scroll", majDefil, { passive: true });

    function compter(el) {
      const fin = +el.dataset.compte;
      if (calme || !fin) { el.textContent = fin; return; }
      const debut = performance.now(), duree = 1200;
      const pas = (t) => {
        const q = Math.min(1, (t - debut) / duree);
        el.textContent = Math.round(fin * (1 - Math.pow(1 - q, 3)));
        if (q < 1) requestAnimationFrame(pas);
      };
      requestAnimationFrame(pas);
    }
    return {
      apresRendu() {
        cible = null;
        const app = document.getElementById("app");
        app.classList.remove("entree"); void app.offsetWidth; app.classList.add("entree");
        app.querySelectorAll("[data-compte]").forEach(compter);
        majDefil();
      }
    };
  })();

  // ---------- démarrage
  async function demarrer() {
    await S.init();
    ME = await S.me();
    const zone = document.getElementById("zone-compte");
    zone.innerHTML = ME
      ? `<a href="#/moi" class="compte">${avatar(ME, "s")}<span>${esc(ME.username)}</span></a>`
      : `<button class="btn btn-discord btn-petit" data-action="login">Connexion Discord</button>`;
    if (S.mode === "demo") {
      const b = document.getElementById("bandeau-demo");
      b.hidden = false;
      b.innerHTML = `Mode démo : membres et contenus fictifs, enregistrés uniquement dans ce navigateur. ${ME ? `Tu es connecté comme « ${esc(ME.username)} » (${estEquipe() ? "admin" : "simple membre"}). <button class="lien-discret" data-action="role-demo">Passer en ${estEquipe() ? "simple membre" : "admin"}</button> ·` : "« Connexion Discord » te connecte comme un admin fictif."} <button class="lien-discret" data-action="reset">Réinitialiser la démo</button>`;
    }
    if (estEquipe()) {
      const a = document.createElement("a");
      a.href = "#/moderation"; a.dataset.page = "moderation"; a.id = "nav-moderation";
      a.innerHTML = 'Modération <b class="compteur" hidden></b>';
      document.querySelector(".nav").appendChild(a);
      majCompteurModeration();
    }
    if (CFG.INVITATION_DISCORD) {
      document.getElementById("lien-discord").innerHTML = `<a class="lien" href="${esc(CFG.INVITATION_DISCORD)}" target="_blank" rel="noopener">Rejoindre le serveur Discord ↗</a>`;
    }
    const ban = document.getElementById("banniere-accueil");
    // Bannière dessinée ; si ton image banniere.png existe, elle passe devant.
    ban.classList.add("avec-image");
    ban.innerHTML = `
      <div class="bd" aria-hidden="true">
        <div class="bd-cadre">
          <p class="bd-sur"><span>✦</span> Communauté <span>✦</span></p>
          <p class="bd-titre">${esc(CFG.NOM_SITE).replace(/^(La|Le|Les) /, '<span class="bd-article">$1</span> ')}</p>
          <p class="bd-jeux">${JEUX.map((g) => `<span style="--c:${g.couleur}"><i></i>${esc(g.nom)}</span>`).join("")}</p>
        </div>
      </div>
      <img class="bd-image" src="${esc(IMGS.banniere || CFG.BANNIERE || "banniere.png")}" alt="${esc(CFG.NOM_SITE)}" data-repli="banniere">`;
    window.addEventListener("hashchange", rendre);
    rendre();
  }
  demarrer().catch((err) => {
    $app.innerHTML = vide("Le site n'a pas pu démarrer : " + esc(err.message));
  });
})();
