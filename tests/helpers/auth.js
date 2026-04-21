/**
 * Utilitaires d'authentification partagés par tous les fichiers de test.
 *
 * Exports :
 *   ADMIN_CREDENTIALS        — identifiants de l'admin inséré par les données de démo
 *   RESPONSABLE_CREDENTIALS  — identifiants du responsable de démo
 *   createAuthAgent(creds)   — retourne un agent supertest déjà authentifié
 *   getRequest()             — retourne un agent supertest anonyme (sans session)
 *
 * Pourquoi un agent supertest plutôt qu'un simple request ?
 *   supertest.agent() maintient les cookies de session entre les requêtes,
 *   ce qui permet de simuler un utilisateur connecté sur plusieurs appels.
 */
import supertest from 'supertest';
import app from '../../server.js';

// Comptes insérés par config/database.js → insertInitialData()
export const ADMIN_CREDENTIALS = {
  email:    'admin@lacite.ca',
  password: 'Admin123!',
};

export const RESPONSABLE_CREDENTIALS = {
  email:    'responsable@lacite.ca',
  password: 'Resp123!',
};

/**
 * Crée et retourne un agent supertest authentifié.
 * Lance une erreur si la connexion échoue pour que le test appelant échoue
 * clairement (plutôt que de renvoyer des 302 vers /auth/login inattendus).
 *
 * @param {object} credentials — { email, password } (défaut : ADMIN_CREDENTIALS)
 * @returns {supertest.Agent}
 */
export async function createAuthAgent(credentials = ADMIN_CREDENTIALS) {
  const agent = supertest.agent(app);

  const res = await agent
    .post('/auth/login')
    .send(credentials)
    .set('Content-Type', 'application/x-www-form-urlencoded');

  if (res.status !== 302 && res.status !== 200) {
    throw new Error(
      `Échec de connexion (${credentials.email}): HTTP ${res.status} — ${JSON.stringify(res.body)}`
    );
  }

  return agent;
}

/**
 * Retourne un agent supertest sans session (visiteur anonyme).
 * Utile pour tester les redirections vers /auth/login.
 */
export function getRequest() {
  return supertest(app);
}
