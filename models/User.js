/**
<<<<<<< HEAD
* Modèle User - Gestion des utilisateurs
*/
 
import { getDatabase } from '../config/database.js';
import bcrypt from 'bcrypt';
 
=======
 * Modèle User - Gestion des utilisateurs
 */

import { getDatabase } from '../config/database.js';
import bcrypt from 'bcrypt';

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
class User {
    /**
     * Trouver un utilisateur par ID
     */
    static async findById(id) {
        const db = await getDatabase();
        return db.get(
            `SELECT id, matricule, email, nom, prenom, role, actif,
                    force_password_change, created_at, updated_at, created_by
             FROM users WHERE id = ?`,
            [id]
        );
    }
<<<<<<< HEAD
 
=======

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
    /**
     * Trouver un utilisateur par email
     */
    static async findByEmail(email) {
        const db = await getDatabase();
        return db.get(
            'SELECT * FROM users WHERE email = ?',
            [email.toLowerCase()]
        );
    }
<<<<<<< HEAD
 
=======

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
    /**
     * Trouver un utilisateur par matricule
     */
    static async findByMatricule(matricule) {
        const db = await getDatabase();
        return db.get(
            'SELECT * FROM users WHERE matricule = ?',
            [matricule]
        );
    }
<<<<<<< HEAD
 
=======

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
    /**
     * Récupérer tous les utilisateurs avec pagination
     */
    static async findAll(options = {}) {
        const db = await getDatabase();
        const { page = 1, limit = 20, role, actif, search } = options;
        const offset = (page - 1) * limit;
<<<<<<< HEAD
 
        let query = `SELECT id, matricule, email, nom, prenom, role, actif,
                            created_at, updated_at FROM users WHERE 1=1`;
        const params = [];
 
=======

        let query = `SELECT id, matricule, email, nom, prenom, role, actif,
                            created_at, updated_at FROM users WHERE 1=1`;
        const params = [];

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
        if (role) {
            query += ' AND role = ?';
            params.push(role);
        }
<<<<<<< HEAD
 
=======

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
        if (actif !== undefined) {
            query += ' AND actif = ?';
            params.push(actif ? 1 : 0);
        }
<<<<<<< HEAD
 
=======

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
        if (search) {
            query += ' AND (nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR matricule LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }
<<<<<<< HEAD
 
=======

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
        // Compter le total
        const countQuery = query.replace('SELECT id, matricule, email, nom, prenom, role, actif, created_at, updated_at', 'SELECT COUNT(*) as total');
        const countResult = await db.get(countQuery, params);
        const total = countResult.total;
<<<<<<< HEAD
 
        // Ajouter tri et pagination
        query += ' ORDER BY nom, prenom LIMIT ? OFFSET ?';
        params.push(limit, offset);
 
        const users = await db.all(query, params);
 
=======

        // Ajouter tri et pagination
        query += ' ORDER BY nom, prenom LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const users = await db.all(query, params);

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
        return {
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
<<<<<<< HEAD
 
=======

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
    /**
     * Créer un nouvel utilisateur
     */
    static async create(userData, createdById = null) {
        const db = await getDatabase();
        const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
<<<<<<< HEAD
 
        // Hasher le mot de passe
        const passwordHash = await bcrypt.hash(userData.password, bcryptRounds);
 
=======

        // Hasher le mot de passe
        const passwordHash = await bcrypt.hash(userData.password, bcryptRounds);

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
        const result = await db.run(
            `INSERT INTO users (matricule, email, password_hash, nom, prenom, role, actif, force_password_change, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userData.matricule,
                userData.email.toLowerCase(),
                passwordHash,
                userData.nom,
                userData.prenom,
                userData.role || 'responsable',
                userData.actif !== false ? 1 : 0,
                userData.forcePasswordChange ? 1 : 0,
                createdById
            ]
        );
<<<<<<< HEAD
 
        return this.findById(result.lastID);
    }
 
=======

        return this.findById(result.lastID);
    }

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
    /**
     * Mettre à jour un utilisateur
     */
    static async update(id, userData) {
        const db = await getDatabase();
<<<<<<< HEAD
 
        const fields = [];
        const params = [];
 
=======

        const fields = [];
        const params = [];

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
        if (userData.matricule !== undefined) {
            fields.push('matricule = ?');
            params.push(userData.matricule);
        }
        if (userData.email !== undefined) {
            fields.push('email = ?');
            params.push(userData.email.toLowerCase());
        }
        if (userData.nom !== undefined) {
            fields.push('nom = ?');
            params.push(userData.nom);
        }
        if (userData.prenom !== undefined) {
            fields.push('prenom = ?');
            params.push(userData.prenom);
        }
        if (userData.role !== undefined) {
            fields.push('role = ?');
            params.push(userData.role);
        }
        if (userData.actif !== undefined) {
            fields.push('actif = ?');
            params.push(userData.actif ? 1 : 0);
        }
        if (userData.forcePasswordChange !== undefined) {
            fields.push('force_password_change = ?');
            params.push(userData.forcePasswordChange ? 1 : 0);
        }
<<<<<<< HEAD
 
        if (fields.length === 0) return this.findById(id);
 
        params.push(id);
 
=======

        if (fields.length === 0) return this.findById(id);

        params.push(id);

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
        await db.run(
            `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            params
        );
<<<<<<< HEAD
 
        return this.findById(id);
    }
 
=======

        return this.findById(id);
    }

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
    /**
     * Mettre à jour le mot de passe
     */
    static async updatePassword(id, newPassword) {
        const db = await getDatabase();
        const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(newPassword, bcryptRounds);
<<<<<<< HEAD
 
=======

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
        await db.run(
            `UPDATE users SET password_hash = ?, force_password_change = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [passwordHash, id]
        );
<<<<<<< HEAD
 
        return this.findById(id);
    }
 
=======

        return this.findById(id);
    }

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
    /**
     * Vérifier le mot de passe d'un utilisateur
     */
    static async verifyPassword(id, password) {
        const db = await getDatabase();
        const user = await db.get('SELECT password_hash FROM users WHERE id = ?', [id]);
<<<<<<< HEAD
 
        if (!user) return false;
 
        return bcrypt.compare(password, user.password_hash);
    }
 
=======

        if (!user) return false;

        return bcrypt.compare(password, user.password_hash);
    }

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
    /**
     * Désactiver un utilisateur
     */
    static async deactivate(id) {
        return this.update(id, { actif: false });
    }
<<<<<<< HEAD
 
=======

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
    /**
     * Activer un utilisateur
     */
    static async activate(id) {
        return this.update(id, { actif: true });
    }
<<<<<<< HEAD
 
=======

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
    /**
     * Supprimer un utilisateur (soft delete = désactivation)
     */
    static async delete(id) {
        return this.deactivate(id);
    }
<<<<<<< HEAD
 
=======

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
    /**
     * Vérifier si un email existe déjà
     */
    static async emailExists(email, excludeId = null) {
        const db = await getDatabase();
        let query = 'SELECT id FROM users WHERE email = ?';
        const params = [email.toLowerCase()];
<<<<<<< HEAD
 
=======

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }
<<<<<<< HEAD
 
        const result = await db.get(query, params);
        return !!result;
    }
 
=======

        const result = await db.get(query, params);
        return !!result;
    }

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
    /**
     * Vérifier si un matricule existe déjà
     */
    static async matriculeExists(matricule, excludeId = null) {
        const db = await getDatabase();
        let query = 'SELECT id FROM users WHERE matricule = ?';
        const params = [matricule];
<<<<<<< HEAD
 
=======

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }
<<<<<<< HEAD
 
=======

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
        const result = await db.get(query, params);
        return !!result;
    }
}
<<<<<<< HEAD
 
=======

>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
export default User;
