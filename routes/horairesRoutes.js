/**
 * Routes de gestion des horaires
 */

import express from 'express';
import { isAuthenticated, isResponsableOrAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import Horaire from '../models/Horaire.js';
import Cours from '../models/Cours.js';
import Salle from '../models/Salle.js';
import Professeur from '../models/Professeur.js';
import Session from '../models/Session.js';
import Pavillon from '../models/Pavillon.js';

const router = express.Router();

/**
 * GET /horaires - Liste/Calendrier des horaires
 */
router.get('/', isAuthenticated, asyncHandler(async (req, res) => {
    const { session_id, professeur_id, salle_id, jour, view = 'calendar' } = req.query;

    try {
        // Récupérer la session spécifiée ou la session active
        let sessionActive;
        if (session_id) {
            sessionActive = await Session.findById(session_id);
        } else {
            sessionActive = await Session.findActive();
        }

        // Données pour les filtres
        const sessions = await Session.findAll({ limit: 50 });
        const pavillons = await Pavillon.getProgrammes();
        const professeurs = await Professeur.findAll({ actif: true, limit: 100 });
        const sallesResult = await Salle.findAll({ actif: true, limit: 200 });
        const plagesHoraires = Horaire.getPlagesHoraires();

        // Récupérer les horaires si une session est sélectionnée
        let horaires = [];
        let calendarData = [];
        let jours = [];
        if (sessionActive) {
            const result = await Horaire.findAll({
                sessionId: sessionActive.id,
                professeurId: professeur_id || undefined,
                salleId: salle_id || undefined,
                jourSemaine: jour || undefined,
                limit: 200
            });
            horaires = result.horaires || [];

            // Formater pour le calendrier
            calendarData = await Horaire.getCalendarData(sessionActive.id, {
                salleId: salle_id || undefined,
                professeurId: professeur_id || undefined
            });

            // Grouper les horaires par jour pour la vue grid
            const joursNoms = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
            const horairesParJour = {};
            for (let i = 1; i <= 5; i++) {
                horairesParJour[i] = [];
            }
            horaires.forEach(h => {
                if (horairesParJour[h.jour_semaine]) {
                    horairesParJour[h.jour_semaine].push(h);
                }
            });
            jours = [1, 2, 3, 4, 5].map(j => ({
                id: j,
                nom: joursNoms[j],
                horaires: horairesParJour[j].sort((a, b) => a.heure_debut.localeCompare(b.heure_debut))
            }));
        }

        res.render('horaires/index', {
            title: 'Planification des horaires',
            sessionActive,
            sessions: sessions.sessions || [],
            pavillons: pavillons || [],
            professeurs: professeurs.professeurs || [],
            salles: sallesResult.salles || [],
            plagesHoraires: plagesHoraires || [],
            horaires,
            jours,
            calendarData: JSON.stringify(calendarData || []),
            view,
            filters: { session_id: session_id || (sessionActive ? sessionActive.id : ''), professeur_id, salle_id, jour }
        });
    } catch (error) {
        console.error('Error in /horaires route:', error);
        throw error;
    }
}));

/**
 * GET /horaires/create - Formulaire de création
 */
router.get('/create', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const { session_id, cours_id, professeur_id, salle_id } = req.query;

    // Récupérer les données du formulaire en cas d'erreur de validation
    const formData = req.session.formData || {};
    delete req.session.formData;

    // Récupérer toutes les sessions actives ou en planification
    const sessionsResult = await Session.findAll({ limit: 50 });
    const sessions = sessionsResult.sessions.filter(s => s.statut !== 'terminee');

    // Récupérer la session sélectionnée ou active
    const effectiveSessionId = formData.session_id || session_id;
    let selectedSession;
    if (effectiveSessionId) {
        selectedSession = await Session.findById(effectiveSessionId);
    } else {
        selectedSession = await Session.findActive();
    }

    if (!selectedSession && sessions.length === 0) {
        req.session.error_msg = 'Aucune session disponible. Veuillez d\'abord créer une session.';
        return res.redirect('/horaires');
    }

    // Utiliser la première session si aucune n'est active
    if (!selectedSession && sessions.length > 0) {
        selectedSession = sessions[0];
    }

    // Récupérer les cours de la session sélectionnée
    const cours = selectedSession ? await Session.getCours(selectedSession.id) : [];

    // Récupérer les salles et professeurs
    const salles = await Salle.findAll({ actif: true, limit: 200 });
    const professeurs = await Professeur.findAll({ actif: true, limit: 100 });
    const plagesHoraires = Horaire.getPlagesHoraires();

    // Générer la liste des heures (de 08:00 à 22:00)
    const heures = [];
    for (let h = 8; h <= 22; h++) {
        heures.push(`${h.toString().padStart(2, '0')}:00`);
        if (h < 22) {
            heures.push(`${h.toString().padStart(2, '0')}:30`);
        }
    }

    res.render('horaires/create', {
        title: 'Planifier un horaire',
        sessions,
        cours,
        salles: salles.salles || [],
        professeurs: professeurs.professeurs || [],
        plagesHoraires,
        heures,
        preselected: {
            session_id: selectedSession?.id,
            cours_id: formData.cours_id || cours_id,
            professeur_id: formData.professeur_id || professeur_id,
            salle_id: formData.salle_id || salle_id,
            jour_semaine: formData.jour_semaine,
            heure_debut: formData.heure_debut,
            heure_fin: formData.heure_fin,
            notes: formData.notes
        }
    });
}));

