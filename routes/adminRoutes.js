/**
 * Routes d'administration
 */

import express from 'express';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validatePassword } from '../middleware/validation.js';
import User from '../models/User.js';
import Session from '../models/Session.js';
import Pavillon from '../models/Pavillon.js';

const router = express.Router();

// Toutes les routes admin requièrent le rôle admin
router.use(isAdmin);

/**
 * GET /admin - Panneau d'administration
 */
router.get('/', asyncHandler(async (req, res) => {
    const usersResult = await User.findAll({ limit: 5 });
    const sessions = await Session.findAll({ limit: 5 });

    res.render('admin/index', {
        title: 'Administration',
        recentUsers: usersResult.users,
        recentSessions: sessions.sessions,
       
    });
}));

// ============================================
// GESTION DES UTILISATEURS
// ============================================

/**
 * GET /admin/users - Liste des utilisateurs
 */
router.get('/users', asyncHandler(async (req, res) => {
    const { page = 1, role, actif, search } = req.query;

    const result = await User.findAll({
        page: parseInt(page),
        limit: 20,
        role,
        actif: actif !== undefined ? actif === 'true' : undefined,
        search
    });

    res.render('admin/users/list', {
        title: 'Gestion des utilisateurs',
        users: result.users,
        pagination: result.pagination,
        filters: { role, actif, search }
    });
}));

/**
 * GET /admin/users/api/next-matricule - Prochain matricule disponible (API)
 */
router.get('/users/api/next-matricule', asyncHandler(async (req, res) => {
    const { role = 'responsable' } = req.query;
    const matricule = await User.getNextMatricule(role);
    res.json({ matricule });
}));

/**
 * GET /admin/users/create - Formulaire de création
 */
router.get('/users/create', (req, res) => {
    res.render('admin/users/create', {
        title: 'Créer un utilisateur'
    });
});

/**
 * POST /admin/users/create - Créer un utilisateur
 */
router.post('/users/create', asyncHandler(async (req, res) => {
    const { matricule, email, nom, prenom, password, confirmPassword, role, forcePasswordChange } = req.body;
    const errors = [];

    // Validations
    if (!matricule || matricule.length < 3) {
        errors.push('Le matricule doit contenir au moins 3 caractères');
    }

    if (await User.matriculeExists(matricule)) {
        errors.push('Ce matricule existe déjà');
    }

    if (await User.emailExists(email)) {
        errors.push('Cet email existe déjà');
    }

    if (password !== confirmPassword) {
        errors.push('Les mots de passe ne correspondent pas');
    }

    const pwdValidation = validatePassword(password);
    if (!pwdValidation.valid) {
        errors.push(...pwdValidation.errors);
    }

    if (errors.length > 0) {
        req.session.error_msg = errors.join('<br>');
        req.session.formData = req.body;
        return res.redirect('/admin/users/create');
    }

    const user = await User.create({
        matricule,
        email,
        nom,
        prenom,
        password,
        role,
        forcePasswordChange: forcePasswordChange === 'on'
    }, req.user.id);


    req.session.success_msg = `Utilisateur "${email}" créé avec succès`;
    res.redirect('/admin/users');
}));

/**
 * GET /admin/users/:id/edit - Formulaire de modification
 */
router.get('/users/:id/edit', asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        req.session.error_msg = 'Utilisateur non trouvé';
        return res.redirect('/admin/users');
    }

    res.render('admin/users/edit', {
        title: `Modifier ${user.email}`,
        editUser: user
    });
}));

/**
 * POST /admin/users/:id/edit - Modifier un utilisateur
 */
router.post('/users/:id/edit', asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const { matricule, email, nom, prenom, role, actif, forcePasswordChange } = req.body;

    const user = await User.findById(userId);
    if (!user) {
        req.session.error_msg = 'Utilisateur non trouvé';
        return res.redirect('/admin/users');
    }

    // Empêcher la modification de son propre rôle
    if (userId == req.user.id && role !== req.user.role) {
        req.session.error_msg = 'Vous ne pouvez pas modifier votre propre rôle';
        return res.redirect(`/admin/users/${userId}/edit`);
    }

    // Vérifications d'unicité
    if (matricule !== user.matricule && await User.matriculeExists(matricule, userId)) {
        req.session.error_msg = 'Ce matricule existe déjà';
        return res.redirect(`/admin/users/${userId}/edit`);
    }

    if (email.toLowerCase() !== user.email && await User.emailExists(email, userId)) {
        req.session.error_msg = 'Cet email existe déjà';
        return res.redirect(`/admin/users/${userId}/edit`);
    }

    await User.update(userId, {
        matricule,
        email,
        nom,
        prenom,
        role,
        actif: actif === 'on',
        forcePasswordChange: forcePasswordChange === 'on'
    });

   
    req.session.success_msg = `Utilisateur "${email}" modifié avec succès`;
    res.redirect('/admin/users');
}));

