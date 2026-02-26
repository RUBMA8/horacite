# Modèles de Données - HoraCite

## Vue d'Ensemble de la Base de Données

HoraCite utilise SQLite3 pour la persistence des données. La base est organisée en deux tables principales: `users` et `sessions`.

---

## Table: users

Gère l'information sur les utilisateurs du système.

### Schéma SQL

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  firstname TEXT NOT NULL,
  lastname TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'STUDENT',
  active BOOLEAN DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Structure Complète

| Colonne | Type | Défaut | Contraintes | Description |
|---------|------|--------|-------------|-------------|
| id | INTEGER | Auto | PRIMARY KEY | Identifiant unique |
| username | TEXT | - | UNIQUE, NOT NULL | Nom d'utilisateur (login) |
| email | TEXT | - | UNIQUE, NOT NULL | Adresse email |
| password | TEXT | - | NOT NULL | Mot de passe hashé (bcrypt) |
| firstname | TEXT | - | NOT NULL | Prénom |
| lastname | TEXT | - | NOT NULL | Nom de famille |
| role | TEXT | STUDENT | NOT NULL | Rôle (ADMIN, PROFESSOR, STUDENT) |
| active | BOOLEAN | 1 (true) | - | Compte actif/inactif |
| createdAt | TIMESTAMP | CURRENT | - | Date de création |
| updatedAt | TIMESTAMP | CURRENT | - | Date dernière modification |

### Valeurs Valides

#### role
```
ADMIN      - Administrateur système
PROFESSOR  - Professeur
STUDENT    - Étudiant
```

### Exemple de Donnée

```javascript
{
  id: 1,
  username: "admin",
  email: "admin@lacite.edu",
  password: "$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  firstname: "Pascal",
  lastname: "Administrateur",
  role: "ADMIN",
  active: true,
  createdAt: "2025-01-15 10:30:00",
  updatedAt: "2025-02-26 14:45:00"
}
```

### Indexation

```sql
CREATE INDEX idx_users_username ON users(username)
CREATE INDEX idx_users_email ON users(email)
CREATE INDEX idx_users_role ON users(role)
CREATE INDEX idx_users_active ON users(active)
```

### Sécurité

- **Mot de passe**: Toujours hashé en bcrypt, jamais stocké en clair
- **Uniqueness**: username et email sont uniques
- **Active Flag**: Pour soft delete (ne jamais supprimer vraiment)

---

## Table: sessions

Gère les sessions académiques du système.

### Schéma SQL

```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Structure Complète

| Colonne | Type | Défaut | Contraintes | Description |
|---------|------|--------|-------------|-------------|
| id | INTEGER | Auto | PRIMARY KEY | Identifiant unique |
| name | TEXT | - | NOT NULL | Nom de la session |
| year | INTEGER | - | NOT NULL | Année académique |
| startDate | DATE | - | NOT NULL | Date de début |
| endDate | DATE | - | NOT NULL | Date de fin |
| description | TEXT | NULL | - | Description optionnelle |
| status | TEXT | planning | NOT NULL | Statut de la session |
| createdAt | TIMESTAMP | CURRENT | - | Date de création |
| updatedAt | TIMESTAMP | CURRENT | - | Date dernière modification |

### Valeurs Valides

#### status
```
planning  - Planifiée, pas encore commence
active    - Session en cours
closed    - Session terminée
```

### Exemple de Donnée

```javascript
{
  id: 1,
  name: "Année 2025-2026",
  year: 2025,
  startDate: "2025-09-01",
  endDate: "2026-06-30",
  description: "Année académique complète 2025-2026",
  status: "planning",
  createdAt: "2025-02-20 09:00:00",
  updatedAt: "2025-02-26 14:00:00"
}
```

### Indexation

```sql
CREATE INDEX idx_sessions_year ON sessions(year)
CREATE INDEX idx_sessions_status ON sessions(status)
CREATE INDEX idx_sessions_startDate ON sessions(startDate)
```

### Validations

- **startDate < endDate**: La date de fin doit être après le début
- **year**: Année numérique positive
- **status**: Seulement les valeurs valides
- **name**: Texte non vide

---

## Schéma de Relation

```
users                sessions
┌─────────────────┐  ┌─────────────────┐
│ id (PK)         │  │ id (PK)         │
│ username        │  │ name            │
│ email           │  │ year            │
│ password        │  │ startDate       │
│ firstname       │  │ endDate         │
│ lastname        │  │ role            │
│ role            │  │ description     │
│ active          │  │ status          │
│ createdAt       │  │ createdAt       │
│ updatedAt       │  │ updatedAt       │
└─────────────────┘  └─────────────────┘
```

### Relations Futures (Sprint 2+)

Les tables suivantes pourraient être ajoutées:

```
courses
├─ session_id (FK) -> sessions.id
├─ professor_id (FK) -> users.id

horaires
├─ course_id (FK) -> courses.id

