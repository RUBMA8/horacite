/**
 * Routes de gestion des professeurs
 */

import express from 'express';
import { isAuthenticated, isResponsableOrAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import Professeur from '../models/Professeur.js';
import Session from '../models/Session.js';

const router = express.Router();

/**
 * GET /professeurs - Liste des professeurs
 */
router.get('/', isAuthenticated, asyncHandler(async (req, res) => {
    const { page = 1, specialite, actif, search } = req.query;

    const result = await Professeur.findAll({
        page: parseInt(page),
        limit: 20,
        specialite,
        actif: actif !== undefined ? actif === 'true' : undefined,
        search
    });

    // Données pour les filtres (Monocampus)
    const specialites = await Professeur.getSpecialites();

    res.render('professeurs/list', {
        title: 'Gestion des professeurs',
        professeurs: result.professeurs,
        pagination: result.pagination,
        specialites,
        filters: { specialite, actif, search }
    });
}));

/**
 * GET /professeurs/create - Formulaire de création
 */
router.get('/create', isResponsableOrAdmin, asyncHandler(async (_req, res) => {
    const specialites = await Professeur.getSpecialites();

    res.render('professeurs/create', {
        title: 'Ajouter un professeur',
        specialites
    });
}));

/**
 * POST /professeurs/create - Créer un professeur
 */
router.post('/create', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const {
        matricule, nom, prenom, email, telephone,
        specialite, specialites_secondaires
    } = req.body;

    // Vérifications
    if (!specialite || !specialite.trim()) {
        req.session.error_msg = 'La spécialité principale est obligatoire';
        req.session.formData = req.body;
        return res.redirect('/professeurs/create');
    }

    if (await Professeur.matriculeExists(matricule)) {
        req.session.error_msg = 'Ce matricule existe déjà';
        req.session.formData = req.body;
        return res.redirect('/professeurs/create');
    }

    if (await Professeur.emailExists(email)) {
        req.session.error_msg = 'Cet email existe déjà';
        req.session.formData = req.body;
        return res.redirect('/professeurs/create');
    }

    await Professeur.create({
        matricule,
        nom,
        prenom,
        email,
        telephone,
        specialite,
        specialites_secondaires
    });


    req.session.success_msg = `Professeur "${prenom} ${nom}" créé avec succès`;
    res.redirect('/professeurs');
}));

/**
 * GET /professeurs/api/next-matricule - Prochain matricule disponible (API)
 */
router.get('/api/next-matricule', isResponsableOrAdmin, asyncHandler(async (_req, res) => {
    const last = await Professeur.findByMaxMatricule();
    res.json({ matricule: last });
}));

/**
 * GET /professeurs/api/disponibles - Trouver les professeurs disponibles (API)
 */
router.get('/api/disponibles', isAuthenticated, asyncHandler(async (req, res) => {
    const { session_id, jour, heure_debut, heure_fin, specialite } = req.query;

    const professeurs = await Professeur.findDisponibles(
        session_id,
        parseInt(jour),
        heure_debut,
        heure_fin,
        specialite
    );

    res.json(professeurs);
}));

/**
 * GET /professeurs/:id - Détail d'un professeur
 */
router.get('/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const professeur = await Professeur.findById(req.params.id);

    if (!professeur) {
        req.session.error_msg = 'Professeur non trouvé';
        return res.redirect('/professeurs');
    }

    // Récupérer la session active
    const sessionActive = await Session.findActive();

    // Récupérer les disponibilités et horaires
    const disponibilites = await Professeur.getDisponibilites(professeur.id);
    let horaires = [];
    if (sessionActive) {
        horaires = await Professeur.getHoraires(professeur.id, sessionActive.id);
    }

    res.render('professeurs/view', {
        title: `${professeur.prenom} ${professeur.nom}`,
        professeur,
        sessionActive,
        disponibilites,
        horaires
    });
}));

/**
 * GET /professeurs/:id/edit - Formulaire de modification
 */
router.get('/:id/edit', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const professeur = await Professeur.findById(req.params.id);

    if (!professeur) {
        req.session.error_msg = 'Professeur non trouvé';
        return res.redirect('/professeurs');
    }

    const specialites = await Professeur.getSpecialites();

    res.render('professeurs/edit', {
        title: `Modifier ${professeur.prenom} ${professeur.nom}`,
        professeur,
        specialites
    });
}));

/**
 * POST /professeurs/:id/edit - Modifier un professeur
 */
