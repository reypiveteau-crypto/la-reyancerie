/* ===== La Reyancerie — logique de l'application ===== */

const COULEURS = {
  Pyro: "#ff6b47", Hydro: "#3db7e4", Anemo: "#4dd8b0", Electro: "#b57bd4",
  Dendro: "#9bd13b", Cryo: "#7fdef0", Geo: "#e8b33c", Polyvalent: "#d9b96b"
};

const REGIONS = {
  Mondstadt: "#6fc5a4", Liyue: "#e0a33c", Inazuma: "#a888d8", Sumeru: "#8fbf46",
  Fontaine: "#4aa9d8", Natlan: "#e2724a", "Nod-Krai": "#7fa8d8",
  Snezhnaya: "#9fd2e0", Autre: "#8a91b4"
};

/* Pictogrammes d'éléments — dessins originaux.
   Ce ne sont PAS les emblèmes de Vision du jeu (propriété HoYoverse) :
   ce sont les symboles naturels de chaque élément, redessinés pour ce site. */
const ICONES = {
  /* flamme avec un cœur évidé */
  Pyro: '<path fill-rule="evenodd" d="M12 1.6c.6 2.9 2 4.5 3.5 6.1 1.9 2 3.6 4 3.6 7A7.1 7.1 0 0 1 4.9 14.7c0-2 .7-3.7 1.8-5.3.1 1.3.6 2.4 1.5 3.2C8 8.6 9.3 5 12 1.6Zm0 10.6c1.5 1.8 2.3 3 2.3 4.1a2.3 2.3 0 1 1-4.6 0c0-1.1.8-2.3 2.3-4.1Z"/>',
  /* goutte avec un reflet évidé */
  Hydro: '<path fill-rule="evenodd" d="M12 1.9c4.4 5.4 6.7 8.7 6.7 11.6a6.7 6.7 0 1 1-13.4 0C5.3 10.6 7.6 7.3 12 1.9ZM9.2 13.2a1 1 0 0 0-2 0 5 5 0 0 0 5 5 1 1 0 0 0 0-2 3 3 0 0 1-3-3Z"/>',
  /* deux bourrasques de vent qui s'enroulent */
  Anemo: '<path d="M2.5 6.6h9.8a2.3 2.3 0 1 0-2.2-2.9l-2-.4A4.3 4.3 0 1 1 12.3 8.6H2.5V6.6Z"/><path d="M2.5 11.4h13a2.7 2.7 0 1 1-2.6 3.4l-2 .5a4.8 4.8 0 1 0 4.6-6H2.5v2.1Z"/><path d="M2.5 16.3h7.2a2 2 0 1 1-1.9 2.6l-2 .5a4 4 0 1 0 3.9-5.1H2.5v2Z"/>',
  /* éclair */
  Electro: '<path d="M14.2 1.2 3.6 13.9h6.3l-1.4 9.3 10.9-12.9h-6.6l1.4-9.1Z"/>',
  /* jeune pousse : deux feuilles et une tige */
  Dendro: '<path d="M11.2 22.4v-6.2c-2.8.2-5-.6-6.5-2.4C3.2 11.9 2.6 9 2.8 5.2c3.8.3 6.6 1.4 8.2 3.4.4.5.7 1 1 1.6.3-.6.6-1.1 1-1.6 1.6-2 4.4-3.1 8.2-3.4.2 3.8-.4 6.7-1.9 8.6-1.5 1.8-3.7 2.6-6.5 2.4v6.2h-1.6Z"/>',
  /* flocon à six branches : un bras dessiné une fois, répété par rotation
     de 60° — symétrie parfaite garantie */
  Cryo: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12V2.8M12 5.2 10.1 3.3M12 5.2 13.9 3.3M12 8.5 10.5 7M12 8.5 13.5 7"/><path transform="rotate(60 12 12)" d="M12 12V2.8M12 5.2 10.1 3.3M12 5.2 13.9 3.3M12 8.5 10.5 7M12 8.5 13.5 7"/><path transform="rotate(120 12 12)" d="M12 12V2.8M12 5.2 10.1 3.3M12 5.2 13.9 3.3M12 8.5 10.5 7M12 8.5 13.5 7"/><path transform="rotate(180 12 12)" d="M12 12V2.8M12 5.2 10.1 3.3M12 5.2 13.9 3.3M12 8.5 10.5 7M12 8.5 13.5 7"/><path transform="rotate(240 12 12)" d="M12 12V2.8M12 5.2 10.1 3.3M12 5.2 13.9 3.3M12 8.5 10.5 7M12 8.5 13.5 7"/><path transform="rotate(300 12 12)" d="M12 12V2.8M12 5.2 10.1 3.3M12 5.2 13.9 3.3M12 8.5 10.5 7M12 8.5 13.5 7"/></g><circle cx="12" cy="12" r="1.15"/>',
  /* cristal taillé */
  Geo: '<path fill-rule="evenodd" d="M7.3 1.8h9.4l4.6 6.5L12 22.6 2.7 8.3l4.6-6.5Zm1 2L6 7.4h3.2l1.1-3.6H8.3Zm4.1 0h-.8l-1.1 3.6h3L12.4 3.8Zm3.3 0h-1.2l1.1 3.6H18l-2.3-3.6ZM6.4 9.4l3.3 5.3-1.6-5.3H6.4Zm3.8 0 1.8 5.9 1.8-5.9h-3.6Zm5.6 0-1.6 5.3 3.3-5.3h-1.7Z"/>',
  /* étoile, pour le Voyageur */
  Polyvalent: '<path d="M12 1.4 14.8 9.2 22.6 12l-7.8 2.8L12 22.6 9.2 14.8 1.4 12l7.8-2.8L12 1.4Z"/>'
};

