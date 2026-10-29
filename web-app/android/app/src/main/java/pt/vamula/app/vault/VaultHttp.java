package pt.vamula.app.vault;

import java.util.Map;

/** POST JSON. Status 0 significa que a ligação não chegou a uma resposta HTTP. */
public interface VaultHttp {

    final class Result {

        public final int status;
        public final String body;

        public Result(int status, String body) {
            this.status = status;
            this.body = body == null ? "" : body;
        }
    }

    Result post(String url, String json, Map<String, String> headers);
}
