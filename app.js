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

  let banniereOK = true;
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
      banniereOK = false;
      document.getElementById("banniere-accueil").hidden = true;
      const h = document.getElementById("hero-repli"); if (h) h.hidden = false;
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

  // ---------- cartes
  function carteBuild(b, auteurs) {
    const g = jeu(b.game), a = auteurs[b.author_id];
    const champs = g ? g.champs.filter((c) => b.fields && b.fields[c.cle]).slice(0, 2) : [];
    const img = urlSure((b.images || [])[0]);
    const nb = (b.images || []).length;
    return `<a class="carte carte-build" href="#/build/${esc(b.id)}" style="--c:${g ? g.couleur : "#fff"}">
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

    return `
    <section class="accueil-tete">
      <!-- La bannière pleine largeur est au-dessus de la page (index.html).
           Ce texte ne s'affiche que si l'image est introuvable. -->
      <div class="hero" id="hero-repli" ${banniereOK ? "hidden" : ""}>
        <p class="surtitre">La plateforme de notre communauté</p>
        <h1>Nos builds, nos événements,<br><em>notre histoire.</em></h1>
      </div>
      ${ME ? `<p class="bienvenue">Content de te revoir, <b>${esc(ME.username)}</b></p>` : `<button class="btn btn-discord" data-action="login">Se connecter avec Discord</button>`}
    </section>

    <section class="pouls" aria-label="En ce moment">
      ${actifs.slice(0, 2).map((e) => `<a class="pouls-item pouls-${statut(e)}" href="#/evenement/${esc(e.id)}"><b>${(TYPES[e.type] || {}).icone || ""} ${statut(e) === "encours" ? "En cours" : "Bientôt"}</b> ${esc(e.title)} <span class="faible">${statut(e) === "encours" ? "" : "· " + esc(dateFr(e.starts_at, true))}</span></a>`).join("")}
      <div class="pouls-item"><b>${buildsJour}</b> nouveau${buildsJour > 1 ? "x" : ""} build${buildsJour > 1 ? "s" : ""} aujourd'hui</div>
      <div class="pouls-item"><b>${memsSemaine}</b> souvenir${memsSemaine > 1 ? "s" : ""} cette semaine</div>
      ${top ? `<a class="pouls-item" href="#/build/${esc(top.id)}"><b>♥ ${top.like_count}</b> Build le plus aimé : ${esc(top.character)}</a>` : ""}
    </section>

    <section class="bloc">
      <div class="bloc-tete"><h2>${ME ? "Tes jeux" : "Les jeux"}</h2><a href="#/jeux" class="lien">Tous les jeux →</a></div>
      <div class="grille grille-jeux">
        ${mesJeux.map((s) => { const g = jeu(s); if (!g) return ""; const n = builds.filter((b) => b.game === s).length; return `<a class="tuile-jeu" href="#/jeu/${g.slug}" style="--c:${g.couleur}"><span class="tuile-nom">${esc(g.nom)}</span><span class="tuile-chiffre">${n} build${n > 1 ? "s" : ""}</span></a>`; }).join("")}
      </div>
    </section>

    <section class="bloc">
      <div class="bloc-tete"><h2>Derniers builds</h2><a href="#/nouveau-build" class="btn btn-petit">+ Publier un build</a></div>
      <div class="grille">${builds.slice(0, 6).map((b) => carteBuild(b, auteurs)).join("") || vide("Aucun build pour l'instant.")}</div>
    </section>

    <section class="bloc">
      <div class="bloc-tete"><h2>Souvenirs et créations récents</h2><a href="#/memoire" class="lien">Toute la mémoire →</a></div>
      <div class="grille">${mems.slice(0, 3).map((m) => carteSouvenir(m, auteurs)).join("") || vide("Aucun souvenir pour l'instant.")}</div>
    </section>`;
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
        return `<a class="tuile-jeu tuile-grande" href="#/jeu/${g.slug}" style="--c:${g.couleur}">
          <span class="tuile-nom">${esc(g.nom)}</span>
          <span class="tuile-stats"><span><b>${nj}</b> joueurs</span><span><b>${nb}</b> builds</span><span><b>${ns}</b> souvenirs</span></span>
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
          ${roster.map((p) => cartePerso(g, p, compte[p.id] || 0)).join("")}
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
    return `<a class="perso" href="#/jeu/${g.slug}/${esc(p.id)}" data-el="${esc(p.element)}" data-arme="${esc(p.arme)}" data-rar="${p.rarete || ""}" data-nom="${esc(slugNom(p.nom))}" style="--el:${couleurPerso(g, p)}">
      <span class="perso-initiale" aria-hidden="true">${esc(p.nom[0])}</span>
      ${src ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async" data-repli="cacher">` : ""}
      <span class="perso-el" title="${esc(p.element)}">${iconeEl(g, p.element, 15)}</span>
      ${n ? `<span class="perso-compte" title="${n} publication${n > 1 ? "s" : ""} de la communauté">${n}</span>` : ""}
      <span class="perso-bas"><span class="perso-nom">${esc(p.nom)}</span>${etoiles(g, p.rarete)}</span>
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
        <div class="perso-portrait" data-rar="${p.rarete || ""}"><span class="perso-initiale" aria-hidden="true">${esc(p.nom[0])}</span>${src ? `<img src="${esc(src)}" alt="Portrait de ${esc(p.nom)}" data-repli="cacher">` : ""}</div>
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
    document.getElementById("banniere-accueil").hidden = !(nom === "accueil" && banniereOK);
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
    ban.innerHTML = `<img src="${esc(IMGS.banniere || CFG.BANNIERE || "banniere.png")}" alt="${esc(CFG.NOM_SITE)}" data-repli="banniere">`;
    window.addEventListener("hashchange", rendre);
    rendre();
  }
  demarrer().catch((err) => {
    $app.innerHTML = vide("Le site n'a pas pu démarrer : " + esc(err.message));
  });
})();
