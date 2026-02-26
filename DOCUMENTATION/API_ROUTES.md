# Routes et API - HoraCite

## Vue d'Ensemble des Routes

Répertoire complet de tous les endpoints HTTP disponibles dans l'application.

---

## Routes d'Authentification (prefix: /auth)

### Afficher Formulaire de Login
```
GET /auth/login
Description: Affiche la page de connexion
Authentification requise: Non
Rôle requis: N/A
Réponse: HTML (login.hbs)
Parameters: Aucun
```

### Login (Connexion)
```
POST /auth/login
Description: Traite la connexion utilisateur
Authentification requise: Non
Rôle requis: N/A

Données POST:
{
  "username": "admin",
  "password": "admin123"
}

Réponses possibles:
201 Created: Connexion succès, redirection /dashboard
400 Bad Request: Données invalides
401 Unauthorized: Username/password incorrect

Exemple cURL:
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Logout (Déconnexion)
```
GET /auth/logout
Description: Termine la session utilisateur
Authentification requise: Oui
Rôle requis: Aucun

Réponses possibles:
302 Found: Redirection vers /auth/login
401 Unauthorized: Utilisateur non authentifié

Exemple cURL:
curl -X GET http://localhost:3000/auth/logout
```

### Afficher Profil Utilisateur
```
GET /auth/profile
Description: Affiche le profil de l'utilisateur connecté
Authentification requise: Oui
Rôle requis: Aucun
Réponse: HTML (profile.hbs)

Affiche:
- Username
- Email
- Prénom/Nom
- Rôle
- Date de création du compte
```

### Formulaire Changement Mot de Passe
```
GET /auth/change-password
Description: Affiche le formulaire de changement de mot de passe
Authentification requise: Oui
Rôle requis: Aucun
Réponse: HTML (change-password.hbs)
```

### Changer Mot de Passe
```
POST /auth/change-password
Description: Change le mot de passe de l'utilisateur
Authentification requise: Oui
Rôle requis: Aucun

Données POST:
{
  "currentPassword": "oldpass123",
  "newPassword": "newpass456",
  "confirmPassword": "newpass456"
}

Réponses possibles:
200 OK: Mot de passe changé avec succès
400 Bad Request: Données invalides ou ancien mot de passe incorrect
422 Unprocessable Entity: Confirmation mismatch

Validations:
- Ancien mot de passe correct
- Nouveau mot de passe min 8 caractères
- Nouveau et confirmation identiques
- Nouveau mot de passe différent de l'ancien
```

---

## Routes de Dashboard

### Dashboard Principal
```
GET /dashboard
Description: Affiche le tableau de bord principal
Authentification requise: Oui
Rôle requis: Aucun (accessible par PROFESSOR et STUDENT)

Réponse: HTML (dashboard/index.hbs)

Affiche:
- Bienvenue utilisateur
- Sessions actives
- Horaires du jour
- Informations personnelles
```

---

## Routes d'Administration (prefix: /admin)

Toutes les routes /admin requièrent:
- Authentification: Oui
- Rôle: ADMIN

### Liste des Utilisateurs
```
GET /admin/users
Description: Affiche la liste paginée des utilisateurs
Authentification requise: Oui (ADMIN)

Query Parameters:
- page (int, default: 1): Numéro de page
- limit (int, default: 10): Nombre par page
- role (string): Filtrer par rôle
- search (string): Rechercher par username/email

Réponse: HTML (admin/users/list.hbs)

Affiche:
- Tableau des utilisateurs avec rôles
- Liens édition/suppression
- Pagination
- Formulaire de recherche

Exemple:
GET /admin/users?page=2&limit=15&role=PROFESSOR
```

### Détails Utilisateur
```
GET /admin/users/:id
Description: Affiche les détails d'un utilisateur
Authentification requise: Oui (ADMIN)

URL Parameters:
- id (int): ID de l'utilisateur

Réponse: HTML

Affiche:
- Toutes les informations utilisateur
- Statut (actif/inactif)
- Date de création
```

### Formulaire Créer Utilisateur
```
GET /admin/users/create
Description: Affiche le formulaire de création d'utilisateur
Authentification requise: Oui (ADMIN)