/**
 * POST /admin/users/:id/reset-password - Réinitialiser le mot de passe
 */
router.post('/users/:id/reset-password', asyncHandler(async (req, res) => {
    const { newPassword, confirmPassword } = req.body;
    const userId = req.params.id;

    if (newPassword !== confirmPassword) {
        req.session.error_msg = 'Les mots de passe ne correspondent pas';
        return res.redirect(`/admin/users/${userId}/edit`);
    }

    const pwdValidation = validatePassword(newPassword);
    if (!pwdValidation.valid) {
        req.session.error_msg = pwdValidation.errors.join('<br>');
        return res.redirect(`/admin/users/${userId}/edit`);
    }

    await User.updatePassword(userId, newPassword);
    await User.update(userId, { forcePasswordChange: true });


    req.session.success_msg = 'Mot de passe réinitialisé. L\'utilisateur devra le changer à sa prochaine connexion.';
    res.redirect('/admin/users');
}));

/**
 * POST /admin/users/:id/toggle - Activer/Désactiver
 */
router.post('/users/:id/toggle', asyncHandler(async (req, res) => {
    const userId = req.params.id;

    // Empêcher la désactivation de son propre compte
    if (userId == req.user.id) {
        req.session.error_msg = 'Vous ne pouvez pas désactiver votre propre compte';
        return res.redirect('/admin/users');
    }

    const user = await User.findById(userId);
    if (!user) {
        req.session.error_msg = 'Utilisateur non trouvé';
        return res.redirect('/admin/users');
    }

    if (user.actif) {
        await User.deactivate(userId);
        req.session.success_msg = `Utilisateur "${user.email}" désactivé`;
    } else {
        await User.activate(userId);
        req.session.success_msg = `Utilisateur "${user.email}" activé`;
    }

  
    res.redirect('/admin/users');
}));

// ============================================
// GESTION DES SESSIONS
// ============================================

/**
 * GET /admin/sessions - Liste des sessions
 */
router.get('/sessions', asyncHandler(async (req, res) => {
    const { page = 1 } = req.query;

    const result = await Session.findAll({
        page: parseInt(page),
        limit: 20
    });

    res.render('admin/sessions/list', {
        title: 'Gestion des sessions',
        sessions: result.sessions,
        pagination: result.pagination,
        types: Session.getTypes(),
        statuts: Session.getStatuts()
    });
}));

/**
 * GET /admin/sessions/create - Formulaire de création
 */
router.get('/sessions/create', (req, res) => {
    res.render('admin/sessions/create', {
        title: 'Créer une session',
        types: Session.getTypes()
    });
});

/**
 * POST /admin/sessions/create - Créer une session
 */
router.post('/sessions/create', asyncHandler(async (req, res) => {
    const { type, annee, date_debut, date_fin } = req.body;

    // Vérifier si la session existe déjà
    if (await Session.exists(type, annee)) {
        req.session.error_msg = 'Cette session existe déjà';
        req.session.formData = req.body;
        return res.redirect('/admin/sessions/create');
    }

    const typeLabel = Session.getTypes().find(t => t.value === type)?.label || type;
    const nom = `${typeLabel} ${annee}`;

    const session = await Session.create({
        nom,
        type,
        annee: parseInt(annee),
        date_debut,
        date_fin
    });

  
    req.session.success_msg = `Session "${nom}" créée avec succès`;
    res.redirect('/admin/sessions');
}));

/**
 * GET /admin/sessions/:id/edit - Formulaire de modification
 */
router.get('/sessions/:id/edit', asyncHandler(async (req, res) => {
    const session = await Session.findById(req.params.id);

    if (!session) {
        req.session.error_msg = 'Session non trouvée';
        return res.redirect('/admin/sessions');
    }

    res.render('admin/sessions/edit', {
        title: `Modifier ${session.nom}`,
        editSession: session,
        types: Session.getTypes(),
        statuts: Session.getStatuts()
    });
}));

/**
 * POST /admin/sessions/:id/edit - Modifier une session
 */