/* Pictogrammes d'armes */
const ARMES = {
  "Épée":       '<path d="M4 20h4l-1-1 9.5-9.5 3.2-6.9-6.9 3.2L3.3 15.3 2 14v4a2 2 0 0 0 2 2Zm12.6-13.3 1.7-.8-.8 1.7-8.8 8.8-.9-.9 8.8-8.8Z"/>',
  "Claymore":   '<path d="M7 21h3v-3.6L20.4 7 21 2.6 16.6 3 6.2 13.4H3v3l2 2 2-2v4.6ZM17.7 5.3l1.1-.1-.1 1.1-9.3 9.3-1-1 9.3-9.3Z"/>',
  "Lance":      '<path d="M12 2 8.5 9h2.2v9.5L9 20.2l1.4 1.4L12 20l1.6 1.6 1.4-1.4-1.7-1.7V9h2.2L12 2Zm0 4.3L13 8h-2l1-1.7Z"/>',
  "Arc":        '<path d="M5 3a13 13 0 0 1 0 18l1.6 1.2A15 15 0 0 0 6.6 1.8L5 3Zm0 9h13.6l-2.3-2.3 1.4-1.4 4.7 4.7-4.7 4.7-1.4-1.4 2.3-2.3H5v-2Z"/>',
  "Catalyseur": '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 0 1 0 16 8 8 0 0 1 0-16Zm0 3.2 1.5 3.3 3.3 1.5-3.3 1.5L12 16.8l-1.5-3.3L7.2 12l3.3-1.5L12 7.2Z"/>'
};

/* Champ facultatif `image` dans data.js :
     image: "mavuika.png"
   L'image s'affiche en fond de la carte et en haut de la fiche, assombrie pour que
   le texte reste lisible. La crête d'élément reste visible par-dessus.
   Sans ce champ — ou si le fichier est introuvable — la carte reste comme avant. */

