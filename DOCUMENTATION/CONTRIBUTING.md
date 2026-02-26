# Guide du Développeur - HoraCite

## Processus de Contribution

### Avant de Commencer

1. Cloner le dépôt
2. Créer une branche feature depuis `main`
3. Développer votre fonctionnalité
4. Créer une pull request (PR)
5. Attendre l'approbation
6. Merge dans `main`

### Création de Branche

Nommage: `feature/descriptif-concis` ou `fix/descriptif-bug`

```bash
# Créer branche
git checkout -b feature/authentification-complete

# Pousser branche
git push origin feature/authentification-complete
```

### Commits

Langage: Français
Conventionnel: `Type: Description`

```bash
# Exemples de commits
git commit -m "Feat: Ajouter validation du formulaire login"
git commit -m "Fix: Corriger bug de session expirée"
git commit -m "Refactor: Simplifier logique d'authentification"
git commit -m "Docs: Mettre à jour documentation API"
```

Types de commits:
- **Feat**: Nouvelle fonctionnalité
- **Fix**: Correctif de bug
- **Refactor**: Restructuration sans changement fonctionnel
- **Docs**: Changements documentation
- **Test**: Ajout/modification tests
- **Style**: Formatage, linting (pas de logique)
- **Chore**: Maintenance (dépendances, build)

---

## Conventions de Code

### JavaScript/Node.js

#### Nommage des Variables et Fonctions

```javascript
// Objets et classes: PascalCase
class UserController { }
const user = new User()

// Variables et fonctions: camelCase
const userName = 'john'
function validateEmail(email) { }
const isAdmin = true

// Constantes: UPPER_SNAKE_CASE
const DB_HOST = 'localhost'
const SESSION_TIMEOUT = 1800000

// Boolean préfixe: is, has, can
const isActive = true
const hasPermission = false
const canDelete = true
```

#### Structure des Fichiers

```javascript
// 1. Imports
const express = require('express')
const User = require('../models/User')

// 2. Middleware
const requireAuth = require('../middleware/auth')

// 3. Déclarations globales
const router = express.Router()

// 4. Fonctions utilitaires
function validateInput(data) { }

// 5. Routes
router.get('/users', requireAuth, ...)

// 6. Exports
module.exports = router
```

#### Longueur des Lignes

Maximum 100 caractères, 120 autorisé pour les URLs/messages

```javascript
// Bon
const message = 'Ceci est un message d\'erreur '
  + 'qui est trop long pour une ligne'

// Mauvais
const message = 'Ceci est un message d\'erreur qui est trop long pour une seule ligne et dépasse les limites'
```

#### Indentation

Utiliser 2 espaces, jamais de tabs

```javascript
// Bon
if (condition) {
  doSomething()
  if (nested) {
    doMore()
  }
}

// Mauvais
if (condition) {
    doSomething()
}
```

#### Commentaires

```javascript
// Commentaire simple pour une ligne
// Expliquer le "pourquoi", pas le "quoi" (le code dit quoi)

/**
 * Commentaire JSDoc pour les fonctions publiques
 * @param {string} username - Le nom d'utilisateur
 * @param {string} password - Le mot de passe
 * @returns {Promise<User>} L'utilisateur authentifié
 */
function authenticate(username, password) { }

// Éviter:
// ================================
// Section Title
// ================================
```

#### Async/Await vs Callbacks

Utiliser async/await plutôt que callbacks ou .then()

```javascript
// Correct: async/await
async function getUser(id) {
  try {
    const user = await User.findById(id)
    return user
  } catch (error) {
    console.error('Erreur récupération user:', error)
    throw error
  }
}

// Éviter: .then()
User.findById(id)
  .then(user => res.json(user))
  .catch(err => res.status(500).json(err))

// Éviter: Callbacks
User.findById(id, (err, user) => {
  if (err) res.status(500).json(err)
  else res.json(user)
})
```

#### Gestion d'Erreurs

```javascript
// Bon: Lever des erreurs explicites
if (!user) {
  throw new Error('Utilisateur non trouvé')
}

// Bon: Try/catch avec contexte
try {
  await User.delete(id)
} catch (error) {
  logger.error('Erreur suppression user:', { userId: id, error })
  throw new Error('Impossible de supprimer l\'utilisateur')
}
```

---

### Handlebars (Views)

#### Structuration

```handlebars
<!-- Commentaire -->
<div class="container">
  <!-- Conditions simples -->
  {{#if isAdmin}}
    <a href="/admin">Admin Panel</a>
  {{else}}
    <p>Accès non autorisé</p>
  {{/if}}

  <!-- Boucles -->
  {{#each users}}
    <p>{{this.username}}</p>
  {{/each}}
</div>
```

#### Helpers Personnalisés

```handlebars
<!-- Formater date -->
<p>Créé le: {{formatDate createdAt}}</p>

<!-- Vérifier rôle -->
{{#if hasRole 'ADMIN'}}
  <button>Supprimer</button>
{{/if}}

<!-- Comparer valeurs -->
{{#eq status 'active'}}
  <span class="badge-active">Actif</span>
{{/eq}}
```

#### Classes CSS Dynamiques

```handlebars
<div class="user-card {{#if isActive}}active{{else}}inactive{{/if}}">
  <p>{{username}}</p>
</div>
```

---

### CSS

#### Organisation

```css
/* 1. Variables et résets */
:root {
  --primary-color: #007bff;
  --error-color: #dc3545;
}

/* 2. Styles de base */
body {
  font-family: Arial, sans-serif;
}

/* 3. Composants */
.btn {
  padding: 10px 20px;
}

.btn-primary {
  background: var(--primary-color);
}

/* 4. Layouts */
.container {
  max-width: 1200px;
}

/* 5. Responsive */
@media (max-width: 768px) {
  .container { padding: 10px; }
}
```

