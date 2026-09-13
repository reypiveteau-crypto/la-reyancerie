# La Reyancerie — mode d'emploi

119 fiches personnages, site statique (HTML/CSS/JS, aucune dépendance, aucun build). Tu peux l'ouvrir en
double-cliquant sur `index.html`, le modifier dans n'importe quel éditeur de texte,
et le mettre en ligne gratuitement.

```
index.html    la page (structure, en-tête, pied de page)
styles.css    tout le design (couleurs, typo, mise en page, aurores boréales)
ciel.js       le ciel étoilé dessiné en canvas (étoiles, Voie lactée, filantes)
app.js        la logique : filtres, recherche, affichage des fiches
data.js       ← LE SEUL FICHIER QUE TU TOUCHERAS AU QUOTIDIEN
```

**Régler le ciel** — tout est en haut de `ciel.js`, dans deux blocs commentés :

- `REGLAGES` : nombre d'étoiles (`densite` — plus le chiffre est petit, plus il y en a),
  scintillement, Voie lactée, fréquence des étoiles filantes (`filanteMin` / `filanteMax`,
  en millisecondes) et nombre maximum simultané. `vitesseAurore` et `intensite` règlent
  les rideaux d'un seul coup.
- `RIDEAUX` : un objet par rideau d'aurore. `y` = hauteur de départ, `h` = hauteur,
  `amp` = amplitude de l'ondulation, `freq` = nombre de vagues, `vit` = vitesse (négative
  pour dériver vers la gauche), `c` = couleur `[r,v,b]`, `frange` = couleur du bord bas.
  Ajoute ou retire des lignes pour avoir plus ou moins de rideaux.

Le flou qui transforme les tranches en voiles continus est dans `styles.css`, règle
`#aurore` : `filter: blur(13px)`. Augmente-le pour un rendu plus vaporeux, diminue-le
pour des rideaux plus nets.

Tout s'immobilise automatiquement si le visiteur a activé « réduire les animations »
sur son appareil.

---

## 1. Ajouter ou modifier un personnage

Tout est dans `data.js`. Copie un bloc existant, colle-le, change les valeurs.

Chaque personnage a une **fiche** (toujours présente) et, en option, un **build**.

```js
{
  id: "clorinde",              // minuscules, sans accent ni espace → sert d'URL
  nom: "Clorinde",
  element: "Electro",          // Pyro/Hydro/Anemo/Electro/Dendro/Cryo/Geo/Polyvalent
  arme: "Épée",                // Épée / Claymore / Lance / Arc / Catalyseur
  rarete: 5,                   // 4, 5, ou null si la source n'est pas sûre
  region: "Fontaine",          // Mondstadt/Liyue/Inazuma/Sumeru/Fontaine/Natlan/
                               // Nod-Krai/Snezhnaya/Autre
  role: "DPS principal",       // DPS principal / Sous-DPS / Support / Soigneur
  tier: "T1",                  // ou null : pas de badge
  bio: "Qui est le personnage. Factuel, pas d'avis sur le build.",

  // ↓ tout ce bloc est OPTIONNEL. Sans lui, la fiche affiche
  //   « build en préparation » au lieu d'un build inventé.
  build: {
    armes: ["Arme 1", "Arme 2"],          // du meilleur au moins bon
    artefacts: ["Set 1 (4p)",                     // 4 pièces du même set
                "2p Set A + 2p Set B",            // deux demi-sets combinés
                "Set C (4p, équipes Freeze)"],    // avec une note de contexte
    stats: { sablier:"ATQ%", coupe:"Bonus DGT Electro", couronne:"Taux CRIT ou DGT CRIT" },
    substats: ["Taux CRIT", "DGT CRIT", "ATQ%"],
    talents: ["Compétence", "Déchaînement", "Attaque normale"],
    conseil: "La chose à savoir que les tableaux ne disent pas.",
    equipes: [ { nom:"Aggravate", membres:["Clorinde","Fischl","Kazuha","Bennett"] } ]
  }
}
```

**Où trouver les noms français officiels** des armes et des artefacts :
`genshin-builds.com/fr/character/<nom-du-perso>`. Utilise toujours cette source
plutôt que de traduire toi-même — les noms FR en jeu ne sont pas des traductions
littérales de l'anglais (« Deepwood Memories » = « Souvenir de forêt »).

Attention aux virgules : chaque bloc se termine par `},` sauf le dernier.
Si la page devient blanche, c'est presque toujours une virgule ou un guillemet manquant —
ouvre la console du navigateur (F12) pour voir la ligne fautive.

Change aussi `VERSION_JEU` et `MAJ` en haut du fichier à chaque patch.

---

## 2. Mettre le site en ligne (gratuit, ~15 minutes)

