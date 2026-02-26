# Documentation des Modules - HoraCite

## Vue d'Ensemble des Modules

Le projet est organisé en 4 modules fonctionnels principaux, chacun développé par un membre de l'équipe.

---

## Module 1: Authentification (RUBEN)

### Description
Gère l'authentification des utilisateurs, la gestion de session et les profils utilisateur.

### Fichiers Principaux
```
config/passport.js              # Stratégie Passport LocalStrategy
middleware/auth.js              # Middlewares d'authentification
routes/authRoutes.js            # Endpoints d'authentification
views/auth/                     # Vues d'authentification
```

### Fonctionnalités

#### 1. Login (Connexion)
- **Route**: `POST /auth/login`
- **Formulaire**: `views/auth/login.hbs`
- **Processus**:
  1. Utilisateur soumet username et password
  2. Passport vérifie les credentials
  3. Bcrypt compare les hashs
  4. Session créée si credentials OK
  5. Redirection vers dashboard

#### 2. Logout (Déconnexion)
- **Route**: `GET /auth/logout`
- **Comportement**: Détruit la session et redirige vers login

#### 3. Profile (Profil Utilisateur)
- **Route**: `GET /auth/profile`
- **Formulaire**: `views/auth/profile.hbs`
- **Affichage**: Informations utilisateur (read-only initialement)

#### 4. Change Password (Changement de Mot de Passe)
- **Route**: `POST /auth/change-password`
- **Formulaire**: `views/auth/change-password.hbs`
- **Validation**:
  - Ancien mot de passe correct
  - Nouveau mot de passe conforme

### Middleware Disponibles

```javascript
// Vérifier si utilisateur authentifié
middleware/auth.js:
  - isAuthenticated()    // Redirige vers login si non auth

// Utilisé dans d'autres modules
middleware/validation.js:
  - isAdmin()           // Vérifie rôle admin
  - requireRole()       // Vérifie un rôle spécifique
```

### Config Passport

```javascript
// LocalStrategy: username/password
passport.use(new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password'
}, (username, password, done) => {
  // Vérifier utilisateur dans BD
}))

// Serialization de session
passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser((id, done) => {
  // Récupérer utilisateur de BD
})
```

---

## Module 2: RBAC - Rôles et Contrôle d'Accès (MIRA)

### Description
Implémente le contrôle d'accès basé sur les rôles (Role-Based Access Control).

### Fichiers Principaux
```
middleware/validation.js        # Middlewares de validation et RBAC
models/User.js                  # Modèle Utilisateur avec rôles
views/partials/navbar.hbs       # Navigation adaptée par rôle
```

### Rôles Utilisateur

#### 1. ADMIN
- Accès total à l'application
- Gestion des utilisateurs
- Gestion des sessions
- Tableau de bord administrateur
- Permissions spéciales

#### 2. PROFESSOR
- Consultation des sessions
- Consultation des horaires
- Profil personnel
- Consultation des utilisateurs

#### 3. STUDENT
- Consultation des horaires
- Profil personnel
- Lectures uniquement (pas de modifications)

### Middleware de Contrôle d'Accès

```javascript
// Basique: vérifier authentification
app.use(middleware.isAuthenticated)

// Spécifique aux rôles
app.get('/admin', middleware.requireRole('ADMIN'), ...)
app.get('/professor', middleware.requireRole('PROFESSOR'), ...)

// Middleware chaîné
router.get('/users',
  middleware.isAuthenticated,
  middleware.requireRole('ADMIN'),
  controller.listUsers
)
```

### Navigation Dynamique

Le fichier `views/partials/navbar.hbs` affiche différents menus selon le rôle:

```handlebars
<!-- Visible pour tous -->
<a href="/auth/profile">Profil</a>

<!-- Admin seulement -->
{{#if isAdmin}}
  <a href="/admin">Tableau de Bord Admin</a>
  <a href="/admin/users">Utilisateurs</a>
  <a href="/admin/sessions">Sessions</a>
{{/if}}

<!-- Professor et Admin -->
{{#if isProfessorOrAdmin}}
  <a href="/dashboard">Tableau de Bord</a>
{{/if}}
```

