/**
* Modèle User - Gestion des utilisateurs
*/
 
import { getDatabase } from '../config/database.js';
import bcrypt from 'bcrypt';
 
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
 
    /**
     * Récupérer tous les utilisateurs avec pagination
     */
    static async findAll(options = {}) {
        const db = await getDatabase();
        const { page = 1, limit = 20, role, actif, search } = options;
        const offset = (page - 1) * limit;
 
        let query = `SELECT id, matricule, email, nom, prenom, role, actif,
                            created_at, updated_at FROM users WHERE 1=1`;
        const params = [];
 
        if (role) {
            query += ' AND role = ?';
            params.push(role);
        }
 
        if (actif !== undefined) {
            query += ' AND actif = ?';
            params.push(actif ? 1 : 0);
        }
 
        if (search) {
            query += ' AND (nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR matricule LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }
 
        // Compter le total
        const countQuery = query.replace('SELECT id, matricule, email, nom, prenom, role, actif, created_at, updated_at', 'SELECT COUNT(*) as total');
        const countResult = await db.get(countQuery, params);
        const total = countResult.total;
 
        // Ajouter tri et pagination
        query += ' ORDER BY nom, prenom LIMIT ? OFFSET ?';
        params.push(limit, offset);
 
        const users = await db.all(query, params);
 
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
 
    /**
     * Créer un nouvel utilisateur
     */
    static async create(userData, createdById = null) {
        const db = await getDatabase();
        const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
 
        // Hasher le mot de passe
        const passwordHash = await bcrypt.hash(userData.password, bcryptRounds);
 
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
 
        return this.findById(result.lastID);
    }
 
    /**
     * Mettre à jour un utilisateur
     */
    static async update(id, userData) {
        const db = await getDatabase();
 
        const fields = [];
        const params = [];
 
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
 
        if (fields.length === 0) return this.findById(id);
 
        params.push(id);
 
        await db.run(
            `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            params
        );
 
        return this.findById(id);
    }
 
    /**
     * Mettre à jour le mot de passe
     */
    static async updatePassword(id, newPassword) {
        const db = await getDatabase();
        const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(newPassword, bcryptRounds);
 
        await db.run(
            `UPDATE users SET password_hash = ?, force_password_change = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [passwordHash, id]
        );
 
        return this.findById(id);
    }
 
    /**
     * Vérifier le mot de passe d'un utilisateur
     */
    static async verifyPassword(id, password) {
        const db = await getDatabase();
        const user = await db.get('SELECT password_hash FROM users WHERE id = ?', [id]);
 
        if (!user) return false;
 
        return bcrypt.compare(password, user.password_hash);
    }
 
    /**
     * Désactiver un utilisateur
     */
    static async deactivate(id) {
        return this.update(id, { actif: false });
    }
 
    /**
     * Activer un utilisateur
     */
    static async activate(id) {
        return this.update(id, { actif: true });
    }
 
    /**
     * Supprimer un utilisateur (soft delete = désactivation)
     */
    static async delete(id) {
        return this.deactivate(id);
    }
 
    /**
     * Vérifier si un email existe déjà
     */
    static async emailExists(email, excludeId = null) {
        const db = await getDatabase();
        let query = 'SELECT id FROM users WHERE email = ?';
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
        let query = 'SELECT id FROM users WHERE matricule = ?';
        const params = [matricule];
 
        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }
 
        const result = await db.get(query, params);
        return !!result;
    }
}
 
export default User;