### Étape A — Créer un compte GitHub
1. Va sur **github.com** → *Sign up*.
2. Une fois connecté : bouton **+** en haut à droite → **New repository**.
3. Nom : `la-reyancerie`. Coche **Public**. → *Create repository*.
4. Sur la page qui s'affiche, clique **uploading an existing file**.
5. Glisse les 5 fichiers (`index.html`, `styles.css`, `ciel.js`, `app.js`, `data.js`) → **Commit changes**.

### Étape B — Déployer sur Vercel
1. Va sur **vercel.com** → *Sign up* → **Continue with GitHub**.
2. **Add New… → Project** → choisis `la-reyancerie` → **Import**.
3. Ne touche à aucun réglage (c'est un site statique) → **Deploy**.
4. Au bout de ~30 secondes tu as une URL du type `la-reyancerie.vercel.app`. Le site est en ligne.

À partir de là, **chaque modification poussée sur GitHub se redéploie toute seule**.
Pour modifier `data.js` sans rien installer : sur GitHub, clique le fichier → l'icône crayon →
modifie → *Commit changes*. Vercel republie tout seul en 30 secondes.

### Étape C — Brancher un nom de domaine
1. Achète un domaine chez **Cloudflare Registrar**, **Namecheap** ou **OVH**
   (compte environ 10 à 15 € par an pour un `.com` ou un `.fr` — vérifie le prix de
   *renouvellement*, pas seulement celui de la première année, certains registrars
   cassent le prix la première année puis le triplent).
2. Dans Vercel : ton projet → **Settings → Domains** → tape ton domaine → **Add**.
3. Vercel affiche les enregistrements DNS à créer. Copie-les dans l'interface DNS de
   ton registrar (en général un enregistrement `A` pour le domaine nu et un `CNAME`
   pour `www`).
4. Compte de quelques minutes à quelques heures de propagation. Le HTTPS est
   automatique et gratuit, tu n'as rien à faire.

---

## 3. Ce qu'il reste à faire pour que le site existe vraiment

Par ordre d'impact :

1. **Terminer les 14 derniers builds.** 104 fiches sur 119 ont un build complet.
   Restent : Ororon, Varesa, Aino, Illuga, Jahoda, Linnea, Nefer, Nicole, Prune,
   Alyosha, Odette, Sandrone, Tartaglia et Aloy. Ils affichent « build en préparation ».
   La source est `genshin-builds.com/fr/character/<slug>` (underscore pour les noms
   composés : `hu_tao`, `kujou_sara`).
2. **Tenir la mise à jour.** À chaque version (toutes les ~6 semaines), ajouter les
   nouveaux personnages et changer `VERSION_JEU`. Un site de builds périmé est pire
   qu'un site inexistant.
3. **Se faire indexer.** Un `sitemap.xml`, et surtout des liens depuis là où sont les
   joueurs francophones : Reddit r/Genshin_Impact_FR, serveurs Discord FR, forums.
   Le référencement naturel sur ce créneau met des mois — c'est normal.
4. **Le vrai angle de différenciation**, c'est le français. Les grosses références
   (Prydwen, Game8, KQM) sont en anglais, et les sites FR existants sont souvent
   des traductions automatiques mal tenues. Un site FR propre, à jour, rapide,
   avec les vrais noms du jeu, a une place à prendre.

---

## Sources des données

Relevé en septembre 2026 (version 7.0) sur :

- genshin-builds.com (builds et noms FR officiels)
- prydwen.gg (tier list)
- game8.co et gamewith.net (roster)
- en.wikipedia.org (contexte narratif des personnages)
- beebom.com (armes d'Arlecchino)

## Pourquoi il n'y a pas d'images de personnages

Choix délibéré, pas un oubli.

L'artwork officiel appartient à HoYoverse. En 2026, HoYoverse poursuit en justice
un wiki de fans (HomDGCat) et demande, au-delà du retrait des leaks, qu'il cesse
**tout** usage de leur artwork. Utiliser leurs illustrations sur un site public
t'expose à une demande de retrait, même sans but commercial.

La fan-art non officielle est pire, pas mieux : c'est à la fois la propriété
intellectuelle de HoYoverse **et** le travail d'un artiste qui ne t'a rien autorisé.

Les deux voies propres, si tu veux du visuel :

1. **Commander des illustrations** à des artistes (Ko-fi, Twitter, Fiverr —
   5 à 20 € la pièce), avec un accord écrit sur l'usage web et un crédit visible.
   C'est ce qui rendrait le site réellement unique.
2. **Assumer l'absence de portraits** : c'est le parti pris actuel. L'identité
   visuelle repose sur les crêtes d'élément, les couleurs de région et le
   traitement de la rareté, tous dessinés pour ce site.

Site de fan non officiel. Genshin Impact est une marque de HoYoverse.
Ce projet n'est ni affilié ni soutenu par HoYoverse.
