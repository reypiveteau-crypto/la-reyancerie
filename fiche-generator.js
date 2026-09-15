const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Charge les données depuis data.js
const dataPath = path.join(__dirname, 'data.js');
if (!fs.existsSync(dataPath)) {
  console.error('❌ data.js introuvable. Assurez-vous que data.js est dans le même dossier.');
  process.exit(1);
}

const dataContent = fs.readFileSync(dataPath, 'utf8');
const match = dataContent.match(/const characters = (\[[\s\S]*?\n\];)/);
if (!match) {
  console.error('❌ Impossible de parser characters depuis data.js');
  process.exit(1);
}

const characters = eval(match[1]);

// Couleurs d'éléments Genshin
const ELEMENTS = {
  Pyro: '#FF6B3B',
  Hydro: '#3B9FE3',
  Electro: '#D86FDE',
  Cryo: '#5ED2E6',
  Anemo: '#7FD8BE',
  Geo: '#FFC552',
  Dendro: '#7FD83B'
};

const ELEMENT_NAMES = {
  Pyro: '🔥 Pyro',
  Hydro: '💧 Hydro',
  Electro: '⚡ Electro',
  Cryo: '❄️ Cryo',
  Anemo: '🌪️ Anemo',
  Geo: '🪨 Geo',
  Dendro: '🌱 Dendro'
};

// Constellation symbols (Unicode)
const CONSTELLATION_SYMBOLS = ['✦', '✧', '✣', '✤', '✥', '✦'];

