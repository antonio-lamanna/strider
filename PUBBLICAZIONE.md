# Pubblicare Automation Canvas su GitHub e Firebase

Il progetto è indipendente da ChatGPT. GitHub conserva i sorgenti e la loro cronologia; Firebase Hosting pubblica l'applicazione compilata. L'editor funziona interamente nel browser e i diagrammi restano nei file XML salvati dall'utente.

## 1. Scaricare e avviare il progetto

Estrai l'archivio ZIP e apri un terminale nella cartella `automation-canvas`, quella che contiene `package.json`. Occorre avere Node.js e npm installati, come indicato nel README.

```bash
npm install
npm run dev
```

Apri l'indirizzo mostrato nel terminale. Per terminare il server di sviluppo premi Ctrl+C.

## 2. Mettere i sorgenti su GitHub

Puoi usare GitHub Desktop per aggiungere la cartella estratta come repository e pubblicarla sul tuo account. In alternativa, con Git installato e l'accesso a GitHub configurato:

1. Crea su GitHub un repository vuoto chiamato `automation-canvas`, pubblico o privato a tua scelta. Non inizializzarlo con README o altri file: sono già inclusi nel progetto.
2. Esegui questi comandi nella cartella estratta, sostituendo `TUO-UTENTE` con il tuo nome utente GitHub:

```bash
git init
git add .
git commit -m "Initial Automation Canvas source"
git branch -M main
git remote add origin https://github.com/TUO-UTENTE/automation-canvas.git
git push -u origin main
```

Carica i file estratti, non soltanto lo ZIP. Il file `.gitignore` esclude dipendenze, build e cache locali. Conserva `package-lock.json` nel repository. La pubblicazione del codice su GitHub e quella del sito su Firebase sono due operazioni separate.

## 3. Pubblicare su Firebase Hosting

Crea un progetto nella [console Firebase](https://console.firebase.google.com/) oppure usa un tuo progetto esistente. Annota il suo **ID progetto**, disponibile nelle impostazioni: può essere diverso dal nome visualizzato.

Installa la CLI e accedi con l'account che può gestire il progetto:

```bash
npm install -g firebase-tools
firebase login
```

Poi, dalla cartella che contiene `firebase.json`, compila e pubblica:

```bash
npm run build
firebase deploy --only hosting --project ID_PROGETTO
```

Sostituisci `ID_PROGETTO` con il vero ID. Il comando pubblica la cartella `dist/` e restituisce l'indirizzo del sito. Questa procedura usa il sito Hosting predefinito del progetto scelto; se contiene già un sito, la pubblicazione ne aggiorna i contenuti.

`firebase.json` è già incluso e punta a `dist/`, con il fallback a `index.html`. Non occorre eseguire `firebase init` o inserire API key nel codice. L'opzione `--project` identifica il progetto senza richiedere un file `.firebaserc`. Non servono Firebase SDK, Firestore, database, Cloud Functions o un servizio di autenticazione per l'app.

## 4. Pubblicare gli aggiornamenti

Dopo aver modificato i sorgenti, salva le modifiche su GitHub e ricompila prima di ogni pubblicazione:

```bash
npm run build
firebase deploy --only hosting --project ID_PROGETTO
```

La configurazione inclusa usa una pubblicazione manuale. Il push su GitHub, da solo, non aggiorna il sito Firebase. I diagrammi XML degli utenti non vengono caricati su GitHub o Firebase dall'editor.

## Documentazione ufficiale

- [Pubblicare un progetto Vite su Firebase](https://vite.dev/guide/static-deploy.html#google-firebase)
- [Guida introduttiva a Firebase Hosting](https://firebase.google.com/docs/hosting/quickstart)
- [Firebase CLI e selezione del progetto](https://firebase.google.com/docs/cli#project_aliases)
- [Aggiungere codice locale a GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)