Réponse: HTML (admin/users/create.hbs)
```

### Créer Utilisateur
```
POST /admin/users/create
Description: Crée un nouvel utilisateur
Authentification requise: Oui (ADMIN)

Données POST:
{
  "username": "new_user",
  "email": "user@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "firstname": "Jean",
  "lastname": "Dupont",
  "role": "STUDENT"
}

Réponses possibles:
201 Created: Utilisateur créé avec succès, redirection /admin/users
400 Bad Request: Données invalides
409 Conflict: Username ou email déjà existant

Validations:
- Username unique et min 3 caractères
- Email unique et format valide
- Password min 8 caractères
- Tous les champs requis
- Role valide (ADMIN, PROFESSOR, STUDENT)
```

### Formulaire Éditer Utilisateur
```
GET /admin/users/:id/edit
Description: Affiche le formulaire d'édition
Authentification requise: Oui (ADMIN)

URL Parameters:
- id (int): ID de l'utilisateur

Réponse: HTML (admin/users/edit.hbs)

Pré-remplissage:
- Tous les champs actuels
- Mot de passe vide (optionnel)
```

### Éditer Utilisateur
```
POST /admin/users/:id/edit
Description: Met à jour les informations utilisateur
Authentification requise: Oui (ADMIN)

URL Parameters:
- id (int): ID de l'utilisateur

Données POST:
{
  "email": "newemail@example.com",
  "firstname": "Jean",
  "lastname": "Martin",
  "role": "PROFESSOR",
  "active": true,
  "password": "" (optionnel, vide = pas de changement)
}

Réponses possibles:
200 OK: Utilisateur mis à jour
400 Bad Request: Données invalides
404 Not Found: Utilisateur non trouvé
409 Conflict: Email déjà existant

Validations:
- Email doit être unique (sauf le sien)
- Password optionnel (si vide, ne change pas)
- Role valide
```

### Supprimer Utilisateur
```
POST /admin/users/:id/delete
Description: Supprime un utilisateur (soft delete)
Authentification requise: Oui (ADMIN)

URL Parameters:
- id (int): ID de l'utilisateur

Réponses possibles:
200 OK: Utilisateur supprimé (marqué inactif)
404 Not Found: Utilisateur non trouvé
403 Forbidden: Impossible de supprimer admin soi-même

Comportement:
- Marque l'utilisateur comme inactif
- Ne supprime pas vraiment de la BD
- Utilisateur ne peut plus se connecter
```

---

## Routes Sessions Académiques (prefix: /admin/sessions)

Toutes les routes /admin/sessions requièrent:
- Authentification: Oui
- Rôle: ADMIN

### Liste des Sessions
```
GET /admin/sessions
Description: Affiche la liste paginée des sessions
Authentification requise: Oui (ADMIN)

Query Parameters:
- page (int, default: 1): Numéro de page
- limit (int, default: 10): Nombre par page
- status (string): Filtrer par statut (planning|active|closed)
- year (int): Filtrer par année

Réponse: HTML (admin/sessions/list.hbs)

Affiche:
- Tableau des sessions
- Statut de chaque session
- Dates de début/fin
- Liens édition/suppression
- Pagination

Exemple:
GET /admin/sessions?page=1&status=active
```

### Détails Session
```
GET /admin/sessions/:id
Description: Affiche les détails d'une session
Authentification requise: Oui (ADMIN)

URL Parameters:
- id (int): ID de la session

Réponse: HTML

Affiche:
- Toutes les informations de la session
- Nombre de participants
- Horaires associés
```

### Formulaire Créer Session
```
GET /admin/sessions/create
Description: Affiche le formulaire de création de session
Authentification requise: Oui (ADMIN)

Réponse: HTML (admin/sessions/create.hbs)
```

### Créer Session
```
POST /admin/sessions/create
Description: Crée une nouvelle session académique
Authentification requise: Oui (ADMIN)

