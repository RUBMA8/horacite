/**
 * Routes de gestion des cours
 */

import express from 'express';
import { isAuthenticated, isResponsableOrAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import Cours from '../models/Cours.js';
import Session from '../models/Session.js';
import Salle from '../models/Salle.js';
import Pavillon from '../models/Pavillon.js';
import Professeur from '../models/Professeur.js';

const router = express.Router();

/**
 * GET /cours - Liste des cours
 */
router.get('/', isAuthenticated, asyncHandler(async (req, res) => {
    const { page = 1, programme, session, type, statut, etape, search } = req.query;

    const result = await Cours.findAll({
        page: parseInt(page),
        limit: 20,
        programmeId: programme,
        sessionId: session,
        typeSalle: type,
        statut: statut || undefined,
        etape,
        search
    });

    // Récupérer les données pour les filtres
    const programmes = await Pavillon.getProgrammes();
    const sessions = await Session.findAll({ limit: 100 });
    const types = Salle.getTypes();
    const etapes = await Cours.getEtapes();

    res.render('cours/list', {
        title: 'Gestion des cours',
        cours: result.cours,
        pagination: result.pagination,
        programmes,
        sessions: sessions.sessions,
        types,
        etapes,
        filters: { programme, session, type, statut, etape, search }
    });
}));

/**
 * GET /cours/create - Formulaire de création
 */
router.get('/create', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const programmes = await Pavillon.getProgrammes();
    const types = Salle.getTypes();
    const sessions = await Session.findAll({ limit: 100 });
    const specialites = await Professeur.getSpecialites();

    res.render('cours/create', {
        title: 'Créer un cours',
        programmes,
        types,
        sessions: sessions.sessions,
        specialites
    });
}));

/**
 * POST /cours/create - Créer un cours
 */
router.post('/create', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const {
        code, nom, programme_id, etape_etude, duree_hebdo,
        type_salle_requis, specialite_requise, description, credits, sessions
    } = req.body;

    const errors = [];

    // Validations
    if (await Cours.codeExists(code)) {
        errors.push('Ce code de cours existe déjà');
    }

    if (!programme_id) {
        errors.push('Veuillez sélectionner un programme');
    }

    if (errors.length > 0) {
        req.session.error_msg = errors.join('<br>');
        req.session.formData = req.body;
        return res.redirect('/cours/create');
    }

    // Créer le cours
    const cours = await Cours.create({
        code: code.toUpperCase(),
        nom,
        programme_id: parseInt(programme_id),
        etape_etude,
        duree_hebdo: parseInt(duree_hebdo),
        type_salle_requis,
        specialite_requise: specialite_requise || null,
        description,
        credits: credits ? parseInt(credits) : null
    });

    // Associer aux sessions sélectionnées
    if (sessions) {
        const sessionIds = Array.isArray(sessions) ? sessions : [sessions];
        for (const sessionId of sessionIds) {
            await Cours.associateToSession(cours.id, sessionId);
        }
    }

    req.session.success_msg = `Cours "${code}" créé avec succès`;
    res.redirect('/cours');
}));

/**
 * GET /cours/:id - Détail d'un cours
 */
router.get('/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const cours = await Cours.findById(req.params.id);

    if (!cours) {
        req.session.error_msg = 'Cours non trouvé';
        return res.redirect('/cours');
    }

    const sessions = await Cours.getSessions(cours.id);

    res.render('cours/view', {
        title: `Cours ${cours.code}`,
        cours,
        sessions
    });
}));

/**
 * GET /cours/:id/edit - Formulaire de modification
 */
router.get('/:id/edit', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const cours = await Cours.findById(req.params.id);

    if (!cours) {
        req.session.error_msg = 'Cours non trouvé';
        return res.redirect('/cours');
    }

    const programmes = await Pavillon.getProgrammes();
    const types = Salle.getTypes();
    const allSessions = await Session.findAll({ limit: 100 });
    const coursSessions = await Cours.getSessions(cours.id);
    const coursSessionIds = coursSessions.map(s => s.id);
    const specialites = await Professeur.getSpecialites();

    res.render('cours/edit', {
        title: `Modifier ${cours.code}`,
        cours,
        programmes,
        types,
        sessions: allSessions.sessions,
        coursSessionIds,
        specialites
    });
}));

