/**
 * Modèle Session - Gestion des sessions académiques
 */

import { getDatabase } from '../config/database.js';

class Session {
    /**
     * Trouver une session par ID
     */
    static async findById(id) {
        const db = await getDatabase();
        return db.get('SELECT * FROM sessions WHERE id = ?', [id]);
    }

    /**
     * Trouver la session active
     */
    static async findActive() {
        const db = await getDatabase();
        return db.get('SELECT * FROM sessions WHERE statut = ? ORDER BY annee DESC, type LIMIT 1', ['active']);
    }

    /**
     * Récupérer toutes les sessions avec pagination
     */
    static async findAll(options = {}) {
        const db = await getDatabase();
        const { page = 1, limit = 20, annee, type, statut } = options;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM sessions WHERE 1=1';
        const params = [];

        if (annee) {
            query += ' AND annee = ?';
            params.push(annee);
        }

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        if (statut) {
            query += ' AND statut = ?';
            params.push(statut);
        }

        // Compter le total
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const countResult = await db.get(countQuery, params);
        const total = countResult.total;

        // Ajouter tri et pagination
        query += ' ORDER BY annee DESC, CASE type WHEN "automne" THEN 1 WHEN "hiver" THEN 2 WHEN "ete" THEN 3 END LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const sessions = await db.all(query, params);

        return {
            sessions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Créer une nouvelle session
     */
    static async create(sessionData) {
        const db = await getDatabase();

        const result = await db.run(
            `INSERT INTO sessions (nom, type, annee, date_debut, date_fin, statut)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                sessionData.nom,
                sessionData.type,
                sessionData.annee,
                sessionData.date_debut,
                sessionData.date_fin,
                sessionData.statut || 'planification'
            ]
        );

        return this.findById(result.lastID);
    }

    /**
     * Mettre à jour une session
     */
    static async update(id, sessionData) {
        const db = await getDatabase();

        const fields = [];
        const params = [];

        const allowedFields = ['nom', 'type', 'annee', 'date_debut', 'date_fin', 'statut'];

        for (const field of allowedFields) {
            if (sessionData[field] !== undefined) {
                fields.push(`${field} = ?`);
                params.push(sessionData[field]);
            }
        }

        if (fields.length === 0) return this.findById(id);

        params.push(id);

        await db.run(
            `UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`,
            params
        );

        return this.findById(id);
    }

    /**
     * Définir une session comme active (désactive les autres)
     */
    static async setActive(id) {
        const db = await getDatabase();

        // Désactiver toutes les sessions actives
        await db.run("UPDATE sessions SET statut = 'planification' WHERE statut = 'active'");

        // Activer la session spécifiée
        await db.run("UPDATE sessions SET statut = 'active' WHERE id = ?", [id]);

        return this.findById(id);
    }

    /**
     * Terminer une session
     */
    static async terminate(id) {
        return this.update(id, { statut: 'terminee' });
    }

    /**
     * Supprimer une session (vérifie les dépendances)
     */
    static async delete(id) {
        const db = await getDatabase();

        // Vérifier s'il y a des horaires associés
        const horaires = await db.get(
            'SELECT id FROM horaires WHERE session_id = ? LIMIT 1',
            [id]
        );

        if (horaires) {
            throw new Error('Cette session a des horaires planifiés. Impossible de la supprimer.');
        }

        // Supprimer les associations cours-sessions
        await db.run('DELETE FROM cours_sessions WHERE session_id = ?', [id]);

        // Supprimer la session
        await db.run('DELETE FROM sessions WHERE id = ?', [id]);

        return true;
    }

    /**
     * Obtenir les cours d'une session
     */
    static async getCours(sessionId) {
        const db = await getDatabase();
        return db.all(
            `SELECT c.*, p.code as programme_code, p.nom as programme_nom
             FROM cours c
             JOIN programmes p ON c.programme_id = p.id
             JOIN cours_sessions cs ON c.id = cs.cours_id
             WHERE cs.session_id = ?
             ORDER BY c.code`,
            [sessionId]
        );
    }

    /**
     * Obtenir les statistiques d'une session
     */
    static async getStatistiques(sessionId) {
        const db = await getDatabase();

        // Nombre de cours
        const coursCount = await db.get(
            'SELECT COUNT(*) as count FROM cours_sessions WHERE session_id = ?',
            [sessionId]
        );

        // Nombre d'horaires
        const horairesCount = await db.get(
            'SELECT COUNT(*) as count FROM horaires WHERE session_id = ?',
            [sessionId]
        );

        // Nombre de professeurs impliqués
        const profsCount = await db.get(
            'SELECT COUNT(DISTINCT professeur_id) as count FROM horaires WHERE session_id = ?',
            [sessionId]
        );

        // Nombre de salles utilisées
        const sallesCount = await db.get(
            'SELECT COUNT(DISTINCT salle_id) as count FROM horaires WHERE session_id = ?',
            [sessionId]
        );

        return {
            cours: coursCount.count,
            horaires: horairesCount.count,
            professeurs: profsCount.count,
            salles: sallesCount.count
        };
    }

    /**
     * Dupliquer les horaires d'une session vers une autre
     */
    static async duplicateHoraires(fromSessionId, toSessionId, userId) {
        const db = await getDatabase();

        // Récupérer les horaires de la session source
        const horaires = await db.all(
            'SELECT * FROM horaires WHERE session_id = ?',
            [fromSessionId]
        );

        let duplicatedCount = 0;

        for (const h of horaires) {
            try {
                await db.run(
                    `INSERT INTO horaires (cours_id, salle_id, professeur_id, session_id,
                                          jour_semaine, heure_debut, heure_fin, recurrent,
                                          notes, created_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [h.cours_id, h.salle_id, h.professeur_id, toSessionId,
                        h.jour_semaine, h.heure_debut, h.heure_fin, h.recurrent,
                        h.notes, userId]
                );
                duplicatedCount++;
            } catch (error) {
                // Ignorer les erreurs de contrainte (cours non associé à la nouvelle session, etc.)
                console.log(`Impossible de dupliquer l'horaire ${h.id}: ${error.message}`);
            }
        }

        return duplicatedCount;
    }

    /**
     * Obtenir les années disponibles
     */
    static async getAnnees() {
        const db = await getDatabase();
        const result = await db.all(
            'SELECT DISTINCT annee FROM sessions ORDER BY annee DESC'
        );
        return result.map(r => r.annee);
    }

    /**
     * Vérifier si une session existe déjà (même type et année)
     */
    static async exists(type, annee, excludeId = null) {
        const db = await getDatabase();
        let query = 'SELECT id FROM sessions WHERE type = ? AND annee = ?';
        const params = [type, annee];

        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }

        const result = await db.get(query, params);
        return !!result;
    }

    /**
     * Obtenir les types de session
     */
    static getTypes() {
        return [
            { value: 'automne', label: 'Automne' },
            { value: 'hiver', label: 'Hiver' },
            { value: 'ete', label: 'Été' }
        ];
    }

    /**
     * Obtenir les statuts de session
     */
    static getStatuts() {
        return [
            { value: 'planification', label: 'En planification' },
            { value: 'active', label: 'Active' },
            { value: 'terminee', label: 'Terminée' }
        ];
    }
}

export default Session;