enrollments
├─ user_id (FK) -> users.id
├─ course_id (FK) -> courses.id
```

---

## Model User (models/User.js)

### Classe et Méthodes

```javascript
class User {
  // Statiques - Opérations de BD
  static create(userData)
  static findById(id)
  static findByUsername(username)
  static findByEmail(email)
  static findAll()
  static findAllPaginated(page, limit)
  static findByRole(role)
  static update(id, userData)
  static updatePassword(id, newPassword)
  static delete(id)           // Soft delete
  static destroy(id)          // Hard delete
  
  // Statiques - Utilitaires
  static hashPassword(plainPassword)
  static verifyPassword(plainPassword, hashedPassword)
  static exists(username)
  static emailExists(email)
  
  // Instance - Propriétés
  id
  username
  email
  firstname
  lastname
  role
  active
  createdAt
  updatedAt
  
  // Instance - Méthodes
  toJSON()
  toSecureJSON()           // Exclut password
  isAdmin()
  isProfessor()
  isStudent()
  hasPermission(action)
}
```

### Utilisation

```javascript
// Créer
const user = await User.create({
  username: 'john123',
  email: 'john@example.com',
  password: 'plainPassword',
  firstname: 'John',
  lastname: 'Doe',
  role: 'STUDENT'
})

// Lire
const user = await User.findById(1)
const user = await User.findByUsername('john123')
const users = await User.findAllPaginated(1, 10)

// Mettre à jour
await User.update(1, {
  firstname: 'Jane',
  role: 'PROFESSOR'
})

// Supprimer (soft)
await User.delete(1)

// Vérifier mot de passe
const valid = await User.verifyPassword('plainPassword', hashedPassword)

// Checker rôle
if (user.isAdmin()) { ... }
```

---

## Model Session (models/Session.js)

### Classe et Méthodes

```javascript
class Session {
  // Statiques - Opérations de BD
  static create(sessionData)
  static findById(id)
  static findAll()
  static findAllPaginated(page, limit)
  static findByYear(year)
  static findByStatus(status)
  static getActiveSession()
  static update(id, sessionData)
  static updateStatus(id, newStatus)
  static delete(id)           // Soft delete
  static destroy(id)          // Hard delete
  
  // Statiques - Utilitaires
  static isActive(sessionId)
  static isBetweenDates(date, sessionId)
  static checkConflict(startDate, endDate)
  static validateProximity(startDate, endDate)
  
  // Instance - Propriétés
  id
  name
  year
  startDate
  endDate
  description
  status
  createdAt
  updatedAt
  
  // Instance - Méthodes
  toJSON()
  isActive()
  isClosed()
  getDuration()              // Nombre jours
  getFormattedDates()
}
```

### Utilisation

```javascript
// Créer
const session = await Session.create({
  name: '2025-2026',
  year: 2025,
  startDate: '2025-09-01',
  endDate: '2026-06-30',
  status: 'planning'
})

// Lire
const session = await Session.findById(1)
const sessions = await Session.findByStatus('active')
const current = await Session.getActiveSession()

// Vérifier dates
if (Session.isBetweenDates('2025-11-15', 1)) {
  // Cette date est dans la session 1
}

// Mettre à jour statut
await Session.updateStatus(1, 'active')

// Supprimer
await Session.delete(1)
```

---

## Migrations de Données Futures

### Stratégie de Migration

Pour les futures versions, les migrations utiliseront:

```bash
# Créer migration
npm run migrate:create "add_courses_table"

# Exécuter migrations
npm run migrate:up

# Revenir en arrière
npm run migrate:down
```

### Script Migration Example

```sql
-- migrations/001_initial_schema.sql
CREATE TABLE users (
  /* ... */
)

CREATE TABLE sessions (
  /* ... */
)

-- migrations/002_add_courses.sql
CREATE TABLE courses (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  session_id INTEGER NOT NULL,
  professor_id INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (professor_id) REFERENCES users(id)
)
```

---

## Backup et Recovery

### Créer Backup

```bash
# Backup manuel
cp ./data/horacite.db ./data/horacite.db.backup

# Avec SQLite
sqlite3 data/horacite.db ".dump" > data/backup.sql
```

### Restaurer Backup

```bash
# Depuis fichier .db
cp ./data/horacite.db.backup ./data/horacite.db

# Depuis SQL dump
sqlite3 data/horacite.db < data/backup.sql
```

### Stratégie de Backup Recommandée

```
Daily:   Backup automatique quotidien
Weekly:  Backup complet hebdomadaire
Before:  Backup avant changements majeurs
Offsite: Copie dans cloud (recommandé)
```

---

## Performance et Optimisation

### Indexes

```sql
-- Indexes actuels
CREATE INDEX idx_users_username ON users(username)
CREATE INDEX idx_users_email ON users(email)
CREATE INDEX idx_sessions_year ON sessions(year)

-- Indexes futurs (si performance issue)
CREATE INDEX idx_users_role ON users(role)
CREATE INDEX idx_sessions_status ON sessions(status)
```

### Requêtes Optimales

```javascript
// Mauvais: N+1 query
const users = await User.findAll()
users.forEach(u => u.sessions = await Session.findByUser(u.id))

// Bon: Join ou batch
const users = await User.findAllWithSessions()
```

---

Documentation des Modèles - Sprint 1, Février 2026