/**
 * POST /cours/:id/edit - Modifier un cours
 */
router.post('/:id/edit', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const coursId = req.params.id;
    const {
        nom, programme_id, etape_etude, duree_hebdo,
        type_salle_requis, specialite_requise, description, credits, sessions
    } = req.body;

    const cours = await Cours.findById(coursId);
    if (!cours) {
        req.session.error_msg = 'Cours non trouvé';
        return res.redirect('/cours');
    }

    // Mettre à jour le cours
    await Cours.update(coursId, {
        nom,
        programme_id: programme_id ? parseInt(programme_id) : cours.programme_id,
        etape_etude,
        duree_hebdo: parseInt(duree_hebdo),
        type_salle_requis,
        specialite_requise: specialite_requise || null,
        description,
        credits: credits ? parseInt(credits) : null
    });

    // Mettre à jour les associations de sessions
    const currentSessions = await Cours.getSessions(coursId);
    const currentSessionIds = currentSessions.map(s => s.id);
    const newSessionIds = sessions ? (Array.isArray(sessions) ? sessions.map(Number) : [Number(sessions)]) : [];

    // Dissocier les sessions retirées
    for (const sessionId of currentSessionIds) {
        if (!newSessionIds.includes(sessionId)) {
            await Cours.dissociateFromSession(coursId, sessionId);
        }
    }

    // Associer les nouvelles sessions
    for (const sessionId of newSessionIds) {
        if (!currentSessionIds.includes(sessionId)) {
            await Cours.associateToSession(coursId, sessionId);
        }
    }

    // Logger l'action

    req.session.success_msg = `Cours "${cours.code}" modifié avec succès`;
    res.redirect(`/cours/${coursId}`);
}));

/**
 * POST /cours/:id/archive - Archiver un cours
 */
router.post('/:id/archive', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const cours = await Cours.findById(req.params.id);

    if (!cours) {
        req.session.error_msg = 'Cours non trouvé';
        return res.redirect('/cours');
    }

    await Cours.archive(cours.id);


    req.session.success_msg = `Cours "${cours.code}" archivé avec succès`;
    res.redirect('/cours');
}));

/**
 * POST /cours/:id/unarchive - Désarchiver un cours
 */
router.post('/:id/unarchive', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const cours = await Cours.findById(req.params.id);

    if (!cours) {
        req.session.error_msg = 'Cours non trouvé';
        return res.redirect('/cours');
    }

    await Cours.unarchive(cours.id);


    req.session.success_msg = `Cours "${cours.code}" réactivé avec succès`;
    res.redirect('/cours');
}));

/**
 * POST /cours/:id/delete - Supprimer un cours
 */
router.post('/:id/delete', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const cours = await Cours.findById(req.params.id);

    if (!cours) {
        req.session.error_msg = 'Cours non trouvé';
        return res.redirect('/cours');
    }

    try {
        await Cours.delete(cours.id);
        req.session.success_msg = `Cours "${cours.code}" supprimé avec succès`;
    } catch (error) {
        req.session.error_msg = error.message;
    }

    res.redirect('/cours');
}));

/**
 * GET /cours/api/next-code - Prochain code de cours disponible (API)
 * ?programme=INFO&etape=1ère année
 */
router.get('/api/next-code', isAuthenticated, asyncHandler(async (req, res) => {
    const { programme, etape } = req.query;
    if (!programme) return res.json({ code: '' });
    const code = await Cours.getNextCode(programme, etape);
    res.json({ code });
}));

/**
 * GET /cours/api/check-code - Vérifier si un code existe (API)
 */
router.get('/api/check-code', isAuthenticated, asyncHandler(async (req, res) => {
    const { code, excludeId } = req.query;
    const exists = await Cours.codeExists(code, excludeId);
    res.json({ exists });
}));

export default router;