### Implémentation dans User Model

```javascript
// Dans models/User.js
User.prototype.isAdmin = function() {
  return this.role === 'ADMIN'
}

User.prototype.hasPermission = function(permission) {
  const roles = {
    'ADMIN': ['read', 'write', 'delete', 'admin'],
    'PROFESSOR': ['read', 'write'],
    'STUDENT': ['read']
  }
  return roles[this.role].includes(permission)
}
```

---

## Module 3: Gestion Utilisateurs (ISIDORE)

### Description
Implémente le CRUD complet (Create, Read, Update, Delete) pour les utilisateurs.

### Fichiers Principaux
```
models/User.js                  # Modèle Utilisateur CRUD
routes/adminRoutes.js           # Routes d'administration
views/admin/users/              # Vues pour utilisateurs
```

### Opérations CRUD

#### Create (Créer Utilisateur)
- **Route**: `GET /admin/users/create` (formulaire)
- **Route**: `POST /admin/users/create` (traitement)
- **Formulaire**: `views/admin/users/create.hbs`
- **Champs**:
  - username (unique)
  - email (unique)
  - password
  - firstname
  - lastname
  - role (select: admin/professor/student)
- **Validation**:
  - Username unique
  - Email valide
  - Password sécurisé (min 8 chars)

#### Read (Lire Utilisateurs)
- **Liste**: `GET /admin/users`
  - Affiche tous les utilisateurs avec pagination
  - Formulaire `views/admin/users/list.hbs`
  - Options: filtrer, trier, pagination
- **Détail**: `GET /admin/users/:id`
  - Affiche les détails d'un utilisateur

#### Update (Modifier Utilisateur)
- **Route**: `GET /admin/users/:id/edit` (formulaire)
- **Route**: `POST /admin/users/:id/edit` (traitement)
- **Formulaire**: `views/admin/users/edit.hbs`
- **Champs modifiables**:
  - firstname, lastname
  - email
  - role
  - active (activation/désactivation)
- **Note**: Mot de passe modifiable séparément

#### Delete (Supprimer Utilisateur)
- **Route**: `POST /admin/users/:id/delete`
- **Comportement**: Soft delete (marquer comme inactif)
- **Alternative**: Hard delete optionnel

### Méthodes Model User

```javascript
// Créer
User.create(data)

// Lire (un)
User.findById(id)
User.findByUsername(username)
User.findByEmail(email)

// Lire (tous)
User.findAll()
User.findAllPaginated(page, limit)
User.findByRole(role)

// Mettre à jour
User.update(id, data)
User.updatePassword(id, newPassword)

// Supprimer
User.delete(id)          // Soft delete
User.destroy(id)         // Vrai suppression

// Utilitaires
User.hashPassword(password)
User.verifyPassword(plaintext, hashed)
User.exists(username)
```

### Contrôle d'Accès
```
Seul ADMIN peut:
- Créer utilisateur
- Lister tous les utilisateurs
- Modifier utilisateurs
- Supprimer utilisateurs
```

---

## Module 4: Sessions Académiques (SOPHIANE)

