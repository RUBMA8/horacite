/**
* Modèle Session Académique 
*
*/
 
import db from '../config/database.js';
 
class Session {
    /**
     * Créer une nouvelle session académique
     *
     * @param {Object} data - { name, date_debut, date_fin, status }
     * @returns {Promise<Session>}
     *
     * Validations:
     * - date_debut < date_fin
     * - status est 'planification', 'active', ou 'terminee'
     * - name est unique
     */
    static async create(data) {
        // TODO: Implémenter
        // 1. Valider les données
        // 2. Si status === 'active', désactiver les autres sessions actives
        // 3. Insérer en BD
        // 4. Retourner la session créée
    }
 
    /**
     * Récupérer toutes les sessions
     *
     * @returns {Promise<Array>}
     */
    static async findAll() {
        // TODO: Implémenter
    }
 
    /**
     * Récupérer une session par ID
     *
     * @param {number} id
     * @returns {Promise<Session>}
     */
    static async findById(id) {
        // TODO: Implémenter
    }
 
    /**
     * Récupérer la session ACTIVE
     *
     * IMPORTANT: Cette méthode est appelée dans server.js
     * et utilisée partout dans l'application
     *
     * @returns {Promise<Session | null>}
     */
    static async findActive() {
        // TODO: Implémenter
        // SELECT * FROM sessions WHERE status = 'active' LIMIT 1
    }
 
    /**
     * Modifier une session
     *
     * @param {number} id
     * @param {Object} data
     * @returns {Promise<Session>}
     *
     * Note: Si status change en 'active',
     * désactiver les autres sessions actives
     */
    static async update(id, data) {
        // TODO: Implémenter
    }
 
    /**
     * Supprimer une session
     *
     * @param {number} id
     * @returns {Promise<boolean>}
     */
    static async delete(id) {
        // TODO: Implémenter
    }
 
    /**
     * Vérifier si une session existe
     *
     * @param {number} id
     * @returns {Promise<boolean>}
     */
    static async exists(id) {
        // TODO: Implémenter
    }
 
    /**
     * Vérifier si les dates se chevauchent avec d'autres sessions
     *
     * @param {Date} dateDebut
     * @param {Date} dateFin
     * @param {number} excludeId - ID de la session à ignorer (pour update)
     * @returns {Promise<boolean>}
     */
    static async datesOverlap(dateDebut, dateFin, excludeId = null) {
        // TODO: Implémenter
    }
}
 
export default Session;
