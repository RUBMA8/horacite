/**
 * Modèle Professeur - Gestion des professeurs
 */

import { getDatabase } from '../config/database.js';

class Professeur {
    /**
     * Trouver un professeur par ID
     */
    static async findById(id) {
        const db = await getDatabase();
        return db.get(
            `SELECT * FROM professeurs WHERE id = ?`,
            [id]
        );
    }

    /**
     * Trouver un professeur par matricule
     */
    static async findByMatricule(matricule) {
        const db = await getDatabase();
        return db.get(
            `SELECT * FROM professeurs WHERE matricule = ?`,
            [matricule]
        );
    }

    /**
     * Trouver un professeur par email
     */
    static async findByEmail(email) {
        const db = await getDatabase();
        return db.get(
            `SELECT * FROM professeurs WHERE email = ?`,
            [email.toLowerCase()]
        );
    }

    /**
     * Récupérer tous les professeurs avec pagination et filtres (Monocampus)
     */
    static async findAll(options = {}) {
        const db = await getDatabase();
        const {
            page = 1,
            limit = 20,
            specialite,
            actif,
            search
        } = options;
        const offset = (page - 1) * limit;

        let query = `SELECT * FROM professeurs`;

        const params = [];
        const conditions = [];

        if (specialite) {
            conditions.push('(specialite = ? OR specialites_secondaires LIKE ?)');
            params.push(specialite, `%${specialite}%`);
        }

        if (actif !== undefined) {
            conditions.push('actif = ?');
            params.push(actif ? 1 : 0);
        }

        if (search) {
            conditions.push('(nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR matricule LIKE ?)');
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Compter le total
        let countQuery = 'SELECT COUNT(*) as total FROM professeurs';
        if (conditions.length > 0) {
            countQuery += ' WHERE ' + conditions.join(' AND ');
        }
        const countResult = await db.get(countQuery, params);
        const total = countResult ? countResult.total : 0;

        // Ajouter tri et pagination
        query += ' ORDER BY nom, prenom LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const professeurs = await db.all(query, params);

        return {
            professeurs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Créer un nouveau professeur
     */
    static async create(profData) {
        const db = await getDatabase();

        const result = await db.run(
            `INSERT INTO professeurs (matricule, nom, prenom, email, telephone,
                                     specialite, specialites_secondaires, actif)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                profData.matricule,
                profData.nom,
                profData.prenom,
                profData.email.toLowerCase(),
                profData.telephone || null,
                profData.specialite,
                profData.specialites_secondaires || null,
                profData.actif !== false ? 1 : 0
            ]
        );

        return this.findById(result.lastID);
    }

    /**
     * Mettre à jour un professeur
     */
    static async update(id, profData) {
        const db = await getDatabase();

        const fields = [];
        const params = [];

        const allowedFields = ['matricule', 'nom', 'prenom', 'email', 'telephone',
            'specialite', 'specialites_secondaires', 'actif'];

        for (const field of allowedFields) {
            if (profData[field] !== undefined) {
                fields.push(`${field} = ?`);
                if (field === 'email') {
                    params.push(profData[field].toLowerCase());
                } else if (field === 'actif') {
                    params.push(profData[field] ? 1 : 0);
                } else {
                    params.push(profData[field]);
                }
            }
        }

        if (fields.length === 0) return this.findById(id);

        params.push(id);

        await db.run(
            `UPDATE professeurs SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            params
        );

        return this.findById(id);
    }

    /**
     * Désactiver un professeur
     */
    static async deactivate(id) {
        return this.update(id, { actif: false });
    }

    /**
     * Activer un professeur
     */
    static async activate(id) {
        return this.update(id, { actif: true });
    }

    /**
     * Supprimer un professeur (vérifie les dépendances)
     */
    static async delete(id) {
        const db = await getDatabase();

        // Vérifier s'il y a des horaires associés
        const horaires = await db.get(
            'SELECT id FROM horaires WHERE professeur_id = ? LIMIT 1',
            [id]
        );

        if (horaires) {
            throw new Error('Ce professeur a des horaires planifiés. Désactivez-le plutôt que de le supprimer.');
        }

        // Supprimer les disponibilités
        await db.run('DELETE FROM disponibilites_professeurs WHERE professeur_id = ?', [id]);

        // Supprimer le professeur
        await db.run('DELETE FROM professeurs WHERE id = ?', [id]);

        return true;
    }

    /**
     * Obtenir les disponibilités d'un professeur
     */
    static async getDisponibilites(professeurId, sessionId = null) {
        const db = await getDatabase();
        let query = `SELECT * FROM disponibilites_professeurs
                     WHERE professeur_id = ?`;
        const params = [professeurId];

        if (sessionId) {
            query += ' AND (session_id = ? OR session_id IS NULL)';
            params.push(sessionId);
        }

        query += ' ORDER BY jour_semaine, heure_debut';

        return db.all(query, params);
    }

    /**
     * Définir les disponibilités d'un professeur
     */
    static async setDisponibilites(professeurId, disponibilites, sessionId = null) {
        const db = await getDatabase();

        // Supprimer les anciennes disponibilités pour cette session
        if (sessionId) {
            await db.run(
                'DELETE FROM disponibilites_professeurs WHERE professeur_id = ? AND session_id = ?',
                [professeurId, sessionId]
            );
        } else {
            await db.run(
                'DELETE FROM disponibilites_professeurs WHERE professeur_id = ? AND session_id IS NULL',
                [professeurId]
            );
        }

        // Insérer les nouvelles disponibilités
        for (const dispo of disponibilites) {
            await db.run(
                `INSERT INTO disponibilites_professeurs
                 (professeur_id, session_id, jour_semaine, heure_debut, heure_fin)
                 VALUES (?, ?, ?, ?, ?)`,
                [professeurId, sessionId, dispo.jour_semaine, dispo.heure_debut, dispo.heure_fin]
            );
        }

        return this.getDisponibilites(professeurId, sessionId);
    }

    /**
     * Vérifier la disponibilité d'un professeur pour un créneau donné
     */
    static async checkDisponibilite(professeurId, sessionId, jourSemaine, heureDebut, heureFin, excludeHoraireId = null) {
        const db = await getDatabase();

        // Vérifier si le professeur est disponible sur ce créneau
        // (peut être composé de plusieurs plages consécutives)
        const dispos = await db.all(
            `SELECT heure_debut, heure_fin FROM disponibilites_professeurs
             WHERE professeur_id = ?
               AND (session_id = ? OR session_id IS NULL)
               AND jour_semaine = ?
               AND heure_debut < ?
               AND heure_fin > ?
             ORDER BY heure_debut`,
            [professeurId, sessionId, jourSemaine, heureFin, heureDebut]
        );

        // Vérifier que les plages couvrent entièrement le créneau demandé
        let covered = heureDebut;
        for (const dispo of dispos) {
            if (dispo.heure_debut > covered) break; // écart détecté
            if (dispo.heure_fin > covered) covered = dispo.heure_fin;
        }

        if (covered < heureFin) {
            return {
                disponible: false,
                raison: 'Le professeur n\'est pas disponible sur ce créneau',
                conflits: []
            };
        }

        // Vérifier les conflits avec d'autres horaires
        let query = `SELECT h.*, c.code as cours_code, c.nom as cours_nom,
                            s.code as salle_code
                     FROM horaires h
                     JOIN cours c ON h.cours_id = c.id
                     JOIN salles s ON h.salle_id = s.id
                     WHERE h.professeur_id = ?
                       AND h.session_id = ?
                       AND h.jour_semaine = ?
                       AND (
                           (h.heure_debut < ? AND h.heure_fin > ?)
                           OR (h.heure_debut < ? AND h.heure_fin > ?)
                           OR (h.heure_debut >= ? AND h.heure_fin <= ?)
                       )`;

        const params = [
            professeurId, sessionId, jourSemaine,
            heureFin, heureDebut,
            heureFin, heureDebut,
            heureDebut, heureFin
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
     * Obtenir les horaires d'un professeur pour une session
     */
    static async getHoraires(professeurId, sessionId) {
        const db = await getDatabase();
        return db.all(
            `SELECT h.*,
                    c.code as cours_code, c.nom as cours_nom,
                    s.code as salle_code,
                    pav.code as pavillon_code
             FROM horaires h
             JOIN cours c ON h.cours_id = c.id
             JOIN salles s ON h.salle_id = s.id
             JOIN pavillons pav ON s.pavillon_id = pav.id
             WHERE h.professeur_id = ? AND h.session_id = ?
             ORDER BY h.jour_semaine, h.heure_debut`,
            [professeurId, sessionId]
        );
    }

    /**
     * Trouver les professeurs disponibles pour un créneau et une spécialité
     */
    static async findDisponibles(sessionId, jourSemaine, heureDebut, heureFin, specialite = null) {
        const db = await getDatabase();

        let query = `SELECT DISTINCT p.*
                     FROM professeurs p
                     JOIN disponibilites_professeurs dp ON p.id = dp.professeur_id
                     WHERE p.actif = 1
                       AND (dp.session_id = ? OR dp.session_id IS NULL)
                       AND dp.jour_semaine = ?
                       AND dp.heure_debut <= ?
                       AND dp.heure_fin >= ?
                       AND p.id NOT IN (
                           SELECT h.professeur_id FROM horaires h
                           WHERE h.session_id = ?
                             AND h.jour_semaine = ?
                             AND (
                                 (h.heure_debut < ? AND h.heure_fin > ?)
                                 OR (h.heure_debut < ? AND h.heure_fin > ?)
                                 OR (h.heure_debut >= ? AND h.heure_fin <= ?)
                             )
                       )`;

        const params = [
            sessionId, jourSemaine, heureDebut, heureFin,
            sessionId, jourSemaine,
            heureFin, heureDebut,
            heureFin, heureDebut,
            heureDebut, heureFin
        ];

        if (specialite) {
            query += ' AND (p.specialite = ? OR p.specialites_secondaires LIKE ?)';
            params.push(specialite, `%${specialite}%`);
        }

        query += ' ORDER BY p.nom, p.prenom';

        return db.all(query, params);
    }

    /**
     * Liste prédéfinie des spécialités
     */
    static SPECIALITES = [
        'Administration',
        'Communications',
        'Design',
        'Électronique',
        'Informatique',
        'Mathématiques',
        'Réseaux'
    ];

    /**
     * Obtenir les spécialités (prédéfinies + toutes les spécialités utilisées en BD,
     * principale ET secondaires)
     */
    static async getSpecialites() {
        const db = await getDatabase();

        // Spécialités principales
        const primaires = await db.all(
            'SELECT DISTINCT specialite FROM professeurs WHERE specialite IS NOT NULL'
        );

        // Spécialités secondaires (stockées en CSV : "Réseaux, Design, ...")
        const secondaires = await db.all(
            'SELECT specialites_secondaires FROM professeurs WHERE specialites_secondaires IS NOT NULL AND specialites_secondaires != ""'
        );

        const fromDb = primaires.map(r => r.specialite);

        // Extraire et aplatir les secondaires
        for (const row of secondaires) {
            const vals = row.specialites_secondaires.split(',').map(s => s.trim()).filter(Boolean);
            fromDb.push(...vals);
        }

        // Fusionner sans doublons, triées
        const merged = [...new Set([...Professeur.SPECIALITES, ...fromDb])].sort();
        return merged;
    }

    /**
     * Calculer le prochain matricule disponible (ex: PROF011)
     */
    static async findByMaxMatricule() {
        const db = await getDatabase();
        const rows = await db.all(
            `SELECT matricule FROM professeurs WHERE matricule GLOB 'PROF[0-9]*'`
        );
        if (!rows || rows.length === 0) return 'PROF001';
        const max = rows.reduce((acc, r) => {
            const num = parseInt(r.matricule.replace(/^PROF/i, ''), 10);
            return !isNaN(num) && num > acc ? num : acc;
        }, 0);
        return 'PROF' + String(max + 1).padStart(3, '0');
    }

    /**
     * Vérifier si un email existe déjà
     */
    static async emailExists(email, excludeId = null) {
        const db = await getDatabase();
        let query = 'SELECT id FROM professeurs WHERE email = ?';
        const params = [email.toLowerCase()];

        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }

        const result = await db.get(query, params);
        return !!result;
    }

    /**
     * Vérifier si un matricule existe déjà
     */
    static async matriculeExists(matricule, excludeId = null) {
        const db = await getDatabase();
        let query = 'SELECT id FROM professeurs WHERE matricule = ?';
        const params = [matricule];

        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }

        const result = await db.get(query, params);
        return !!result;
    }
}

export default Professeur;
