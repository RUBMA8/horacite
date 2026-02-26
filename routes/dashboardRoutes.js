/**
 * Routes du tableau de bord
 */

import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import Session from '../models/Session.js';
import { getDatabase } from '../config/database.js';

const router = express.Router();

/**
 * GET /dashboard - Tableau de bord principal
 */
router.get('/', isAuthenticated, asyncHandler(async (req, res) => {
    const db = await getDatabase();

    // Récupérer la session active
    const sessionActive = await Session.findActive();

    // Statistiques générales
    const stats = {};

    // Nombre de cours
    const coursCount = await db.get('SELECT COUNT(*) as count FROM cours WHERE statut = ?', ['actif']);
    stats.cours = coursCount.count;

    // Nombre de professeurs actifs
    const profsCount = await db.get('SELECT COUNT(*) as count FROM professeurs WHERE actif = 1');
    stats.professeurs = profsCount.count;

    // Nombre de salles actives
    const sallesCount = await db.get('SELECT COUNT(*) as count FROM salles WHERE actif = 1');
    stats.salles = sallesCount.count;

    // Nombre d'horaires pour la session active
    if (sessionActive) {
        const horairesCount = await db.get(
            'SELECT COUNT(*) as count FROM horaires WHERE session_id = ?',
            [sessionActive.id]
        );
        stats.horaires = horairesCount.count;

        // Statistiques par jour de la semaine
        stats.parJour = await db.all(
            `SELECT jour_semaine, COUNT(*) as count
             FROM horaires WHERE session_id = ?
             GROUP BY jour_semaine ORDER BY jour_semaine`,
            [sessionActive.id]
        );
    } else {
        stats.horaires = 0;
        stats.parJour = [];
    }

    // Dernières activités (pour admin)
    let recentActivities = [];
    if (req.user.role === 'admin') {
        recentActivities = await db.all(
            `SELECT al.*, u.nom || ' ' || u.prenom as user_name
             FROM audit_logs al
             LEFT JOIN users u ON al.user_id = u.id
             ORDER BY al.timestamp DESC LIMIT 10`
        );
    }

    res.render('dashboard/index', {
        title: 'Tableau de bord',
        sessionActive,
        stats,
        recentActivities,
        isAdmin: req.user.role === 'admin'
    });
}));

/**
 * GET /dashboard/quick-stats - Statistiques rapides (API)
 */
router.get('/quick-stats', isAuthenticated, asyncHandler(async (req, res) => {
    const sessionActive = await Session.findActive();

    if (!sessionActive) {
        return res.json({ error: 'Aucune session active' });
    }

    const stats = await Horaire.getStatistiques(sessionActive.id);

    res.json(stats);
}));

export default router;
