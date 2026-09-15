/**
 * Character Cards Loader
 * Charge et affiche les fiches HTML générées dans le site
 * 
 * Usage:
 *   CharacterCardLoader.load(characterId);
 *   CharacterCardLoader.loadFromCharacter(character);
 */

const CharacterCardLoader = {
  /**
   * Charge et affiche la fiche HTML d'un personnage
   * @param {string} characterId - L'ID du personnage (ex: 'albedo')
   * @param {string} containerId - L'ID du conteneur (par défaut: 'character-card-container')
   */
  async load(characterId, containerId = 'character-card-container') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Container #${containerId} introuvable`);
      return;
    }

    try {
      // Affiche un loader pendant le chargement
      container.innerHTML = '<div class="card-loading">Chargement de la fiche...</div>';

      // Charge le fichier HTML
      const response = await fetch(`./character-cards/${characterId}.html`);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: Fiche non trouvée`);
      }

      const html = await response.text();
      
      // Insère le HTML dans le conteneur
      container.innerHTML = html;

      // Déclenche un événement personnalisé (pour tracking, analytics, etc.)
      const event = new CustomEvent('cardLoaded', { 
        detail: { characterId } 
      });
      window.dispatchEvent(event);

      console.log(`✅ Fiche ${characterId} chargée`);

    } catch (error) {
      console.error(`❌ Erreur lors du chargement de ${characterId}:`, error);
      container.innerHTML = `
        <div class="card-error">
          <p>Impossible de charger la fiche de ce personnage.</p>
          <p style="font-size: 12px; color: #888;">${error.message}</p>
        </div>
      `;
    }
  },

  /**
   * Charge la fiche à partir d'un objet character
   * @param {object} character - L'objet personnage avec id, name, etc.
   * @param {string} containerId - L'ID du conteneur
   */
  async loadFromCharacter(character, containerId = 'character-card-container') {
    if (!character || !character.id) {
      console.error('Character object invalide ou sans ID');
      return;
    }
    await this.load(character.id, containerId);
  },

  /**
   * Change la fiche affichée (avec transition)
   * @param {string} newCharacterId - Le nouvel ID du personnage
   * @param {string} containerId - L'ID du conteneur
   */
  async transition(newCharacterId, containerId = 'character-card-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Fade out
    container.style.opacity = '0';
    container.style.transition = 'opacity 200ms ease-out';

    // Attends la fin de la transition
    await new Promise(resolve => setTimeout(resolve, 200));

    // Charge la nouvelle fiche
    await this.load(newCharacterId, containerId);

    // Fade in
    container.style.opacity = '1';
    container.style.transition = 'opacity 300ms ease-in';
  },

  /**
   * Précharge une fiche en arrière-plan (cache)
   * @param {string} characterId - L'ID du personnage
   */
  async preload(characterId) {
    try {
      await fetch(`./character-cards/${characterId}.html`);
    } catch (error) {
      console.debug(`Préchargement de ${characterId} échoué (normal)`, error.message);
    }
  },

  /**
   * Précharge plusieurs fiches
   * @param {array} characterIds - Liste des IDs à précharger
   */
  async preloadBulk(characterIds) {
    const promises = characterIds.map(id => this.preload(id));
    await Promise.allSettled(promises);
    console.log(`📦 ${characterIds.length} fiches préchargées`);
  }
};

// Export pour les modules ES6 (optionnel)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CharacterCardLoader;
}
