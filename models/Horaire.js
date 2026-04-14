/**
 * Modèle Horaire - Gestion des horaires (cœur du système)
 */

import { getDatabase } from '../config/database.js';
import Salle from './Salle.js';
import Professeur from './Professeur.js';

class Horaire {
    /**
     * Trouver un horaire par ID
     */
    static async findById(id) {
        const db = await getDatabase();
        return db.get(
            `SELECT h.*,
                    c.code as cours_code, c.nom as cours_nom, c.type_salle_requis,
                    p.nom as programme_nom,
                    s.code as salle_code, s.type as salle_type,
                    pav.code as pavillon_code,
                    prof.nom as professeur_nom, prof.prenom as professeur_prenom,
                    prof.specialite as professeur_specialite,
                    ses.nom as session_nom,
                    u.nom || ' ' || u.prenom as created_by_name
             FROM horaires h
             JOIN cours c ON h.cours_id = c.id
             JOIN programmes p ON c.programme_id = p.id
             JOIN salles s ON h.salle_id = s.id
             JOIN pavillons pav ON s.pavillon_id = pav.id
             JOIN professeurs prof ON h.professeur_id = prof.id
             JOIN sessions ses ON h.session_id = ses.id
             JOIN users u ON h.created_by = u.id
             WHERE h.id = ?`,
            [id]
        );
    }