/**
 * POST /horaires/create - Créer un horaire
 */
router.post('/create', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const {
        cours_id, salle_id, professeur_id, session_id,
        jour_semaine, heure_debut, heure_fin, notes
    } = req.body;

    try {
        const horaire = await Horaire.create({
            cours_id,
            salle_id,
            professeur_id,
            session_id,
            jour_semaine: parseInt(jour_semaine),
            heure_debut,
            heure_fin,
            notes
        }, req.user.id);

        req.session.success_msg = 'Horaire planifié avec succès';
        res.redirect('/horaires');

    } catch (error) {
        req.session.error_msg = error.message;
        req.session.formData = req.body;
        res.redirect(`/horaires/create?session_id=${session_id}`);
    }
}));

/**
 * GET /horaires/:id - Détail d'un horaire
 */
router.get('/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const horaire = await Horaire.findById(req.params.id);

    if (!horaire) {
        req.session.error_msg = 'Horaire non trouvé';
        return res.redirect('/horaires');
    }

    res.render('horaires/view', {
        title: `Horaire - ${horaire.cours_code}`,
        horaire
    });
}));

/**
 * GET /horaires/:id/edit - Formulaire de modification
 */
router.get('/:id/edit', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const horaire = await Horaire.findById(req.params.id);

    if (!horaire) {
        req.session.error_msg = 'Horaire non trouvé';
        return res.redirect('/horaires');
    }

    const session = await Session.findById(horaire.session_id);
    const cours = await Session.getCours(session.id);
    const salles = await Salle.findAll({ actif: true, limit: 100 });
    const professeurs = await Professeur.findAll({ actif: true, limit: 100 });
    const plagesHoraires = Horaire.getPlagesHoraires();

    const heures = [];
    for (let h = 8; h <= 22; h++) {
        heures.push(`${h.toString().padStart(2, '0')}:00`);
        if (h < 22) {
            heures.push(`${h.toString().padStart(2, '0')}:30`);
        }
    }

    res.render('horaires/edit', {
        title: `Modifier horaire - ${horaire.cours_code}`,
        horaire,
        session,
        cours,
        salles: salles.salles,
        professeurs: professeurs.professeurs,
        plagesHoraires,
        heures
    });
}));

/**
 * POST /horaires/:id/edit - Modifier un horaire
 */
