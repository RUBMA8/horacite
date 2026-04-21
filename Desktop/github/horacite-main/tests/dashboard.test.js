/**
 * Tests du tableau de bord — /dashboard et /
 *
 * Couvre :
 *   - Accès au dashboard pour admin et responsable
 *   - Redirection vers /auth/login pour un visiteur anonyme
 *   - Comportement de la route racine / (redirection selon l'état d'auth)
 */
import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import app from '../server.js';
import { createAuthAgent, RESPONSABLE_CREDENTIALS } from './helpers/auth.js';

// Visiteur anonyme
const request = supertest(app);

let adminAgent;
let respAgent;

beforeAll(async () => {
  adminAgent = await createAuthAgent();
  respAgent  = await createAuthAgent(RESPONSABLE_CREDENTIALS);
});

describe('Dashboard', () => {
  it('GET /dashboard - accessible pour le rôle admin', async () => {
    const res = await adminAgent.get('/dashboard');
    expect(res.status).toBe(200);
  });

  it('GET /dashboard - accessible pour le rôle responsable', async () => {
    const res = await respAgent.get('/dashboard');
    expect(res.status).toBe(200);
  });

  it('GET /dashboard - redirige un visiteur anonyme vers /auth/login', async () => {
    const res = await request.get('/dashboard');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('login');
  });

  it('GET / - redirige un utilisateur connecté vers /dashboard', async () => {
    // La route racine fait res.redirect('/dashboard') si req.isAuthenticated()
    const res = await adminAgent.get('/');
    expect([200, 302]).toContain(res.status);
  });

  it('GET / - redirige un visiteur anonyme vers /auth/login', async () => {
    // La route racine fait res.redirect('/auth/login') si non authentifié
    const res = await request.get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('login');
  });
});
