/**
 * Routes d'authentification
 */

import express from 'express';
import passport from 'passport';
import { isAuthenticated, isNotAuthenticated } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validatePassword } from '../middleware/validation.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

/**
 * GET /auth/login - Page de connexion
 */
router.get('/login', isNotAuthenticated, (req, res) => {
    res.render('auth/login', {
        title: 'Connexion',
        layout: 'auth'
    });
});

/**
 * POST /auth/login - Traitement de la connexion
 */
router.post('/login', isNotAuthenticated, (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }

        if (!user) {
            req.session.error_msg = info?.message || 'Identifiants incorrects';
            return res.redirect('/auth/login');
        }

        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }

            // Régénérer la session pour la sécurité
            const returnTo = req.session.returnTo;
            delete req.session.returnTo;

            req.session.success_msg = `Bienvenue, ${user.prenom} ${user.nom}!`;

            // Rediriger vers la page demandée ou le dashboard
            res.redirect(returnTo || '/dashboard');
        });
    })(req, res, next);
});

/**
 * GET /auth/logout - Déconnexion
 */
router.get('/logout', isAuthenticated, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const ip = req.ip;

    // Logger la déconnexion
    await AuditLog.logLogout(userId, ip);

    req.logout((err) => {
        if (err) {
            console.error('Erreur lors de la déconnexion:', err);
        }

        req.session.destroy((err) => {
            if (err) {
                console.error('Erreur lors de la destruction de la session:', err);
            }
            res.redirect('/auth/login');
        });
    });
}));

/**
 * GET /auth/change-password - Page de changement de mot de passe
 */
router.get('/change-password', isAuthenticated, (req, res) => {
    res.render('auth/change-password', {
        title: 'Changer le mot de passe',
        forceChange: req.user.force_password_change
    });
});

/**
 * POST /auth/change-password - Traitement du changement de mot de passe
 */
router.post('/change-password', isAuthenticated, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const errors = [];

    // Vérifier le mot de passe actuel
    const isValid = await User.verifyPassword(req.user.id, currentPassword);
    if (!isValid) {
        errors.push('Le mot de passe actuel est incorrect');
    }

    // Vérifier que les nouveaux mots de passe correspondent
    if (newPassword !== confirmPassword) {
        errors.push('Les nouveaux mots de passe ne correspondent pas');
    }

    // Valider le nouveau mot de passe
    const pwdValidation = validatePassword(newPassword);
    if (!pwdValidation.valid) {
        errors.push(...pwdValidation.errors);
    }

    // Vérifier que le nouveau mot de passe est différent de l'ancien
    if (currentPassword === newPassword) {
        errors.push('Le nouveau mot de passe doit être différent de l\'ancien');
    }

    if (errors.length > 0) {
        req.session.error_msg = errors.join('<br>');
        return res.redirect('/auth/change-password');
    }

    // Mettre à jour le mot de passe
    await User.updatePassword(req.user.id, newPassword);

    // Logger l'action
    await AuditLog.logCRUD(req.user.id, 'PASSWORD_CHANGE', 'users', req.user.id, {}, req.ip);

    req.session.success_msg = 'Mot de passe modifié avec succès';
    res.redirect('/dashboard');
}));

/**
 * GET /auth/profile - Page de profil utilisateur
 */
router.get('/profile', isAuthenticated, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    res.render('auth/profile', {
        title: 'Mon profil',
        profileUser: user
    });
}));

/**
 * POST /auth/profile - Mise à jour du profil
 */
router.post('/profile', isAuthenticated, asyncHandler(async (req, res) => {
    const { nom, prenom } = req.body;
    const errors = [];

    if (!nom || nom.length < 2) {
        errors.push('Le nom doit contenir au moins 2 caractères');
    }

    if (!prenom || prenom.length < 2) {
        errors.push('Le prénom doit contenir au moins 2 caractères');
    }

    if (errors.length > 0) {
        req.session.error_msg = errors.join('<br>');
        return res.redirect('/auth/profile');
    }

    await User.update(req.user.id, { nom, prenom });

    req.session.success_msg = 'Profil mis à jour avec succès';
    res.redirect('/auth/profile');
}));

export default router;
