<<<<<<< HEAD
/**
* Middleware de Validation et Contrôle d'Accès 
*
* À placer dans: middleware/validation.js
*/
 
/**
* Middleware: Vérifier que l'utilisateur est admin
*
* @param {Request} req
* @param {Response} res
* @param {Function} next
*/
export function requireAdmin(req, res, next) {
   
    if (!req.isAuthenticated()) return res.redirect('/auth/login');
    if (req.user.role !== 'admin') return res.status(403).send('Accès refusé');
    next();
}
 
/**
* Middleware: Vérifier que l'utilisateur a un rôle spécifique
*
* @param {Array<string>} roles - Rôles acceptés
* @returns {Function} Middleware
*/
export function requireRole(...roles) {
    return (req, res, next) => {

       if (!req.isAuthenticated()) return res.redirect('/auth/login');
       if (!roles.includes(req.user.role)) return res.status(403).send('Accès refusé');
       next();
    };
}
 
/**
* Middleware: Valider les données en entrée
* (Peut valider email, password, etc.)
*
* TODO: Implémenter selon les besoins
*/
export function validateInput(req, res, next) {
    // TODO: Implémenter la validation
}
 
/**
* Middleware: Vérifier que l'utilisateur est responsable ou admin
* (Shortcut pour les routes de gestion)
*
* @param {Request} req
* @param {Response} res
* @param {Function} next
*/
export function requireResponsable(req, res, next) {
    // TODO: Implémenter
    // Vérifier si 'admin' OU 'responsable'
}

=======
/**
 * Middleware et utilitaires de validation
 */

/**
 * Règles de validation pour les mots de passe
 */
export const passwordRules = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true
};

/**
 * Valide un mot de passe selon les règles défin ies
 */
export function validatePassword(password) {
    const errors = [];

    if (!password || password.length < passwordRules.minLength) {
        errors.push(`Le mot de passe doit contenir au moins ${passwordRules.minLength} caractères`);
    }

    if (passwordRules.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Le mot de passe doit contenir au moins une majuscule');
    }

    if (passwordRules.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Le mot de passe doit contenir au moins une minuscule');
    }

    if (passwordRules.requireNumber && !/[0-9]/.test(password)) {
        errors.push('Le mot de passe doit contenir au moins un chiffre');
    }

    if (passwordRules.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*...)');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Valide un email
 */
export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Valide un code de cours (format: XXXX0000)
 */
export function validateCodeCours(code) {
    const codeRegex = /^[A-Z]{4}[0-9]{4}$/;
    return codeRegex.test(code);
}

/**
 * Valide un matricule
 */
export function validateMatricule(matricule) {
    return matricule && matricule.length >= 3 && matricule.length <= 50;
}

/**
 * Valide une heure au format HH:MM
 */
export function validateTime(time) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
}

/**
 * Valide une date au format YYYY-MM-DD
 */
export function validateDate(date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;

    const d = new Date(date);
    return d instanceof Date && !isNaN(d);
}

/**
 * Sanitize une chaîne de caractères (prévention XSS)
 */
export function sanitizeString(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim();
}

/**
 * Middleware de validation générique
 */
