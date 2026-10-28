package pt.vamula.app.vault;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;

final class SessionCodec {

    private static final int MAGIC = 0x564D5331;
    private static final int VERSION = 1;

    private SessionCodec() {}

    static byte[] encode(SessionRecord record) {
        try {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            DataOutputStream out = new DataOutputStream(buffer);
            out.writeInt(MAGIC);
            out.writeInt(VERSION);
            out.writeUTF(record.accessToken());
            out.writeUTF(record.refreshToken());
            out.writeUTF(record.familyId());
            out.writeInt(record.generation());
            out.writeUTF(text(record.absoluteExpiresAt()));
            out.writeUTF(text(record.idleExpiresAt()));
            out.writeUTF(text(record.idempotencyKey()));
            out.writeBoolean(record.refreshPending());
            out.flush();
            return buffer.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("session_encode_failed");
        }
    }

    static SessionRecord decode(byte[] blob) throws IOException {
        DataInputStream in = new DataInputStream(new ByteArrayInputStream(blob));
        if (in.readInt() != MAGIC || in.readInt() != VERSION) {
            throw new IOException("session_blob_unreadable");
        }
        return new SessionRecord(
            in.readUTF(),
            in.readUTF(),
            in.readUTF(),
            in.readInt(),
            emptyToNull(in.readUTF()),
            emptyToNull(in.readUTF()),
            emptyToNull(in.readUTF()),
            in.readBoolean()
        );
    }

    private static String text(String value) {
        return value == null ? "" : value;
    }

    private static String emptyToNull(String value) {
        return value.isEmpty() ? null : value;
    }
}
