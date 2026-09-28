# Play Store preflight — Android release

Estado: **READY FOR HUMAN CONSOLE SETUP / INTERNAL TESTING**. Não está **CLOSED**. Nada foi publicado. GPS em background continua aberto. S-MOB-02 continua **PARTIAL**.

Package `pt.vamula.app`. `versionCode` 1. `versionName` 1.0. `minSdk` 24. `compileSdk` / `targetSdk` 36. O primeiro Internal Testing mantém estes números enquanto a app nunca tiver sido carregada na Play. Daí em diante o `versionCode` aumenta sempre e o `versionName` é a versão visível.

## Signing

O Gradle assina `assembleRelease` e `bundleRelease` só com uma upload key local.

Origem, por esta ordem:

1. Variáveis de ambiente `TVDE_UPLOAD_STORE_FILE`, `TVDE_UPLOAD_STORE_PASSWORD`, `TVDE_UPLOAD_KEY_ALIAS`, `TVDE_UPLOAD_KEY_PASSWORD`.
2. `web-app/android/keystore.properties`, copiado de `keystore.properties.example`. Este ficheiro não entra no Git.

Sem uma destas configurações completas, as tarefas de release falham. `assembleDebug` não usa esta chave. O keystore, as passwords e o alias secreto não são versionados.

Formato recomendado da upload key: PKCS12, RSA 2048, validade 10000 dias, alias `vamula-upload`, ficheiro fora do repo em `%USERPROFILE%\.android-keys\vamula\vamula-upload.p12`. A criação da chave é manual e só depois de autorização explícita.

## Play App Signing

Ainda não está activo. É necessário para Internal Testing.

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

## Play Console — ordem humana

Necessário para Internal Testing:

1. Criar a app com package `pt.vamula.app`.
2. Activar Play App Signing.
3. Usar a upload key local. Não entregar a chave privada à Google se a consola permitir ficar só com o certificado de upload.
4. Copiar o SHA-1 da upload key.
5. No Google Cloud, no client Android de `pt.vamula.app`, adicionar esse SHA-1. Parar antes de apagar o SHA-1 debug.
6. Depois do primeiro upload, copiar o SHA-1 do certificado de app signing da Google e adicioná-lo ao mesmo client Android.
7. Criar a faixa Internal Testing e a lista de testers.
8. Preencher Data Safety com validação humana. O inventário técnico está no relatório da PR; a política publicada é `https://vamula.pt/privacidade/`.
9. Store listing mínimo que a consola exigir nesta faixa.
10. Release notes.
11. Upload do AAB já assinado. Não usar o AAB unsigned gerado na auditoria.

Pode esperar até Production: ficha completa da loja, icon 512, feature graphic, screenshots, descrição curta e longa, categoria final, e o resto do review de produção. GPS em background não faz parte deste preflight.
