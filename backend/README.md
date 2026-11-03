# NewsFoundry — backend

API Python 3.13.5 / FastAPI, modèles SQLModel et connexion PostgreSQL 17.
Les dépendances sont verrouillées dans `uv.lock`.

Voir le [README principal](../README.md) pour l’installation, les variables, le démarrage et le déploiement.

Depuis ce dossier, après création de `.env` et démarrage de PostgreSQL :

```powershell
uv sync --locked --no-dev
uv run --locked --no-dev uvicorn src.main:app --host 127.0.0.1 --port 8014 --reload --reload-dir src
```

Routes du socle : `/`, `/health`, `/docs`. Le compte de démonstration est initialisé au démarrage ;
les routes de connexion, de chat et de génération seront développées ultérieurement.

Le Dockerfile attend ce dossier comme contexte de construction. Il utilise le port `PORT` de
l’hébergeur, avec 8000 par défaut. Les clés et les paramètres de la base restent dans l’environnement.
