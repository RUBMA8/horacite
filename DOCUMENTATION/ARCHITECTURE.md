# Architecture Technique - HoraCite

## Vue d'Ensemble Générale

HoraCite est une application web traditionnelle suivant l'architecture MVC (Model-View-Controller):

```
Client (Navigateur)
    |
    | HTTP/HTTPS
    v
Express.js Server
    |
    +-- Routes (Controllers)
    |   ├-- authRoutes.js
    |   ├-- adminRoutes.js
    |   └-- dashboardRoutes.js
    |
    +-- Middleware (Pipeline de traitement)
    |   ├-- auth.js
    |   ├-- validation.js
    |   └-- errorHandler.js
    |
    +-- Models (Logique métier)
    |   ├-- User.js
    |   └-- Session.js
    |
    +-- Views (Handlebars)
    |   ├-- Layouts
    |   ├-- Partials
    |   └-- Pages
    |
    v
SQLite Database
```

## Stack Technologique

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js (serveur web léger)
- **Engine de Templates**: Express-Handlebars (vues côté serveur)
- **Base de Données**: SQLite3
- **Authentification**: Passport.js avec stratégie LocalStrategy
- **Sessions**: Express-Session avec session store personnalisé

### Frontend
- **HTML5**: Structure sémantique
- **CSS3**: Styles personnalisés (sans framework CSS)
- **JavaScript Vanilla**: Validation et interactions client

### Outils et Dépendances
- **bcryptjs**: Hachage sécurisé des mots de passe
- **express-validator**: Validation des données
- **compression**: Compression GZIP des réponses
- **dotenv**: Gestion des variables d'environnement
- **nodemon**: Rechargement automatique en développement

## Flux de Requête

### Exemple: Authentification (Login)

```
1. Utilisateur soumet le formulaire login.hbs
                |
2. POST /auth/login
    |
3. Middleware (validation)
    - Vérifier les données
    - Nettoyer les entrées
                |
4. Route handler (authRoutes.js)
    - Appeler Passport
    - Vérifier les credentials
                |
5. Model (User.js)
    - Requête SQL SELECT
    - Vérification du hash password
                |
6. Résultat
    - Si succès: Créer session, rediriger
    - Si erreur: Message flash, rerendre formulaire
```

### Flux Général d'une Requête

```
Requête HTTP
    |
    v
Express Server reçoit la requête
    |
    v
Middleware de Session et Authentication
    - Charger session existante
    - Vérifier si utilisateur authentifié
    |
    v
Route Middleware (middleware personnalisé)
    - Validation des données
    - Contrôle d'accès RBAC
    |
    v
Route Handler (Logique métier)
    - Appeler les Models
    - Traiter les données
    |
    v
Envoi de la réponse
    - Rendre HTML (vue)
    - Ou envoyer JSON (API)
    |
    v
Client reçoit la réponse
```

## Structure des Modules

### Module 1: Authentification (RUBEN)
```
Entry Point: /auth/*
├── config/passport.js       (Stratégie d'authentification)
├── middleware/auth.js       (Middlewares auth)
├── routes/authRoutes.js     (Endpoints)
└── views/auth/              (Formulaires)
```

**Responsabilités**:
- Enregistrement et connexion utilisateur
- Gestion de session
- Authentification Passport.js
- Profil utilisateur et changement mot de passe

### Module 2: RBAC (MIRA)
```
Entry Point: Intégré dans tout l'app
├── middleware/validation.js (Contrôle d'accès)
├── models/User.js           (Rôles utilisateur)
└── views/partials/navbar.   (Navigation adaptée)
```

**Responsabilités**:
- Définir et enforcer les rôles (ADMIN, PROFESSOR, STUDENT)
- Middleware de vérification des permissions
- Afficher/masquer contenu selon le rôle
- Contrôle d'accès granulaire aux routes