const app = document.getElementById("app");
let fElement = null, fRegion = null, fRole = null, fBuild = false, recherche = "";
let currentCharacterId = null;
let isLoading = false;
const svgEl   = (el, s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor" aria-hidden="true">${ICONES[el] || ""}</svg>`;
const svgArme = (a, s = 15) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor" aria-hidden="true">${ARMES[a] || ""}</svg>`;
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const avecBuild = PERSONNAGES.filter(p => p.build).length;

/* Quelle image pour ce personnage ?
   Priorité au champ `image` de sa fiche, sinon on regarde la liste AVEC_IMAGE.
   Renvoie null si le personnage n'a pas d'image : la carte reste normale. */
function imageDe(p) {
  if (p.image) return p.image;
  if (typeof AVEC_IMAGE === "undefined") return null;
  const e = AVEC_IMAGE.find(x => x === p.id || x.startsWith(p.id + "."));
  if (!e) return null;
  return e.includes(".") ? e : e + ".png";
}

/* ---------- Lecture d'un set d'artefacts ----------
   Transforme la chaîne écrite dans data.js en quelque chose d'affichable :
     "Troupe dorée (4p)"                        → 4 pièces de Troupe dorée
     "2p Ancien rituel royal + 2p Colère..."    → deux demi-sets combinés
     "Briseur de glace (4p, équipes Freeze)"    → 4 pièces + une note de contexte
   Si le format ne correspond à rien de connu, on affiche la chaîne telle quelle. */
function lireSet(txt) {
  let corps = txt, note = null, pieces = null;

  const par = corps.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (par) {
    corps = par[1];
    const dedans = par[2];
    const pm = dedans.match(/^(\d)\s*p(?:ièces?)?\s*(?:,\s*(.*))?$/i);
    if (pm) { pieces = +pm[1]; note = pm[2] || null; }
    else { note = dedans; }
  }

  // « 2p A + 2p B » : on ne coupe que sur un « + » entouré d'espaces,
  // pour ne pas casser « Maîtrise élémentaire +80 »
  const bouts = corps.split(/\s\+\s/);
  const morceaux = [];
  for (const b of bouts) {
    const m = b.match(/^(\d)\s*p(?:ièces?)?\s+(.*)$/i);
    if (m) morceaux.push({ n: +m[1], nom: m[2] });
    else morceaux.push({ n: pieces, nom: b });
  }
  return { morceaux, note, brut: txt };
}

const RANGS = ["Meilleur choix", "Bonne alternative", "Correct aussi", "Dépannage"];

/* ---------- Icône d'un set d'artefacts ----------
   L'image se range dans le dossier artefacts/, nommée d'après le nom du set :
   minuscules, sans accent, tirets à la place des espaces et des apostrophes.
     « Rêve doré »                  → artefacts/reve-dore.png
     « Cœur de la fournaise »       → artefacts/coeur-de-la-fournaise.png
     « Aubade d'astre et de lune »  → artefacts/aubade-d-astre-et-de-lune.png
   Tant que l'image n'est pas déposée, un emplacement vide s'affiche à sa place.
   Les lignes qui ne sont pas des sets (« 2p ATQ% », « Bonus DGT Hydro »…)
   n'ont pas d'emplacement. */
const PAS_UN_SET = /^(ATQ|PV|DEF|Bonus\b|Maîtrise élémentaire|Recharge|Taux CRIT|DGT CRIT)/i;

const slugSet = (nom) => nom
  .toLowerCase()
  .replace(/œ/g, "oe").replace(/æ/g, "ae")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[«»]/g, "").replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

function iconeSet(nom) {
  if (PAS_UN_SET.test(nom)) return "";
  return `<span class="set-icone"><img class="icone-set" src="artefacts/${slugSet(nom)}.png" alt="" loading="lazy" width="44" height="44"></span>`;
}

/* ---------- Icône d'une arme ----------
   Même principe que les sets, dans le dossier armes/ :
     « Arc d'Amos »                   → armes/arc-d-amos.png
     « Absolution (signature) »       → armes/absolution.png   (la parenthèse est ignorée)
   Tant que l'image n'est pas déposée, un emplacement vide s'affiche. */