async function generateCharacterCard(character, imageMap) {
  const elementColor = ELEMENTS[character.element] || '#7FD8BE';
  const rarity = character.rarity || 4;
  const stars = '★'.repeat(rarity);
  
  // Prépare les builds
  const build = character.builds && character.builds[0] ? character.builds[0] : {};
  const armes = build.weapons ? (Array.isArray(build.weapons) ? build.weapons.slice(0, 3) : [build.weapons]) : [];
  const artefacts = build.artifacts && build.artifacts.main ? build.artifacts.main.slice(0, 4) : [];
  const stats = build.focus_stats ? build.focus_stats.slice(0, 3) : [];
  const team = build.team_comps && build.team_comps.length > 0 ? build.team_comps[0] : { members: [] };
  const constellations = character.constellations ? character.constellations.slice(0, 6) : [];
  
  // Vérifie si une image existe
  const hasImage = imageMap[character.id];
  const portraitStyle = hasImage 
    ? `background: url('data:image/png;base64,${imageMap[character.id]}') center/cover;`
    : `background: linear-gradient(135deg, rgba(${hexToRgb(elementColor)}, 0.3) 0%, rgba(126, 216, 190, 0.1) 100%);`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    body {
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, #0a1428 0%, #1a2744 50%, #0f1f3a 100%);
      color: #fff;
      width: 1200px;
      height: 900px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    
    .card {
      width: 1200px;
      height: 900px;
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 30px;
      padding: 40px;
      background: linear-gradient(135deg, rgba(10, 20, 40, 0.95) 0%, rgba(26, 39, 68, 0.95) 100%);
      border: 2px solid rgba(126, 216, 190, 0.3);
      border-radius: 16px;
      overflow: hidden;
      position: relative;
    }
    
    .card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(circle at 20% 20%, rgba(${hexToRgb(elementColor)}, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(58, 159, 227, 0.05) 0%, transparent 50%);
      pointer-events: none;
    }
    
    .left-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      position: relative;
      z-index: 1;
    }
    
    .portrait {
      width: 240px;
      height: 280px;
      border-radius: 12px;
      ${portraitStyle}
      border: 2px solid ${elementColor};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 100px;
      font-weight: 700;
      color: ${elementColor};
      text-shadow: 0 0 20px ${elementColor};
      position: relative;
      overflow: hidden;
    }
    
    .name-plate {
      text-align: center;
      position: relative;
      z-index: 2;
    }
    
    .name {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    
    .rarity-stars {
      font-size: 16px;
      color: ${elementColor};
      letter-spacing: 4px;
      text-shadow: 0 0 8px ${elementColor};
      margin-bottom: 12px;
    }
    
    .element-badge {
      display: inline-block;
      padding: 6px 12px;
      background: ${elementColor};
      color: #0a1428;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      width: 100%;
      margin-top: 20px;
    }
    
    .info-item {
      background: rgba(${hexToRgb(elementColor)}, 0.1);
      border: 1px solid ${elementColor};
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 11px;
      text-align: center;
    }
    
    .info-label {
      color: rgba(255, 255, 255, 0.6);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 2px;
    }
    
    .info-value {
      font-weight: 600;
      color: ${elementColor};
    }
    
    .right-section {
      display: flex;
      flex-direction: column;
      gap: 18px;
      position: relative;
      z-index: 1;
      overflow-y: auto;
      max-height: 820px;
      padding-right: 12px;
    }
    
    .right-section::-webkit-scrollbar {
      width: 4px;
    }
    
    .right-section::-webkit-scrollbar-track {
      background: rgba(${hexToRgb(elementColor)}, 0.1);
      border-radius: 2px;
    }
    
    .right-section::-webkit-scrollbar-thumb {
      background: ${elementColor};
      border-radius: 2px;
    }
    
    .section {
      border-left: 3px solid ${elementColor};
      padding-left: 16px;
    }
    
    .section-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${elementColor};
      margin-bottom: 10px;
    }
    
    .section-content {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .tag {
      background: rgba(${hexToRgb(elementColor)}, 0.15);
      border: 1px solid ${elementColor};
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      color: #fff;
    }
    
    .constellation-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 6px;
    }
    
    .constellation {
      width: 32px;
      height: 32px;
      background: rgba(${hexToRgb(elementColor)}, 0.2);
      border: 1px solid ${elementColor};
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      color: ${elementColor};
      position: relative;
    }
    
    .constellation.active {
      background: ${elementColor};
      color: #0a1428;
    }
    
    .stat-item {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid rgba(${hexToRgb(elementColor)}, 0.2);
      font-size: 12px;
    }
    
    .stat-item:last-child {
      border-bottom: none;
    }
    
    .stat-label {
      color: rgba(255, 255, 255, 0.7);
    }
    
    .stat-value {
      font-weight: 600;
      color: ${elementColor};
    }
    
    .small-text {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="left-section">
      <div class="portrait"></div>
      <div class="name-plate">
        <div class="name">${character.name}</div>
        <div class="rarity-stars">${stars}</div>
        <div class="element-badge">${character.element}</div>
        
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Arme</div>
            <div class="info-value">${character.weapon || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Région</div>
            <div class="info-value">${character.region || 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="right-section">
      ${armes.length > 0 ? `
      <div class="section">
        <div class="section-title">⚔️ Armes recommandées</div>
        <div class="section-content">
          ${armes.map(w => \`<div class="tag">\${typeof w === 'string' ? w : w.name || w}</div>\`).join('')}
        </div>
      </div>
      ` : ''}
      
      ${artefacts.length > 0 ? `
      <div class="section">
        <div class="section-title">🔮 Artefacts</div>
        <div class="section-content">
          ${artefacts.map(a => \`<div class="tag">\${typeof a === 'string' ? a : a.name || a}</div>\`).join('')}
        </div>
      </div>
      ` : ''}
      
      ${stats.length > 0 ? `
      <div class="section">
        <div class="section-title">📊 Stats principales</div>
        <div>
          ${stats.map(s => \`
            <div class="stat-item">
              <span class="stat-label">\${typeof s === 'string' ? s : s.name || s}</span>
              <span class="stat-value">Prioritaire</span>
            </div>
          \`).join('')}
        </div>
      </div>
      ` : ''}
      
      ${team && team.members && team.members.length > 0 ? `
      <div class="section">
        <div class="section-title">👥 Équipe recommandée</div>
        <div class="section-content">
          ${team.members.slice(0, 3).map(m => \`<div class="tag">\${m}</div>\`).join('')}
        </div>
        <div class="small-text">\${team.members.length} personnage(s) compatibles</div>
      </div>
      ` : ''}
      
      ${constellations.length > 0 ? `
      <div class="section">
        <div class="section-title">✨ Constellations</div>
        <div class="constellation-grid">
          ${constellations.map((c, i) => \`
            <div class="constellation active" title="\${typeof c === 'string' ? c : c.name || c}">\${CONSTELLATION_SYMBOLS[i]}</div>
          \`).join('')}
        </div>
        <div class="small-text">\${constellations.length}/6 constellation(s)</div>
      </div>
      ` : ''}
    </div>
  </div>
</body>
</html>
  `;

  return html;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? \`\${parseInt(result[1], 16)}, \${parseInt(result[2], 16)}, \${parseInt(result[3], 16)}\` : '255, 255, 255';
}

async function loadImages() {
  const imageMap = {};
  const imageDir = __dirname;
  const extensions = ['.png', '.jpg', '.jpeg', '.webp'];
  
  console.log('📸 Scanning pour les images de personnages...');
  
  for (const character of characters) {
    for (const ext of extensions) {
      const imagePath = path.join(imageDir, character.id + ext);
      if (fs.existsSync(imagePath)) {
        try {
          const imageData = fs.readFileSync(imagePath);
          imageMap[character.id] = imageData.toString('base64');
          console.log(\`  ✓ \${character.name} — \${ext}\`);
          break;
        } catch (e) {
          console.error(\`  ✗ Erreur: \${character.name} — \${e.message}\`);
        }
      }
    }
  }
  
  console.log(\`✅ \${Object.keys(imageMap).length}/\${characters.length} images trouvées\n\`);
  return imageMap;
}

async function generateAllCards() {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const outputDir = path.join(__dirname, 'character-cards');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Charge les images
  const imageMap = await loadImages();
  
  console.log(\`🎨 Génération des fiches personnages (HTML + PNG)...\`);
  console.log(\`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\`);
  
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < characters.length; i++) {
    const character = characters[i];
    
    try {
      const html = await generateCharacterCard(character, imageMap);
      
      // 1️⃣ Exporte le HTML brut (pour intégration au site)
      const htmlFilename = path.join(outputDir, \`\${character.id}.html\`);
      fs.writeFileSync(htmlFilename, html, 'utf8');
      
      // 2️⃣ Génère la PNG (pour partage réseaux sociaux)
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 900 });
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pngFilename = path.join(outputDir, \`\${character.id}.png\`);
      await page.screenshot({ path: pngFilename, type: 'png' });
      await page.close();
      
      success++;
      const pct = Math.round((i + 1) / characters.length * 100);
      console.log(\`[\${String(pct).padStart(3, ' ')}%] ✅ \${String(i + 1).padStart(3, ' ')}/\${characters.length} — \${character.name.padEnd(20, ' ')} (HTML + PNG)\`);
      
    } catch (error) {
      failed++;
      console.log(\`[ERR!] ❌ \${String(i + 1).padStart(3, ' ')}/\${characters.length} — \${character.name} — \${error.message}\`);
    }
  }
  
  await browser.close();
  
  console.log(\`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`);
  console.log(\`✨ Génération terminée!\`);
  console.log(\`   ✅ Succès: \${success}\`);
  if (failed > 0) console.log(\`   ❌ Échecs: \${failed}\`);
  console.log(\`   📁 HTML: ./character-cards/*.html\`);
  console.log(\`   📁 PNG:  ./character-cards/*.png\n\`);
}

generateAllCards().catch(err => {
  console.error('💥 Erreur fatale:', err);
  process.exit(1);
});