router.post('/sessions/:id/edit', asyncHandler(async (req, res) => {
    const sessionId = req.params.id;
    const { type, annee, date_debut, date_fin, statut } = req.body;

    const session = await Session.findById(sessionId);
    if (!session) {
        req.session.error_msg = 'Session non trouvée';
        return res.redirect('/admin/sessions');
    }

    // Vérifier si une autre session avec le même type/année existe
    if (await Session.exists(type, annee, sessionId)) {
        req.session.error_msg = 'Une autre session avec ce type et cette année existe déjà';
        return res.redirect(`/admin/sessions/${sessionId}/edit`);
    }

    const typeLabel = Session.getTypes().find(t => t.value === type)?.label || type;
    const nom = `${typeLabel} ${annee}`;

    await Session.update(sessionId, {
        nom,
        type,
        annee: parseInt(annee),
        date_debut,
        date_fin,
        statut
    });

   
    req.session.success_msg = `Session "${nom}" modifiée avec succès`;
    res.redirect('/admin/sessions');
}));

/**
 * POST /admin/sessions/:id/delete - Supprimer une session
 */
router.post('/sessions/:id/delete', asyncHandler(async (req, res) => {
    const sessionId = req.params.id;

    try {
        const session = await Session.findById(sessionId);
        if (!session) {
            req.session.error_msg = 'Session non trouvée';
            return res.redirect('/admin/sessions');
        }

        await Session.delete(sessionId);

       
        req.session.success_msg = `Session "${session.nom}" supprimée avec succès`;
    } catch (error) {
        req.session.error_msg = error.message;
    }

    res.redirect('/admin/sessions');
}));

/**
 * POST /admin/sessions/:id/set-active - Définir comme active
 */
router.post('/sessions/:id/set-active', asyncHandler(async (req, res) => {
    const session = await Session.setActive(req.params.id);

   
    req.session.success_msg = `Session "${session.nom}" définie comme active`;
    res.redirect('/admin/sessions');
}));

/**
 * POST /admin/sessions/:id/terminate - Terminer une session
 */
router.post('/sessions/:id/terminate', asyncHandler(async (req, res) => {
    const session = await Session.terminate(req.params.id);


    req.session.success_msg = `Session "${session.nom}" terminée`;
    res.redirect('/admin/sessions');
}));

// ============================================
// GESTION DES PROGRAMMES
// ============================================

/**
 * GET /admin/programmes - Liste des programmes
 */
router.get('/programmes', asyncHandler(async (req, res) => {
    const programmes = await Pavillon.getProgrammes(false);

    res.render('admin/programmes/list', {
        title: 'Gestion des programmes',
        programmes
    });
}));

/**
 * POST /admin/programmes/create - Créer un programme
 */
router.post('/programmes/create', asyncHandler(async (req, res) => {
    const { code, nom, description } = req.body;
    const errors = [];

    // Validations
    if (!code || code.trim().length < 2) {
        errors.push('Le code doit contenir au moins 2 caractères');
    }

    if (!nom || nom.trim().length < 3) {
        errors.push('Le nom doit contenir au moins 3 caractères');
    }

    if (await Pavillon.programmeCodeExists(code)) {
        errors.push('Ce code de programme existe déjà');
    }

    if (errors.length > 0) {
        req.session.error_msg = errors.join('<br>');
        return res.redirect('/admin/programmes');
    }

    await Pavillon.createProgramme({
        code: code.toUpperCase().trim(),
        nom: nom.trim(),
        description: description?.trim() || null,
        actif: true
    });

    req.session.success_msg = `Programme "${nom}" créé avec succès`;
    res.redirect('/admin/programmes');
}));

/**
 * POST /admin/programmes/:id/edit - Modifier un programme
 */
router.post('/programmes/:id/edit', asyncHandler(async (req, res) => {
    const programmeId = req.params.id;
    const { code, nom, description, actif } = req.body;
    const errors = [];

    const programme = await Pavillon.findProgrammeById(programmeId);
    if (!programme) {
        req.session.error_msg = 'Programme non trouvé';
        return res.redirect('/admin/programmes');
    }

    // Validations
    if (!code || code.trim().length < 2) {
        errors.push('Le code doit contenir au moins 2 caractères');
    }

    if (!nom || nom.trim().length < 3) {
        errors.push('Le nom doit contenir au moins 3 caractères');
    }

    if (code.toUpperCase() !== programme.code && await Pavillon.programmeCodeExists(code, programmeId)) {
        errors.push('Ce code de programme existe déjà');
    }

    if (errors.length > 0) {
        req.session.error_msg = errors.join('<br>');
        return res.redirect('/admin/programmes');
    }

    await Pavillon.updateProgramme(programmeId, {
        code: code.toUpperCase().trim(),
        nom: nom.trim(),
        description: description?.trim() || null,
        actif: actif === 'on'
    });

    req.session.success_msg = `Programme "${nom}" modifié avec succès`;
    res.redirect('/admin/programmes');
}));

export default router;
