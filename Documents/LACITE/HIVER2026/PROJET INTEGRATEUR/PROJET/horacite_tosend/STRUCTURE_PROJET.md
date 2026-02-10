# 📁 Structure de Base pour Main (Sprint 1)

## Arborescence Complète

```
HoraCite/
│
├── config/
│   ├── database.js              # Configuration SQLite (✅ COMPLET)
│   ├── passport.js              # Config Passport (⏳ RUBEN)
│   └── index.js                 # Export des configs
│
├── middleware/
│   ├── auth.js                  # Middlewares auth (⏳ RUBEN)
│   ├── errorHandler.js          # Gestion erreurs (✅ COMPLET)
│   ├── validation.js            # Validation & contrôle accès (⏳ MIRA)
│   └── index.js                 # Export des middlewares
│
├── models/
│   ├── User.js                  # Modèle Utilisateur (⏳ RUBEN + MIRA + ISIDORE)
│   ├── Session.js               # Modèle Session (⏳ SOPHIANE)
│   └── index.js                 # Export des modèles (✅ COMPLET)
│
├── routes/
│   ├── authRoutes.js            # Routes auth (⏳ RUBEN)
│   ├── adminRoutes.js           # Routes admin (⏳ ISIDORE + SOPHIANE)
│   ├── dashboardRoutes.js       # Routes dashboard (✅ BASIQUE)
│   └── index.js                 # Agrégateur routes
│
├── views/
│   ├── layouts/
│   │   ├── main.hbs             # Layout principal (✅ COMPLET)
│   │   └── auth.hbs             # Layout auth (✅ COMPLET)
│   │
│   ├── partials/
│   │   ├── navbar.hbs           # Navigation (⏳ AUGMENTER par MIRA)
│   │   ├── sidebar.hbs          # Sidebar (✅ COMPLET)
│   │   ├── footer.hbs           # Footer (✅ COMPLET)
│   │   ├── flash-messages.hbs   # Messages (✅ COMPLET)
│   │   └── pagination.hbs       # Pagination (✅ COMPLET)
│   │
│   ├── auth/
│   │   ├── login.hbs            # Page login (⏳ RUBEN)
│   │   ├── profile.hbs          # Page profile (⏳ RUBEN)
│   │   └── change-password.hbs  # Page changement pwd (⏳ RUBEN)
│   │
│   ├── admin/
│   │   ├── index.hbs            # Page admin principale (⏳ ISIDORE)
│   │   ├── users/
│   │   │   ├── list.hbs         # Listage users (⏳ ISIDORE)
│   │   │   ├── create.hbs       # Création user (⏳ ISIDORE)
│   │   │   └── edit.hbs         # Édition user (⏳ ISIDORE)
│   │   └── sessions/
│   │       ├── list.hbs         # Listage sessions (⏳ SOPHIANE)
│   │       ├── create.hbs       # Création session (⏳ SOPHIANE)
│   │       └── edit.hbs         # Édition session (⏳ SOPHIANE)
│   │
│   ├── dashboard/
│   │   └── index.hbs            # Dashboard principal (✅ BASIQUE)
│   │
│   └── errors/
│       ├── 404.hbs              # Erreur 404 (✅ COMPLET)
│       └── 500.hbs              # Erreur 500 (✅ COMPLET)
│
├── public/
│   ├── js/
│   │   ├── main.js              # Scripts généraux (✅ COMPLET)
│   │   └── validation.js        # Validation côté client (✅ COMPLET)
│   ├── css/
│   │   └── style.css            # Styles (✅ COMPLET)
│   └── images/
│
├── server.js                    # Serveur principal (✅ À adapter)
├── package.json                 # Dépendances (✅ COMPLET)
├── .env.example                 # Variables d'env (✅ COMPLET)
├── .gitignore                   # Ignorer fichiers (✅ COMPLET)
│
└── README.md                    # Documentation (✅ À jour)
```

---

## 📋 Checklist d'Implémentation

### RUBEN - Authentification
- [ ] `config/passport.js` - Stratégie LocalStrategy
- [ ] `middleware/auth.js` - Middlewares isAuthenticated, isAdmin
- [ ] `routes/authRoutes.js` - Routes login/logout/profile/changePassword
- [ ] `views/auth/login.hbs`
- [ ] `views/auth/profile.hbs`
- [ ] `views/auth/change-password.hbs`

### MIRA - Rôles & Contrôle d'Accès
- [ ] `middleware/validation.js` - Middlewares requireAdmin, requireRole
- [ ] Augmenter `models/User.js` - Ajouter role et méthodes
- [ ] Augmenter `views/partials/navbar.hbs` - Navigation par rôle

### ISIDORE - CRUD Utilisateurs
- [ ] `models/User.js` - Méthodes CRUD complètes
- [ ] `routes/adminRoutes.js` (partie users) - Routes CRUD
- [ ] `views/admin/index.hbs` - Page admin principale
- [ ] `views/admin/users/list.hbs`
- [ ] `views/admin/users/create.hbs`
- [ ] `views/admin/users/edit.hbs`

### SOPHIANE - Sessions Académiques
- [ ] `models/Session.js` - Méthodes CRUD complètes
- [ ] `routes/adminRoutes.js` (partie sessions) - Routes CRUD
- [ ] `views/admin/sessions/list.hbs`
- [ ] `views/admin/sessions/create.hbs`
- [ ] `views/admin/sessions/edit.hbs`

---

## 🔗 Dépendances Between Tasks

```
RUBEN (Authentification)
    ↓
MIRA (Rôles & Validation)
    ↓
ISIDORE (CRUD Users) +  SOPHIANE (Sessions)
    ↓
MERGE INTO MAIN
```

---

## 🚀 Démarrage

```bash
# Installer dépendances
npm install

# Créer .env depuis .env.example
cp .env.example .env

# Démarrer le serveur
npm start
```

---

## 📝 Variables d'Environnement (.env)

```
PORT=3000
NODE_ENV=development
DATABASE_PATH=./data/horacite.db
SESSION_SECRET=your_secret_key_here
SESSION_TIMEOUT=1800000
CORS_ORIGIN=*
```