### Module 3: Gestion Utilisateurs (ISIDORE)
```
Entry Point: /admin/users
├── models/User.js           (CRUD Utilisateurs)
├── routes/adminRoutes.js    (Endpoints CRUD)
└── views/admin/users/       (Formulaires CRUD)
```

**Responsabilités**:
- CRUD complet (Create, Read, Update, Delete)
- Prise de liste des utilisateurs
- Création/édition/suppression d'utilisateurs
- Attribution des rôles
- Activation/désactivation des comptes

### Module 4: Sessions Académiques (SOPHIANE)
```
Entry Point: /admin/sessions
├── models/Session.js        (CRUD Sessions)
├── routes/adminRoutes.js    (Endpoints CRUD)
└── views/admin/sessions/    (Formulaires CRUD)
```

**Responsabilités**:
- CRUD complet pour les sessions académiques
- Gestion du calendrier académique
- Définition des périodes d'étude
- Association sessions <-> utilisateurs

## Modèle de Données

### Table Users
```
id (PK)
├── username (UNIQUE)
├── email (UNIQUE)
├── password (hashed)
├── firstname
├── lastname
├── role (admin|professor|student)
├── active (boolean)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

### Table Sessions
```
id (PK)
├── name
├── year
├── startDate
├── endDate
├── description
├── status (planning|active|closed)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

## Pattern de Sécurité

### 1. Authentification
```
Password Flow:
plaintext password → bcrypt hash → stored in DB
Login: plaintext → compare with bcrypt → session
```

### 2. Contrôle d'Accès
```
Middleware Chain:
isAuthenticated (utilisateur logged in?)
    ├── isAdmin (rôle = admin?)
    ├── isProfessor (rôle = professor?)
    └── isStudent (rôle = student?)
```

### 3. Validation des Données
```
Input Validation:
Formulaire → Frontend Validation
          → Backend Validation (express-validator)
          → Sanitization (nettoyer les données)
          → Query Parameterized (prévenir SQL injection)
```

### 4. Session et Cookies
```
Session Management:
Login → Generate Session ID
     → Store in Session Store
     → Send Secure Cookie
     → Validate on each request
```

## Performance et Optimisations

### Compresser les Réponses
```javascript
app.use(compression()) // Compression GZIP
```

### Caching
```javascript
// Assets statiques (JS, CSS, images)
app.use(express.static('public', {
  maxAge: '1 day'  // Cache 1 jour
}))
```

### Database Efficiency
- Requêtes parameterized (prévenir injection SQL)
- Pagination des listes longues
- Indexes sur les colonnes fréquemment interrogées

## Gestion des Erreurs

### Stack d'Erreurs
```
Try-Catch au niveau des routes
    |
    v
Middleware d'erreur global (errorHandler.js)
    |
    v
Afficher page d'erreur appropriée
    - 404 (route non trouvée)
    - 500 (erreur serveur)
    - 403 (accès refusé)
    - 400 (données invalides)
```

## Déploiement et Scalabilité

### Mode Développement
- Nodemon rechargement automatique
- Logging détaillé
- Source maps de débogage

### Mode Production
- Code minifié
- Logs limités
- HTTPS obligatoire
- Gestion mémoire optimisée
- Session persistente (Redis recommandé)

## Points d'Extension Future

1. **API REST**: Transformer les routes en API JSON
2. **WebSockets**: Notifications en temps réel
3. **Microservices**: Séparer les modules en services
4. **Cache Redis**: Améliorer les performances
5. **Message Queue**: Traitement asynchrone des tâches
6. **Monitoring**: Logs centralisés et monitoring

## Diagramme d'Intégration des Modules

```
Utilisateur Final
    |
    +-- RUBEN (Auth)
         |
         v
    Authentification succès
         |
         +-- MIRA (RBAC)
              |
              v
         Vérification des droits
              |
              +-- ISIDORE (Users) ou SOPHIANE (Sessions)
                   |
                   v
              Opération CRUD
                   |
                   v
              Réponse utilisateur
```

---

Architecture finalisée pour Sprint 1 - Février 2026
