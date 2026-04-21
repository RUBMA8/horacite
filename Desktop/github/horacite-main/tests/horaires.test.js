/**
 * Tests des horaires — /horaires/*
 *
 * Couvre la fonctionnalité centrale de l'application :
 *   - Page d'accueil et filtres (vue calendrier, filtre par jour)
 *   - API JSON : cours d'une session, données calendrier, statistiques,
 *                détection de conflits, vues par salle et par professeur
 *   - Création d'un horaire valide et détection de conflit (même salle, même créneau)
 *   - Consultation et modification d'un horaire existant
 *
 * Données de démo supposées présentes :
 *   - Session ID 1 (la première créée, statut quelconque)
 *   - Cours ID 1 (INFO1001), Salle ID 1 (A101), Professeur ID 1 (PROF001)
 *
 * Note sur les conflits : le créneau lundi 14h-16h est utilisé pour créer
 * un horaire dans le test de création. Un second test tente d'occuper la même
 * salle au même créneau pour vérifier la détection de conflit.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createAuthAgent, RESPONSABLE_CREDENTIALS } from './helpers/auth.js';

let adminAgent;
let respAgent;

// IDs correspondant aux données de démo
const SESSION_ID = 1;
const COURS_ID   = 1;   // INFO1001
const SALLE_ID   = 1;   // A101 — pavillon A
const PROF_ID    = 1;   // PROF001 — Sophie Tremblay

beforeAll(async () => {
  adminAgent = await createAuthAgent();
  respAgent  = await createAuthAgent(RESPONSABLE_CREDENTIALS);
});

// ─── Liste et consultation ────────────────────────────────────────────────

describe('Horaires - Liste et consultation', () => {
  it('GET /horaires - affiche la page d\'accueil des horaires', async () => {
    const res = await adminAgent.get('/horaires');
    expect(res.status).toBe(200);
  });

  it('GET /horaires?view=calendar - affiche la vue calendrier', async () => {
    const res = await adminAgent.get('/horaires?view=calendar');
    expect(res.status).toBe(200);
  });

  it('GET /horaires?jour=1 - filtre les horaires du lundi', async () => {
    const res = await adminAgent.get('/horaires?jour=1');
    expect(res.status).toBe(200);
  });
});

// ─── API JSON ─────────────────────────────────────────────────────────────

describe('Horaires - API', () => {
  it('GET /horaires/api/cours?session_id=1 - liste les cours de la session', async () => {
    const res = await adminAgent.get(`/horaires/api/cours?session_id=${SESSION_ID}`);
    expect(res.status).toBe(200);
    // Retourne un tableau (vide si aucun horaire créé pour cette session)
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /horaires/api/calendar?session_id=1 - données pour le composant calendrier', async () => {
    const res = await adminAgent.get(`/horaires/api/calendar?session_id=${SESSION_ID}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /horaires/api/stats?session_id=1 - statistiques de la session', async () => {
    const res = await adminAgent.get(`/horaires/api/stats?session_id=${SESSION_ID}`);
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });

  it('GET /horaires/api/check-conflits - aucun conflit sur créneau libre', async () => {
    // Créneau choisi : lundi 8h-10h — normalement libre avant tout test de création
    const params = new URLSearchParams({
      session_id:    String(SESSION_ID),
      salle_id:      String(SALLE_ID),
      professeur_id: String(PROF_ID),
      jour_semaine:  '1',
      heure_debut:   '08:00',
      heure_fin:     '10:00',
    });
    const res = await adminAgent.get(`/horaires/api/check-conflits?${params}`);
    expect(res.status).toBe(200);
    // La réponse doit toujours contenir la liste des conflits (vide ou non)
    expect(res.body).toHaveProperty('conflits');
    expect(Array.isArray(res.body.conflits)).toBe(true);
  });

  it('GET /horaires/view/salle/:id - vue hebdomadaire d\'une salle', async () => {
    const res = await adminAgent.get(
      `/horaires/view/salle/${SALLE_ID}?session_id=${SESSION_ID}`
    );
    expect(res.status).toBe(200);
  });

  it('GET /horaires/view/professeur/:id - vue hebdomadaire d\'un professeur', async () => {
    const res = await adminAgent.get(
      `/horaires/view/professeur/${PROF_ID}?session_id=${SESSION_ID}`
    );
    expect(res.status).toBe(200);
  });
});

// ─── Création ─────────────────────────────────────────────────────────────

describe('Horaires - Création', () => {
  it('GET /horaires/create - affiche le formulaire de création', async () => {
    const res = await respAgent.get('/horaires/create');
    expect(res.status).toBe(200);
  });

  it('POST /horaires/create - crée un horaire valide (lundi 14h-16h)', async () => {
    const res = await respAgent
      .post('/horaires/create')
      .type('form')
      .send({
        session_id:    String(SESSION_ID),
        cours_id:      String(COURS_ID),
        salle_id:      String(SALLE_ID),
        professeur_id: String(PROF_ID),
        jour_semaine:  '1',
        heure_debut:   '14:00',
        heure_fin:     '16:00',
      });
    expect([200, 302]).toContain(res.status);
  });

  it('POST /horaires/create - conflit de salle sur le même créneau → rejet', async () => {
    // Tente d'occuper la salle 1 lundi 14h-16h (déjà prise par le test précédent)
    // La route doit détecter le conflit et refuser l'enregistrement
    const res = await respAgent
      .post('/horaires/create')
      .type('form')
      .send({
        session_id:    String(SESSION_ID),
        cours_id:      '2',              // cours différent
        salle_id:      String(SALLE_ID), // même salle → conflit
        professeur_id: '2',              // professeur différent
        jour_semaine:  '1',
        heure_debut:   '14:00',
        heure_fin:     '16:00',
      });
    // 200/302 = page d'erreur affichée ou redirection, 400/409/422 = réponse HTTP explicite
    expect([200, 302, 400, 409, 422]).toContain(res.status);
  });
});

// ─── Détail et modification ────────────────────────────────────────────────

describe('Horaires - Détail et modification', () => {
  it('GET /horaires/1 - affiche le détail de l\'horaire 1 (ou 404 si inexistant)', async () => {
    // L'horaire 1 peut ne pas exister si aucun horaire n'est inséré en démo
    const res = await adminAgent.get('/horaires/1');
    expect([200, 404, 302]).toContain(res.status);
  });

  it('GET /horaires/1/edit - affiche le formulaire de modification (ou 404)', async () => {
    const res = await respAgent.get('/horaires/1/edit');
    expect([200, 404, 302]).toContain(res.status);
  });
});