router.post('/:id/edit', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    const horaireId = req.params.id;
    const {
        cours_id, salle_id, professeur_id,
        jour_semaine, heure_debut, heure_fin, notes
    } = req.body;

    try {
        await Horaire.update(horaireId, {
            cours_id,
            salle_id,
            professeur_id,
            jour_semaine: parseInt(jour_semaine),
            heure_debut,
            heure_fin,
            notes
        }, req.user.id);

        req.session.success_msg = 'Horaire modifié avec succès';
        res.redirect('/horaires');

    } catch (error) {
        req.session.error_msg = error.message;
        res.redirect(`/horaires/${horaireId}/edit`);
    }
}));

/**
 * POST /horaires/:id/delete - Supprimer un horaire
 */
router.post('/:id/delete', isResponsableOrAdmin, asyncHandler(async (req, res) => {
    try {
        await Horaire.delete(req.params.id, req.user.id);
        req.session.success_msg = 'Horaire supprimé avec succès';
    } catch (error) {
        req.session.error_msg = error.message;
    }

    res.redirect('/horaires');
}));

/**
 * GET /horaires/api/cours - Cours d'une session (API)
 */
router.get('/api/cours', isAuthenticated, asyncHandler(async (req, res) => {
    const { session_id } = req.query;
    if (!session_id) return res.json([]);
    const cours = await Session.getCours(session_id);
    res.json(cours);
}));

/**
 * GET /horaires/api/check-conflits - Vérifier les conflits (API)
 */
router.get('/api/check-conflits', isAuthenticated, asyncHandler(async (req, res) => {
    const { salle_id, professeur_id, session_id, cours_id, jour, heure_debut, heure_fin, exclude_id } = req.query;

    const conflits = await Horaire.checkConflits({
        salle_id,
        professeur_id,
        session_id,
        cours_id,
        jour_semaine: parseInt(jour),
        heure_debut,
        heure_fin
    }, exclude_id);

    res.json({
        hasConflits: conflits.length > 0,
        conflits
    });
}));

/**
 * GET /horaires/api/calendar - Données du calendrier (API)
 */
router.get('/api/calendar', isAuthenticated, asyncHandler(async (req, res) => {
    const { session_id, salle_id, professeur_id, cours_id } = req.query;

    if (!session_id) {
        return res.json([]);
    }

    const data = await Horaire.getCalendarData(session_id, {
        salleId: salle_id,
        professeurId: professeur_id,
        coursId: cours_id
    });

    res.json(data);
}));

/**
 * GET /horaires/api/stats - Statistiques (API)
 */
router.get('/api/stats', isAuthenticated, asyncHandler(async (req, res) => {
    const { session_id } = req.query;

    if (!session_id) {
        return res.json({ error: 'Session requise' });
    }

    const stats = await Horaire.getStatistiques(session_id);
    res.json(stats);
}));

/**
 * GET /horaires/view/salle/:id - Vue par salle
 */
router.get('/view/salle/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const salle = await Salle.findById(req.params.id);
    if (!salle) {
        req.session.error_msg = 'Salle non trouvée';
        return res.redirect('/horaires');
    }

    const sessionActive = await Session.findActive();
    let horaires = [];
    if (sessionActive) {
        horaires = await Salle.getHoraires(salle.id, sessionActive.id);
    }

    res.render('horaires/view-salle', {
        title: `Horaires - Salle ${salle.code}`,
        salle,
        sessionActive,
        horaires
    });
}));

/**
 * GET /horaires/view/professeur/:id - Vue par professeur
 */
router.get('/view/professeur/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const professeur = await Professeur.findById(req.params.id);
    if (!professeur) {
        req.session.error_msg = 'Professeur non trouvé';
        return res.redirect('/horaires');
    }

    const sessionActive = await Session.findActive();
    let horaires = [];
    if (sessionActive) {
        horaires = await Professeur.getHoraires(professeur.id, sessionActive.id);
    }

    res.render('horaires/view-professeur', {
        title: `Horaires - ${professeur.prenom} ${professeur.nom}`,
        professeur,
        sessionActive,
        horaires
    });
}));

export default router;
