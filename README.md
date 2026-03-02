# 📅 Calendar Bulk — Création d'événements Google Calendar en masse

Application fullstack (Next.js + NestJS) permettant de créer des événements Google Calendar en masse à partir d'une liste de destinataires, avec support de templates dynamiques.

Conçu pour envoyer rapidement des invitations calendrier personnalisées (relances, rendez-vous, suivis) à une liste de contacts.

---

## Stack technique

| Couche | Techno | Port |
|--------|--------|------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS | 3000 |
| Backend | NestJS + googleapis | 3001 |
| Auth | NextAuth.js + Google OAuth2 | — |
| API externe | Google Calendar API v3 | — |

---

## Architecture globale
```
┌──────────────────────────────┐       ┌──────────────────────────┐
│       Frontend (Next.js)     │       │    Backend (NestJS)      │
│          :3000               │       │        :3001             │
│                              │       │                          │
│  app/                        │  POST │  src/                    │
│  ├── page.tsx (accueil)      │ ───── │  ├── main.ts             │
│  ├── dashboard/              │  /cal │  ├── app.module.ts       │
│  │   └── page.tsx (formulaire│ endar │  ├── app.controller.ts   │
│  └── api/                    │ /bulk │  └── app.service.ts      │
│      ├── auth/[...nextauth]/ │       │                          │
│      │   ├── authOptions.ts  │       │  → Google Calendar API   │
│      │   └── route.ts        │       │                          │
│      └── calendar/           │       └──────────────────────────┘
│          └── bulk-create/    │
│              └── route.ts    │
└──────────────────────────────┘
```

**Flux de données :**

1. L'utilisateur se connecte via Google OAuth (NextAuth.js côté front).
2. Le frontend récupère les tokens OAuth (`access_token`, `refresh_token`) via la session.
3. L'utilisateur remplit le formulaire sur `/dashboard` (destinataires, variables, template, date).
4. Le frontend envoie un `POST /api/calendar/bulk-create` (route API Next.js).
5. La route API Next.js transmet la requête au backend NestJS (`POST http://localhost:3001/calendar/bulk`).
6. NestJS crée les événements via l'API Google Calendar et renvoie les résultats.

---

## Structure du projet

### Frontend (Next.js)
```
app/
├── page.tsx                          ← Page d'accueil (connexion + navigation)
├── dashboard/
│   └── page.tsx                      ← Formulaire de création d'événements en masse
└── api/
    ├── auth/
    │   └── [...nextauth]/
    │       ├── authOptions.ts        ← Configuration NextAuth (Google Provider + callbacks)
    │       └── route.ts              ← Handler NextAuth (GET + POST)
    └── calendar/
        └── bulk-create/
            └── route.ts              ← Proxy API : valide les données et transmet au backend NestJS
```

### Backend (NestJS)
```
src/
├── main.ts                           ← Bootstrap NestJS + CORS
├── app.module.ts                     ← Module racine (ConfigModule global)
├── app.controller.ts                 ← Route POST /calendar/bulk
└── app.service.ts                    ← Logique OAuth2 + création d'événements
```

---

## Installation

### Prérequis

- Node.js >= 18
- Un projet Google Cloud avec l'API Calendar activée
- Des identifiants OAuth2 (Client ID + Client Secret)

### Setup Frontend
```bash
cd frontend
npm install
```

### Setup Backend
```bash
cd backend
npm install
```

### Variables d'environnement

**Frontend** — créer un fichier `.env` à la racine du projet Next.js :
```env
GOOGLE_CLIENT_ID=123456789-xxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GGGGGG-ffffff-xxxxxxxxxxxxxxxxxxxx
NEXTAUTH_SECRET=une-chaine-secrete-aleatoire
NEXTAUTH_URL=http://localhost:3000
```

**Backend** — créer un fichier `.env` à la racine du projet NestJS :
```env
GOOGLE_CLIENT_ID=123456789-xxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GGGGGG-ffffff-xxxxxxxxxxxxxxxxxxxx
```

> Les identifiants OAuth2 proviennent de la console Google Cloud (APIs & Services → Credentials → OAuth 2.0 Client IDs). Les deux `.env` partagent les mêmes `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`.

### Lancement
```bash
# Terminal 1 — Backend
cd backend
npm run start:dev    # http://localhost:3001

# Terminal 2 — Frontend
cd frontend
npm run dev          # http://localhost:3000
```

> ⚠️ Le backend doit être lancé **avant** le frontend, car la route API Next.js communique avec `http://localhost:3001`.

---

## Frontend — Pages et composants

### Page d'accueil (`app/page.tsx`)

Page de landing avec deux actions principales :

- **S'identifier** — redirige vers `/api/auth/signin` (flux OAuth Google via NextAuth).
- **Envoyer des événements** — redirige vers `/dashboard` (formulaire de création).

### Dashboard (`app/dashboard/page.tsx`)

Formulaire complet de création d'événements en masse. L'interface se compose de :

