package pt.vamula.app.location;

/**
 * Propriedade do envio GPS neste processo. Não é gravada: uma morte do processo
 * recomeça na WebView. O nativo só assume com o serviço operacional e o upload
 * autorizado e funcional.
 *
 * Um POST já iniciado só termina em {@code end}. O prazo não o apaga e não
 * autoriza o outro lado a começar por cima.
 */
public final class DriverLocationOwnership {

    public static final int WEBVIEW = 0;
    public static final int NATIVE = 1;
    public static final int SESSION_CHANGED = 2;

    /** O outro lado espera pelo fim. Passar este prazo não abre um segundo POST. */
    static final long OPEN_SEND_BOUND_MILLIS = 20_000L;

    private static final Object LOCK = new Object();

    private static int holder = WEBVIEW;
    private static long generation;
    private static String leaseFamily = "";
    private static int webViewInFlight;
    private static int nativeInFlight;
    private static int documentGeneration;
    private static int leaseDocument;
    private static String lastRelease = "";

    private DriverLocationOwnership() {}

    public static void resetForProcessStart() {
        synchronized (LOCK) {
            holder = WEBVIEW;
            generation++;
            leaseFamily = "";
            webViewInFlight = 0;
            nativeInFlight = 0;
            documentGeneration = 0;
            leaseDocument = 0;
            lastRelease = "";
            LOCK.notifyAll();
        }
    }

    public static boolean nativeOwnsUpload() {
        synchronized (LOCK) {
            return holder == NATIVE;
        }
    }

    public static boolean webViewBeginSend() {
        synchronized (LOCK) {
            if (holder == NATIVE) {
                return false;
            }
            while (nativeInFlight > 0) {
                try {
                    LOCK.wait(50L);
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    return false;
                }
                if (holder == NATIVE) {
                    return false;
                }
            }
            if (webViewInFlight > 0) {
                return false;
            }
            leaseDocument = documentGeneration;
            webViewInFlight++;
            return true;
        }
    }

    /** Novo documento da WebView. O anterior só larga o POST se ainda era o responsável. */
    public static int replaceDocument() {
        int previous;
        synchronized (LOCK) {
            previous = documentGeneration;
            documentGeneration++;
        }
        abandonDocument(previous);
        synchronized (LOCK) {
            return documentGeneration;
        }
    }

    public static int currentDocument() {
        synchronized (LOCK) {
            return documentGeneration;
        }
    }

    public static boolean abandonDocument(int documentId) {
        if (documentId <= 0) {
            return false;
        }
        synchronized (LOCK) {
            return clearWebLease(documentId);
        }
    }

    /** A vista já não existe. Não há prazo que abra o outro emissor. */
    public static void onWebViewGone() {
        synchronized (LOCK) {
            if (webViewInFlight <= 0) {
                return;
            }
            if (documentGeneration <= 0) {
                if (leaseDocument <= 0) {
                    webViewInFlight = 0;
                    leaseDocument = 0;
                    LOCK.notifyAll();
                }
                return;
            }
            clearWebLease(documentGeneration);
        }
    }

    public static void webViewEndSend() {
        synchronized (LOCK) {
            if (webViewInFlight > 0) {
                webViewInFlight--;
            }
            LOCK.notifyAll();
        }
    }

    public static int reconcile(boolean operational, boolean authorized, boolean functional, String family) {
        synchronized (LOCK) {
            String current = family == null ? "" : family;
            if (holder == NATIVE && (current.isEmpty() || !current.equals(leaseFamily))) {
                releaseLocked("session");
                return SESSION_CHANGED;
            }
            if (!operational || !authorized || !functional || current.isEmpty()) {
                if (holder == NATIVE) {
                    releaseLocked("ineligible");
                }
                return WEBVIEW;
            }
            if (holder == NATIVE) {
                return NATIVE;
            }
            generation++;
            holder = NATIVE;
            leaseFamily = current;
            LOCK.notifyAll();
            return NATIVE;
        }
    }

    public static boolean awaitWebViewIdle(long timeoutMs) {
        long deadline = System.currentTimeMillis() + Math.max(0L, timeoutMs);
        synchronized (LOCK) {
            while (true) {
                long now = System.currentTimeMillis();
                if (webViewInFlight == 0 || holder != NATIVE) {
                    return holder == NATIVE && webViewInFlight == 0;
                }
                if (now >= deadline) {
                    return false;
                }
                try {
                    LOCK.wait(Math.min(50L, deadline - now));
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    return false;
                }
            }
        }
    }

    public static boolean beginNativePost() {
        synchronized (LOCK) {
            if (holder != NATIVE || nativeInFlight > 0 || webViewInFlight > 0) {
                return false;
            }
            nativeInFlight++;
            return true;
        }
    }

    public static void endNativePost() {
        synchronized (LOCK) {
            if (nativeInFlight > 0) {
                nativeInFlight--;
            }
            LOCK.notifyAll();
        }
    }

    public static String lastRelease() {
        synchronized (LOCK) {
            return lastRelease;
        }
    }

    public static void release(String reason) {
        synchronized (LOCK) {
            releaseLocked(reason);
        }
    }

    public static void releaseForNewSession(Runnable disarm) {
        synchronized (LOCK) {
            if (disarm != null) {
                disarm.run();
            }
            releaseLocked("session");
        }
    }

    private static boolean clearWebLease(int documentId) {
        if (documentId <= 0 || webViewInFlight <= 0 || leaseDocument != documentId) {
            return false;
        }
        webViewInFlight = 0;
        leaseDocument = 0;
        LOCK.notifyAll();
        return true;
    }

    private static void releaseLocked(String reason) {
        if (holder == NATIVE) {
            generation++;
        }
        holder = WEBVIEW;
        leaseFamily = "";
        lastRelease = reason == null ? "" : reason;
        LOCK.notifyAll();
    }
}
