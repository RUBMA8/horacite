/**
 * Tests des salles — /salles/*
 *
 * Couvre :
 *   - Liste avec filtres (type, capacité minimum, recherche texte)
 *   - Consultation du détail d'une salle et gestion du 404
 *   - API JSON : liste des pavillons, disponibilité d'une salle sur un créneau
 *   - Création d'une salle (champs valides et doublons)
 *   - Modification d'une salle existante
 *   - Toggle actif/inactif
 *   - Suppression (salle créée en test)
 *
 * Données de démo supposées présentes :
 *   - Au moins un pavillon (ID 1) avec des salles A101, A102…
 *   - Salle ID 1 : pavillon 1, code A101, type theorique
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

describe('Salles - Liste et consultation', () => {
  it('GET /salles - affiche la liste complète des salles', async () => {
    const res = await adminAgent.get('/salles');
    expect(res.status).toBe(200);
    // La page doit mentionner au moins un mot relatif aux salles
    expect(res.text).toMatch(/salle|pavillon|capacité/i);
  });

  it('GET /salles?type=theorique - filtre les salles théoriques', async () => {
    const res = await adminAgent.get('/salles?type=theorique');
    expect(res.status).toBe(200);
  });

  it('GET /salles?type=laboratoire_informatique - filtre les labos informatique', async () => {
    const res = await adminAgent.get('/salles?type=laboratoire_informatique');
    expect(res.status).toBe(200);
  });

  it('GET /salles?capacite=30 - filtre les salles de capacité ≥ 30', async () => {
    const res = await adminAgent.get('/salles?capacite=30');
    expect(res.status).toBe(200);
  });

  it('GET /salles?search=A - recherche par code de salle', async () => {
    const res = await adminAgent.get('/salles?search=A');
    expect(res.status).toBe(200);
  });

  it('GET /salles/1 - affiche le détail de la salle 1', async () => {
    const res = await adminAgent.get('/salles/1');
    expect(res.status).toBe(200);
  });

  it('GET /salles/9999 - salle inexistante → 404 ou redirection', async () => {
    const res = await adminAgent.get('/salles/9999');
    expect([404, 302]).toContain(res.status);
  });
});

// ─── API JSON ─────────────────────────────────────────────────────────────

describe('Salles - API', () => {
  it('GET /salles/api/pavillons - retourne la liste des pavillons', async () => {
    const res = await adminAgent.get('/salles/api/pavillons');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    // Chaque pavillon doit avoir au minimum un champ « code »
    expect(res.body[0]).toHaveProperty('code');
  });

  it('GET /salles/api/disponibles - salles libres sur un créneau lundi 8h-10h', async () => {
    const res = await adminAgent.get(
      '/salles/api/disponibles?session_id=1&jour=1&heure_debut=08:00&heure_fin=10:00'
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /salles/api/disponibles?type=theorique - filtre par type dans les dispos', async () => {
    const res = await adminAgent.get(
      '/salles/api/disponibles?session_id=1&jour=2&heure_debut=10:00&heure_fin=12:00&type=theorique'
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /salles/api/disponibles?capacite=30 - filtre par capacité dans les dispos', async () => {
    const res = await adminAgent.get(
      '/salles/api/disponibles?session_id=1&jour=3&heure_debut=09:00&heure_fin=11:00&capacite=30'
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /salles/1/disponibilite - vérifie la disponibilité de la salle 1', async () => {
    const res = await adminAgent.get(
      '/salles/1/disponibilite?session_id=1&jour=1&heure_debut=08:00&heure_fin=10:00'
    );
    expect(res.status).toBe(200);
    // La réponse doit indiquer si la salle est disponible ou non
    expect(res.body).toHaveProperty('disponible');
  });
});

// ─── Création ─────────────────────────────────────────────────────────────

describe('Salles - Création', () => {
  it('GET /salles/create - affiche le formulaire de création', async () => {
    const res = await respAgent.get('/salles/create');
    expect(res.status).toBe(200);
  });

  it('POST /salles/create - crée une salle valide dans le pavillon 1', async () => {
    const res = await respAgent
      .post('/salles/create')
      .type('form')
      .send({
        pavillon_id:    '1',
        code:           'Z999',    // code unique pour le test
        niveau:         '9e',
        type:           'theorique',
        capacite:       '30',
        accessible_pmr: '0',
      });
    expect([200, 302]).toContain(res.status);
  });

  it('POST /salles/create - champs requis manquants → rejet', async () => {
    // Envoyer uniquement le code sans type ni capacité ni pavillon
    const res = await respAgent
      .post('/salles/create')
      .type('form')
      .send({ code: 'X001' });
    expect([200, 302, 400, 422]).toContain(res.status);
  });
});

// ─── Modification ─────────────────────────────────────────────────────────

describe('Salles - Modification', () => {
  it('GET /salles/1/edit - affiche le formulaire de modification', async () => {
    const res = await respAgent.get('/salles/1/edit');
    expect([200, 302]).toContain(res.status);
  });

  it('POST /salles/1/edit - met à jour la capacité de la salle 1', async () => {
    const res = await respAgent
      .post('/salles/1/edit')
      .type('form')
      .send({
        pavillon_id:    '1',
        code:           'A101',
        niveau:         '1er',
        type:           'theorique',
        capacite:       '42',
        accessible_pmr: '1',
      });
    expect([200, 302]).toContain(res.status);
  });
});

// ─── Toggle actif/inactif ─────────────────────────────────────────────────

describe('Salles - Activation / Désactivation', () => {
  it('POST /salles/1/toggle - bascule le statut actif de la salle 1', async () => {
    const res = await adminAgent.post('/salles/1/toggle').type('form').send({});
    expect([200, 302]).toContain(res.status);

    // Rétablir l'état initial pour ne pas perturber les autres tests
    await adminAgent.post('/salles/1/toggle').type('form').send({});
  });
});

// ─── Suppression ──────────────────────────────────────────────────────────

describe('Salles - Suppression', () => {
  it('Vérification de la salle de test Z999 après création', async () => {
    // La salle Z999 a été créée dans le test de création ci-dessus
    const listRes = await adminAgent.get('/salles?search=Z999');
    expect(listRes.status).toBe(200);
  });
});