| Section | Description |
|---------|-------------|
| **Destinataires** | Zone de texte — un email par ligne |
| **Variables** | Zone de texte — une valeur par ligne (associée au destinataire correspondant) |
| **Indicateur de cohérence** | Vérifie que le nombre de destinataires correspond au nombre de variables |
| **Template de l'événement** | Titre et description avec placeholder `{var}` |
| **Planification** | Date/heure de début + durée en minutes |
| **Résultat** | Affichage JSON de la réponse API après soumission |

**Validation côté client :**

- Les listes destinataires et variables doivent avoir la même longueur (et être non vides).
- La date/heure de début est obligatoire.
- Le bouton de soumission est désactivé tant que les conditions ne sont pas remplies.

**Appel API :** Le formulaire envoie un `POST` vers `/api/calendar/bulk-create` avec le payload suivant :
```json
{
  "recipients": ["alice@example.com", "bob@example.com"],
  "variables": ["Alice Dupont", "Bob Martin"],
  "titleTemplate": "Rendez-vous avec {var}",
  "descriptionTemplate": "Bonjour {var}, voici votre invitation.",
  "startLocal": "2025-03-15T10:00",
  "durationMin": 30
}
```

---

## Frontend — Authentification (NextAuth.js)

### Configuration (`app/api/auth/[...nextauth]/authOptions.ts`)

L'authentification utilise NextAuth.js avec le provider Google. La configuration inclut :

- **Provider Google** avec les scopes : `openid`, `email`, `profile`, `calendar.events`.
- **`access_type: "offline"`** pour obtenir un `refresh_token`.
- **`prompt: "consent"`** pour forcer le consentement et garantir l'obtention du refresh token.

### Callbacks

| Callback | Rôle |
|----------|------|
| `jwt` | Stocke l'`access_token` et le `refresh_token` dans le token JWT à la connexion |
| `session` | Expose les tokens dans l'objet session côté client |

### Route (`app/api/auth/[...nextauth]/route.ts`)

Exporte le handler NextAuth sur les méthodes `GET` et `POST`, conformément au pattern App Router de Next.js.

---

## Frontend — Route API proxy (`app/api/calendar/bulk-create/route.ts`)

Route API Next.js qui sert de proxy entre le frontend et le backend NestJS.

### Responsabilités

1. **Récupération de la session** — extrait les tokens OAuth depuis la session NextAuth.
2. **Validation des données** — vérifie la présence et le format des champs requis (`recipients`, `variables`, `titleTemplate`, `descriptionTemplate`, `startLocal`, `durationMin`).
3. **Calcul des dates** — convertit `startLocal` + `durationMin` en `startISO` / `endISO`.
4. **Transmission au backend** — envoie un `POST` vers `http://localhost:3001/calendar/bulk` avec les tokens et les données formatées.
5. **Retour de la réponse** — renvoie le résultat du backend au client.

### Codes de retour

| Code | Cas |
|------|-----|
| 200 | Événements créés avec succès |
| 400 | Données invalides (longueurs différentes, durée invalide, champ manquant) |
| 401 | Utilisateur non authentifié (pas de tokens dans la session) |
| 500 | Erreur interne |

---

## Endpoint API Backend

### POST /calendar/bulk

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
| tokens | object | Tokens OAuth2 Google (access + refresh) |
| calendarId | string | ID du calendrier (défaut : `primary`) |
| titleTemplate | string | Template du titre — `{var}` remplacé par la variable |
| descriptionTemplate | string | Template de la description — `{var}` remplacé |
| startISO | string | Date/heure de début (ISO 8601) |
| endISO | string | Date/heure de fin (ISO 8601) |
| recipients | string[] | Liste d'emails des invités |
| variables | string[] | Variables de personnalisation (même longueur que recipients) |

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
| `RDV avec {var}` | Alice Dupont | RDV avec Alice Dupont |
| `Suivi {var} - Mars` | Projet X | Suivi Projet X - Mars |

Chaque destinataire (`recipients[i]`) est associé à sa variable (`variables[i]`). Les deux tableaux doivent avoir la même longueur.

---

## Authentification — Flux complet
```
Utilisateur      Frontend (Next.js)       NextAuth        Google       Backend (NestJS)
    │                   │                    │               │                │
    │── S'identifier ──▶│                    │               │                │
    │                   │── /auth/signin ───▶│               │                │
    │                   │                    │── OAuth ──────▶│                │
    │                   │                    │◀── tokens ────│                │
    │                   │◀── session ────────│               │                │
    │                   │                    │               │                │
    │── Formulaire ────▶│                    │               │                │
    │                   │── POST /api/calendar/bulk-create ──────────────────▶│
    │                   │                    │               │◀── Calendar ──│
    │                   │◀── résultats ──────────────────────────────────────│
    │◀── JSON ──────────│                    │               │                │
```

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
- Le frontend et le backend doivent partager les mêmes identifiants OAuth2 (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`).
- La route API Next.js (`/api/calendar/bulk-create`) agit comme proxy et ne communique avec le backend qu'en `localhost`.
