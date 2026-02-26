/**
 * Configuration et initialisation de la base de données SQLite
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Instance de connexion globale
let db = null;

/**
 * Obtenir une connexion à la base de données
 */
export async function getDatabase() {
    if (db) return db;

    const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/horaires.db');

    // S'assurer que le dossier existe
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    // Activer les clés étrangères
    await db.run('PRAGMA foreign_keys = ON');

    return db;
}

/**
 * Initialiser la base de données avec le schéma
 */
export async function initializeDatabase() {
    const database = await getDatabase();

    // Vérifier si les tables existent déjà
    const tableExists = await database.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    );

    if (!tableExists) {
        console.log('Création des tables de la base de données...');

        // Utiliser la création manuelle du schéma (plus fiable)
        await createSchema(database);

        // Insérer les données initiales
        await insertInitialData(database);
    } else {
        console.log('Base de données existante détectée');
    }

    return database;
}

/**
 * Créer le schéma manuellement si le fichier SQL n'est pas disponible
 */
async function createSchema(database) {
    const statements = [
        // Table users
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            matricule VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            nom VARCHAR(100) NOT NULL,
            prenom VARCHAR(100) NOT NULL,
            role VARCHAR(20) NOT NULL CHECK(role IN ('admin', 'responsable')),
            actif BOOLEAN DEFAULT 1,
            force_password_change BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )`,

        // Table pavillons (Monocampus - pas de FK campus)
        `CREATE TABLE IF NOT EXISTS pavillons (
            id INTEGER PRIMARY KEY,
            code VARCHAR(10) UNIQUE NOT NULL,
            nom VARCHAR(100) NOT NULL,
            localization TEXT,
            actif BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // Table salles
        `CREATE TABLE IF NOT EXISTS salles (
            id INTEGER PRIMARY KEY,
            pavillon_id INTEGER NOT NULL,
            code VARCHAR(20) NOT NULL,
            niveau VARCHAR(10),
            type VARCHAR(50) NOT NULL CHECK(type IN (
                'theorique', 'laboratoire_informatique', 'laboratoire_scientifique',
                'salle_multimedia', 'atelier', 'studio'
            )),
            capacite INTEGER CHECK(capacite > 0),
            equipements TEXT,
            accessible_pmr BOOLEAN DEFAULT 0,
            actif BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pavillon_id) REFERENCES pavillons(id) ON DELETE CASCADE,
            UNIQUE(pavillon_id, code)
        )`,

        // Table programmes
        `CREATE TABLE IF NOT EXISTS programmes (
            id INTEGER PRIMARY KEY,
            code VARCHAR(20) UNIQUE NOT NULL,
            nom VARCHAR(200) NOT NULL,
            description TEXT,
            actif BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // Table sessions
        `CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY,
            nom VARCHAR(50) NOT NULL,
            type VARCHAR(20) NOT NULL CHECK(type IN ('automne', 'hiver', 'ete')),
            annee INTEGER NOT NULL,
            date_debut DATE NOT NULL,
            date_fin DATE NOT NULL,
            statut VARCHAR(20) DEFAULT 'planification' CHECK(statut IN (
                'planification', 'active', 'terminee'
            )),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(type, annee)
        )`,

        // Table cours
        `CREATE TABLE IF NOT EXISTS cours (
            id INTEGER PRIMARY KEY,
            code VARCHAR(20) UNIQUE NOT NULL,
            nom VARCHAR(200) NOT NULL,
            programme_id INTEGER NOT NULL,
            etape_etude VARCHAR(50),
            duree_hebdo INTEGER NOT NULL,
            type_salle_requis VARCHAR(50) NOT NULL CHECK(type_salle_requis IN (
                'theorique', 'laboratoire_informatique', 'laboratoire_scientifique',
                'salle_multimedia', 'atelier', 'studio'
            )),
            specialite_requise VARCHAR(100),
            description TEXT,
            credits INTEGER,
            statut VARCHAR(20) DEFAULT 'actif' CHECK(statut IN ('actif', 'archive')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE RESTRICT
        )`,

        // Table cours_sessions
        `CREATE TABLE IF NOT EXISTS cours_sessions (
            cours_id INTEGER NOT NULL,
            session_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (cours_id, session_id),
            FOREIGN KEY (cours_id) REFERENCES cours(id) ON DELETE CASCADE,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        )`,

        // Table professeurs (Monocampus - pas de campus_principal)
        `CREATE TABLE IF NOT EXISTS professeurs (
            id INTEGER PRIMARY KEY,
            matricule VARCHAR(50) UNIQUE NOT NULL,
            nom VARCHAR(100) NOT NULL,
            prenom VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            telephone VARCHAR(20),
            specialite VARCHAR(100) NOT NULL,
            specialites_secondaires TEXT,
            actif BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // Table disponibilites_professeurs
        `CREATE TABLE IF NOT EXISTS disponibilites_professeurs (
            id INTEGER PRIMARY KEY,
            professeur_id INTEGER NOT NULL,
            session_id INTEGER,
            jour_semaine INTEGER NOT NULL CHECK(jour_semaine BETWEEN 1 AND 5),
            heure_debut TIME NOT NULL,
            heure_fin TIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (professeur_id) REFERENCES professeurs(id) ON DELETE CASCADE,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
            CHECK (heure_fin > heure_debut)
        )`,

        // Table horaires
        `CREATE TABLE IF NOT EXISTS horaires (
            id INTEGER PRIMARY KEY,
            cours_id INTEGER NOT NULL,
            salle_id INTEGER NOT NULL,
            professeur_id INTEGER NOT NULL,
            session_id INTEGER NOT NULL,
            jour_semaine INTEGER NOT NULL CHECK(jour_semaine BETWEEN 1 AND 5),
            heure_debut TIME NOT NULL,
            heure_fin TIME NOT NULL,
            recurrent BOOLEAN DEFAULT 1,
            date_debut DATE,
            date_fin DATE,
            notes TEXT,
            created_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cours_id) REFERENCES cours(id) ON DELETE CASCADE,
            FOREIGN KEY (salle_id) REFERENCES salles(id) ON DELETE RESTRICT,
            FOREIGN KEY (professeur_id) REFERENCES professeurs(id) ON DELETE RESTRICT,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
            CHECK (heure_fin > heure_debut)
        )`,

        // Table audit_logs
        `CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            action VARCHAR(50) NOT NULL,
            table_name VARCHAR(50),
            record_id INTEGER,
            details TEXT,
            ip_address VARCHAR(45),
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )`
    ];

    for (const statement of statements) {
        await database.run(statement);
    }

    console.log('Schéma créé manuellement');

    // Migration: Ajouter le champ specialite_requise s'il n'existe pas
    try {
        await database.run(`
            ALTER TABLE cours ADD COLUMN specialite_requise VARCHAR(100)
        `);
        console.log('Migration: Colonne specialite_requise ajoutée à la table cours');
    } catch (err) {
        // La colonne existe déjà, c'est normal
        if (err.message.includes('duplicate column')) {
            console.log('Migration: Colonne specialite_requise existe déjà');
        } else {
            throw err;
        }
    }
}

/**
 * Insérer les données initiales (pavillons, programmes, etc.)
 */
async function insertInitialData(database) {
    console.log('Insertion des données initiales...');

    // Vérifier si les données existent déjà
    const existingPavillon = await database.get('SELECT id FROM pavillons LIMIT 1');
    if (existingPavillon) {
        console.log('Données initiales déjà présentes');
        return;
    }

    // Pavillons (Monocampus)
    await database.run(`INSERT INTO pavillons (code, nom, localization) VALUES
        ('A', 'Pavillon A - Principal', 'Bâtiment principal'),
        ('B', 'Pavillon B - Sciences', 'Aile est'),
        ('C', 'Pavillon C - Technologies', 'Aile ouest')`);

    // Salles (Monocampus - 3 pavillons)
    await database.run(`INSERT INTO salles (pavillon_id, code, niveau, type, capacite, accessible_pmr) VALUES
        (1, 'A101', '1er', 'theorique', 40, 1),
        (1, 'A102', '1er', 'theorique', 35, 1),
        (1, 'A103', '1er', 'salle_multimedia', 30, 1),
        (1, 'A201', '2e', 'theorique', 45, 0),
        (1, 'A202', '2e', 'laboratoire_informatique', 25, 0),
        (2, 'B101', '1er', 'laboratoire_scientifique', 20, 1),
        (2, 'B102', '1er', 'laboratoire_informatique', 30, 1),
        (2, 'B201', '2e', 'atelier', 15, 0),
        (3, 'C101', '1er', 'laboratoire_informatique', 35, 1),
        (3, 'C102', '1er', 'laboratoire_informatique', 35, 1),
        (3, 'C201', '2e', 'studio', 20, 0)`);

    // Programmes
    await database.run(`INSERT INTO programmes (code, nom, description) VALUES
        ('INFO', 'Programmation informatique', 'Programme de développement logiciel et programmation'),
        ('RESX', 'Réseaux et sécurité', 'Administration de réseaux et cybersécurité'),
        ('ELEC', 'Électronique', 'Génie électronique et systèmes embarqués'),
        ('GRAP', 'Design graphique', 'Création visuelle et design numérique'),
        ('COMM', 'Communications', 'Relations publiques et médias'),
        ('ADMI', 'Administration des affaires', 'Gestion et administration')`);

    // Sessions académiques (5 ans d'historique)
    const sessions = [];
    for (let year = 2021; year <= 2026; year++) {
        sessions.push(`('Automne ${year}', 'automne', ${year}, '${year}-09-05', '${year}-12-20', '${year < 2026 ? 'terminee' : 'planification'}')`);
        sessions.push(`('Hiver ${year + 1}', 'hiver', ${year + 1}, '${year + 1}-01-10', '${year + 1}-04-30', '${year + 1 < 2026 ? 'terminee' : 'planification'}')`);
        if (year < 2026) {
            sessions.push(`('Été ${year + 1}', 'ete', ${year + 1}, '${year + 1}-05-15', '${year + 1}-08-15', 'terminee')`);
        }
    }
    await database.run(`INSERT INTO sessions (nom, type, annee, date_debut, date_fin, statut) VALUES ${sessions.join(',')}`);

    // Marquer la session Hiver 2026 comme active
    await database.run(`UPDATE sessions SET statut = 'active' WHERE nom = 'Hiver 2026'`);

    // Cours
    await database.run(`INSERT INTO cours (code, nom, programme_id, etape_etude, duree_hebdo, type_salle_requis, credits) VALUES
        ('INFO1001', 'Introduction à la programmation', 1, '1ère année', 4, 'laboratoire_informatique', 3),
        ('INFO1002', 'Bases de données I', 1, '1ère année', 3, 'laboratoire_informatique', 3),
        ('INFO2001', 'Programmation orientée objet', 1, '2e année', 4, 'laboratoire_informatique', 3),
        ('INFO2002', 'Développement web', 1, '2e année', 4, 'laboratoire_informatique', 3),
        ('INFO3001', 'Projet intégrateur', 1, '3e année', 6, 'laboratoire_informatique', 4),
        ('RESX1001', 'Réseaux I', 2, '1ère année', 3, 'laboratoire_informatique', 3),
        ('RESX1002', 'Sécurité informatique', 2, '1ère année', 3, 'laboratoire_informatique', 3),
        ('ELEC1001', 'Circuits électriques', 3, '1ère année', 4, 'laboratoire_scientifique', 3),
        ('ELEC1002', 'Électronique numérique', 3, '1ère année', 3, 'atelier', 3),
        ('GRAP1001', 'Design graphique I', 4, '1ère année', 4, 'salle_multimedia', 3),
        ('GRAP1002', 'Infographie', 4, '1ère année', 3, 'laboratoire_informatique', 3),
        ('COMM1001', 'Communications I', 5, '1ère année', 3, 'theorique', 3),
        ('ADMI1001', 'Comptabilité I', 6, '1ère année', 3, 'theorique', 3),
        ('ADMI1002', 'Gestion des ressources', 6, '1ère année', 3, 'theorique', 3),
        ('MATH1001', 'Mathématiques appliquées', 1, '1ère année', 3, 'theorique', 3)`);

    // Associer les cours à la session active
    await database.run(`INSERT INTO cours_sessions (cours_id, session_id)
        SELECT c.id, s.id FROM cours c, sessions s WHERE s.nom = 'Hiver 2026'`);

    // Professeurs (Monocampus - pas de campus_principal)
    await database.run(`INSERT INTO professeurs (matricule, nom, prenom, email, telephone, specialite) VALUES
        ('PROF001', 'Tremblay', 'Jean', 'jean.tremblay@lacite.ca', '613-555-0101', 'Informatique'),
        ('PROF002', 'Gagnon', 'Marie', 'marie.gagnon@lacite.ca', '613-555-0102', 'Informatique'),
        ('PROF003', 'Roy', 'Pierre', 'pierre.roy@lacite.ca', '613-555-0103', 'Réseaux'),
        ('PROF004', 'Côté', 'Sophie', 'sophie.cote@lacite.ca', '613-555-0104', 'Électronique'),
        ('PROF005', 'Bouchard', 'Michel', 'michel.bouchard@lacite.ca', '613-555-0105', 'Design'),
        ('PROF006', 'Lavoie', 'Anne', 'anne.lavoie@lacite.ca', '613-555-0106', 'Communications'),
        ('PROF007', 'Morin', 'Luc', 'luc.morin@lacite.ca', '613-555-0107', 'Administration'),
        ('PROF008', 'Fortin', 'Julie', 'julie.fortin@lacite.ca', '613-555-0108', 'Mathématiques'),
        ('PROF009', 'Ouellet', 'Marc', 'marc.ouellet@lacite.ca', '613-555-0109', 'Informatique'),
        ('PROF010', 'Pelletier', 'Nathalie', 'nathalie.pelletier@lacite.ca', '416-555-0110', 'Informatique')`);

    // Disponibilités des professeurs (tous disponibles du lundi au vendredi, 8h-17h par défaut)
    const dispos = [];
    for (let profId = 1; profId <= 10; profId++) {
        for (let jour = 1; jour <= 5; jour++) {
            dispos.push(`(${profId}, NULL, ${jour}, '08:00', '12:00')`);
            dispos.push(`(${profId}, NULL, ${jour}, '13:00', '17:00')`);
        }
    }
    await database.run(`INSERT INTO disponibilites_professeurs (professeur_id, session_id, jour_semaine, heure_debut, heure_fin) VALUES ${dispos.join(',')}`);

    // Créer l'administrateur par défaut
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const adminPassword = await bcrypt.hash('Admin123!', bcryptRounds);
    const respPassword = await bcrypt.hash('Resp123!', bcryptRounds);

    await database.run(`INSERT INTO users (matricule, email, password_hash, nom, prenom, role) VALUES
        ('ADMIN001', 'admin@lacite.ca', '${adminPassword}', 'Système', 'Administrateur', 'admin'),
        ('RESP001', 'responsable@lacite.ca', '${respPassword}', 'Dupont', 'Marie', 'responsable'),
        ('RESP002', 'responsable2@lacite.ca', '${respPassword}', 'Martin', 'Paul', 'responsable')`);

    console.log('Données initiales insérées avec succès');
    console.log('');
    console.log('=== COMPTES DE DÉMONSTRATION ===');
    console.log('Administrateur: admin@lacite.ca / Admin123!');
    console.log('Responsable 1:  responsable@lacite.ca / Resp123!');
    console.log('Responsable 2:  responsable2@lacite.ca / Resp123!');
    console.log('================================');
}

/**
 * Fermer la connexion à la base de données
 */
export async function closeDatabase() {
    if (db) {
        await db.close();
        db = null;
    }
}

export default { getDatabase, initializeDatabase, closeDatabase };
