package pt.vamula.app.vault;

import android.net.Uri;
import android.webkit.WebView;
import androidx.webkit.JavaScriptReplyProxy;
import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import pt.vamula.app.location.DriverLocationArmament;

/** Canal limitado a https://localhost no frame principal. A mensagem não é registada. */
public final class VaultChannel {

    public static final String NAME = "vamulaVault";
    private static final int MESSAGE_LIMIT = 16384;
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor(runnable -> {
        Thread thread = new Thread(runnable, "vamula-vault");
        thread.setDaemon(true);
        return thread;
    });

    private VaultChannel() {}

    public static boolean install(WebView webView, SessionVault vault) {
        if (webView == null || vault == null || !WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            return false;
        }
        AndroidRefreshCoordinator coordinator = new AndroidRefreshCoordinator(vault, new HttpUrlVaultHttp());
        WebViewCompat.addWebMessageListener(
            webView,
            NAME,
            Collections.singleton(VaultOrigin.APP_ORIGIN),
            (view, message, sourceOrigin, isMainFrame, replyProxy) -> EXECUTOR.execute(() -> answer(vault, coordinator, message, sourceOrigin, isMainFrame, replyProxy))
        );
        return true;
    }

    private static void answer(
        SessionVault vault,
        AndroidRefreshCoordinator coordinator,
        WebMessageCompat message,
        Uri sourceOrigin,
        boolean isMainFrame,
        JavaScriptReplyProxy replyProxy
    ) {
        try {
            String origin = VaultOrigin.accepts(isMainFrame, sourceOrigin) ? VaultOrigin.APP_ORIGIN : "";
            replyProxy.postMessage(reply(vault, coordinator, !origin.isEmpty(), origin, message == null ? null : message.getData()));
        } catch (RuntimeException exception) {
            // A página já pode ter sido fechada. Não registar a resposta.
        }
    }

    public static String reply(SessionVault vault, AndroidRefreshCoordinator coordinator, boolean mainFrame, String origin, String data) {
        if (!VaultOrigin.accepts(mainFrame, origin)) {
            return error(idOf(data), "origin_rejected");
        }
        if (data == null || data.length() > MESSAGE_LIMIT) {
            return error("", "rejected");
        }
        FlatJson request;
        try {
            request = FlatJson.parse(data);
        } catch (IllegalArgumentException exception) {
            return error("", "rejected");
        }
        String id = request.text("id") == null ? "" : request.text("id");
        String op = request.text("op") == null ? "" : request.text("op");
        if ("contract".equals(op)) {
            return base(id, true).put("contract", AndroidRefreshCoordinator.CONTRACT).emit();
        }
        if ("commit".equals(op)) {
            AndroidRefreshCoordinator.Outcome outcome = coordinator.commit(
                text(request, "api_base"),
                text(request, "access_token"),
                text(request, "refresh_token"),
                text(request, "session_id"),
                text(request, "absolute_expires_at")
            );
            if (!"committed".equals(outcome.kind)) {
                return error(id, outcome.kind);
            }
            DriverLocationArmament.onSessionCommitted(vault, coordinator, text(request, "api_base"), text(request, "session_id"));
            return base(id, true).emit();
        }
        if ("refresh".equals(op)) {
            return refreshReply(id, coordinator.refresh(text(request, "api_base")));
        }
        if ("logout".equals(op)) {
            AndroidRefreshCoordinator.Outcome outcome = coordinator.logout(text(request, "api_base"));
            if (outcome.cleared) {
                DriverLocationArmament.onSessionEnded();
            }
            return base(id, true).put("kind", outcome.kind).put("revoked", outcome.revoked).emit();
        }
        if ("restore".equals(op)) {
            AndroidRefreshCoordinator.Outcome outcome = coordinator.restore(text(request, "api_base"));
            if ("ready".equals(outcome.kind) || "refreshed".equals(outcome.kind)) {
                DriverLocationArmament.onSessionRestored(vault, coordinator, text(request, "api_base"), outcome.kind);
            } else if ("empty".equals(outcome.kind) || "revoked".equals(outcome.kind)) {
                DriverLocationArmament.onSessionEnded();
            }
            return refreshReply(id, outcome);
        }
        return error(id, "rejected");
    }

    private static String refreshReply(String id, AndroidRefreshCoordinator.Outcome outcome) {
        FlatJson response = base(id, true).put("kind", outcome.kind);
        if ("refreshed".equals(outcome.kind) || "ready".equals(outcome.kind)) {
            response.put("access_token", outcome.accessToken);
            putText(response, "user_id", outcome.userId);
            putText(response, "role", outcome.role);
            putText(response, "phone", outcome.phone);
            putText(response, "display_name", outcome.displayName);
        }
        return response.emit();
    }

    private static void putText(FlatJson json, String key, String value) {
        if (value != null) {
            json.put(key, value);
        }
    }

    private static FlatJson base(String id, boolean ok) {
        return FlatJson.object().put("id", id == null ? "" : id).put("ok", ok);
    }

    private static String error(String id, String code) {
        return base(id, false).put("error", code).emit();
    }

    private static String text(FlatJson json, String key) {
        String value = json.text(key);
        return value == null ? "" : value;
    }

    private static String idOf(String data) {
        if (data == null || data.length() > MESSAGE_LIMIT) {
            return "";
        }
        try {
            String id = FlatJson.parse(data).text("id");
            return id == null ? "" : id;
        } catch (IllegalArgumentException exception) {
            return "";
        }
    }
}
