/**
 * Routes de gestion des salles
 */

import express from 'express';
import { isAuthenticated, isResponsableOrAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import Salle from '../models/Salle.js';
import Session from '../models/Session.js';
import Pavillon from '../models/Pavillon.js';

const router = express.Router();

/**
 * GET /salles - Liste des salles
 */
router.get('/', isAuthenticated, asyncHandler(async (req, res) => {
    const { page = 1, type, capacite, actif, search } = req.query;

    const result = await Salle.findAll({
        page: parseInt(page),
        limit: 20,
      
        type,
        capaciteMin: capacite ? parseInt(capacite) : null,
        actif: actif !== undefined ? actif === 'true' : undefined,
        search
    });

    // Données pour les filtres (Monocampus)
   
    const types = Salle.getTypes();

    res.render('salles/list', {
        title: 'Gestion des salles',
        salles: result.salles,
        pagination: result.pagination,
        
        types,
        filters: { type, capacite, actif, search }
    });
}));

/**
 * GET /salles/create - Formulaire de création
 */
router.get('/create', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const types = Salle.getTypes();

    res.render('salles/create', {
        title: 'Ajouter une salle',
      
        types
    });
}));

/**
 * POST /salles/create - Créer une salle
 */
router.post('/create', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const { pavillon_id, code, niveau, type, capacite, equipements, accessible_pmr } = req.body;

    if (!pavillon_id) {
        req.session.error_msg = 'Veuillez sélectionner un pavillon';
        req.session.formData = req.body;
        return res.redirect('/salles/create');
    }

    // Vérifier si le code existe déjà dans ce pavillon
    const existing = await Salle.findByCode(code, pavillon_id);
    if (existing) {
        req.session.error_msg = 'Ce code de salle existe déjà dans ce pavillon';
        req.session.formData = req.body;
        return res.redirect('/salles/create');
    }

    const salle = await Salle.create({
        pavillon_id: parseInt(pavillon_id),
        code: code.toUpperCase(),
        niveau,
        type,
        capacite: capacite ? parseInt(capacite) : null,
        equipements,
        accessible_pmr: accessible_pmr === '1' || accessible_pmr === 'on'
    });


    req.session.success_msg = `Salle "${salle.code}" créée avec succès`;
    res.redirect('/salles');
}));

/**
 * GET /salles/:id - Détail d'une salle
 */
router.get('/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const salle = await Salle.findById(req.params.id);

    if (!salle) {
        req.session.error_msg = 'Salle non trouvée';
        return res.redirect('/salles');
    }

    // Récupérer la session active
    const sessionActive = await Session.findActive();

    // Récupérer les horaires de la salle pour la session active
    let horaires = [];
    if (sessionActive) {
        horaires = await Salle.getHoraires(salle.id, sessionActive.id);
    }

    res.render('salles/view', {
        title: `Salle ${salle.code}`,
        salle,
        sessionActive,
        horaires
    });
}));

/**
 * GET /salles/:id/edit - Formulaire de modification
 */
router.get('/:id/edit', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const salle = await Salle.findById(req.params.id);

    if (!salle) {
        req.session.error_msg = 'Salle non trouvée';
        return res.redirect('/salles');
    }

  
    const types = Salle.getTypes();

    res.render('salles/edit', {
        title: `Modifier ${salle.code}`,
        salle,
        
        types
    });
}));

/**
 * POST /salles/:id/edit - Modifier une salle
 */
router.post('/:id/edit', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const salleId = req.params.id;
    const { pavillon_id, code, niveau, type, capacite, equipements, accessible_pmr, actif } = req.body;

    const salle = await Salle.findById(salleId);
    if (!salle) {
        req.session.error_msg = 'Salle non trouvée';
        return res.redirect('/salles');
    }

    await Salle.update(salleId, {
        ...(pavillon_id && { pavillon_id: parseInt(pavillon_id) }),
        ...(code && { code: code.toUpperCase() }),
        niveau,
        type,
        capacite: capacite ? parseInt(capacite) : null,
        equipements,
        accessible_pmr: accessible_pmr === '1' || accessible_pmr === 'on',
        actif: actif === '1' || actif === 'on'
    });


    req.session.success_msg = `Salle modifiée avec succès`;
    res.redirect(`/salles/${salleId}`);
}));

/**
 * POST /salles/:id/toggle - Activer/Désactiver une salle
 */
router.post('/:id/toggle', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const salle = await Salle.findById(req.params.id);

    if (!salle) {
        req.session.error_msg = 'Salle non trouvée';
        return res.redirect('/salles');
    }

    if (salle.actif) {
        await Salle.deactivate(salle.id);
        req.session.success_msg = `Salle "${salle.code}" désactivée`;
    } else {
        await Salle.activate(salle.id);
        req.session.success_msg = `Salle "${salle.code}" activée`;
    }


    res.redirect('/salles');
}));

/**
 * POST /salles/:id/delete - Supprimer une salle
 */
router.post('/:id/delete', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const salle = await Salle.findById(req.params.id);

    if (!salle) {
        req.session.error_msg = 'Salle non trouvée';
        return res.redirect('/salles');
    }

    try {
        await Salle.delete(salle.id);
        req.session.success_msg = `Salle "${salle.code}" supprimée`;
    } catch (error) {
        req.session.error_msg = error.message;
    }

    res.redirect('/salles');
}));

/**
 * GET /salles/:id/disponibilite - Vérifier la disponibilité (API)
 */
router.get('/:id/disponibilite', isAuthenticated, asyncHandler(async (req, res) => {
    const { session_id, jour, heure_debut, heure_fin } = req.query;

    const result = await Salle.checkDisponibilite(
        req.params.id,
        session_id,
        jour,
        heure_debut,
        heure_fin
    );

    res.json(result);
}));

/**
 * GET /salles/api/disponibles - Trouver les salles disponibles (API)
 */
router.get('/api/disponibles', isAuthenticated, asyncHandler(async (req, res) => {
    const { session_id, jour, heure_debut, heure_fin, type, capacite } = req.query;

    const salles = await Salle.findDisponibles(
        session_id,
        parseInt(jour),
        heure_debut,
        heure_fin,
        type,
        capacite ? parseInt(capacite) : null
    );

    res.json(salles);
}));

/**
 * GET /salles/api/pavillons - Obtenir les pavillons (Monocampus - API)
 */
router.get('/api/pavillons', isAuthenticated, asyncHandler(async (req, res) => {
    const pavillons = await Pavillon.findAll();
    res.json(pavillons);
}));

export default router;
