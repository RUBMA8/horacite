/**
 * Middleware d'authentification et d'autorisation
 */

/**
 * Vérifie si l'utilisateur est authentifié
 */
export function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }

    // Sauvegarder l'URL demandée pour redirection après login
    req.session.returnTo = req.originalUrl;

    req.session.error_msg = 'Veuillez vous connecter pour accéder à cette page';
    res.redirect('/auth/login');
}

/**
 * Vérifie si l'utilisateur n'est PAS authentifié (pour pages login)
 */
export function isNotAuthenticated(req, res, next) {
    if (!req.isAuthenticated()) {
        return next();
    }

    res.redirect('/dashboard');
}

/**
 * Vérifie si l'utilisateur a le rôle admin
 */
export function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }

    req.session.error_msg = 'Accès non autorisé. Cette section est réservée aux administrateurs.';
    res.redirect('/dashboard');
}

/**
 * Vérifie si l'utilisateur a le rôle responsable ou admin
 */
export function isResponsableOrAdmin(req, res, next) {
    if (req.isAuthenticated() && ['admin', 'responsable'].includes(req.user.role)) {
        return next();
    }

    req.session.error_msg = 'Accès non autorisé.';
    res.redirect('/dashboard');
}

/**
 * Vérifie si l'utilisateur a l'un des rôles spécifiés
 */
export function hasRole(...roles) {
    return (req, res, next) => {
        if (req.isAuthenticated() && roles.includes(req.user.role)) {
            return next();
        }

        req.session.error_msg = 'Accès non autorisé.';
        res.redirect('/dashboard');
    };
}

/**
 * Middleware pour les routes API - retourne JSON si non authentifié
 */
export function apiAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }

    res.status(401).json({ error: 'Non authentifié', message: 'Veuillez vous connecter' });
}

/**
 * Middleware pour les routes API admin
 */
export function apiAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }

    res.status(403).json({ error: 'Non autorisé', message: 'Accès réservé aux administrateurs' });
}

/**
 * Vérifie si l'utilisateur doit changer son mot de passe
 */
export function checkPasswordChange(req, res, next) {
    // Ignorer pour les routes de changement de mot de passe et déconnexion
    const exemptPaths = ['/auth/change-password', '/auth/logout'];

    if (req.isAuthenticated() && req.user.force_password_change && !exemptPaths.includes(req.path)) {
        req.session.error_msg = 'Vous devez changer votre mot de passe avant de continuer.';
        return res.redirect('/auth/change-password');
    }

    next();
}

export default {
    isAuthenticated,
    isNotAuthenticated,
    isAdmin,
    isResponsableOrAdmin,
    hasRole,
    apiAuth,
    apiAdmin,
    checkPasswordChange
};