export function validate(schema) {
    return (req, res, next) => {
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = req.body[field];

            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push(`Le champ "${rules.label || field}" est requis`);
                continue;
            }

            if (value !== undefined && value !== null && value !== '') {
                if (rules.type === 'email' && !validateEmail(value)) {
                    errors.push(`Le champ "${rules.label || field}" doit être un email valide`);
                }

                if (rules.type === 'password') {
                    const pwdValidation = validatePassword(value);
                    if (!pwdValidation.valid) {
                        errors.push(...pwdValidation.errors);
                    }
                }

                if (rules.minLength && value.length < rules.minLength) {
                    errors.push(`Le champ "${rules.label || field}" doit contenir au moins ${rules.minLength} caractères`);
                }

                if (rules.maxLength && value.length > rules.maxLength) {
                    errors.push(`Le champ "${rules.label || field}" ne doit pas dépasser ${rules.maxLength} caractères`);
                }

                if (rules.pattern && !rules.pattern.test(value)) {
                    errors.push(`Le champ "${rules.label || field}" n'est pas dans un format valide`);
                }

                if (rules.enum && !rules.enum.includes(value)) {
                    errors.push(`La valeur du champ "${rules.label || field}" n'est pas valide`);
                }

                if (rules.min !== undefined && Number(value) < rules.min) {
                    errors.push(`Le champ "${rules.label || field}" doit être au moins ${rules.min}`);
                }

                if (rules.max !== undefined && Number(value) > rules.max) {
                    errors.push(`Le champ "${rules.label || field}" ne doit pas dépasser ${rules.max}`);
                }
            }
        }

        if (errors.length > 0) {
            // Si c'est une requête AJAX, retourner JSON
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(400).json({ errors });
            }

            // Sinon, stocker les erreurs dans la session et rediriger
            req.session.error_msg = errors.join('<br>');
            req.session.formData = req.body;
            return res.redirect('back');
        }

        next();
    };
}

/**
 * Schémas de validation prédéfinis
 */
export const schemas = {
    login: {
        email: { required: true, type: 'email', label: 'Email' },
        password: { required: true, label: 'Mot de passe' }
    },

    createUser: {
        matricule: { required: true, minLength: 3, maxLength: 50, label: 'Matricule' },
        email: { required: true, type: 'email', label: 'Email' },
        nom: { required: true, minLength: 2, maxLength: 100, label: 'Nom' },
        prenom: { required: true, minLength: 2, maxLength: 100, label: 'Prénom' },
        password: { required: true, type: 'password', label: 'Mot de passe' },
        role: { required: true, enum: ['admin', 'responsable'], label: 'Rôle' }
    },

    createCours: {
        code: { required: true, pattern: /^[A-Z]{4}[0-9]{4}$/, label: 'Code du cours' },
        nom: { required: true, minLength: 3, maxLength: 200, label: 'Nom du cours' },
        programme_id: { required: true, label: 'Programme' },
        duree_hebdo: { required: true, min: 1, max: 10, label: 'Durée hebdomadaire' },
        type_salle_requis: {
            required: true,
            enum: ['theorique', 'laboratoire_informatique', 'laboratoire_scientifique', 'salle_multimedia', 'atelier', 'studio'],
            label: 'Type de salle'
        }
    },

    createSalle: {
        pavillon_id: { required: true, label: 'Pavillon' },
        code: { required: true, pattern: /^[A-Z][0-9]{3}$/, label: 'Code de la salle' },
        type: {
            required: true,
            enum: ['theorique', 'laboratoire_informatique', 'laboratoire_scientifique', 'salle_multimedia', 'atelier', 'studio'],
            label: 'Type de salle'
        }
    },

    createProfesseur: {
        matricule: { required: true, minLength: 3, maxLength: 50, label: 'Matricule' },
        nom: { required: true, minLength: 2, maxLength: 100, label: 'Nom' },
        prenom: { required: true, minLength: 2, maxLength: 100, label: 'Prénom' },
        email: { required: true, type: 'email', label: 'Email' },
        specialite: { required: true, minLength: 2, maxLength: 100, label: 'Spécialité' }
    },

    createHoraire: {
        cours_id: { required: true, label: 'Cours' },
        salle_id: { required: true, label: 'Salle' },
        professeur_id: { required: true, label: 'Professeur' },
        session_id: { required: true, label: 'Session' },
        jour_semaine: { required: true, min: 1, max: 5, label: 'Jour de la semaine' },
        heure_debut: { required: true, label: 'Heure de début' },
        heure_fin: { required: true, label: 'Heure de fin' }
    }
};

export default {
    passwordRules,
    validatePassword,
    validateEmail,
    validateCodeCours,
    validateMatricule,
    validateTime,
    validateDate,
    sanitizeString,
    validate,
    schemas
};
>>>>>>> d0bbf23 (Ajouter la configuration Sprint 1 : routes, vues, sécurité et middlewares)
