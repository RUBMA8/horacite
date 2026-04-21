/**
 * Setup par fichier de test — exécuté dans chaque worker Vitest
 * avant l'import des modules testés.
 *
 * Ces variables doivent être définies AVANT tout import qui touche la BD
 * ou la configuration Express (session, passport, etc.).
 * Vitest exécute ce fichier grâce à l'option setupFiles dans vitest.config.js.
 *
 * Le pool « forks » avec singleFork:true garantit que tous les fichiers de test
 * partagent le même processus — indispensable pour partager la BD SQLite en mémoire
 * et les sessions HTTP entre les tests.
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.NODE_ENV       = 'test';
process.env.DB_PATH        = path.join(__dirname, '../database/test.db');
process.env.SESSION_SECRET = 'test-secret-key-horacite';
process.env.BCRYPT_ROUNDS  = '4';
