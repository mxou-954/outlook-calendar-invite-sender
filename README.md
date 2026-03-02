# 📅 Calendar Bulk — Création d'événements Google Calendar en masse

Backend NestJS qui permet de créer des événements Google Calendar en masse à partir d'une liste de destinataires, avec support de templates dynamiques.

Conçu pour envoyer rapidement des invitations calendrier personnalisées (relances, rendez-vous, suivis) à une liste de contacts.

---

## Stack technique

| Couche | Techno | Port |
|--------|--------|------|
| Backend | NestJS + googleapis | `3001` |
| Auth | Google OAuth2 (access_token + refresh_token) | — |
| API externe | Google Calendar API v3 | — |

---

## Structure

```
src/
├── main.ts              ← Bootstrap NestJS + CORS
├── app.module.ts        ← Module racine (ConfigModule global)
├── app.controller.ts    ← Route POST /calendar/bulk
└── app.service.ts       ← Logique OAuth2 + création d'événements
```

---

## Installation

### Prérequis

- Node.js >= 18
- Un projet Google Cloud avec l'API Calendar activée
- Des identifiants OAuth2 (Client ID + Client Secret)

### Setup

```bash
npm install
```

### Variables d'environnement

Créez un fichier `.env` à la racine :

```env
GOOGLE_CLIENT_ID=123456789-xxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GGGGGG-ffffff-xxxxxxxxxxxxxxxxxxxx
```

Ces identifiants proviennent de la console Google Cloud (APIs & Services → Credentials → OAuth 2.0 Client IDs).

### Lancement

```bash
npm run start:dev    # http://localhost:3001
```

---

## Endpoint API

### `POST /calendar/bulk`

Crée un événement Google Calendar pour chaque destinataire, avec un titre et une description personnalisés via un système de template.

#### Payload

```json
{
  "tokens": {
    "access_token": "ya29.xxxx",
    "refresh_token": "1//xxxx"
  },
  "calendarId": "primary",
  "titleTemplate": "Rendez-vous avec {var}",
  "descriptionTemplate": "Bonjour {var}, voici votre invitation.",
  "startISO": "2025-03-15T10:00:00",
  "endISO": "2025-03-15T11:00:00",
  "recipients": ["alice@example.com", "bob@example.com"],
  "variables": ["Alice Dupont", "Bob Martin"]
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `tokens` | `object` | Tokens OAuth2 Google (access + refresh) |
| `calendarId` | `string` | ID du calendrier (défaut : `primary`) |
| `titleTemplate` | `string` | Template du titre — `{var}` remplacé par la variable |
| `descriptionTemplate` | `string` | Template de la description — `{var}` remplacé |
| `startISO` | `string` | Date/heure de début (ISO 8601) |
| `endISO` | `string` | Date/heure de fin (ISO 8601) |
| `recipients` | `string[]` | Liste d'emails des invités |
| `variables` | `string[]` | Variables de personnalisation (même longueur que recipients) |

#### Réponse succès

```json
{
  "ok": true,
  "created": 2,
  "results": [
    {
      "recipient": "alice@example.com",
      "variable": "Alice Dupont",
      "eventId": "abc123",
      "htmlLink": "https://calendar.google.com/event?eid=abc123",
      "status": "confirmed"
    },
    {
      "recipient": "bob@example.com",
      "variable": "Bob Martin",
      "eventId": "def456",
      "htmlLink": "https://calendar.google.com/event?eid=def456",
      "status": "confirmed"
    }
  ]
}
```

#### Réponse erreur

```json
{
  "error": "recipients et variables doivent être non vides et de même longueur"
}
```

---

## Système de templates

Les champs `titleTemplate` et `descriptionTemplate` utilisent le placeholder `{var}` qui est remplacé par la valeur correspondante dans le tableau `variables`.

| Template | Variable | Résultat |
|----------|----------|----------|
| `RDV avec {var}` | `Alice Dupont` | `RDV avec Alice Dupont` |
| `Suivi {var} - Mars` | `Projet X` | `Suivi Projet X - Mars` |

Chaque destinataire (`recipients[i]`) est associé à sa variable (`variables[i]`). Les deux tableaux doivent avoir la même longueur.

---

## Authentification

Le backend ne gère pas le flux OAuth2 lui-même. Il attend des tokens déjà obtenus (via un frontend ou un outil comme OAuth Playground).

Les tokens nécessaires :
- **access_token** : token d'accès courant (expire après ~1h)
- **refresh_token** : token de rafraîchissement (longue durée)

### Scopes requis

L'access token doit avoir le scope :

```
https://www.googleapis.com/auth/calendar.events
```

### Obtenir des tokens de test

1. Rendez-vous sur [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)
2. Sélectionnez "Google Calendar API v3" → scope `calendar.events`
3. Autorisez et récupérez les tokens

---

## Notes

- Le fuseau horaire est fixé à `Europe/Paris` pour tous les événements.
- `sendUpdates: 'all'` envoie une notification par email à chaque invité.
- Les événements sont créés séquentiellement (un par un). Pour de très grandes listes, considérez l'ajout de batch requests.
