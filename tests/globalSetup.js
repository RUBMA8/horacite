/**
 * Setup global Vitest — exécuté UNE SEULE FOIS avant tous les fichiers de test.
 *
 * Responsabilités :
 *   setup()    — supprime l'éventuelle BD de test résiduelle, recrée le répertoire
 *                si nécessaire, puis appelle initializeDatabase() pour créer le schéma
 *                et insérer les données de démo (utilisateurs, sessions, cours, salles,
 *                professeurs, disponibilités, pavillons).
 *   teardown() — ferme proprement la connexion SQLite et supprime le fichier test.db
 *                après la suite complète pour ne pas laisser de résidu.
 *
 * Le fichier de BD de test est isolé de la BD de développement :
 *   dev  → database/horaires.db   (chemin par défaut)
 *   test → database/test.db       (défini par DB_PATH ci-dessous)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Chemin absolu du fichier SQLite utilisé pendant les tests
export const TEST_DB_PATH = path.join(__dirname, '../database/test.db');

export async function setup() {
  // Variables d'environnement à définir AVANT tout import touchant la BD
  process.env.NODE_ENV      = 'test';
  process.env.DB_PATH       = TEST_DB_PATH;
  process.env.SESSION_SECRET = 'test-secret-key-horacite';
  process.env.BCRYPT_ROUNDS  = '4';   // bcrypt rapide en test (4 rounds au lieu de 12)

  // Repartir d'une BD vierge à chaque exécution de la suite
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  // Créer le dossier database/ si absent (ex : premier clone)
  const dbDir = path.dirname(TEST_DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Crée les tables et insère les données de démo définies dans config/database.js
  const { initializeDatabase } = await import('../config/database.js');
  await initializeDatabase();
}

export async function teardown() {
  // Libérer la connexion SQLite avant de supprimer le fichier
  const { closeDatabase } = await import('../config/database.js');
  await closeDatabase();

  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
}
