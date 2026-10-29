package pt.vamula.app.vault;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/** Cliente mínimo. Não segue redireccionamentos e não regista o corpo. */
public final class HttpUrlVaultHttp implements VaultHttp {

    private static final int BODY_LIMIT = 65536;
    private final int timeoutMs;

    public HttpUrlVaultHttp() {
        this(15_000);
    }

    HttpUrlVaultHttp(int timeoutMs) {
        this.timeoutMs = timeoutMs;
    }

    @Override
    public Result post(String url, String json, Map<String, String> headers) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setConnectTimeout(timeoutMs);
            connection.setReadTimeout(timeoutMs);
            connection.setInstanceFollowRedirects(false);
            connection.setUseCaches(false);
            connection.setDoOutput(true);
            connection.setRequestMethod("POST");
            for (Map.Entry<String, String> header : headers.entrySet()) {
                connection.setRequestProperty(header.getKey(), header.getValue());
            }
            byte[] payload = json.getBytes(StandardCharsets.UTF_8);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(payload);
            }
            int status = connection.getResponseCode();
            InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
            return new Result(status, readLimited(stream));
        } catch (IOException exception) {
            return new Result(0, "");
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private static String readLimited(InputStream stream) throws IOException {
        if (stream == null) {
            return "";
        }
        try (InputStream input = stream) {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[1024];
            int total = 0;
            int read;
            while ((read = input.read(buffer)) >= 0 && total < BODY_LIMIT) {
                int count = Math.min(read, BODY_LIMIT - total);
                output.write(buffer, 0, count);
                total += count;
            }
            return output.toString(StandardCharsets.UTF_8);
        }
    }
}