function iconeArme(nom) {
  const base = nom.replace(/\s*\([^)]*\)\s*$/, "");
  return `<span class="set-icone arme-icone"><img class="icone-set" src="armes/${slugSet(base)}.png" alt="" loading="lazy" width="44" height="44"></span>`;
}

function ligneSet(txt, i) {
  const { morceaux, note } = lireSet(txt);
  const corps = morceaux.map(m =>
    `<span class="set-bloc">${iconeSet(m.nom)}${m.n ? `<span class="set-piece">${m.n}<small>p</small></span>` : ""}<span class="set-nom">${esc(m.nom)}</span></span>`
  ).join('<span class="set-plus">+</span>');
  return `
    <li class="set ${i === 0 ? "set-top" : ""}">
      <span class="set-rang">${RANGS[Math.min(i, RANGS.length - 1)]}</span>
      <div class="set-corps">${corps}</div>
      ${note ? `<span class="set-note">${esc(note)}</span>` : ""}
    </li>`;
}

/* ---------- Vue liste ---------- */
function vueListe() {
  const elements = Object.keys(COULEURS).filter(e => PERSONNAGES.some(p => p.element === e));
  const regions  = Object.keys(REGIONS).filter(r => PERSONNAGES.some(p => p.region === r));
  const roles    = ["DPS principal", "Sous-DPS", "Support", "Soigneur"];

  const q = recherche.trim().toLowerCase();
  const liste = PERSONNAGES.filter(p => {
    if (fElement && p.element !== fElement) return false;
    if (fRegion && p.region !== fRegion) return false;
    if (fRole && !p.role.toLowerCase().includes(fRole.toLowerCase())) return false;
    if (fBuild && !p.build) return false;
    if (q) {
      const blob = [p.nom, p.element, p.arme, p.role, p.region, p.bio,
        ...(p.build ? [...p.build.armes, ...p.build.artefacts, ...p.build.equipes.flatMap(t => t.membres)] : [])
      ].join(" ").toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });

  const actif = fElement || fRegion || fRole || fBuild || recherche;

  app.innerHTML = `
    <section class="hero">
      <p class="eyebrow">Version ${VERSION_JEU} · ${MAJ}</p>
      <h1>Guide des builds<br><em>des personnages Genshin</em></h1>
      <div class="accroche">
        <p class="accroche-q">«&#8239;Je viens de le drop.<br>Je lui mets quoi&#8239;?&#8239;»</p>
        <span class="accroche-trait" aria-hidden="true"></span>
        <p class="accroche-r"><b>Armes, artefacts, stats et équipes.</b></p>
      </div>
      <div class="hero-stats">
        <span class="pill"><b>${PERSONNAGES.length}</b> fiches</span>
        <span class="pill"><b>${avecBuild}</b> builds détaillés</span>
        <span class="pill"><b>${regions.length}</b> régions</span>
      </div>
    </section>

    <section class="toolbar">
      <input class="search" id="q" type="search" placeholder="Chercher un personnage, une arme, un set, une équipe…" value="${esc(recherche)}">
      <div class="filter-row">
        <span class="filter-label">Élément</span>
        ${elements.map(e => `<button class="chip chip-el" data-el="${e}" aria-pressed="${fElement === e}" style="--c:${COULEURS[e]}">
            <span class="chip-ico">${svgEl(e, 14)}</span>${e}</button>`).join("")}
      </div>
      <div class="filter-row">
        <span class="filter-label">Région</span>
        ${regions.map(r => `<button class="chip chip-el" data-region="${r}" aria-pressed="${fRegion === r}" style="--c:${REGIONS[r]}">
            <span class="dot"></span>${r}</button>`).join("")}
      </div>
      <div class="filter-row">
        <span class="filter-label">Rôle</span>
        ${roles.map(r => `<button class="chip" data-role="${r}" aria-pressed="${fRole === r}">${r}</button>`).join("")}
        <button class="chip chip-build" data-build="1" aria-pressed="${fBuild}">Avec build détaillé</button>
        ${actif ? `<button class="chip chip-reset" id="reset">Réinitialiser</button>` : ""}
      </div>
      <p class="count">${liste.length} personnage${liste.length > 1 ? "s" : ""}</p>
    </section>

    <section class="grid">
      ${liste.length ? liste.map(carte).join("") : `<p class="empty">Aucun personnage ne correspond. Essaie un autre filtre.</p>`}
    </section>
  `;

  const inp = document.getElementById("q");
  inp.addEventListener("input", e => {
    recherche = e.target.value;
    const pos = e.target.selectionStart;
    vueListe();
    const n = document.getElementById("q");
    n.focus(); n.setSelectionRange(pos, pos);
  });

  const bind = (sel, fn) => app.querySelectorAll(sel).forEach(b => b.onclick = () => { fn(b); vueListe(); });
  bind("[data-el]",     b => fElement = fElement === b.dataset.el ? null : b.dataset.el);
  bind("[data-region]", b => fRegion  = fRegion  === b.dataset.region ? null : b.dataset.region);
  bind("[data-role]",   b => fRole    = fRole    === b.dataset.role ? null : b.dataset.role);
  bind("[data-build]",  () => fBuild = !fBuild);
  const r = document.getElementById("reset");
  if (r) r.onclick = () => { fElement = fRegion = fRole = null; fBuild = false; recherche = ""; vueListe(); };

  app.querySelectorAll(".card").forEach(c => c.onclick = () => { location.hash = "#/" + c.dataset.id; });
  brancherImages();
}

function carte(p) {
  const img = imageDe(p);
  return `
    <button class="card ${p.rarete === 5 ? "is-5" : ""}${img ? " avec-fond" : ""}" data-id="${p.id}"
            style="--el:${COULEURS[p.element]};--rg:${REGIONS[p.region] || "#8a91b4"}">
      ${img ? `<img class="fond" src="${esc(img)}" alt="" loading="lazy" decoding="async">` : ""}
      <span class="card-rail"></span>
      <div class="card-top">
        <span class="el-badge">${svgEl(p.element)}</span>
        <span class="card-flags">
          ${p.tier ? `<span class="tier">${p.tier}</span>` : ""}
          ${p.build ? `<span class="has-build" title="Build détaillé disponible">●</span>` : ""}
        </span>
      </div>
      <h3>${esc(p.nom)}</h3>
      <div class="card-meta">
        <span class="stars${p.rarete === 5 ? " s5" : ""}">${p.rarete ? "★".repeat(p.rarete) : "—"}</span>
        <span class="wpn">${svgArme(p.arme)}${esc(p.arme)}</span>
      </div>
      <div class="card-foot">
        <span class="card-region">${esc(p.region)}</span>
        <span class="card-role">${esc(p.role)}</span>
      </div>
    </button>`;
}

/* ---------- Vue fiche ---------- */
function vueFiche(p) {
  if (isLoading) return;
  isLoading = true;
  
  try {
    app.style.display = 'none';
    
    const cardContainer = document.getElementById('character-card-container');
    if (cardContainer) {
      cardContainer.style.display = 'block';
    }
    
    CharacterCardLoader.load(p.id, 'character-card-container');
    currentCharacterId = p.id;
    
    document.getElementById('character-card-container').scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'affichage du personnage:', error);
    app.style.display = 'block';
  } finally {
    isLoading = false;
  }
}

