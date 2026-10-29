package pt.vamula.app.vault;

import java.util.LinkedHashMap;
import java.util.Map;

/** Objecto JSON plano. Não regista valores e não depende de org.json. */
final class FlatJson {

    private final Map<String, Object> values = new LinkedHashMap<>();

    static FlatJson object() {
        return new FlatJson();
    }

    static FlatJson parse(String raw) {
        if (raw == null) {
            throw new IllegalArgumentException("json_rejected");
        }
        Parser parser = new Parser(raw);
        parser.skip();
        FlatJson json = parser.object();
        parser.skip();
        if (!parser.done()) {
            throw new IllegalArgumentException("json_rejected");
        }
        return json;
    }

    FlatJson put(String key, String value) {
        values.put(key, value);
        return this;
    }

    FlatJson put(String key, boolean value) {
        values.put(key, value);
        return this;
    }

    String text(String key) {
        Object value = values.get(key);
        if (!(value instanceof String)) {
            return null;
        }
        String text = (String) value;
        return text.trim().isEmpty() ? null : text;
    }

    boolean isNull(String key) {
        return values.containsKey(key) && values.get(key) == null;
    }

    Long longValue(String key) {
        Object value = values.get(key);
        if (value instanceof Long) {
            return (Long) value;
        }
        if (value instanceof String) {
            try {
                return Long.parseLong((String) value);
            } catch (NumberFormatException exception) {
                return null;
            }
        }
        return null;
    }

    String emit() {
        StringBuilder output = new StringBuilder();
        output.append('{');
        boolean first = true;
        for (Map.Entry<String, Object> entry : values.entrySet()) {
            if (!first) {
                output.append(',');
            }
            first = false;
            output.append('"');
            escape(output, entry.getKey());
            output.append('"').append(':');
            Object value = entry.getValue();
            if (value == null) {
                output.append("null");
            } else if (value instanceof Boolean) {
                output.append(value);
            } else if (value instanceof Long) {
                output.append(value);
            } else {
                output.append('"');
                escape(output, String.valueOf(value));
                output.append('"');
            }
        }
        output.append('}');
        return output.toString();
    }

    private static void escape(StringBuilder output, String value) {
        for (int index = 0; index < value.length(); index++) {
            char symbol = value.charAt(index);
            if (symbol == '"' || symbol == '\\') {
                output.append('\\').append(symbol);
            } else if (symbol == '\n') {
                output.append("\\n");
            } else if (symbol == '\r') {
                output.append("\\r");
            } else if (symbol < 0x20) {
                output.append(String.format("\\u%04x", (int) symbol));
            } else {
                output.append(symbol);
            }
        }
    }

    private static final class Parser {
        private final String raw;
        private int index;

        private Parser(String raw) {
            this.raw = raw;
        }

        private boolean done() {
            return index >= raw.length();
        }

        private void skip() {
            while (!done() && raw.charAt(index) <= ' ') {
                index++;
            }
        }

        private char next() {
            if (done()) {
                throw new IllegalArgumentException("json_rejected");
            }
            return raw.charAt(index++);
        }

        private FlatJson object() {
            if (next() != '{') {
                throw new IllegalArgumentException("json_rejected");
            }
            FlatJson json = new FlatJson();
            skip();
            if (!done() && raw.charAt(index) == '}') {
                index++;
                return json;
            }
            while (true) {
                skip();
                String key = string();
                skip();
                if (next() != ':') {
                    throw new IllegalArgumentException("json_rejected");
                }
                skip();
                json.values.put(key, value());
                skip();
                char separator = next();
                if (separator == '}') {
                    return json;
                }
                if (separator != ',') {
                    throw new IllegalArgumentException("json_rejected");
                }
            }
        }

        private Object value() {
            if (done()) {
                throw new IllegalArgumentException("json_rejected");
            }
            char symbol = raw.charAt(index);
            if (symbol == '"') {
                return string();
            }
            if (symbol == '-' || (symbol >= '0' && symbol <= '9')) {
                return number();
            }
            if (raw.startsWith("true", index)) {
                index += 4;
                return Boolean.TRUE;
            }
            if (raw.startsWith("false", index)) {
                index += 5;
                return Boolean.FALSE;
            }
            if (raw.startsWith("null", index)) {
                index += 4;
                return null;
            }
            throw new IllegalArgumentException("json_rejected");
        }

        private Long number() {
            int start = index;
            if (raw.charAt(index) == '-') {
                index++;
            }
            while (!done() && raw.charAt(index) >= '0' && raw.charAt(index) <= '9') {
                index++;
            }
            if (!done() && (raw.charAt(index) == '.' || raw.charAt(index) == 'e' || raw.charAt(index) == 'E')) {
                throw new IllegalArgumentException("json_rejected");
            }
            try {
                return Long.parseLong(raw.substring(start, index));
            } catch (NumberFormatException exception) {
                throw new IllegalArgumentException("json_rejected");
            }
        }

        private String string() {
            if (next() != '"') {
                throw new IllegalArgumentException("json_rejected");
            }
            StringBuilder output = new StringBuilder();
            while (true) {
                char symbol = next();
                if (symbol == '"') {
                    return output.toString();
                }
                if (symbol != '\\') {
                    output.append(symbol);
                    continue;
                }
                char escaped = next();
                if (escaped == 'u') {
                    int code = 0;
                    for (int shift = 0; shift < 4; shift++) {
                        code = (code << 4) + hex(next());
                    }
                    output.append((char) code);
                } else if (escaped == 'n') {
                    output.append('\n');
                } else if (escaped == 'r') {
                    output.append('\r');
                } else if (escaped == '"' || escaped == '\\' || escaped == '/') {
                    output.append(escaped);
                } else {
                    throw new IllegalArgumentException("json_rejected");
                }
            }
        }

        private static int hex(char symbol) {
            if (symbol >= '0' && symbol <= '9') {
                return symbol - '0';
            }
            if (symbol >= 'a' && symbol <= 'f') {
                return symbol - 'a' + 10;
            }
            if (symbol >= 'A' && symbol <= 'F') {
                return symbol - 'A' + 10;
            }
            throw new IllegalArgumentException("json_rejected");
        }
    }
}
