/**
 * Modèle Pavillon - Gestion des pavillons et programmes (monocampus)
 * Note: Campus est implicite - une seule institution
 */

import { getDatabase } from '../config/database.js';

class Pavillon {
    // ============================================
    // PAVILLONS
    // ============================================

    /**
     * Récupérer tous les pavillons
     */
    static async findAll() {
        const db = await getDatabase();
        return db.all('SELECT * FROM pavillons WHERE actif = 1 ORDER BY code');
    }

    // ============================================
    // PROGRAMMES
    // ============================================

    /**
     * Trouver un programme par ID
     */
    static async findProgrammeById(id) {
        const db = await getDatabase();
        return db.get('SELECT * FROM programmes WHERE id = ?', [id]);
    }

    /**
     * Récupérer tous les programmes
     */
    static async getProgrammes(actifOnly = true) {
        const db = await getDatabase();
        let query = 'SELECT * FROM programmes';
        if (actifOnly) {
            query += ' WHERE actif = 1';
        }
        query += ' ORDER BY nom';
        return db.all(query);
    }

    /**
     * Créer un programme
     */
    static async createProgramme(programmeData) {
        const db = await getDatabase();
        const result = await db.run(
            'INSERT INTO programmes (code, nom, description, actif) VALUES (?, ?, ?, ?)',
            [programmeData.code, programmeData.nom, programmeData.description || null, programmeData.actif !== false ? 1 : 0]
        );
        return this.findProgrammeById(result.lastID);
    }

    /**
     * Mettre à jour un programme
     */
    static async updateProgramme(id, programmeData) {
        const db = await getDatabase();
        const fields = [];
        const params = [];

        for (const [key, value] of Object.entries(programmeData)) {
            if (['code', 'nom', 'description', 'actif'].includes(key)) {
                fields.push(`${key} = ?`);
                params.push(key === 'actif' ? (value ? 1 : 0) : value);
            }
        }

        if (fields.length === 0) return this.findProgrammeById(id);

        params.push(id);
        await db.run(`UPDATE programmes SET ${fields.join(', ')} WHERE id = ?`, params);
        return this.findProgrammeById(id);
    }

    /**
     * Supprimer un programme (vérifie les dépendances)
     */
    static async deleteProgramme(id) {
        const db = await getDatabase();

        const cours = await db.get('SELECT id FROM cours WHERE programme_id = ? LIMIT 1', [id]);
        if (cours) {
            throw new Error('Ce programme a des cours associés. Impossible de le supprimer.');
        }

        await db.run('DELETE FROM programmes WHERE id = ?', [id]);
        return true;
    }

    /**
     * Vérifier si un code de programme existe
     */
    static async programmeCodeExists(code, excludeId = null) {
        const db = await getDatabase();
        let query = 'SELECT id FROM programmes WHERE code = ?';
        const params = [code];

        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }

        const result = await db.get(query, params);
        return !!result;
    }
}

export default Pavillon;
