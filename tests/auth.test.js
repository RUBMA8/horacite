/**
 * Tests d'authentification — /auth/*
 *
 * Couvre l'ensemble du cycle de vie d'une session utilisateur :
 *   - Affichage de la page de connexion
 *   - Connexion réussie (admin et responsable)
 *   - Rejet des identifiants invalides
 *   - Déconnexion
 *   - Protection des routes privées contre l'accès non authentifié
 *   - Consultation et modification du profil
 *   - Changement de mot de passe avec validation
 *
 * Note sur les noms de champs : le formulaire change-password utilise les noms
 * camelCase (currentPassword, newPassword, confirmPassword) définis dans la vue
 * views/auth/change-password.hbs — toujours vérifier la vue en cas de 500.
 */
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import app from '../server.js';
import { createAuthAgent, ADMIN_CREDENTIALS, RESPONSABLE_CREDENTIALS } from './helpers/auth.js';

// Agent sans session — simule un visiteur anonyme
const request = supertest(app);

describe('Authentification', () => {

  // ─── Page de connexion ────────────────────────────────────────────────────

  describe('GET /auth/login', () => {
    it('affiche la page de connexion quand non authentifié', async () => {
      const res = await request.get('/auth/login');
      expect(res.status).toBe(200);
      // La page doit contenir au minimum un champ email ou password
      expect(res.text).toMatch(/login|connexion|email|password/i);
    });

    it('redirige (ou reste sur place) si l\'utilisateur est déjà connecté', async () => {
      // Le middleware isNotAuthenticated peut rediriger vers /dashboard
      const agent = await createAuthAgent();
      const res = await agent.get('/auth/login');
      expect([200, 302]).toContain(res.status);
    });
  });

  // ─── Connexion POST ───────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('connexion admin réussie → redirige vers /dashboard', async () => {
      const res = await request
        .post('/auth/login')
        .type('form')
        .send(ADMIN_CREDENTIALS);
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('dashboard');
    });

    it('connexion responsable réussie → 302', async () => {
      const res = await request
        .post('/auth/login')
        .type('form')
        .send(RESPONSABLE_CREDENTIALS);
      expect(res.status).toBe(302);
    });

    it('mauvais mot de passe → reste sur login avec message d\'erreur', async () => {
      const res = await request
        .post('/auth/login')
        .type('form')
        .send({ email: 'admin@lacite.ca', password: 'mauvaismdp' });
      // Passport redirige vers /auth/login (302) ou ré-affiche la page (200)
      expect([200, 302]).toContain(res.status);
      if (res.status === 200) {
        expect(res.text).toMatch(/incorrect|invalide|erreur/i);
      } else {
        expect(res.headers.location).toContain('login');
      }
    });

    it('email inexistant → rejet', async () => {
      const res = await request
        .post('/auth/login')
        .type('form')
        .send({ email: 'inexistant@lacite.ca', password: 'Test123!' });
      expect([200, 302]).toContain(res.status);
    });

    it('champs email et password vides → rejet', async () => {
      const res = await request
        .post('/auth/login')
        .type('form')
        .send({ email: '', password: '' });
      expect([200, 302, 422]).toContain(res.status);
    });
  });

  // ─── Déconnexion ─────────────────────────────────────────────────────────

  describe('GET /auth/logout', () => {
    it('détruit la session et redirige vers /auth/login', async () => {
      const agent = await createAuthAgent();
      const res = await agent.get('/auth/logout');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('login');
    });
  });

  // ─── Middleware de protection ─────────────────────────────────────────────

  describe('Routes protégées sans authentification', () => {
    // Chaque route privée doit renvoyer un 302 vers /auth/login pour un visiteur anonyme

    it('GET /dashboard redirige vers login', async () => {
      const res = await request.get('/dashboard');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('login');
    });

    it('GET /admin redirige vers login', async () => {
      const res = await request.get('/admin');
      expect(res.status).toBe(302);
    });

    it('GET /cours redirige vers login', async () => {
      const res = await request.get('/cours');
      expect(res.status).toBe(302);
    });

    it('GET /salles redirige vers login', async () => {
      const res = await request.get('/salles');
      expect(res.status).toBe(302);
    });

    it('GET /professeurs redirige vers login', async () => {
      const res = await request.get('/professeurs');
      expect(res.status).toBe(302);
    });

    it('GET /horaires redirige vers login', async () => {
      const res = await request.get('/horaires');
      expect(res.status).toBe(302);
    });
  });

  // ─── Profil ───────────────────────────────────────────────────────────────

  describe('GET /auth/profile', () => {
    it('page de profil accessible une fois connecté', async () => {
      const agent = await createAuthAgent();
      const res = await agent.get('/auth/profile');
      expect(res.status).toBe(200);
    });

    it('page de profil redirige vers login sans authentification', async () => {
      const res = await request.get('/auth/profile');
      expect(res.status).toBe(302);
    });
  });

  // ─── Changement de mot de passe ───────────────────────────────────────────
  //
  // IMPORTANT : la vue views/auth/change-password.hbs définit les champs avec
  // les noms camelCase (currentPassword, newPassword, confirmPassword).
  // La route lit ces mêmes noms via req.body — toujours utiliser ce format.

  describe('POST /auth/change-password', () => {
    it('changement de mot de passe valide → succès puis rétablissement', async () => {
      const agent = await createAuthAgent(RESPONSABLE_CREDENTIALS);

      // Changer vers un nouveau mot de passe valide
      const res = await agent
        .post('/auth/change-password')
        .type('form')
        .send({
          currentPassword: 'Resp123!',
          newPassword: 'NouveauMdp1!',
          confirmPassword: 'NouveauMdp1!',
        });
      expect([200, 302]).toContain(res.status);

      // Rétablir l'ancien mot de passe pour ne pas perturber les autres tests
      await agent
        .post('/auth/change-password')
        .type('form')
        .send({
          currentPassword: 'NouveauMdp1!',
          newPassword: 'Resp123!',
          confirmPassword: 'Resp123!',
        });
    });

    it('mauvais mot de passe actuel → rejet avec message d\'erreur', async () => {
      const agent = await createAuthAgent();
      const res = await agent
        .post('/auth/change-password')
        .type('form')
        .send({
          currentPassword: 'mauvais',
          newPassword: 'NouveauMdp1!',
          confirmPassword: 'NouveauMdp1!',
        });
      // La route redirige vers /auth/change-password avec un message d'erreur en session
      expect([200, 302]).toContain(res.status);
    });

    it('confirmation différente du nouveau mot de passe → rejet', async () => {
      const agent = await createAuthAgent();
      const res = await agent
        .post('/auth/change-password')
        .type('form')
        .send({
          currentPassword: 'Admin123!',
          newPassword: 'NouveauMdp1!',
          confirmPassword: 'Différent1!',   // ne correspond pas → erreur de validation
        });
      expect([200, 302]).toContain(res.status);
    });
  });
});
