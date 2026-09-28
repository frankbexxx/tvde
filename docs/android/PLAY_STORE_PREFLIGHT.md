# Play Store preflight — Android release

Estado: **INTERNAL TESTING ACTIVE / SMOKE PENDING**. Não está **CLOSED**. S-MOB-02 continua **PARTIAL**.

Package `pt.vamula.app`. `versionCode` 1. `versionName` 1.0. `minSdk` 24. `compileSdk` / `targetSdk` 36. O primeiro Internal Testing usa estes números. Daí em diante o `versionCode` aumenta sempre e o `versionName` é a versão visível.

## Estado em 2026-09-28

A app `VAMULÁ` existe na Play Console, na conta `frankbex.dev@gmail.com`, idioma `pt-PT`, app gratuita. Play App Signing foi aceite. O Internal Testing está activo.

Primeiro lançamento interno: `VAMULÁ 1.0 Internal 1`. A Play Console aceitou o AAB. `versionCode` 1. `versionName` 1.0.

Testers: `frankbex.dev@gmail.com`, `frankbexxx@gmail.com`.

Link: https://play.google.com/apps/internaltest/4701587799723936774

A build foi instalada no Oppo pela Google Play. O APK sideload anterior foi removido. A Play Store mostra a build como proveniente da Play. O nome temporário visível é `pt.vamula.app (unreviewed)`.

Smoke da build Play: **NOT EXECUTED**. Não é PASS. O próximo smoke previsto é abrir a app, login, Google OAuth, localização e push.

Avisos da Play Console, não bloqueantes neste Internal Testing, e por corrigir noutra tarefa: sem ficheiro de desofuscação; sem símbolos nativos de depuração.

Para uma conta pessoal recente da Play, a produção exige um teste fechado com pelo menos 12 testers durante pelo menos 14 dias. Esse teste não foi iniciado.

Ainda aberto em S-MOB-02: o smoke desta build, a preparação restante para Production, e GPS em background.

## Signing

O Gradle assina `assembleRelease` e `bundleRelease` só com uma upload key local.

Origem, por esta ordem:

1. Variáveis de ambiente `TVDE_UPLOAD_STORE_FILE`, `TVDE_UPLOAD_STORE_PASSWORD`, `TVDE_UPLOAD_KEY_ALIAS`, `TVDE_UPLOAD_KEY_PASSWORD`.
2. `web-app/android/keystore.properties`, copiado de `keystore.properties.example`. Este ficheiro não entra no Git.

Sem uma destas configurações completas, as tarefas de release falham. `assembleDebug` não usa esta chave. O keystore, as passwords e o alias secreto não são versionados.

A upload key já foi criada, fora do repositório:

- Caminho: `C:\Users\frank\.android-keys\vamula\vamula-upload.p12`
- Alias: `vamula-upload`
- Formato: PKCS12
- Algoritmo: RSA 2048
- SHA-1: `B0:77:BD:BA:C2:F3:E9:6E:64:2B:C7:32:C2:F9:4E:5F:E3:A9:DA:CC`
- SHA-256: `6B:2D:F5:2D:CD:8E:7F:78:9E:91:DC:FF:2F:81:95:EE:67:F4:4B:59:6B:7F:68:50:BD:D0:DC:9C:44:08:61:C1`

O keystore não está no Git. As passwords não estão no Git. `web-app/android/keystore.properties` é local e gitignored.

`assembleRelease` PASS. `bundleRelease` PASS. O APK release e o AAB release ficaram assinados. `jarsigner` verificou o AAB. Package `pt.vamula.app`, `versionCode` 1, `versionName` 1.0. AAB local: `C:\dev\APP\web-app\android\app\build\outputs\bundle\release\app-release.aab`.

## Play App Signing

Play App Signing está aceite na consola.

- **Upload key:** a chave criada por nós. Assina o AAB que enviamos. O fingerprint desta chave é nosso.
- **App signing key:** a chave que a Google guarda depois de activar Play App Signing. Assina o que os telemóveis instalam. O fingerprint só aparece no Play Console depois do primeiro enrolamento. Não é a nossa chave.

O login Google no Android precisa do SHA-1 do certificado que realmente assina a app instalada. Antes da Play, isso é o fingerprint da upload key. Depois de Play App Signing, o que conta para os testers é o fingerprint do certificado de app signing da Google. O SHA-1 debug continua a ser o do APK debug.

## OAuth e Firebase

A app nativa inicializa o Google Sign-In com o client id Web devolvido pela API. O `google-services.json` tem o package `pt.vamula.app` e um client OAuth de tipo Web, sem `certificate_hash`. O envio FCM não depende do certificado da app. O que precisa de fingerprint é o client OAuth Android no Google Cloud, no mesmo projecto.

Não substituir `google-services.json` só por causa do release. Acrescentar fingerprints no Cloud Console é acção humana, depois de a upload key existir e, de novo, depois de a Google mostrar o certificado de app signing.

## Permissões declaradas pela app

`INTERNET`, `POST_NOTIFICATIONS`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`.

Não há `ACCESS_BACKGROUND_LOCATION`, SMS, contactos nem armazenamento geral.

O manifesto fundido também traz permissões de bibliotecas já usadas: `USE_BIOMETRIC` e `USE_FINGERPRINT` de `androidx.biometric`, `ACCESS_NETWORK_STATE`, `WAKE_LOCK` e `com.google.android.c2dm.permission.RECEIVE` de Firebase Messaging, e uma permissão `signature` de `androidx.core`. Não foram removidas.

## Play Console — o que falta

Feito para este Internal Testing: app, package, Play App Signing, upload do AAB assinado, faixa interna e os dois testers.

Ainda por fazer, e não iniciado nesta actualização:

1. Smoke da build instalada pela Play: abrir a app, login, Google OAuth, localização e push.
2. No Google Cloud, no client Android de `pt.vamula.app`, o SHA-1 da upload key e, para a build que a Play instala, o SHA-1 do certificado de app signing da Google. Não apagar o SHA-1 debug.
3. Data Safety com validação humana. A política publicada é `https://vamula.pt/privacidade/`.
4. Para Production: ficha completa, icon 512, feature graphic, screenshots, descrição curta e longa, categoria, e o teste fechado de 12 testers durante 14 dias exigido a uma conta pessoal recente. GPS em background continua fora desta frente.
