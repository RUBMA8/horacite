# HoraCité — Système de gestion des horaires académiques

**La Cité collégiale · Projet intégrateur · Hiver 2026**

> Application web MVC permettant aux responsables administratifs et administrateurs système de planifier, gérer et optimiser les horaires académiques de La Cité collégiale, avec détection automatique des conflits en temps réel.

---

## Table des matières

- [Présentation](#présentation)
- [Fonctionnalités](#fonctionnalités)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Exécution](#exécution)
- [Organisation du projet](#organisation-du-projet)
- [Rôles et accès](#rôles-et-accès)
- [Équipe](#équipe)

---

## Présentation

HoraCité centralise la planification académique de La Cité collégiale. Il permet de gérer les cours, les salles (par pavillon et niveau), les professeurs et leurs disponibilités, ainsi que les sessions académiques, tout en prévenant automatiquement les conflits d'affectation.

**Utilisateurs cibles :** administrateur système et responsable administratif (aucun accès direct pour étudiants ou professeurs dans cette version).

---

## Fonctionnalités

| Module | Capacités |
|---|---|
| **Authentification** | Connexion sécurisée, sessions 30 min, rôles |
| **Tableau de bord** | Statistiques globales, activité récente |
| **Cours** | Création, modification, archivage, filtres |
| **Salles** | Gestion par pavillon/niveau, accessibilité PMR, disponibilité temps réel |
| **Professeurs** | Profils, spécialités, disponibilités hebdomadaires |
| **Horaires** | Affectation cours-salle-professeur, détection de conflits |
| **Sessions académiques** | Cycles automne/hiver/été, états planification/active/terminée |
| **Administration** | Gestion des utilisateurs, logs d'audit |

---

## Prérequis

- **Node.js** v18 ou supérieur (testé sur v22)
- **npm** v9 ou supérieur
- Système : macOS, Linux ou Windows

---

## Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/RUBMA8/horacite.git
cd horacite

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Puis éditer .env (voir section Configuration)
```

---

## Configuration

Créer un fichier `.env` à la racine (ne jamais le versionner) :

```env
# Environnement
NODE_ENV=development

# Serveur
PORT=3000

# Sessions
SESSION_SECRET=remplacer_par_une_chaine_aleatoire_longue
SESSION_TIMEOUT=1800000

# Base de données (chemin relatif ou absolu)
DATABASE_PATH=./database/horacite.db

# CORS (laisser vide en développement local)
CORS_ORIGIN=
```

Un fichier `.env.example` est fourni avec toutes les clés disponibles.

---

## Exécution

```bash
# Démarrage standard
npm start

# Démarrage avec rechargement automatique (développement)
npm run dev
```

Le serveur démarre sur `http://localhost:3000` par défaut.

**Comptes de démonstration :**

| Rôle | Matricule | Mot de passe |
|---|---|---|
| Administrateur | ADMIN001 | Admin1234! |
| Responsable | RESP001 | Resp1234! |

> Le mot de passe doit être changé à la première connexion.

---

## Organisation du projet

```
horacite/
├── config/
│   ├── database.js          # Initialisation SQLite et schéma
│   └── passport.js          # Stratégie d'authentification Passport
├── database/
│   └── horacite.db          # Base de données SQLite (générée au démarrage)
├── middleware/
│   ├── auth.js              # Garde d'authentification et de rôles
│   ├── errorHandler.js      # Gestionnaire d'erreurs global
│   └── validation.js        # Validation des entrées
├── models/
│   ├── User.js              # Utilisateurs et authentification
│   ├── Cours.js             # Cours académiques
│   ├── Salle.js             # Salles et disponibilités
│   ├── Professeur.js        # Professeurs et disponibilités
│   ├── Horaire.js           # Horaires et détection de conflits
│   ├── Session.js           # Sessions académiques
│   ├── Pavillon.js          # Pavillons du campus
│   └── index.js             # Export centralisé
├── routes/
│   ├── authRoutes.js        # /auth — connexion/déconnexion
│   ├── dashboardRoutes.js   # /dashboard
│   ├── adminRoutes.js       # /admin — utilisateurs, sessions, audit
│   ├── coursRoutes.js       # /cours
│   ├── sallesRoutes.js      # /salles
│   ├── professeursRoutes.js # /professeurs
│   └── horairesRoutes.js    # /horaires
├── views/
│   ├── layouts/main.hbs     # Layout principal Bootstrap 5
│   ├── partials/            # Navbar, sidebar, messages
│   ├── auth/                # Login
│   ├── admin/               # Dashboard admin, utilisateurs, sessions
│   ├── cours/               # CRUD cours
│   ├── salles/              # CRUD salles
│   ├── professeurs/         # CRUD professeurs + disponibilités
│   └── horaires/            # Planificateur et vue calendrier
├── public/
│   ├── css/                 # Styles personnalisés
│   └── js/                  # Scripts client
├── DOCUMENTATION/           # Diagrammes, CDC, guides
├── server.js                # Point d'entrée principal
├── package.json
└── .env.example
```

---

---

## Équipe

| Nom | Matricule | Rôle |
|---|---|---|
| Ruben-Marie Bouakaly | 2742806 | Chef de projet / développeur |
| Mira Allaoua | 2732107 | Développeuse |
| Isidore Pascal Ombolo | 2740115 | Développeur |
| Sofiane Bouyoucef | 2726522 | Développeur |

**Dépôt Git :** https://github.com/RUBMA8/horacite  
**Suivi JIRA :** https://rcustoms.atlassian.net/jira/software/projects/SCRUM/boards/1  
**Institution :** La Cité collégiale — Hiver 2026
