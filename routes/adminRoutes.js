/**
* Routes Administration 
*
* À placer dans: routes/adminRoutes.js
*
*/
 
import express from 'express';
import { requireAdmin } from '../middleware/validation.js';
import { isAuthenticated } from '../middleware/auth.js';
import User from '../models/User.js';
import Session from '../models/Session.js';
 
const router = express.Router();
 
// ============================================
// ROUTES ADMIN - PAGE PRINCIPALE (ISIDORE)
// ============================================
 
/**
* GET /admin
* Page d'accueil du panel admin
*
* TODO: Implémenter
* - Récupérer nombre d'utilisateurs
* - Récupérer nombre de sessions
* - Afficher vue admin/index
*/
router.get('/', isAuthenticated, requireAdmin, (req, res) => {
    // TODO: Implémenter
});
 
// ============================================
// CRUD UTILISATEURS - ISIDORE
// ============================================
 
/**
* GET /admin/users
* Lister tous les utilisateurs
*
* TODO: Implémenter
* - Récupérer tous les utilisateurs avec pagination
* - Afficher vue admin/users/list.hbs
*/
router.get('/users', isAuthenticated, requireAdmin, async (req, res) => {
    // TODO: Implémenter
});
 
/**
* GET /admin/users/create
* Afficher le formulaire de création
*
* TODO: Implémenter
* - Afficher vue admin/users/create.hbs
*/
router.get('/users/create', isAuthenticated, requireAdmin, (req, res) => {
    // TODO: res.render('admin/users/create');
});
 
/**
* POST /admin/users
* Créer un nouvel utilisateur
*
* TODO: Implémenter
* - Valider les données (email, password, etc.)
* - Créer l'utilisateur
* - Rediriger vers /admin/users avec message de succès
*/
router.post('/users', isAuthenticated, requireAdmin, async (req, res) => {
    // TODO: Implémenter
});
 
/**
* GET /admin/users/:id/edit
* Afficher le formulaire d'édition
*
* TODO: Implémenter
* - Récupérer l'utilisateur par ID
* - Afficher vue admin/users/edit.hbs avec l'utilisateur
*/
router.get('/users/:id/edit', isAuthenticated, requireAdmin, async (req, res) => {
    // TODO: Implémenter
});
 
/**
* POST /admin/users/:id
* Modifier un utilisateur
*
* TODO: Implémenter
* - Valider les données
* - Modifier l'utilisateur
* - Rediriger vers /admin/users avec message de succès
*/
router.post('/users/:id', isAuthenticated, requireAdmin, async (req, res) => {
    // TODO: Implémenter
});
 
/**
* POST /admin/users/:id/delete
* Supprimer un utilisateur
*
* TODO: Implémenter
* - Supprimer l'utilisateur
* - Rediriger vers /admin/users avec message de succès
*/
router.post('/users/:id/delete', isAuthenticated, requireAdmin, async (req, res) => {
    // TODO: Implémenter
});
 
 
export default router;

 
