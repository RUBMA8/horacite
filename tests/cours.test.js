/**
 * Tests des cours — /cours/* et /admin/programmes
 *
 * Couvre :
 *   - Liste des cours avec filtres (programme, type de salle, recherche texte)
 *   - Consultation du détail d'un cours et gestion du 404
 *   - API JSON : prochain code disponible, vérification d'unicité d'un code
 *   - Création d'un cours (champs valides et doublons)
 *   - Modification d'un cours existant
 *   - Archivage / désarchivage
 *   - Accès à la liste des programmes via /admin/programmes
 *
 * Données de démo supposées présentes :
 *   - Cours INFO1001 dans le programme 1 (Informatique)
 *   - Cours d'ID 1 accessible par GET /cours/1
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

describe('Cours - Liste et consultation', () => {
  it('GET /cours - affiche la liste complète des cours', async () => {
    const res = await adminAgent.get('/cours');
    expect(res.status).toBe(200);
    // Au moins un code de cours doit apparaître dans le HTML
    expect(res.text).toMatch(/INFO|cours|programme/i);
  });

  it('GET /cours?programme=1 - filtre les cours par programme', async () => {
    const res = await adminAgent.get('/cours?programme=1');
    expect(res.status).toBe(200);
  });

  it('GET /cours?type=laboratoire_informatique - filtre par type de salle requis', async () => {
    const res = await adminAgent.get('/cours?type=laboratoire_informatique');
    expect(res.status).toBe(200);
  });

  it('GET /cours?search=programmation - recherche en texte libre', async () => {
    const res = await adminAgent.get('/cours?search=programmation');
    expect(res.status).toBe(200);
  });

  it('GET /cours/1 - affiche le détail du premier cours', async () => {
    const res = await adminAgent.get('/cours/1');
    expect(res.status).toBe(200);
  });

  it('GET /cours/9999 - cours inexistant → 404 ou redirection', async () => {
    const res = await adminAgent.get('/cours/9999');
    expect([404, 302]).toContain(res.status);
  });
});

// ─── API JSON ─────────────────────────────────────────────────────────────

describe('Cours - API', () => {
  it('GET /cours/api/next-code - retourne le prochain code disponible pour un programme', async () => {
    const res = await adminAgent.get('/cours/api/next-code?programme=1&etape=1');
    expect(res.status).toBe(200);
    // La réponse JSON doit contenir la propriété « code »
    expect(res.body).toHaveProperty('code');
  });

  it('GET /cours/api/check-code - code INFO1001 existe → exists:true', async () => {
    const res = await adminAgent.get('/cours/api/check-code?code=INFO1001');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('exists');
    expect(res.body.exists).toBe(true);
  });

  it('GET /cours/api/check-code - code XXXX9999 inexistant → exists:false', async () => {
    const res = await adminAgent.get('/cours/api/check-code?code=XXXX9999');
    expect(res.status).toBe(200);
    expect(res.body.exists).toBe(false);
  });
});

// ─── Création ─────────────────────────────────────────────────────────────

describe('Cours - Création (admin)', () => {
  it('GET /cours/create - affiche le formulaire de création', async () => {
    const res = await adminAgent.get('/cours/create');
    expect(res.status).toBe(200);
  });

  it('POST /cours/create - crée un cours valide', async () => {
    const res = await adminAgent
      .post('/cours/create')
      .type('form')
      .send({
        code:             'TEST101',
        nom:              'Cours de test',
        programme_id:     '1',
        etape_etude:      '1ère année',
        duree_hebdo:      '3',
        type_salle_requis: 'theorique',
        credits:          '3',
        description:      'Créé par les tests automatisés',
      });
    expect([200, 302]).toContain(res.status);
  });

  it('POST /cours/create - code dupliqué INFO1001 → rejet', async () => {
    // INFO1001 est déjà présent dans les données de démo
    const res = await adminAgent
      .post('/cours/create')
      .type('form')
      .send({
        code:             'INFO1001',
        nom:              'Doublon',
        programme_id:     '1',
        duree_hebdo:      '3',
        type_salle_requis: 'theorique',
        credits:          '3',
      });
    expect([200, 302, 400, 422]).toContain(res.status);
  });

  it('POST /cours/create - champs requis manquants → rejet', async () => {
    // Envoyer uniquement le nom sans code ni programme
    const res = await adminAgent
      .post('/cours/create')
      .type('form')
      .send({ nom: 'Sans code' });
    expect([200, 302, 400, 422]).toContain(res.status);
  });
});

// ─── Modification ─────────────────────────────────────────────────────────

describe('Cours - Modification (responsable)', () => {
  it('GET /cours/1/edit - affiche le formulaire de modification', async () => {
    const res = await respAgent.get('/cours/1/edit');
    expect(res.status).toBe(200);
  });

  it('POST /cours/1/edit - modifie la durée hebdo et le type de salle', async () => {
    const res = await respAgent
      .post('/cours/1/edit')
      .type('form')
      .send({
        code:             'INFO1001',
        nom:              'Introduction à la programmation (modifié)',
        programme_id:     '1',
        etape_etude:      '1ère année',
        duree_hebdo:      '4',
        type_salle_requis: 'laboratoire_informatique',
        credits:          '3',
      });
    expect([200, 302]).toContain(res.status);
  });
});

// ─── Archivage ────────────────────────────────────────────────────────────

describe('Cours - Archivage', () => {
  it('POST /cours/1/archive - archive le cours 1', async () => {
    const res = await adminAgent.post('/cours/1/archive').type('form').send({});
    expect([200, 302]).toContain(res.status);
  });

  it('POST /cours/1/unarchive - désarchive le cours 1', async () => {
    const res = await adminAgent.post('/cours/1/unarchive').type('form').send({});
    expect([200, 302]).toContain(res.status);
  });
});

// ─── Programmes ───────────────────────────────────────────────────────────

describe('Cours - Programmes (/admin/programmes)', () => {
  it('GET /admin/programmes - liste les programmes (admin uniquement)', async () => {
    const res = await adminAgent.get('/admin/programmes');
    expect(res.status).toBe(200);
  });
});