#### Nommage Classes

```css
/* BEM (Block Element Modifier) */
.nav { }               /* Block */
.nav__item { }        /* Element */
.nav__item--active { }  /* Modifier */

/* Ou simple descriptif */
.button-primary { }
.form-group { }
.error-message { }
```

---

## Normes de Sécurité

### Validation des Données

```javascript
// Toujours valider et nettoyer les entrées
const { body, validationResult } = require('express-validator')

router.post('/users', [
  body('username')
    .isLength({ min: 3 })
    .withMessage('Min 3 caractères'),
  body('email')
    .isEmail()
    .withMessage('Email invalide'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Min 8 caractères')
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  // Traiter...
})
```

### Hachage des Mots de Passe

```javascript
// Utiliser bcrypt, jamais stocker en clair
const bcrypt = require('bcryptjs')

// Hacher
const hashedPassword = await bcrypt.hash(plainPassword, 10)

// Vérifier
const isValid = await bcrypt.compare(plainPassword, hashedPassword)
```

### Requêtes SQL Sécurisées

```javascript
// Toujours utiliser prepared statements
// CORRECT: Protection contre SQL injection
db.run('SELECT * FROM users WHERE id = ?', [id])

// MAUVAIS: Vulnérable à injection SQL
db.run(`SELECT * FROM users WHERE id = ${id}`)
```

### Variables Sensibles

```javascript
// Utiliser .env pour les secrets
require('dotenv').config()

const dbConfig = {
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  sessionSecret: process.env.SESSION_SECRET
}

// Ne jamais committer .env ou clés API
// .env est dans .gitignore
```

---

## Tests

### Structure des Tests

```javascript
// tests/models/User.test.js
const User = require('../../models/User')

describe('User Model', () => {
  describe('create', () => {
    it('devrait créer un nouvel utilisateur', async () => {
      const user = await User.create({
        username: 'john',
        email: 'john@example.com',
        password: 'password123'
      })
      
      expect(user.id).toBeDefined()
      expect(user.username).toBe('john')
    })
  })
})
```

### Lancer les Tests

```bash
# Tous les tests
npm test

# Un fichier spécifique
npm test -- tests/models/User.test.js

# Avec coverage
npm test -- --coverage
```

---

## Documentation du Code

### JSDoc pour Fonctions

```javascript
/**
 * Authentifie un utilisateur
 * 
 * @param {string} username - Le nom d'utilisateur
 * @param {string} password - Le mot de passe en clair
 * @returns {Promise<User>} L'utilisateur authentifié avec session
 * @throws {Error} Si credentials invalides
 * 
 * @example
 * const user = await authenticate('admin', 'password123')
 */
async function authenticate(username, password) {
  // Implémentation
}
```

### README de Modules

Chaque module devrait avoir un README:

```markdown
# Module Authentification

## Description
Gère l'authentification Passport.js avec LocalStrategy.

## Fichiers
- config/passport.js - Configuration
- middleware/auth.js - Middlewares
- routes/authRoutes.js - Routes
- views/auth/ - Vues

## Utilisation
POST /auth/login avec { username, password }
```

---

## Review de Code

### Checklist de PR

Avant de soumettre une PR:

- [ ] Le code suit les conventions
- [ ] Les commentaires sont clairs et utiles
- [ ] La fonctionnalité est testée
- [ ] Pas de console.log() sauf pour logs importants
- [ ] Pas de modifications inutiles
- [ ] Les messages de commit sont descriptifs en français
- [ ] La documentation est à jour
- [ ] Pas de secrets ou infos sensibles

### Commentaires de Review

```javascript
// Exemple de feedback constructif

// Suggestion: Cette logique pourrait être dans une fonction utilitaire
// Voir validateUserInput() déjà existante

// Question: Quelle est la raison de ce try-catch silencieux?
// Je propose d'ajouter un log pour le débogage

// Merci pour la clarté du code! Juste une petite optimisation possible:
// Utiliser const au lieu de let pour immutabilité
```

---

## Outils et Commandes

### NPM Scripts

```bash
# Développement
npm run dev          # Démarrer avec nodemon

# Production
npm start            # Démarrer le serveur

# Tests
npm test             # Lancer les tests

# Linting
npm run lint         # Vérifier style de code

# Formatting
npm run format       # Formater le code

# Build
npm run build        # Compiler pour production
```

---

## Versioning

### Semantic Versioning (v1.2.3)

```
MAJOR.MINOR.PATCH
1.    2.    3

MAJOR: Changements incompatibles
MINOR: Nouvelles features (backwards compatible)
PATCH: Bug fixes
```

### Changelog

Mettre à jour CHANGELOG.md pour chaque version:

```markdown
## [1.1.0] - 2025-02-26

### Ajouté
- Fonctionnalité X

### Changé
- Comportement de Y

### Corrigé
- Bug Z
```

---

## Ressources et References

- [Express.js Best Practices](https://expressjs.com/)
- [Node.js Style Guide](https://github.com/felixge/node-style-guide)
- [Handlebars Documentation](https://handlebarsjs.com/)
- [SQLite Best Practices](https://www.sqlite.org/bestpractice.html)
- [OWASP Security Guidelines](https://owasp.org/)

---

## Points de Contact

Pour des questions sur les conventions:
- Documentation technique: Voir DOCUMENTATION/ARCHITECTURE.md
- Problèmes spécifiques: Ouvrir une issue GitHub
- Pair programming: Contactez votre équipe

---

Guide du Développeur - Sprint 1, Février 2026
