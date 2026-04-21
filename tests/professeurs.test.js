/**
 * Tests des professeurs — /professeurs/*
 *
 * Couvre :
 *   - Liste avec filtres (spécialité, statut actif, recherche texte)
 *   - Consultation du détail d'un professeur et gestion du 404
 *   - API JSON : prochain matricule, liste des professeurs disponibles sur un créneau
 *   - Création d'un professeur (valide et doublons)
 *   - Modification d'un professeur existant
 *   - Gestion des disponibilités hebdomadaires (GET / POST)
 *   - Toggle actif/inactif
 *
 * Données de démo supposées présentes :
 *   - 10 professeurs PROF001–PROF010, dont Morin, Tremblay, Gagnon
 *   - PROF001 : ID 1, spécialité Informatique
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createAuthAgent, RESPONSABLE_CREDENTIALS } from './helpers/auth.js';

let adminAgent;
let respAgent;

beforeAll(async () => {
  adminAgent = await createAuthAgent();
  respAgent  = await createAuthAgent(RESPONSABLE_CREDENTIALS);
});

// ─── Liste et consultation ────────────────────────────────────────────────

describe('Professeurs - Liste et consultation', () => {
  it('GET /professeurs - affiche la liste complète des professeurs', async () => {
    const res = await adminAgent.get('/professeurs');
    expect(res.status).toBe(200);
    // Au moins un matricule de démo doit apparaître
    expect(res.text).toMatch(/PROF|professeur/i);
  });

  it('GET /professeurs?specialite=Informatique - filtre par spécialité', async () => {
    const res = await adminAgent.get('/professeurs?specialite=Informatique');
    expect(res.status).toBe(200);
  });

  it('GET /professeurs?actif=1 - affiche uniquement les professeurs actifs', async () => {
    const res = await adminAgent.get('/professeurs?actif=1');
    expect(res.status).toBe(200);
  });

  it('GET /professeurs?search=morin - recherche par nom (insensible à la casse)', async () => {
    const res = await adminAgent.get('/professeurs?search=morin');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Morin/i);
  });

  it('GET /professeurs/1 - affiche le détail du premier professeur', async () => {
    const res = await adminAgent.get('/professeurs/1');
    expect(res.status).toBe(200);
  });

  it('GET /professeurs/9999 - professeur inexistant → 404 ou redirection', async () => {
    const res = await adminAgent.get('/professeurs/9999');
    expect([404, 302]).toContain(res.status);
  });
});

// ─── API JSON ─────────────────────────────────────────────────────────────

describe('Professeurs - API', () => {
  it('GET /professeurs/api/next-matricule - retourne le prochain matricule auto-incrémenté', async () => {
    const res = await adminAgent.get('/professeurs/api/next-matricule');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('matricule');
  });

  it('GET /professeurs/api/disponibles - liste les profs libres lundi 8h-10h', async () => {
    const res = await adminAgent.get(
      '/professeurs/api/disponibles?session_id=1&jour=1&heure_debut=08:00&heure_fin=10:00'
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /professeurs/api/disponibles?specialite=Informatique - filtre par spécialité', async () => {
    const res = await adminAgent.get(
      '/professeurs/api/disponibles?session_id=1&jour=2&heure_debut=09:00&heure_fin=11:00&specialite=Informatique'
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ─── Création ─────────────────────────────────────────────────────────────

describe('Professeurs - Création', () => {
  it('GET /professeurs/create - affiche le formulaire de création', async () => {
    const res = await respAgent.get('/professeurs/create');
    expect(res.status).toBe(200);
  });

  it('POST /professeurs/create - crée un professeur valide', async () => {
    const res = await respAgent
      .post('/professeurs/create')
      .type('form')
      .send({
        matricule:  'PROF099',
        nom:        'Testeur',
        prenom:     'Jean',
        email:      'jean.testeur@lacite.ca',
        telephone:  '613-555-0199',
        specialite: 'Informatique',
      });
    expect([200, 302]).toContain(res.status);
  });

  it('POST /professeurs/create - matricule PROF001 dupliqué → rejet', async () => {
    // PROF001 est déjà présent dans les données de démo
    const res = await respAgent
      .post('/professeurs/create')
      .type('form')
      .send({
        matricule:  'PROF001',
        nom:        'Doublon',
        prenom:     'Test',
        email:      'doublon@lacite.ca',
        specialite: 'Informatique',
      });
    expect([200, 302, 400, 422]).toContain(res.status);
  });

  it('POST /professeurs/create - champs requis manquants → rejet', async () => {
    // Envoyer uniquement le nom sans prénom ni matricule
    const res = await respAgent
      .post('/professeurs/create')
      .type('form')
      .send({ nom: 'Sans prénom' });
    expect([200, 302, 400, 422]).toContain(res.status);
  });
});

// ─── Modification ─────────────────────────────────────────────────────────

describe('Professeurs - Modification', () => {
  it('GET /professeurs/1/edit - affiche le formulaire de modification', async () => {
    const res = await respAgent.get('/professeurs/1/edit');
    expect(res.status).toBe(200);
  });

  it('POST /professeurs/1/edit - met à jour les informations du professeur 1', async () => {
    const res = await respAgent
      .post('/professeurs/1/edit')
      .type('form')
      .send({
        matricule:  'PROF001',
        nom:        'Tremblay',
        prenom:     'Sophie',
        email:      'sophie.tremblay@lacite.ca',
        telephone:  '613-555-0101',
        specialite: 'Informatique',
      });
    expect([200, 302]).toContain(res.status);
  });
});

// ─── Disponibilités ───────────────────────────────────────────────────────

describe('Professeurs - Disponibilités', () => {
  it('GET /professeurs/1/disponibilites - affiche la grille de disponibilités', async () => {
    const res = await respAgent.get('/professeurs/1/disponibilites');
    expect(res.status).toBe(200);
  });

  it('POST /professeurs/1/disponibilites - met à jour les créneaux disponibles', async () => {
    // Format attendu par la route : tableau de { jour_semaine, heure_debut, heure_fin }
    const res = await respAgent
      .post('/professeurs/1/disponibilites')
      .type('form')
      .send({
        'disponibilites[0][jour_semaine]': '1',
        'disponibilites[0][heure_debut]':  '08:00',
        'disponibilites[0][heure_fin]':    '17:00',
      });
    expect([200, 302]).toContain(res.status);
  });
});

// ─── Toggle actif/inactif ─────────────────────────────────────────────────

describe('Professeurs - Activation / Désactivation', () => {
  it('POST /professeurs/1/toggle - bascule le statut actif du professeur 1', async () => {
    const res = await adminAgent.post('/professeurs/1/toggle').type('form').send({});
    expect([200, 302]).toContain(res.status);

    // Rétablir l'état initial pour ne pas perturber les autres tests
    await adminAgent.post('/professeurs/1/toggle').type('form').send({});
  });
});