    /**
     * Récupérer tous les horaires avec filtres (Monocampus)
     */
    static async findAll(options = {}) {
        const db = await getDatabase();
        const {
            page = 1,
            limit = 50,
            sessionId,
            coursId,
            salleId,
            professeurId,
            jourSemaine,
            programmeId
        } = options;
        const offset = (page - 1) * limit;

        let query = `SELECT h.*,
                            c.code as cours_code, c.nom as cours_nom,
                            p.nom as programme_nom,
                            s.code as salle_code, s.type as salle_type,
                            pav.code as pavillon_code,
                            prof.nom as professeur_nom, prof.prenom as professeur_prenom,
                            ses.nom as session_nom
                     FROM horaires h
                     JOIN cours c ON h.cours_id = c.id
                     JOIN programmes p ON c.programme_id = p.id
                     JOIN salles s ON h.salle_id = s.id
                     JOIN pavillons pav ON s.pavillon_id = pav.id
                     JOIN professeurs prof ON h.professeur_id = prof.id
                     JOIN sessions ses ON h.session_id = ses.id`;

        const params = [];
        const conditions = [];

        if (sessionId) {
            conditions.push('h.session_id = ?');
            params.push(sessionId);
        }

        if (coursId) {
            conditions.push('h.cours_id = ?');
            params.push(coursId);
        }

        if (salleId) {
            conditions.push('h.salle_id = ?');
            params.push(salleId);
        }

        if (professeurId) {
            conditions.push('h.professeur_id = ?');
            params.push(professeurId);
        }

        if (jourSemaine) {
            conditions.push('h.jour_semaine = ?');
            params.push(jourSemaine);
        }

        if (programmeId) {
            conditions.push('c.programme_id = ?');
            params.push(programmeId);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Compter le total avec une requête séparée
        let countQuery = `SELECT COUNT(*) as total
                          FROM horaires h
                          JOIN cours c ON h.cours_id = c.id
                          JOIN programmes p ON c.programme_id = p.id
                          JOIN salles s ON h.salle_id = s.id
                          JOIN pavillons pav ON s.pavillon_id = pav.id
                          JOIN professeurs prof ON h.professeur_id = prof.id
                          JOIN sessions ses ON h.session_id = ses.id`;

        if (conditions.length > 0) {
            countQuery += ' WHERE ' + conditions.join(' AND ');
        }

        const countResult = await db.get(countQuery, params);
        const total = countResult ? countResult.total : 0;

        // Ajouter tri et pagination
        query += ' ORDER BY h.jour_semaine, h.heure_debut LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const horaires = await db.all(query, params);

        return {
            horaires,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Créer un nouvel horaire avec validation des conflits
     */
    static async create(horaireData, userId) {
        const db = await getDatabase();

        // Vérifier la disponibilité de la salle
        const salleCheck = await Salle.checkDisponibilite(
            horaireData.salle_id,
            horaireData.session_id,
            horaireData.jour_semaine,
            horaireData.heure_debut,
            horaireData.heure_fin
        );

        if (!salleCheck.disponible) {
            throw new Error(`Conflit de salle: ${salleCheck.conflits.map(c =>
                `${c.cours_code} (${c.heure_debut}-${c.heure_fin})`
            ).join(', ')}`);
        }

        // Vérifier la disponibilité du professeur
        const profCheck = await Professeur.checkDisponibilite(
            horaireData.professeur_id,
            horaireData.session_id,
            horaireData.jour_semaine,
            horaireData.heure_debut,
            horaireData.heure_fin
        );

        if (!profCheck.disponible) {
            if (profCheck.conflits.length > 0) {
                throw new Error(`Conflit de professeur: ${profCheck.conflits.map(c =>
                    `${c.cours_code} (${c.heure_debut}-${c.heure_fin})`
                ).join(', ')}`);
            } else {
                throw new Error(profCheck.raison);
            }
        }

        // Vérifier la compatibilité salle-cours
        const salle = await Salle.findById(horaireData.salle_id);
        const cours = await db.get(
            'SELECT type_salle_requis, specialite_requise, nom FROM cours WHERE id = ?',
            [horaireData.cours_id]
        );

        if (salle.type !== cours.type_salle_requis) {
            throw new Error(`Type de salle incompatible: Le cours requiert une salle de type "${cours.type_salle_requis}" mais la salle sélectionnée est de type "${salle.type}"`);
        }

        // Vérifier la compatibilité professeur-cours (spécialité)
        if (cours.specialite_requise) {
            const professeur = await Professeur.findById(horaireData.professeur_id);

            // Construire liste des spécialités du professeur
            const profSpecialites = [professeur.specialite];
            if (professeur.specialites_secondaires) {
                profSpecialites.push(
                    ...professeur.specialites_secondaires.split(',').map(s => s.trim())
                );
            }

            // Vérifier si une des spécialités correspond
            if (!profSpecialites.includes(cours.specialite_requise)) {
                throw new Error(
                    `Spécialité incompatible: Le cours "${cours.nom}" requiert ` +
                    `un professeur en "${cours.specialite_requise}", mais ` +
                    `${professeur.prenom} ${professeur.nom} a pour spécialité(s): ` +
                    `${profSpecialites.join(', ')}.`
                );
            }
        }

        // Créer l'horaire
        const result = await db.run(
            `INSERT INTO horaires (cours_id, salle_id, professeur_id, session_id,
                                  jour_semaine, heure_debut, heure_fin, recurrent,
                                  date_debut, date_fin, notes, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                horaireData.cours_id,
                horaireData.salle_id,
                horaireData.professeur_id,
                horaireData.session_id,
                horaireData.jour_semaine,
                horaireData.heure_debut,
                horaireData.heure_fin,
                horaireData.recurrent !== false ? 1 : 0,
                horaireData.date_debut || null,
                horaireData.date_fin || null,
                horaireData.notes || null,
                userId
            ]
        );

        // Logger l'action
        await db.run(
            `INSERT INTO audit_logs (user_id, action, table_name, record_id, details)
             VALUES (?, 'CREATE', 'horaires', ?, ?)`,
            [userId, result.lastID, JSON.stringify(horaireData)]
        );

        return this.findById(result.lastID);
    }

    /**
     * Mettre à jour un horaire avec validation des conflits
     */
    static async update(id, horaireData, userId) {
        const db = await getDatabase();
        const currentHoraire = await this.findById(id);

        if (!currentHoraire) {
            throw new Error('Horaire non trouvé');
        }

        // Préparer les données mises à jour
        const updatedData = {
            salle_id: horaireData.salle_id || currentHoraire.salle_id,
            professeur_id: horaireData.professeur_id || currentHoraire.professeur_id,
            session_id: horaireData.session_id || currentHoraire.session_id,
            jour_semaine: horaireData.jour_semaine || currentHoraire.jour_semaine,
            heure_debut: horaireData.heure_debut || currentHoraire.heure_debut,
            heure_fin: horaireData.heure_fin || currentHoraire.heure_fin
        };

        // Vérifier la disponibilité de la salle (exclure l'horaire actuel)
        const salleCheck = await Salle.checkDisponibilite(
            updatedData.salle_id,
            updatedData.session_id,
            updatedData.jour_semaine,
            updatedData.heure_debut,
            updatedData.heure_fin,
            id
        );

        if (!salleCheck.disponible) {
            throw new Error(`Conflit de salle: ${salleCheck.conflits.map(c =>
                `${c.cours_code} (${c.heure_debut}-${c.heure_fin})`
            ).join(', ')}`);
        }

        // Vérifier la disponibilité du professeur (exclure l'horaire actuel)
        const profCheck = await Professeur.checkDisponibilite(
            updatedData.professeur_id,
            updatedData.session_id,
            updatedData.jour_semaine,
            updatedData.heure_debut,
            updatedData.heure_fin,
            id
        );

        if (!profCheck.disponible) {
            if (profCheck.conflits.length > 0) {
                throw new Error(`Conflit de professeur: ${profCheck.conflits.map(c =>
                    `${c.cours_code} (${c.heure_debut}-${c.heure_fin})`
                ).join(', ')}`);
            } else {
                throw new Error(profCheck.raison);
            }
        }

        // Vérifier la compatibilité professeur-cours (habilitation/spécialité)
        const coursId = horaireData.cours_id || currentHoraire.cours_id;
        const cours = await db.get(
            'SELECT type_salle_requis, specialite_requise, nom FROM cours WHERE id = ?',
            [coursId]
        );

        if (cours && cours.specialite_requise) {
            const professeur = await Professeur.findById(updatedData.professeur_id);
            const profSpecialites = [professeur.specialite];
            if (professeur.specialites_secondaires) {
                profSpecialites.push(
                    ...professeur.specialites_secondaires.split(',').map(s => s.trim())
                );
            }
            if (!profSpecialites.includes(cours.specialite_requise)) {
                throw new Error(
                    `Spécialité incompatible: Le cours "${cours.nom}" requiert ` +
                    `un professeur en "${cours.specialite_requise}", mais ` +
                    `${professeur.prenom} ${professeur.nom} a pour spécialité(s): ` +
                    `${profSpecialites.join(', ')}.`
                );
            }
        }

        // Mettre à jour
        const fields = [];
        const params = [];

        const allowedFields = ['cours_id', 'salle_id', 'professeur_id', 'session_id',
            'jour_semaine', 'heure_debut', 'heure_fin', 'recurrent',
            'date_debut', 'date_fin', 'notes'];

        for (const field of allowedFields) {
            if (horaireData[field] !== undefined) {
                fields.push(`${field} = ?`);
                if (field === 'recurrent') {
                    params.push(horaireData[field] ? 1 : 0);
                } else {
                    params.push(horaireData[field]);
                }
            }
        }

        if (fields.length === 0) return this.findById(id);

        params.push(id);

        await db.run(
            `UPDATE horaires SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            params
        );

        // Logger l'action
        await db.run(
            `INSERT INTO audit_logs (user_id, action, table_name, record_id, details)
             VALUES (?, 'UPDATE', 'horaires', ?, ?)`,
            [userId, id, JSON.stringify({ old: currentHoraire, new: horaireData })]
        );

        return this.findById(id);
    }

    /**
     * Supprimer un horaire
     */
    static async delete(id, userId) {
        const db = await getDatabase();
        const horaire = await this.findById(id);

        if (!horaire) {
            throw new Error('Horaire non trouvé');
        }

        await db.run('DELETE FROM horaires WHERE id = ?', [id]);

        // Logger l'action
        await db.run(
            `INSERT INTO audit_logs (user_id, action, table_name, record_id, details)
             VALUES (?, 'DELETE', 'horaires', ?, ?)`,
            [userId, id, JSON.stringify(horaire)]
        );

        return true;
    }

    /**
     * Obtenir les horaires formatés pour un calendrier
     */
    static async getCalendarData(sessionId, filters = {}) {
        const db = await getDatabase();

        let query = `SELECT h.*,
                            c.code as cours_code, c.nom as cours_nom,
                            s.code as salle_code,
                            pav.code as pavillon_code,
                            prof.nom || ' ' || prof.prenom as professeur_nom
                     FROM horaires h
                     JOIN cours c ON h.cours_id = c.id
                     JOIN salles s ON h.salle_id = s.id
                     JOIN pavillons pav ON s.pavillon_id = pav.id
                     JOIN professeurs prof ON h.professeur_id = prof.id
                     WHERE h.session_id = ?`;

        const params = [sessionId];

        if (filters.salleId) {
            query += ' AND h.salle_id = ?';
            params.push(filters.salleId);
        }

        if (filters.professeurId) {
            query += ' AND h.professeur_id = ?';
            params.push(filters.professeurId);
        }

        if (filters.coursId) {
            query += ' AND h.cours_id = ?';
            params.push(filters.coursId);
        }

        query += ' ORDER BY h.jour_semaine, h.heure_debut';

        const horaires = await db.all(query, params);

        // Formater pour FullCalendar ou autre calendrier
        return horaires.map(h => ({
            id: h.id,
            title: `${h.cours_code} - ${h.salle_code}`,
            daysOfWeek: [h.jour_semaine === 7 ? 0 : h.jour_semaine],
            startTime: h.heure_debut,
            endTime: h.heure_fin,
            extendedProps: {
                cours_code: h.cours_code,
                cours_nom: h.cours_nom,
                salle_code: h.salle_code,
                pavillon_code: h.pavillon_code,
                professeur_nom: h.professeur_nom
            }
        }));
    }

    /**
     * Vérifier les conflits potentiels avant création
     */
    static async checkConflits(horaireData, excludeId = null) {
        const db = await getDatabase();
        const conflits = [];

        // Vérifier la salle (seulement si une salle est sélectionnée)
        if (horaireData.salle_id) {
            const salleCheck = await Salle.checkDisponibilite(
                horaireData.salle_id,
                horaireData.session_id,
                horaireData.jour_semaine,
                horaireData.heure_debut,
                horaireData.heure_fin,
                excludeId
            );

            if (!salleCheck.disponible) {
                conflits.push({
                    type: 'salle',
                    message: 'La salle est déjà occupée',
                    details: salleCheck.conflits
                });
            }
        }

        // Vérifier le professeur (seulement si un professeur est sélectionné)
        if (horaireData.professeur_id) {
            const profCheck = await Professeur.checkDisponibilite(
                horaireData.professeur_id,
                horaireData.session_id,
                horaireData.jour_semaine,
                horaireData.heure_debut,
                horaireData.heure_fin,
                excludeId
            );

            if (!profCheck.disponible) {
                conflits.push({
                    type: 'professeur',
                    message: profCheck.raison || 'Le professeur n\'est pas disponible',
                    details: profCheck.conflits
                });
            }

            // Vérifier l'habilitation du professeur pour le cours
            if (horaireData.cours_id) {
                const cours = await db.get(
                    'SELECT specialite_requise, nom FROM cours WHERE id = ?',
                    [horaireData.cours_id]
                );

                if (cours && cours.specialite_requise) {
                    const professeur = await Professeur.findById(horaireData.professeur_id);
                    const profSpecialites = [professeur.specialite];
                    if (professeur.specialites_secondaires) {
                        profSpecialites.push(
                            ...professeur.specialites_secondaires.split(',').map(s => s.trim())
                        );
                    }
                    if (!profSpecialites.includes(cours.specialite_requise)) {
                        conflits.push({
                            type: 'habilitation',
                            message: `Le professeur ${professeur.prenom} ${professeur.nom} n'est pas habilité pour ce cours (spécialité requise: ${cours.specialite_requise})`
                        });
                    }
                }
            }
        }

        return conflits;
    }

    /**
     * Obtenir les statistiques d'occupation (Monocampus)
     */
    static async getStatistiques(sessionId) {
        const db = await getDatabase();

        // Nombre total d'horaires
        const totalHoraires = await db.get(
            'SELECT COUNT(*) as count FROM horaires WHERE session_id = ?',
            [sessionId]
        );

        // Horaires par jour
        const parJour = await db.all(
            `SELECT jour_semaine, COUNT(*) as count
             FROM horaires WHERE session_id = ?
             GROUP BY jour_semaine ORDER BY jour_semaine`,
            [sessionId]
        );

        return {
            total: totalHoraires.count,
            parJour
        };
    }

    /**
     * Obtenir les plages horaires standards
     */
    static getPlagesHoraires() {
        return [
            { debut: '08:00', fin: '10:00', label: '08h00 - 10h00' },
            { debut: '10:00', fin: '12:00', label: '10h00 - 12h00' },
            { debut: '13:00', fin: '15:00', label: '13h00 - 15h00' },
            { debut: '15:00', fin: '17:00', label: '15h00 - 17h00' }
        ];
    }
}

export default Horaire;