router.post('/:id/edit', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const profId = req.params.id;
    const {
        matricule, nom, prenom, email, telephone,
        specialite, specialites_secondaires, actif
    } = req.body;

    const professeur = await Professeur.findById(profId);
    if (!professeur) {
        req.session.error_msg = 'Professeur non trouvé';
        return res.redirect('/professeurs');
    }

    // Vérifications d'unicité
    if (matricule !== professeur.matricule && await Professeur.matriculeExists(matricule, profId)) {
        req.session.error_msg = 'Ce matricule existe déjà';
        return res.redirect(`/professeurs/${profId}/edit`);
    }

    if (email.toLowerCase() !== professeur.email && await Professeur.emailExists(email, profId)) {
        req.session.error_msg = 'Cet email existe déjà';
        return res.redirect(`/professeurs/${profId}/edit`);
    }

    await Professeur.update(profId, {
        matricule,
        nom,
        prenom,
        email,
        telephone,
        specialite,
        specialites_secondaires,
        actif: actif === 'on'
    });


    req.session.success_msg = `Professeur "${prenom} ${nom}" modifié avec succès`;
    res.redirect(`/professeurs/${profId}`);
}));

/**
 * GET /professeurs/:id/disponibilites - Gestion des disponibilités
 */
router.get('/:id/disponibilites', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const professeur = await Professeur.findById(req.params.id);

    if (!professeur) {
        req.session.error_msg = 'Professeur non trouvé';
        return res.redirect('/professeurs');
    }

    const disponibilites = await Professeur.getDisponibilites(professeur.id);
    const sessionsResult = await Session.findAll({ limit: 20 });

    // Générer les plages horaires (08:00 à 22:00)
    const heures = [];
    for (let h = 8; h <= 22; h++) {
        heures.push(`${h.toString().padStart(2, '0')}:00`);
    }

    // Jours de la semaine
    const jours = [
        { id: 1, nom: 'Lundi' },
        { id: 2, nom: 'Mardi' },
        { id: 3, nom: 'Mercredi' },
        { id: 4, nom: 'Jeudi' },
        { id: 5, nom: 'Vendredi' }
    ];

    // Créer une map des disponibilités existantes — étendre chaque plage en créneaux horaires
    const dispoMap = {};
    disponibilites.forEach(d => {
        const debut = parseInt(d.heure_debut.split(':')[0]);
        const fin = parseInt(d.heure_fin.split(':')[0]);
        for (let h = debut; h < fin; h++) {
            const key = `${d.jour_semaine}_${h.toString().padStart(2, '0')}:00`;
            dispoMap[key] = true;
        }
    });

    res.render('professeurs/disponibilites', {
        title: `Disponibilités - ${professeur.prenom} ${professeur.nom}`,
        professeur,
        disponibilites,
        dispoMap: JSON.stringify(dispoMap),
        sessions: sessionsResult.sessions,
        heures,
        jours
    });
}));

/**
 * POST /professeurs/:id/disponibilites - Sauvegarder les disponibilités
 */
router.post('/:id/disponibilites', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const profId = req.params.id;
    const { disponibilites, session_id } = req.body;

    const professeur = await Professeur.findById(profId);
    if (!professeur) {
        req.session.error_msg = 'Professeur non trouvé';
        return res.redirect('/professeurs');
    }

    // Parser les disponibilités
    let dispos = [];
    if (disponibilites) {
        try {
            dispos = JSON.parse(disponibilites);
        } catch (e) {
            req.session.error_msg = 'Format de disponibilités invalide';
            return res.redirect(`/professeurs/${profId}/disponibilites`);
        }
    }

    await Professeur.setDisponibilites(profId, dispos, session_id || null);

 

    req.session.success_msg = 'Disponibilités mises à jour avec succès';
    res.redirect(`/professeurs/${profId}`);
}));

/**
 * POST /professeurs/:id/toggle - Activer/Désactiver
 */
router.post('/:id/toggle', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const professeur = await Professeur.findById(req.params.id);

    if (!professeur) {
        req.session.error_msg = 'Professeur non trouvé';
        return res.redirect('/professeurs');
    }

    if (professeur.actif) {
        await Professeur.deactivate(professeur.id);
        req.session.success_msg = `${professeur.prenom} ${professeur.nom} désactivé`;
    } else {
        await Professeur.activate(professeur.id);
        req.session.success_msg = `${professeur.prenom} ${professeur.nom} activé`;
    }

  

    res.redirect('/professeurs');
}));

/**
 * POST /professeurs/:id/delete - Supprimer
 */
router.post('/:id/delete', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const professeur = await Professeur.findById(req.params.id);

    if (!professeur) {
        req.session.error_msg = 'Professeur non trouvé';
        return res.redirect('/professeurs');
    }

    try {
        await Professeur.delete(professeur.id);
       
        req.session.success_msg = `${professeur.prenom} ${professeur.nom} supprimé`;
    } catch (error) {
        req.session.error_msg = error.message;
    }

    res.redirect('/professeurs');
}));

export default router;
