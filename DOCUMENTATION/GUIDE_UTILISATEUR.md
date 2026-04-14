# Guide utilisateur — HoraCité

**Système de gestion des horaires académiques · La Cité collégiale**

---

## Table des matières

- [Connexion et déconnexion](#1-connexion-et-déconnexion)
- [Tableau de bord](#2-tableau-de-bord)
- [Gestion des cours](#3-gestion-des-cours)
- [Gestion des salles](#4-gestion-des-salles)
- [Gestion des professeurs](#5-gestion-des-professeurs)
- [Planification des horaires](#6-planification-des-horaires)
- [Sessions académiques](#7-sessions-académiques)
- [Administration (admin seulement)](#8-administration--admin-seulement)
- [Messages d'erreur courants](#9-messages-derreur-courants)

---

## 1. Connexion et déconnexion

### Se connecter

1. Ouvrir `http://localhost:3000` dans le navigateur.
2. Saisir votre **matricule** (ex. `ADMIN001` ou `RESP001`) et votre **mot de passe**.
3. Cliquer sur **Se connecter**.

> Après 30 minutes d'inactivité, la session expire automatiquement et vous serez redirigé vers la page de connexion.

### Changer son mot de passe

1. Cliquer sur votre nom en haut à droite → **Mon profil**.
2. Saisir l'ancien mot de passe, puis le nouveau deux fois.
3. Le nouveau mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.

### Se déconnecter

Cliquer sur **Déconnexion** dans le menu de navigation (en haut à droite ou dans la barre latérale).

---

## 2. Tableau de bord

À la connexion, le tableau de bord affiche :

- La **session académique active** (ou un avertissement si aucune n'est active).
- Les **statistiques globales** : nombre de cours, salles, professeurs, horaires planifiés.
- L'**activité récente** : dernières actions enregistrées.

---

## 3. Gestion des cours

> Accès : **Responsable administratif**

### Consulter la liste

Cliquer sur **Cours** dans le menu latéral. Utiliser les filtres (programme, type de salle, statut) et la barre de recherche pour retrouver un cours.

### Créer un cours

1. Cliquer sur **+ Nouveau cours**.
2. Remplir les champs obligatoires :
   - **Code** (ex. `INFO1001`) — unique, majuscules.
   - **Nom** du cours.
   - **Programme** d'appartenance.
   - **Durée** en heures.
   - **Type de salle requis** (théorique, labo informatique, etc.).
3. Cliquer sur **Enregistrer**.

### Modifier un cours

1. Cliquer sur le cours dans la liste.
2. Cliquer sur **Modifier**.
3. Apporter les changements et **Enregistrer**.

> Si le cours est associé à des horaires existants, certains champs peuvent être verrouillés.

### Archiver un cours

Sur la fiche du cours, cliquer sur **Désactiver**. Le cours reste visible en lecture seule mais ne peut plus être planifié.

---

## 4. Gestion des salles

> Accès : **Responsable administratif**

### Consulter et filtrer

Menu latéral → **Salles**. Filtres disponibles : type, capacité minimale, statut actif/inactif.

### Créer une salle

1. Cliquer sur **+ Nouvelle salle**.
2. Sélectionner le **pavillon**.
3. Remplir le **code**, le **niveau**, le **type**, la **capacité**.
4. Cocher les options si applicable :
   - **Accessible PMR** (personnes à mobilité réduite).
   - **Salle active**.
5. Cliquer sur **Enregistrer**.

### Modifier une salle

Depuis la liste ou la fiche, cliquer sur **Modifier**. Le pavillon et le code ne peuvent pas être modifiés après création.

### Vérifier la disponibilité

Sur la fiche d'une salle, la section **Horaires** affiche tous les créneaux déjà occupés pour la session active.

---

## 5. Gestion des professeurs

> Accès : **Responsable administratif**

### Créer un professeur

1. Menu → **Professeurs** → **+ Nouveau professeur**.
2. Le **matricule** est généré automatiquement (`PROF001`, `PROF002`…).
3. Remplir : nom, prénom, email, téléphone (optionnel).
4. Sélectionner la **spécialité principale**.
5. Ajouter des **spécialités secondaires** si nécessaire (séparées par des virgules).
6. Cliquer sur **Enregistrer**.

### Définir les disponibilités

1. Sur la fiche du professeur, cliquer sur **Gérer les disponibilités**.
2. La grille affiche les créneaux **Lundi–Vendredi, 8h–22h**.
3. Cocher les cases correspondant aux plages où le professeur est disponible.
4. Sélectionner la **session académique** concernée (ou laisser vide pour une disponibilité permanente).
5. Cliquer sur **Enregistrer les disponibilités**.

> Les disponibilités sont utilisées par le système pour valider les affectations d'horaires.

---

## 6. Planification des horaires

> Accès : **Responsable administratif** — nécessite une session académique active.

### Créer un horaire

1. Menu → **Horaires** → **+ Nouvel horaire**.
2. Sélectionner la **session académique**.
3. Choisir le **cours** à planifier.
4. Choisir la **salle** (seules les salles compatibles avec le type de cours sont proposées).
5. Sélectionner le **jour** et la **plage horaire** (début–fin).
6. Sélectionner le **professeur** (seuls les professeurs disponibles sur ce créneau sont proposés).
7. Indiquer le **groupe** si applicable.
8. Cliquer sur **Planifier**.

### Détection de conflits

Le système vérifie automatiquement **avant** l'enregistrement :

| Conflit | Message affiché |
|---|---|
| Salle déjà occupée sur ce créneau | "La salle X est déjà occupée le [jour] [heure] par [cours]" |
| Professeur déjà affecté sur ce créneau | "Le professeur X est déjà affecté à [cours] le [jour] [heure]" |
| Professeur non disponible sur ce créneau | "Le professeur X n'est pas disponible sur ce créneau" |

En cas de conflit, le formulaire reste affiché avec le message d'erreur. Aucun enregistrement n'a lieu.

### Modifier ou supprimer un horaire

Sur la fiche de l'horaire, utiliser les boutons **Modifier** ou **Supprimer**. La suppression est irréversible.

### Vues disponibles

Depuis la liste des horaires, basculer entre :
- **Vue par cours** — tous les créneaux d'un cours donné.
- **Vue par salle** — occupation d'une salle.
- **Vue par professeur** — emploi du temps d'un enseignant.

---

## 7. Sessions académiques

> Accès : **Administrateur système**

Une session académique représente une période d'enseignement (ex. Automne 2026).

### Créer une session

1. Menu → **Administration** → **Sessions** → **+ Nouvelle session**.
2. Remplir : code, nom, saison (automne/hiver/été), année, dates de début et fin.
3. Le statut initial est **En planification**.
4. Cliquer sur **Enregistrer**.

### Cycle de vie d'une session

```
En planification  →  Active  →  Terminée
```

- **En planification** : les horaires peuvent être créés et modifiés librement.
- **Active** : la session est en cours ; les horaires sont verrouillés en modification.
- **Terminée** : accès en lecture seule, conservation historique.

Un seul session peut être **Active** à la fois.

---

## 8. Administration — Admin seulement

### Gérer les utilisateurs

Menu → **Administration** → **Utilisateurs**.

**Créer un compte :**
1. Cliquer sur **+ Nouvel utilisateur**.
2. Remplir nom, prénom, email, rôle (Administrateur ou Responsable).
3. Le matricule est généré automatiquement (`ADMIN00X` ou `RESP00X`).
4. Un mot de passe temporaire est généré et affiché une seule fois — le communiquer à l'utilisateur.
5. L'utilisateur devra le changer à sa première connexion.

**Désactiver un compte :**
Sur la fiche de l'utilisateur, cliquer sur **Désactiver**. Le compte est verrouillé sans être supprimé.

### Consulter les logs d'audit

Menu → **Administration** → **Audit**. Chaque action critique (connexion, création, modification, suppression, changement de mot de passe) est enregistrée avec l'utilisateur responsable et l'horodatage.

---

## 9. Messages d'erreur courants

| Message | Cause | Solution |
|---|---|---|
| "Identifiants incorrects" | Matricule ou mot de passe invalide | Vérifier la saisie ou contacter l'administrateur |
| "Session expirée" | Inactivité > 30 min | Se reconnecter |
| "Ce code existe déjà" | Code de cours ou salle déjà utilisé | Utiliser un code différent |
| "Salle déjà occupée" | Conflit d'horaire sur la salle | Choisir une autre salle ou un autre créneau |
| "Professeur déjà affecté" | Conflit d'horaire sur le professeur | Choisir un autre professeur ou créneau |
| "Accès refusé" | Action réservée à un autre rôle | Contacter l'administrateur système |
| "Salle non trouvée" | ID invalide dans l'URL | Revenir à la liste des salles |