function panneauxBuild(p, b) {
  const seq = (arr) => arr.map((s, i) => `${i ? '<span class="seq-arrow">›</span>' : ""}<span class="seq-item">${esc(s)}</span>`).join("");
  return `
    ${b.conseil ? `<aside class="conseil"><span class="conseil-tag">À retenir</span><p>${esc(b.conseil)}</p></aside>` : ""}
    <div class="panels">
      <section class="panel">
        <h3>Armes recommandées</h3>
        <ol class="rank-list">${b.armes.map((a, i) => `<li class="${i === 0 ? "best" : ""}">${iconeArme(a)}<span class="arme-nom">${esc(a)}</span></li>`).join("")}</ol>
      </section>

      <section class="panel">
        <h3>Sets d'artefacts</h3>
        <p class="panel-aide"><b>4p</b> = les 4 pièces du même set, pour avoir le bonus complet.
           <b>2p + 2p</b> = deux demi-sets combinés, quand tu n'as pas encore le set entier.</p>
        <ol class="sets">${b.artefacts.map(ligneSet).join("")}</ol>
      </section>

      <section class="panel">
        <h3>Stats principales</h3>
        <dl>
          <div class="stat-row"><dt>Sablier</dt><dd>${esc(b.stats.sablier)}</dd></div>
          <div class="stat-row"><dt>Coupe</dt><dd>${esc(b.stats.coupe)}</dd></div>
          <div class="stat-row"><dt>Couronne</dt><dd>${esc(b.stats.couronne)}</dd></div>
        </dl>
        <h3 class="sub">Substats, par priorité</h3>
        <div class="seq">${seq(b.substats)}</div>
        <h3 class="sub">Montée des talents</h3>
        <div class="seq">${seq(b.talents)}</div>
      </section>

      <section class="panel panel-wide">
        <h3>Équipes recommandées</h3>
        <div class="teams">
          ${b.equipes.map(t => `
            <div class="team">
              <div class="team-name">${esc(t.nom)}</div>
              <div class="team-members">
                ${t.membres.map(m => `<span class="member ${m === p.nom ? "self" : ""}">${esc(m)}</span>`).join("")}
              </div>
            </div>`).join("")}
        </div>
      </section>
    </div>`;
}

