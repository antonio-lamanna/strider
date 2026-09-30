# Pubblicare Strider su Firebase Hosting

Repository: https://github.com/antonio-lamanna/strider

Strider è un editor eseguito nel browser. Firebase Hosting serve i file statici:
la landing page alla radice e l'applicazione sotto `/app`.

## Avvio locale

Con Node.js 20 e npm installati:

```bash
npm ci
npm run dev
```

## Pubblicazione automatica

Il workflow `.github/workflows/firebase-hosting-merge.yml` viene eseguito a ogni
push su `main` o tramite avvio manuale da GitHub Actions. Compila l'app, esegue
i test, copia la landing in `dist/`, pubblica su Firebase e verifica il sito live.

Il deploy richiede il repository secret `FIREBASE_SERVICE_ACCOUNT_STRIDER_WORKFLOW`.
Il valore deve essere configurato in GitHub Actions Secrets, mai inserito nei file.
Se il secret manca, il workflow segnala che la pubblicazione è disabilitata.
Il workflow delle pull request pubblica anteprime quando le credenziali sono disponibili.

## Pubblicazione manuale su un proprio progetto

```bash
npm ci
npm run build
npm test
cp -R landing/. dist/
npm install -g firebase-tools
firebase login
firebase deploy --only hosting --project YOUR_FIREBASE_PROJECT_ID
```

Sostituire `YOUR_FIREBASE_PROJECT_ID` con il progetto di destinazione.
La pubblicazione aggiorna il sito Hosting del progetto selezionato.

## Configurazione e credenziali

`firebase.json` definisce hosting e routing; `.firebaserc` contiene l'identificativo
pubblico del progetto. Questi file non contengono credenziali e sono versionati.
Non occorrono Firebase SDK o API key nel frontend per servire questa app statica.

Non versionare `.env` con valori reali, token di deploy o chiavi private di service
account. Un eventuale `.env.example` deve contenere soltanto valori segnaposto.
