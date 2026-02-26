# Documentation du Projet HoraCite - Sprint 1

Bienvenue dans la documentation du projet HoraCite. Ce projet est une application web de gestion d'horaires académiques pour l'établissement LACITE.

## Vue d'ensemble

HoraCite est une application Node.js/Express qui permet de gérer:
- Les utilisateurs (étudiants, professeurs, administrateurs)
- Les sessions académiques
- Les horaires de cours
- Le contrôle d'accès basé sur les rôles (RBAC)

## Structure de la Documentation

### 1. [Guide d'Installation](./INSTALLATION.md)
Instructions complètes pour installer et configurer le projet localement.

### 2. [Architecture Technique](./ARCHITECTURE.md)
Description de l'architecture générale, des technologies utilisées et des patterns appliqués.

### 3. [Documentation des Modules](./MODULES.md)
Détails sur chaque module du projet:
- Module d'Authentification
- Module RBAC (Rôles et Permissions)
- Module Utilisateurs
- Module Sessions

### 4. [Routes et API](./API_ROUTES.md)
Documentation complète des points d'entrée HTTP et de leur utilisation.

### 5. [Modèles de Données](./MODELS.md)
Schéma des bases de données et description des modèles de données.

### 6. [Guide du Développeur](./CONTRIBUTING.md)
Conventions de code, processus de contribution et meilleures pratiques.

## Démarrage Rapide

Pour démarrer rapidement le projet:

```bash
# Cloner le dépôt
git clone https://github.com/RUBMA8/horacite.git
cd horacite

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env

# Démarrer le serveur
npm run dev
```

Le serveur sera accessible à: http://localhost:3000

## Technologies Utilisées

- **Runtime**: Node.js
- **Framework Web**: Express.js
- **Template Engine**: Handlebars (Express-Handlebars)
- **Base de Données**: SQLite3
- **Authentification**: Passport.js
- **Validation**: Express-Validator
- **Session Management**: Express-Session
- **Sécurité**: BCrypt pour le hachage des mots de passe

## Équipe du Sprint 1

Le développement du Sprint 1 a été réparti entre quatre développeurs:

- **RUBEN**: Module d'authentification (login, logout, profil)
- **MIRA**: Module RBAC et contrôle d'accès basé sur les rôles
- **ISIDORE**: Module CRUD pour les utilisateurs
- **SOPHIANE**: Module CRUD pour les sessions académiques

## Flux de Travail Git

```
main (branche principale)
  ├── branches feature (Ruben, Mira, Isidore, Sophiane)
  └── merge après validation
```

Chaque développeur travaille sur sa propre branche et crée une pull request pour intégration.

## Support et Questions

Pour toute question ou problème:
1. Consultez la documentation appropriée
2. Vérifiez le fichier TROUBLESHOOTING.md
3. Ouvrez une issue GitHub

## Conventions et Standards

- Langage de code: JavaScript (Node.js)
- Langue de documentation: Français
- Format de commit: Français
- Style de code: Voir CONTRIBUTING.md

## Schéma des Rôles Utilisateur

```
ADMIN
  ├── Gestion des utilisateurs
  ├── Gestion des sessions
  └── Accès à tous les modules

PROFESSOR
  ├── Consultation des sessions
  ├── Consultation des horaires
  └── Profil personnel

STUDENT
  ├── Consultation des horaires
  └── Profil personnel
```

## Points de Contact

- Coordonnateur Projet: RUBMA (Pascal)
- Documentation: Voir responsables par module

---

Documentation générée pour le Sprint 1 - Février 2026
