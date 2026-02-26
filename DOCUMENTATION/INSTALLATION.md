# Guide d'Installation - HoraCite

## Prérequis Système

- Node.js (version 14.x ou supérieure)
- npm (version 6.x ou supérieure)
- Git
- SQLite3 (inclus avec npm)
- Un éditeur de texte ou IDE (VS Code recommandé)

## Installation Étape par Étape

### Étape 1: Cloner le Dépôt

```bash
# HTTPS
git clone https://github.com/RUBMA8/horacite.git
cd horacite

# SSH (si configuré)
git clone git@github.com:RUBMA8/horacite.git
cd horacite
```

### Étape 2: Vérifier les Versions

```bash
node --version    # Doit être >= 14.0.0
npm --version     # Doit être >= 6.0.0
```

### Étape 3: Installer les Dépendances

```bash
# Installer globalement les dépendances
npm install

# Ou avec une connexion lente (installer de manière stricte)
npm ci
```

### Étape 4: Configurer les Variables d'Environnement

```bash
# Créer le fichier .env à partir du modèle
cp .env.example .env

# Éditer .env selon votre environnement
nano .env    # ou vim, ou ouvrir avec votre éditeur
```

Variables essentielles à configurer:

```ini
PORT=3000                              # Port du serveur
NODE_ENV=development                   # Mode développement
SESSION_SECRET=your_secret_key_change  # Clé de session (changer en production)
DATABASE_PATH=./data/horacite.db       # Emplacement de la base de données
```

### Étape 5: Créer la Base de Données

```bash
# Les tables seront créées automatiquement au premier démarrage
# Mais vous pouvez initialiser manuellement si nécessaire:

# Vérifier que le dossier data existe
mkdir -p data

# Les scripts de migration sont dans ./database/
# (À exécuter si la base ne se crée pas automatiquement)
```

### Étape 6: Démarrer le Serveur

#### Mode Développement (avec rechargement automatique)
```bash
npm run dev
```

#### Mode Production
```bash
npm start
```

### Étape 7: Vérifier l'Installation

Ouvrez votre navigateur et allez à: http://localhost:3000

Vous devriez voir:
- Page de login si vous êtes non authentifié
- Page d'accueil si vous êtes authentifié

## Comptes de Test par Défaut

Pour tester l'application avec des comptes prédéfinis:

```
Admin:
  - Username: admin
  - Password: admin123
  - Rôle: ADMIN

Professeur:
  - Username: prof
  - Password: prof123
  - Rôle: PROFESSOR

Étudiant:
  - Username: student
  - Password: student123
  - Rôle: STUDENT
```

**Note**: Ces comptes de test ne doivent être utilisés qu'en développement.

## Installation avec Docker (Optionnel)

Si vous avez Docker installé:

```bash
# Construire l'image
docker build -t horacite .

# Exécuter le conteneur
docker run -p 3000:3000 --env-file .env horacite
```

Note: Un Dockerfile doit être créé pour cette option.

## Vérification de l'Installation

### Vérifier les Dépendances

```bash
npm list    # Affiche la liste de toutes les dépendances
```

### Vérifier la Base de Données

```bash
# Vérifier que la base de données SQL est créée
ls -la data/horacite.db

# Ou avec SQLite CLI si installé
sqlite3 data/horacite.db ".tables"
```

### Tests de Diagnostic

```bash
# Tester la structure du projet
npm run lint   # Si un linter est configuré

# Exécuter les tests
npm test       # Si des tests sont disponibles
```

## Dépannage

### Erreur: "Cannot find module"

```bash
# Solution: Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
```

### Erreur: "EACCES" (Permission denied)

```bash
# Sous Linux/Mac, essayez avec sudo pour npm global
sudo npm install

# Ou changez les permissions
sudo chown -R $USER ~/.npm
```

### Port déjà utilisé

```bash
# Changer le port dans .env
PORT=3001    # Utiliser le port 3001 au lieu de 3000

# Ou trouver quel processus utilise le port
lsof -i :3000    # Sur Mac/Linux
netstat -ano | findstr :3000    # Sur Windows
```

### Base de Données Corrompue

```bash
# Supprimer la base de données
rm data/horacite.db

# Elle sera recréée au prochain démarrage
npm start
```

## Configuration Avancée

### Certificats SSL pour HTTPS local

Les certificats SSL sont déjà fournis dans `security/`:
- localhost.cert - Certificat auto-signé
- localhost.key - Clé privée

Pour les régénérer:

```bash
# Générer nouveau certificat auto-signé
openssl req -x509 -newkey rsa:2048 -nodes -out security/localhost.cert -keyout security/localhost.key -days 365
```

### Variables d'Environnement Avancées

```ini
# Logging
LOG_LEVEL=debug              # debug, info, warn, error

# Session
SESSION_TIMEOUT=1800000      # 30 minutes en millisecondes
COOKIE_SECURE=false          # true pour HTTPS en production

# CORS
CORS_ORIGIN=*               # * pour toutes les origines (dev seulement)

# Base de données
DB_BACKUP_ENABLED=true      # Activer les sauvegardes automatiques
DB_BACKUP_PATH=./backups    # Dossier de sauvegarde
```

## Mise à Jour du Projet

Pour mettre à jour le projet:

```bash
# Récupérer les derniers changements
git pull origin main

# Mettre à jour les dépendances
npm install

# Si des migrations de BD sont nécessaires
npm run migrate
```

## Environnements de Déploiement

### Local/Développement
```
NODE_ENV=development
DEBUG=*
SESSION_SECRET=dev_key
```

### Staging/Test
```
NODE_ENV=staging
SESSION_SECRET=strong_random_key_here
```

### Production
```
NODE_ENV=production
SESSION_SECRET=very_strong_random_key_here_256_chars
LOG_LEVEL=warn
```

## Support et Aide

- Vérifier les logs: `npm start` affiche les erreurs
- Consulter TROUBLESHOOTING.md
- Vérifier la documentation complète dans DOCUMENTATION/