### Description
Gère les sessions académiques (années scolaires, semestres, périodes d'études).

### Fichiers Principaux
```
models/Session.js               # Modèle Session CRUD
routes/adminRoutes.js           # Routes d'administration
views/admin/sessions/           # Vues pour sessions
```

### Structure d'une Session

Une session académique contient:
- Nom (ex: "2025-2026", "Semestre 1")
- Année académique
- Date de début
- Date de fin
- Description
- Statut (planning, active, closed)

### Opérations CRUD

#### Create (Créer Session)
- **Route**: `GET /admin/sessions/create`
- **Route**: `POST /admin/sessions/create`
- **Formulaire**: `views/admin/sessions/create.hbs`
- **Champs**:
  - name (requis)
  - year (année académique)
  - startDate (date de début)
  - endDate (date de fin)
  - description (optionnel)
  - status (planning|active|closed)

#### Read (Lire Sessions)
- **Liste**: `GET /admin/sessions`
  - Affiche toutes les sessions avec pagination
  - Filtre par statut
  - Tri par date
- **Détail**: `GET /admin/sessions/:id`
  - Affiche les détails d'une session

#### Update (Modifier Session)
- **Route**: `GET /admin/sessions/:id/edit`
- **Route**: `POST /admin/sessions/:id/edit`
- **Formulaire**: `views/admin/sessions/edit.hbs`
- **Champs modifiables**:
  - nom, dates, description
  - statut (planning -> active -> closed)

#### Delete (Supprimer Session)
- **Route**: `POST /admin/sessions/:id/delete`
- **Restriction**: Pas suppression si session active ou contient des participations

### Méthodes Model Session

```javascript
// Créer
Session.create(data)

// Lire (un)
Session.findById(id)
Session.findByYear(year)

// Lire (tous)
Session.findAll()
Session.findAllPaginated(page, limit)
Session.findByStatus(status)
Session.getActiveSession()

// Mettre à jour
Session.update(id, data)
Session.updateStatus(id, newStatus)

// Supprimer
Session.delete(id)          // Soft delete
Session.destroy(id)         // Vrai suppression

// Utilitaires
Session.isActive(sessionId)
Session.isBetweenDates(date, sessionId)
Session.checkConflict(startDate, endDate)
```

### Workflow de Statut Session

```
PLANNING
  (session planifiée, pas encore commencée)
  |
  v
ACTIVE
  (session en cours)
  |
  v
CLOSED
  (session terminée)
```

### Contrôle d'Accès
```
Admin peut:
- Créer/modifier/supprimer sessions
- Activer/clôturer sessions

PROFESSOR peut:
- Consulter sessions actives
- Voir détails de leur session

STUDENT peut:
- Consulter sessions actives
```

---

## Intégration Entre Modules

### Flow Complet d'Authentification et Autorisation

```
1. Utilisateur accès /admin/users

2. RUBEN Module (Auth):
   - Middleware isAuthenticated
   - Vérifier session valide
   - Récupérer user.id de session

3. MIRA Module (RBAC):
   - Middleware requireRole('ADMIN')
   - Vérifier user.role === 'ADMIN'
   - Si non: 403 Forbidden

4. ISIDORE Module (Users):
   - Si autorisé: afficher liste

5. Réponse:
   - HTML avec navbar du rôle (MIRA)
   - Contenu admin (ISIDORE)
```

### Dépendances Entre Modules

```
RUBEN (Auth)
  - Dépend de: aucun module
  - Utilisé par: MIRA, ISIDORE, SOPHIANE

MIRA (RBAC)
  - Dépend de: RUBEN (user authentifié)
  - Utilisé par: ISIDORE, SOPHIANE

ISIDORE (Users)
  - Dépend de: RUBEN, MIRA
  - Utilisé par: MIRA (données de rôles)

SOPHIANE (Sessions)
  - Dépend de: RUBEN, MIRA
  - Utilisé par: Aucun autre module
```

---

## Convention de Nommage

### Routes
```
GET    /resource              - Récupérer liste
GET    /resource/:id          - Récupérer détail
GET    /resource/create       - Afficher formulaire création
POST   /resource/create       - Traiter création
GET    /resource/:id/edit     - Afficher formulaire édition
POST   /resource/:id/edit     - Traiter édition
POST   /resource/:id/delete   - Supprimer ressource
```

### Vues Handlebars
```
views/[module]/[action].hbs

views/auth/login.hbs
views/admin/users/list.hbs
views/admin/sessions/edit.hbs
```

### Middleware
```
middleware/[fonctionnalite].js

middleware/auth.js            - Authentification
middleware/validation.js      - Validation et RBAC
middleware/errorHandler.js    - Gestion erreurs
```

---

Documentation des modules - Sprint 1, Février 2026
