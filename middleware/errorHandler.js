/**
 * Middleware de gestion des erreurs
 */


/**
 * Gestionnaire d'erreurs 404 - Page non trouvée
 */
export function notFoundHandler(req, res, next) {
    res.status(404).render('errors/404', {
        title: 'Page non trouvée',
        message: 'La page que vous recherchez n\'existe pas.',
        url: req.originalUrl
    });
}

/**
 * Gestionnaire d'erreurs global
 */
export function errorHandler(err, req, res, next) {
    // Log de l'erreur
    console.error('Erreur:', err);

    // Enregistrer dans les logs d'audit si c'est une erreur serveur
    if (err.status !== 404) {
       
    }

    // Déterminer le code de statut
    const statusCode = err.status || err.statusCode || 500;

    // Réponse API JSON
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(statusCode).json({
            error: true,
            message: process.env.NODE_ENV === 'production'
                ? 'Une erreur s\'est produite'
                : err.message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }

    // Réponse HTML
    const template = statusCode === 404 ? 'errors/404' : 'errors/500';

    res.status(statusCode).render(template, {
        title: statusCode === 404 ? 'Page non trouvée' : 'Erreur serveur',
        message: process.env.NODE_ENV === 'production'
            ? 'Une erreur s\'est produite. Veuillez réessayer plus tard.'
            : err.message,
        error: process.env.NODE_ENV === 'development' ? err : {},
        statusCode
    });
}

/**
 * Wrapper pour les fonctions async des routes
 * Attrape les erreurs et les passe au middleware d'erreur
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Créer une erreur HTTP personnalisée
 */
export function createError(message, statusCode = 500) {
    const error = new Error(message);
    error.status = statusCode;
    return error;
}

export default {
    notFoundHandler,
    errorHandler,
    asyncHandler,
    createError
};
