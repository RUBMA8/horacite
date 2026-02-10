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