/* Si une image déclarée dans data.js n'existe pas ou ne charge pas :
   on réessaie avec les autres extensions courantes (une capture d'écran est
   souvent un .jpg), puis on abandonne et la crête d'élément reprend sa place.
   Aucune case vide, jamais d'icône cassée. */
const EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

function brancherImages() {
  app.querySelectorAll("img.fond").forEach(img => {
    img.addEventListener("error", () => {
      const src = img.getAttribute("src") || "";
      const point = src.lastIndexOf(".");
      const ext = point > -1 ? src.slice(point).toLowerCase() : "";
      const suivante = EXTENSIONS[EXTENSIONS.indexOf(ext) + 1];
      if (ext && suivante) {           // il reste une extension à essayer
        img.setAttribute("src", src.slice(0, point) + suivante);
        return;
      }
      img.closest(".avec-fond")?.classList.remove("avec-fond");
      img.remove();
    });
  });

  // icônes de sets : même principe, mais l'emplacement reste visible (vide)
  app.querySelectorAll("img.icone-set").forEach(img => {
    img.addEventListener("error", () => {
      const src = img.getAttribute("src") || "";
      const point = src.lastIndexOf(".");
      const ext = point > -1 ? src.slice(point).toLowerCase() : "";
      const suivante = EXTENSIONS[EXTENSIONS.indexOf(ext) + 1];
      if (ext && suivante) { img.setAttribute("src", src.slice(0, point) + suivante); return; }
      img.parentElement?.classList.add("set-icone-vide");
      img.remove();
    });
  });
}

/* ---------- Routeur ---------- */
function router() {
  const id = location.hash.replace("#/", "");
  const p = PERSONNAGES.find(x => x.id === id);
  if (p) { vueFiche(p); document.title = `${p.nom} — La Reyancerie`; }
  else { vueListe(); document.title = "La Reyancerie — tous les personnages de Genshin Impact en français"; }
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", router);
router();