Données POST:
{
  "name": "Année 2025-2026",
  "year": 2025,
  "startDate": "2025-09-01",
  "endDate": "2026-06-30",
  "description": "Année académique complète",
  "status": "planning"
}

Réponses possibles:
201 Created: Session créée avec succès
400 Bad Request: Données invalides
409 Conflict: Session déjà existante pour cette année

Validations:
- Name requis
- Year format numérique
- StartDate avant EndDate
- Status valide (planning|active|closed)
- Pas de chevauchement avec autres sessions
```

### Formulaire Éditer Session
```
GET /admin/sessions/:id/edit
Description: Affiche le formulaire d'édition de session
Authentification requise: Oui (ADMIN)

URL Parameters:
- id (int): ID de la session

Réponse: HTML (admin/sessions/edit.hbs)

Pré-remplissage:
- Toutes les informations actuelles
```

### Éditer Session
```
POST /admin/sessions/:id/edit
Description: Met à jour une session académique
Authentification requise: Oui (ADMIN)

URL Parameters:
- id (int): ID de la session

Données POST:
{
  "name": "Année 2025-2026",
  "year": 2025,
  "startDate": "2025-09-01",
  "endDate": "2026-06-30",
  "description": "Année académique complète",
  "status": "planning"
}

Réponses possibles:
200 OK: Session mise à jour
400 Bad Request: Données invalides
404 Not Found: Session non trouvée
409 Conflict: Chevauchement avec autre session

Restrictions de statut:
- planning -> active ou closed
- active -> closed seulement
- closed -> pas de changement (lecture seule)
```

### Supprimer Session
```
POST /admin/sessions/:id/delete
Description: Supprime une session (soft delete)
Authentification requise: Oui (ADMIN)

URL Parameters:
- id (int): ID de la session

Réponses possibles:
200 OK: Session supprimée
404 Not Found: Session non trouvée
409 Conflict: Impossible de supprimer session avec contenus

Restrictions:
- Impossible si session a des horaires ou participations
- Session closed ne peut être supprimée
- Soft delete (marquer comme supprimée)
```

---

## Gestion des Erreurs des Routes

### Format d'Erreur Standard
```
4xx Errors (client):
200 OK               - Succès
201 Created          - Ressource créée
400 Bad Request      - Données invalides
401 Unauthorized     - Non authentifié
403 Forbidden        - Non autorisé (pas bon rôle)
404 Not Found        - Ressource inexistante
409 Conflict         - Conflit (ex: username déjà existe)
422 Unprocessable    - Validation échouée

5xx Errors (serveur):
500 Internal Server Error   - Erreur serveur générale
```

### Message d'Erreur
```
Format JSON (si API):
{
  error: "Message d'erreur lisible"
  code: "ERROR_CODE"
  details: { ... }
}

Format HTML (si web):
- Page erreur (500.hbs, 404.hbs)
- Flash message avec détails
- Redirection si approprié
```

---

## Exemples d'Utilisation

### Workflow Complet: Créer Utilisateur

```bash
# 1. Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 2. Accéder page création
curl -X GET http://localhost:3000/admin/users/create

# 3. Créer utilisateur
curl -X POST http://localhost:3000/admin/users/create \
  -H "Content-Type: application/json" \
  -d '{
    "username":"student1",
    "email":"student1@example.com",
    "password":"pass123456",
    "firstname":"Marie",
    "lastname":"Durand",
    "role":"STUDENT"
  }'

# 4. Vérifier création
curl -X GET http://localhost:3000/admin/users
```

### Workflow Complet: Créer Session

```bash
# 1. Login (comme admin)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 2. Créer session
curl -X POST http://localhost:3000/admin/sessions/create \
  -H "Content-Type: application/json" \
  -d '{
    "name":"2025-2026",
    "year":2025,
    "startDate":"2025-09-01",
    "endDate":"2026-06-30",
    "status":"planning"
  }'

# 3. Lister sessions
curl -X GET "http://localhost:3000/admin/sessions?status=planning"
```

---

Documentation des Routes - Sprint 1, Février 2026
