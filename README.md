# NewsFoundry

Application de revue de presse assistée par IA, réalisée à partir du [starter officiel OpenClassrooms](https://github.com/OpenClassrooms-Student-Center/P14DevIA).

**État actuel :** le socle de développement fonctionne : frontend Next.js, API FastAPI, connexion PostgreSQL, initialisation du compte de démonstration et commandes de démarrage/arrêt. La connexion utilisateur, le chat, les recherches d’actualités et la génération de revues seront ajoutés ensuite. La page d’accueil est une page d’attente.

## Stack

| Brique | Technologie |
|---|---|
| Frontend | Next.js 16.4.4, React 19.3, TypeScript, Tailwind CSS |
| Backend | Python 3.13.5, FastAPI, SQLModel |
| Données | PostgreSQL 17 |
| Intégration IA préparée | PydanticAI, client compatible OpenAI |
| Gestion des dépendances | npm et uv, fichiers de verrouillage inclus |

## Prérequis

- **Node.js 24.11.1**, version utilisée pour les vérifications. Le frontend exige au minimum Node 22.19.
- **uv**, avec Python **3.13.5** disponible ou installable par uv.
- **Windows / PowerShell** pour les commandes automatiques ci-dessous. Un démarrage manuel est décrit plus bas pour les autres systèmes.
- Docker est **optionnel en local** : le projet fournit aussi PostgreSQL 17 via une dépendance npm.

## Installation sur Windows

```powershell
git clone https://github.com/Jojostimabl/OpC_14_NewsFoundry.git
cd OpC_14_NewsFoundry

# Dépendances et caches conservés dans ce dossier.
npm ci --cache .npm-cache
npm --prefix frontend ci --cache .npm-cache

$env:UV_CACHE_DIR = "$PWD/.uv-cache"
Push-Location backend
uv sync --locked --no-dev
Pop-Location

# Créer les configurations privées et un secret JWT aléatoire.
# Les fichiers déjà présents sont conservés.
& ./backend/.venv/Scripts/python.exe ./scripts/setup-env.py
```

Les commandes créent `backend/.env` et `frontend/.env.local` à partir des exemples. Ces fichiers sont ignorés par Git. Le secret JWT est généré localement et n’est pas affiché.

Les clés fournisseur et le modèle LLM restent vides : ils ne sont pas nécessaires au fonctionnement du socle actuel. Leur configuration interviendra avec les fonctionnalités IA.

## Démarrer et arrêter

Depuis la racine du projet :

```powershell
./scripts/dev.ps1 Start
./scripts/dev.ps1 Status
./scripts/dev.ps1 Stop
```

`Start` lance les trois services en arrière-plan. Les journaux sont dans `.logs/`. `Stop` arrête les processus de cette session et ferme proprement PostgreSQL, en conservant les données.

| Service | Adresse |
|---|---|
| Application | http://127.0.0.1:3014 |
| Documentation de l’API | http://127.0.0.1:8014/docs |
| Santé de l’API et connexion DB | http://127.0.0.1:8014/health |
| Vérification frontend → API → DB | http://127.0.0.1:3014/api/health |
| PostgreSQL | `127.0.0.1:55414`, base `newsfoundry` |

La création des tables et du compte `test@test.com` / `test` est idempotente. Son mot de passe est haché. La route de connexion n’est pas encore implémentée.

## Lancement manuel

Après installation et création des fichiers d’environnement, ouvrir trois terminaux.

**1. PostgreSQL**, depuis la racine :

```powershell
npm run db:local
```

**2. Backend** :

```powershell
cd backend
uv run --locked --no-dev uvicorn src.main:app --host 127.0.0.1 --port 8014 --reload --reload-dir src
```

**3. Frontend** :

```powershell
cd frontend
npm run dev
```

Sur Linux/macOS, les mêmes commandes manuelles s’appliquent ; après `uv sync --locked --no-dev` dans `backend`, créer les configurations avec `backend/.venv/bin/python scripts/setup-env.py` depuis la racine. Les commandes `scripts/dev.ps1` restent destinées à Windows.

## Alternative PostgreSQL avec Docker

```powershell
docker compose up -d --wait
docker compose down
```

Le service écoute sur le même port **55414** : choisir le mode npm ou Docker et ne pas les lancer simultanément. Le mode npm conserve ses données dans `.local-postgres/` ; Docker utilise un volume distinct. Le passage d’un mode à l’autre ne transfère pas les données. Les identifiants des exemples sont destinés au développement local.

## Variables d’environnement

| Fichier | Variable | Usage |
|---|---|---|
| `backend/.env` | `DATABASE_URL` | Connexion PostgreSQL |
| | `CORS_ORIGINS` | Origines du frontend autorisées, séparées par des virgules |
| | `JWT_SECRET` | Secret privé préparé pour la future authentification |
| | `LLM_MODEL` | Modèle à configurer avec les fonctionnalités IA |
| | `OPENROUTER_API_KEY` | Clé fournisseur facultative à ce stade |
| | `WORLD_NEWS_API_KEY` | Clé d’actualités à renseigner ultérieurement |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL` | URL publique du backend, sans secret |

Les exemples sont publiés ; les valeurs privées, bases de données, caches et dépendances installées restent locales.

## Structure

```text
backend/
  src/                  API, configuration et accès à la base
  pyproject.toml        Dépendances Python
  uv.lock               Versions Python verrouillées
  Dockerfile            Image du backend
frontend/
  src/app/              Page Next.js et route de disponibilité
  package.json          Dépendances frontend
  package-lock.json     Versions Node verrouillées
scripts/
  setup-env.py          Création des configurations privées
  local-postgres.mjs    PostgreSQL local
  dev.ps1               Démarrage, état et arrêt sous Windows
compose.yaml            Alternative PostgreSQL avec Docker
package.json            Outils locaux et commandes racine
```

## Compilation et préparation du déploiement

Frontend, depuis `frontend/` :

```powershell
npm run build
```

Backend, depuis la racine :

```powershell
docker build -t newsfoundry-backend ./backend
```

Le contexte Docker est **backend/**. L’image respecte la variable `PORT` de l’hébergeur, avec 8000 par défaut. La construction locale nécessite un moteur Docker actif.

Le futur déploiement utilisera `frontend/` comme racine sur Vercel et `backend/` sur Railway. Les URLs de production ne sont pas encore configurées. En production, fournir les variables privées et les origines CORS correspondantes.

## Dépannage rapide

- **Port occupé :** exécuter `./scripts/dev.ps1 Status` et arrêter la session existante avant de relancer `Start`.
- **API indisponible :** vérifier `.logs/backend.stderr.log` et le démarrage de PostgreSQL.
- **Erreur de base :** contrôler `DATABASE_URL`, le mode PostgreSQL choisi et le port 55414.
- **Dépendances absentes :** reprendre les commandes d’installation avec les fichiers de verrouillage.
- **Docker indisponible :** utiliser le mode local `npm run db:local`.

Les fichiers d’étude, supports de formation, tests et CI ne font pas partie de cette distribution publique.
