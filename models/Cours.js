/**
 * Modèle Cours - Gestion des cours
 */

import { getDatabase } from '../config/database.js';

class Cours {
    /**
     * Trouver un cours par ID
     */
    static async findById(id) {
        const db = await getDatabase();
        return db.get(
            `SELECT c.*, p.code as programme_code, p.nom as programme_nom
             FROM cours c
             JOIN programmes p ON c.programme_id = p.id
             WHERE c.id = ?`,
            [id]
        );
    }

    /**
     * Trouver un cours par code
     */
    static async findByCode(code) {
        const db = await getDatabase();
        return db.get(
            `SELECT c.*, p.code as programme_code, p.nom as programme_nom
             FROM cours c
             JOIN programmes p ON c.programme_id = p.id
             WHERE c.code = ?`,
            [code]
        );
    }

    /**
     * Récupérer tous les cours avec pagination et filtres
     */
    static async findAll(options = {}) {
        const db = await getDatabase();
        const {
            page = 1,
            limit = 20,
            programmeId,
            sessionId,
            typeSalle,
            statut,
            etape,
            search
        } = options;
        const offset = (page - 1) * limit;

        let query = `SELECT c.*, p.code as programme_code, p.nom as programme_nom
                     FROM cours c
                     JOIN programmes p ON c.programme_id = p.id`;
        let countQuery = 'SELECT COUNT(*) as total FROM cours c';
        const params = [];
        const conditions = [];

        if (sessionId) {
            query = `SELECT c.*, p.code as programme_code, p.nom as programme_nom
                     FROM cours c
                     JOIN programmes p ON c.programme_id = p.id
                     JOIN cours_sessions cs ON c.id = cs.cours_id`;
            countQuery = `SELECT COUNT(DISTINCT c.id) as total FROM cours c
                          JOIN cours_sessions cs ON c.id = cs.cours_id`;
            conditions.push('cs.session_id = ?');
            params.push(sessionId);
        }

        if (programmeId) {
            conditions.push('c.programme_id = ?');
            params.push(programmeId);
        }

        if (typeSalle) {
            conditions.push('c.type_salle_requis = ?');
            params.push(typeSalle);
        }

        if (statut) {
            conditions.push('c.statut = ?');
            params.push(statut);
        }

        if (etape) {
            conditions.push('c.etape_etude = ?');
            params.push(etape);
        }

        if (search) {
            conditions.push('(c.code LIKE ? OR c.nom LIKE ?)');
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        if (conditions.length > 0) {
            const whereClause = ' WHERE ' + conditions.join(' AND ');
            query += whereClause;
            countQuery += whereClause;
        }

        // Compter le total
        const countResult = await db.get(countQuery, params);
        const total = countResult.total;

        // Ajouter tri et pagination
        query += ' ORDER BY c.code LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const cours = await db.all(query, params);

        return {
            cours,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Créer un nouveau cours
     */
    static async create(coursData) {
        const db = await getDatabase();

        const result = await db.run(
            `INSERT INTO cours (code, nom, programme_id, etape_etude, duree_hebdo,
                               type_salle_requis, specialite_requise, description, credits, statut)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                coursData.code,
                coursData.nom,
                coursData.programme_id,
                coursData.etape_etude,
                coursData.duree_hebdo,
                coursData.type_salle_requis,
                coursData.specialite_requise || null,
                coursData.description || null,
                coursData.credits || null,
                coursData.statut || 'actif'
            ]
        );

        return this.findById(result.lastID);
    }

    /**
     * Mettre à jour un cours
     */
    static async update(id, coursData) {
        const db = await getDatabase();

        const fields = [];
        const params = [];

        const allowedFields = ['nom', 'programme_id', 'etape_etude', 'duree_hebdo',
            'type_salle_requis', 'specialite_requise', 'description', 'credits', 'statut'];

        for (const field of allowedFields) {
            if (coursData[field] !== undefined) {
                fields.push(`${field} = ?`);
                params.push(coursData[field]);
            }
        }

        if (fields.length === 0) return this.findById(id);

        params.push(id);

        await db.run(
            `UPDATE cours SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            params
        );

        return this.findById(id);
    }

    /**
     * Archiver un cours
     */
    static async archive(id) {
        return this.update(id, { statut: 'archive' });
    }

    /**
     * Désarchiver un cours
     */
    static async unarchive(id) {
        return this.update(id, { statut: 'actif' });
    }

    /**
     * Supprimer un cours (vérifie les dépendances)
     */
    static async delete(id) {
        const db = await getDatabase();

        // Vérifier s'il y a des horaires associés
        const horaires = await db.get(
            'SELECT id FROM horaires WHERE cours_id = ? LIMIT 1',
            [id]
        );

        if (horaires) {
            throw new Error('Ce cours a des horaires planifiés. Archivez-le plutôt que de le supprimer.');
        }

        // Supprimer les associations cours-sessions
        await db.run('DELETE FROM cours_sessions WHERE cours_id = ?', [id]);

        // Supprimer le cours
        await db.run('DELETE FROM cours WHERE id = ?', [id]);

        return true;
    }

    /**
     * Associer un cours à une session
     */
    static async associateToSession(coursId, sessionId) {
        const db = await getDatabase();

        try {
            await db.run(
                'INSERT INTO cours_sessions (cours_id, session_id) VALUES (?, ?)',
                [coursId, sessionId]
            );
            return true;
        } catch (error) {
            if (error.message.includes('UNIQUE constraint')) {
                return false; // Déjà associé
            }
            throw error;
        }
    }

    /**
     * Dissocier un cours d'une session
     */
    static async dissociateFromSession(coursId, sessionId) {
        const db = await getDatabase();
        await db.run(
            'DELETE FROM cours_sessions WHERE cours_id = ? AND session_id = ?',
            [coursId, sessionId]
        );
        return true;
    }

    /**
     * Obtenir les sessions d'un cours
     */
    static async getSessions(coursId) {
        const db = await getDatabase();
        return db.all(
            `SELECT s.* FROM sessions s
             JOIN cours_sessions cs ON s.id = cs.session_id
             WHERE cs.cours_id = ?
             ORDER BY s.annee DESC, s.type`,
            [coursId]
        );
    }

    /**
     * Vérifier si un code existe déjà
     */
    static async codeExists(code, excludeId = null) {
        const db = await getDatabase();
        let query = 'SELECT id FROM cours WHERE code = ?';
        const params = [code];

        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }

        const result = await db.get(query, params);
        return !!result;
    }

    /**
     * Obtenir les étapes d'étude distinctes
     */
    /**
     * Calculer le prochain code de cours disponible
     * ex: programme=INFO, etape="1ère année" → INFO1004
     *     programme=INFO, etape="2e année"  → INFO2003
     */
    static async getNextCode(programmeCode, etape) {
        const db = await getDatabase();

        // Convertir l'étape en chiffre (1ère année→1, 2e→2, 3e→3, sinon 1)
        let yearDigit = '1';
        if (etape) {
            const match = etape.match(/(\d+)/);
            if (match) yearDigit = match[1];
        }

        const prefix = `${programmeCode.toUpperCase()}${yearDigit}`;

        // Trouver le dernier code utilisé pour ce préfixe
        const row = await db.get(
            `SELECT code FROM cours WHERE code LIKE ? ORDER BY code DESC LIMIT 1`,
            [`${prefix}%`]
        );

        if (!row) return `${prefix}001`;
        const seq = parseInt(row.code.slice(prefix.length), 10);
        return `${prefix}${String(seq + 1).padStart(3, '0')}`;
    }

    static async getEtapes() {
        const db = await getDatabase();
        const result = await db.all(
            'SELECT DISTINCT etape_etude FROM cours WHERE etape_etude IS NOT NULL ORDER BY etape_etude'
        );
        return result.map(r => r.etape_etude);
    }
}

export default Cours;
