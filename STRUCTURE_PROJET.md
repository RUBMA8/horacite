# Structure du Projet HoraCite - Sprint 1

## Arborescence Complète

```
HoraCite_sp1/
│
├── config/
│   ├── database.js              # Configuration SQLite
│   ├── passport.js              # Configuration Passport (Stratégie LocalStrategy)
│   └── index.js                 # Export des configurations
│
├── middleware/
│   ├── auth.js                  # Middlewares d'authentification
│   ├── errorHandler.js          # Gestion globale des erreurs
│   ├── validation.js            # Validation des données et contrôle d'accès
│   └── (importés dans server.js)
│
├── models/
│   ├── User.js                  # Modèle Utilisateur avec méthodes CRUD
│   ├── Session.js               # Modèle Session Académique avec méthodes CRUD
│   └── index.js                 # Export centralisé des modèles
│
├── routes/
│   ├── authRoutes.js            # Routes d'authentification (login, logout, profile)
│   ├── adminRoutes.js           # Routes d'administration (gestion users et sessions)
│   ├── dashboardRoutes.js       # Routes du tableau de bord
│   └── (agrégées dans server.js)
│
├── views/
│   ├── layouts/
│   │   ├── main.hbs             # Layout principal pour pages authentifiées
│   │   └── auth.hbs             # Layout pour pages d'authentification
│   │
│   ├── partials/
│   │   ├── navbar.hbs           # Barre de navigation
│   │   ├── sidebar.hbs          # Barre latérale avec menu
│   │   ├── footer.hbs           # Pied de page
│   │   ├── flash-messages.hbs   # Affichage des messages flash
│   │   └── pagination.hbs       # Composant pagination
│   │
│   ├── auth/
│   │   ├── login.hbs            # Formulaire de connexion
│   │   ├── profile.hbs          # Page profil utilisateur
│   │   └── change-password.hbs  # Formulaire changement de mot de passe
│   │
│   ├── admin/
│   │   ├── index.hbs            # Tableau de bord administrateur
│   │   ├── users/
│   │   │   ├── list.hbs         # Listage des utilisateurs
│   │   │   ├── create.hbs       # Formulaire création utilisateur
│   │   │   └── edit.hbs         # Formulaire édition utilisateur
│   │   └── sessions/
│   │       ├── list.hbs         # Listage des sessions
│   │       ├── create.hbs       # Formulaire création session
│   │       └── edit.hbs         # Formulaire édition session
│   │
│   ├── dashboard/
│   │   └── index.hbs            # Tableau de bord principal
│   │
│   └── errors/
│       ├── 404.hbs              # Page erreur 404
│       └── 500.hbs              # Page erreur 500
│
├── public/
│   ├── js/
│   │   ├── main.js              # Scripts côté client généraux
│   │   └── validation.js        # Validation des formulaires côté client
│   ├── css/
│   │   └── style.css            # Styles personnalisés
│   ├── images/                  # Dossier pour les images
│   └── favicon.svg              # Icône de site
│
├── security/
│   ├── localhost.cert           # Certificat SSL local
│   └── localhost.key            # Clé privée SSL locale
│
├── database/                    # Dossier pour les bases de données
│
├── server.js                    # Point d'entrée principal du serveur Express
├── package.json                 # Dépendances npm du projet
├── .env                         # Variables d'environnement (local, non versioné)
├── .env.example                 # Exemple de variables d'environnement
├── .gitignore                   # Fichiers à ignorer dans git
│
└── DOCUMENTATION/               # Documentation du projet
```

---

## Checklist d'Implémentation - Sprint 1

### Module Authentification (RUBEN)
- [x] config/passport.js - Stratégie LocalStrategy
- [x] middleware/auth.js - Middlewares isAuthenticated, isAdmin
- [x] routes/authRoutes.js - Routes login/logout/profile/changePassword
- [x] views/auth/login.hbs
- [x] views/auth/profile.hbs
- [x] views/auth/change-password.hbs

### Module RBAC (MIRA)
- [x] middleware/validation.js - Middlewares de validation et contrôle d'accès
- [x] models/User.js - Modèle avec rôles et méthodes
- [x] views/partials/navbar.hbs - Navigation adaptée par rôle

### Module CRUD Utilisateurs (ISIDORE)
- [x] models/User.js - Implémentation CRUD complète
- [x] routes/adminRoutes.js - Routes CRUD utilisateurs
- [x] views/admin/index.hbs - Page admin principale
- [x] views/admin/users/list.hbs - Listage utilisateurs
- [x] views/admin/users/create.hbs - Création utilisateur
- [x] views/admin/users/edit.hbs - Édition utilisateur

### Module Sessions Académiques (SOPHIANE)
- [x] models/Session.js - Implémentation CRUD sessions
- [x] routes/adminRoutes.js - Routes CRUD sessions
- [x] views/admin/sessions/list.hbs - Listage sessions
- [x] views/admin/sessions/create.hbs - Création session
- [x] views/admin/sessions/edit.hbs - Édition session

---

## Ordonnancement des Dépendances

```
RUBEN (Authentification)
    |
    v
MIRA (Rôles et Validation)
    |
    +---------+
    |         |
    v         v
ISIDORE    SOPHIANE
(Users)    (Sessions)
    |         |
    +----+----+
         v
      MAIN BRANCH
```

---

## Configuration et Démarrage

### Installation
```bash
# Installer les dépendances npm
npm install

# Créer fichier .env à partir du template
cp .env.example .env
```

### Démarrage du serveur
```bash
# Développement (avec nodemon)
npm run dev

# Production
npm start
```

### HTTPS local
Le serveur utilise des certificats SSL auto-signés situés dans `security/`:
- localhost.cert - Certificat
- localhost.key - Clé privée

---

## Variables d'Environnement

Fichier `.env` (créer à partir de `.env.example`):

```ini
# Serveur
PORT=3000
NODE_ENV=development
HTTPS_PORT=3001

# Base de données
DATABASE_PATH=./data/horacite.db
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=

# Session et Sécurité
SESSION_SECRET=horacite_secret_key_change_in_production
SESSION_TIMEOUT=1800000

# CORS et configuration
CORS_ORIGIN=*
LOG_LEVEL=info
```

---

## Structure des Données

### Utilisateur
- id (INTEGER PRIMARY KEY)
- username (TEXT UNIQUE)
- email (TEXT UNIQUE)
- password (TEXT, hashed)
- firstname (TEXT)
- lastname (TEXT)
- role (TEXT: admin, professor, student)
- active (BOOLEAN)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)

### Session
- id (INTEGER PRIMARY KEY)
- name (TEXT)
- year (INTEGER)
- startDate (DATE)
- endDate (DATE)
- description (TEXT)
- status (TEXT: planning, active, closed)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)

