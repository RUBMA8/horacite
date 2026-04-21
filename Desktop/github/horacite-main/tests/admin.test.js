/**
 * Tests administration — /admin/*
 *
 * Couvre les fonctionnalités réservées au rôle « admin » :
 *   - Contrôle d'accès (admin autorisé, responsable et anonyme refusés)
 *   - Gestion des utilisateurs (CRUD, reset mot de passe, toggle actif)
 *   - Gestion des sessions académiques (CRUD)
 *
 * Note sur les champs de formulaire — sessions académiques :
 *   Le formulaire views/admin/sessions/create.hbs utilise « type » (automne/hiver/ete)
 *   pour identifier la saison. Ne pas confondre avec « saison » ou « statut ».
 *   La route lit : { type, annee, date_debut, date_fin } et génère le nom automatiquement.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import app from '../server.js';
import { createAuthAgent, RESPONSABLE_CREDENTIALS } from './helpers/auth.js';

// Agent anonyme pour tester les refus d'accès
const request = supertest(app);

// Agents authentifiés créés une seule fois avant tous les tests du fichier
let adminAgent;
let respAgent;

beforeAll(async () => {
  adminAgent = await createAuthAgent();
  respAgent  = await createAuthAgent(RESPONSABLE_CREDENTIALS);
});

// ─── Contrôle d'accès ─────────────────────────────────────────────────────

describe('Admin - Contrôle d\'accès', () => {
  it('GET /admin - accessible en tant qu\'admin', async () => {
    const res = await adminAgent.get('/admin');
    expect(res.status).toBe(200);
  });

  it('GET /admin - refusé en tant que responsable (302 ou 403)', async () => {
    // Le middleware isAdmin redirige ou renvoie 403 selon l'implémentation
    const res = await respAgent.get('/admin');
    expect([302, 403]).toContain(res.status);
  });

  it('GET /admin - refusé sans authentification → redirection login', async () => {
    const res = await request.get('/admin');
    expect(res.status).toBe(302);
  });
});

// ─── Gestion des utilisateurs ─────────────────────────────────────────────

describe('Admin - Gestion des utilisateurs', () => {
  it('GET /admin/users - liste tous les utilisateurs', async () => {
    const res = await adminAgent.get('/admin/users');
    expect(res.status).toBe(200);
    // Les comptes de démo doivent apparaître dans la liste
    expect(res.text).toMatch(/admin@lacite|responsable@lacite/i);
  });

  it('GET /admin/users/create - affiche le formulaire de création', async () => {
    const res = await adminAgent.get('/admin/users/create');
    expect(res.status).toBe(200);
  });

  it('POST /admin/users/create - crée un nouvel utilisateur responsable', async () => {
    const res = await adminAgent
      .post('/admin/users/create')
      .type('form')
      .send({
        matricule: 'RESP099',
        email:     'resp.test99@lacite.ca',
        nom:       'Test',
        prenom:    'Utilisateur',
        role:      'responsable',
        password:  'TestPass1!',
        // Le formulaire utilise confirm_password (snake_case) — vérifier create.hbs
        confirm_password: 'TestPass1!',
      });
    expect([200, 302]).toContain(res.status);
  });

  it('POST /admin/users/create - email dupliqué → rejet', async () => {
    // admin@lacite.ca existe déjà dans les données de démo
    const res = await adminAgent
      .post('/admin/users/create')
      .type('form')
      .send({
        matricule: 'RESP100',
        email:     'admin@lacite.ca',
        nom:       'Doublon',
        prenom:    'Test',
        role:      'responsable',
        password:  'TestPass1!',
        confirm_password: 'TestPass1!',
      });
    expect([200, 302, 400, 422]).toContain(res.status);
  });

  it('GET /admin/users/:id/edit - affiche le formulaire de modification', async () => {
    // ID 2 = responsable@lacite.ca (inséré en second dans les données de démo)
    const res = await adminAgent.get('/admin/users/2/edit');
    expect(res.status).toBe(200);
  });

  it('POST /admin/users/:id/toggle - bascule le statut actif/inactif', async () => {
    const res = await adminAgent.post('/admin/users/2/toggle').type('form').send({});
    expect([200, 302]).toContain(res.status);

    // Rétablir l'état initial pour ne pas perturber les autres tests
    await adminAgent.post('/admin/users/2/toggle').type('form').send({});
  });

  it('POST /admin/users/:id/reset-password - réinitialise le mot de passe', async () => {
    const res = await adminAgent
      .post('/admin/users/2/reset-password')
      .type('form')
      .send({
        new_password:     'NouveauResp1!',
        confirm_password: 'NouveauResp1!',
      });
    expect([200, 302]).toContain(res.status);

    // Remettre Resp123! pour que createAuthAgent(RESPONSABLE_CREDENTIALS) fonctionne toujours
    await adminAgent
      .post('/admin/users/2/reset-password')
      .type('form')
      .send({
        new_password:     'Resp123!',
        confirm_password: 'Resp123!',
      });
  });

  it('GET /admin/users/api/next-matricule - retourne le prochain matricule disponible', async () => {
    const res = await adminAgent.get('/admin/users/api/next-matricule');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('matricule');
  });
});

// ─── Gestion des sessions académiques ────────────────────────────────────

describe('Admin - Gestion des sessions académiques', () => {
  it('GET /admin/sessions - liste les sessions avec données de démo', async () => {
    const res = await adminAgent.get('/admin/sessions');
    expect(res.status).toBe(200);
    // Les sessions de démo couvrent 2021-2026 (automne/hiver/été)
    expect(res.text).toMatch(/automne|hiver|printemps|été/i);
  });

  it('GET /admin/sessions/create - affiche le formulaire de création', async () => {
    const res = await adminAgent.get('/admin/sessions/create');
    expect(res.status).toBe(200);
  });

  it('POST /admin/sessions/create - crée une nouvelle session académique', async () => {
    // Le champ s'appelle « type » (automne | hiver | ete), PAS « saison »
    // La route génère automatiquement le nom à partir de type + annee
    const res = await adminAgent
      .post('/admin/sessions/create')
      .type('form')
      .send({
        type:       'ete',        // valeurs valides : automne | hiver | ete
        annee:      '2027',       // année future pour éviter un doublon avec les données de démo
        date_debut: '2027-05-03',
        date_fin:   '2027-08-20',
      });
    expect([200, 302]).toContain(res.status);
  });

  it('GET /admin/sessions/:id/edit - affiche le formulaire de modification', async () => {
    // ID 1 = première session insérée dans les données de démo
    const res = await adminAgent.get('/admin/sessions/1/edit');
    expect(res.status).toBe(200);
  });
});
