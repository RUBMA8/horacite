/**
 * Modèle Salle - Gestion des salles
 */

import { getDatabase } from '../config/database.js';

class Salle {
    /**
     * Trouver une salle par ID
     */
    static async findById(id) {
        const db = await getDatabase();
        return db.get(
            `SELECT s.*,
                    pav.code as pavillon_code, pav.nom as pavillon_nom
             FROM salles s
             JOIN pavillons pav ON s.pavillon_id = pav.id
             WHERE s.id = ?`,
            [id]
        );
    }

    /**
     * Trouver une salle par code et pavillon
     */
    static async findByCode(code, pavillonId) {
        const db = await getDatabase();
        return db.get(
            `SELECT s.*,
                    pav.code as pavillon_code, pav.nom as pavillon_nom
             FROM salles s
             JOIN pavillons pav ON s.pavillon_id = pav.id
             WHERE s.code = ? AND s.pavillon_id = ?`,
            [code, pavillonId]
        );
    }

    /**
     * Récupérer toutes les salles avec pagination et filtres (Monocampus)
     */
    static async findAll(options = {}) {
        const db = await getDatabase();
        const {
            page = 1,
            limit = 20,
            pavillonId,
            type,
            capaciteMin,
            actif,
            search
        } = options;
        const offset = (page - 1) * limit;

        let query = `SELECT s.*,
                            pav.code as pavillon_code, pav.nom as pavillon_nom
                     FROM salles s
                     JOIN pavillons pav ON s.pavillon_id = pav.id`;

        const params = [];
        const conditions = [];

        if (pavillonId) {
            conditions.push('s.pavillon_id = ?');
            params.push(pavillonId);
        }

        if (type) {
            conditions.push('s.type = ?');
            params.push(type);
        }

        if (capaciteMin) {
            conditions.push('s.capacite >= ?');
            params.push(capaciteMin);
        }

        if (actif !== undefined) {
            conditions.push('s.actif = ?');
            params.push(actif ? 1 : 0);
        }

        if (search) {
            conditions.push('(s.code LIKE ? OR pav.nom LIKE ?)');
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Compter le total (requête séparée pour éviter les problèmes de regex multilignes)
        let countQuery = `SELECT COUNT(*) as total FROM salles s JOIN pavillons pav ON s.pavillon_id = pav.id`;
        if (conditions.length > 0) {
            countQuery += ' WHERE ' + conditions.join(' AND ');
        }
        const countResult = await db.get(countQuery, params);
        const total = countResult ? countResult.total : 0;

        // Ajouter tri et pagination
        query += ' ORDER BY pav.code, s.code LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const salles = await db.all(query, params);

        return {
            salles,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Créer une nouvelle salle
     */
    static async create(salleData) {
        const db = await getDatabase();

        const result = await db.run(
            `INSERT INTO salles (pavillon_id, code, niveau, type, capacite, equipements, accessible_pmr, actif)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                salleData.pavillon_id,
                salleData.code,
                salleData.niveau || null,
                salleData.type,
                salleData.capacite || null,
                salleData.equipements || null,
                salleData.accessible_pmr ? 1 : 0,
                salleData.actif !== false ? 1 : 0
            ]
        );

        return this.findById(result.lastID);
    }

    /**
     * Mettre à jour une salle
     */
    static async update(id, salleData) {
        const db = await getDatabase();

        const fields = [];
        const params = [];

        const allowedFields = ['pavillon_id', 'code', 'niveau', 'type', 'capacite',
            'equipements', 'accessible_pmr', 'actif'];

        for (const field of allowedFields) {
            if (salleData[field] !== undefined) {
                fields.push(`${field} = ?`);
                if (field === 'accessible_pmr' || field === 'actif') {
                    params.push(salleData[field] ? 1 : 0);
                } else {
                    params.push(salleData[field]);
                }
            }
        }

        if (fields.length === 0) return this.findById(id);

        params.push(id);

        await db.run(
            `UPDATE salles SET ${fields.join(', ')} WHERE id = ?`,
            params
        );

        return this.findById(id);
    }

    /**
     * Désactiver une salle
     */
    static async deactivate(id) {
        return this.update(id, { actif: false });
    }

    /**
     * Activer une salle
     */
    static async activate(id) {
        return this.update(id, { actif: true });
    }

    /**
     * Supprimer une salle (vérifie les dépendances)
     */
    static async delete(id) {
        const db = await getDatabase();

        // Vérifier s'il y a des horaires associés
        const horaires = await db.get(
            'SELECT id FROM horaires WHERE salle_id = ? LIMIT 1',
            [id]
        );

        if (horaires) {
            throw new Error('Cette salle a des horaires planifiés. Désactivez-la plutôt que de la supprimer.');
        }

        await db.run('DELETE FROM salles WHERE id = ?', [id]);
        return true;
    }

    /**
     * Vérifier la disponibilité d'une salle pour un créneau donné
     */
    static async checkDisponibilite(salleId, sessionId, jourSemaine, heureDebut, heureFin, excludeHoraireId = null) {
        const db = await getDatabase();

        let query = `SELECT h.*, c.code as cours_code, c.nom as cours_nom
                     FROM horaires h
                     JOIN cours c ON h.cours_id = c.id
                     WHERE h.salle_id = ?
                       AND h.session_id = ?
                       AND h.jour_semaine = ?
                       AND (
                           (h.heure_debut < ? AND h.heure_fin > ?)
                           OR (h.heure_debut < ? AND h.heure_fin > ?)
                           OR (h.heure_debut >= ? AND h.heure_fin <= ?)
                       )`;

        const params = [
            salleId, sessionId, jourSemaine,
            heureFin, heureDebut,   // Chevauchement début
            heureFin, heureDebut,   // Chevauchement fin
            heureDebut, heureFin    // Inclusion complète
        ];

        if (excludeHoraireId) {
            query += ' AND h.id != ?';
            params.push(excludeHoraireId);
        }

        const conflits = await db.all(query, params);
        return {
            disponible: conflits.length === 0,
            conflits
        };
    }

    /**
     * Obtenir les créneaux occupés d'une salle pour une session
     */
    static async getHoraires(salleId, sessionId) {
        const db = await getDatabase();
        return db.all(
            `SELECT h.*,
                    c.code as cours_code, c.nom as cours_nom,
                    p.nom || ' ' || p.prenom as professeur_nom
             FROM horaires h
             JOIN cours c ON h.cours_id = c.id
             JOIN professeurs p ON h.professeur_id = p.id
             WHERE h.salle_id = ? AND h.session_id = ?
             ORDER BY h.jour_semaine, h.heure_debut`,
            [salleId, sessionId]
        );
    }

    /**
     * Trouver les salles disponibles pour un créneau et un type
     */
    static async findDisponibles(sessionId, jourSemaine, heureDebut, heureFin, type = null, capaciteMin = null) {
        const db = await getDatabase();

        let query = `SELECT s.*,
                            pav.code as pavillon_code, pav.nom as pavillon_nom
                     FROM salles s
                     JOIN pavillons pav ON s.pavillon_id = pav.id
                     WHERE s.actif = 1
                       AND s.id NOT IN (
                           SELECT h.salle_id FROM horaires h
                           WHERE h.session_id = ?
                             AND h.jour_semaine = ?
                             AND (
                                 (h.heure_debut < ? AND h.heure_fin > ?)
                                 OR (h.heure_debut < ? AND h.heure_fin > ?)
                                 OR (h.heure_debut >= ? AND h.heure_fin <= ?)
                             )
                       )`;

        const params = [
            sessionId, jourSemaine,
            heureFin, heureDebut,
            heureFin, heureDebut,
            heureDebut, heureFin
        ];

        if (type) {
            query += ' AND s.type = ?';
            params.push(type);
        }

        if (capaciteMin) {
            query += ' AND s.capacite >= ?';
            params.push(capaciteMin);
        }

        query += ' ORDER BY pav.code, s.code';

        return db.all(query, params);
    }

    /**
     * Obtenir tous les types de salles
     */
    static getTypes() {
        return [
            { value: 'theorique', label: 'Salle théorique' },
            { value: 'laboratoire_informatique', label: 'Laboratoire informatique' },
            { value: 'laboratoire_scientifique', label: 'Laboratoire scientifique' },
            { value: 'salle_multimedia', label: 'Salle multimédia' },
            { value: 'atelier', label: 'Atelier' },
            { value: 'studio', label: 'Studio' }
        ];
    }
}

export default Salle;
