package dev.gamersclt.batcaverna.nativeapp;

import java.util.Arrays;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;

public final class SessionCipherTest {
    public static void main(String[] args) throws Exception {
        KeyGenerator generator = KeyGenerator.getInstance("AES");
        generator.init(256);
        SecretKey key = generator.generateKey();
        byte[] first = SessionCipher.encrypt(key, "access_token", "test-session-credential");
        byte[] second = SessionCipher.encrypt(key, "access_token", "test-session-credential");
        if (Arrays.equals(first, second)) throw new AssertionError("IV reused");
        if (!"test-session-credential".equals(SessionCipher.decrypt(key, "access_token", first)))
            throw new AssertionError("Round trip failed");
        rejects(key, "refresh_token", first);
        byte[] changed = first.clone(); changed[changed.length - 1] ^= 1;
        rejects(key, "access_token", changed);
        rejects(generator.generateKey(), "access_token", first);
        rejects(key, "access_token", new byte[12]);
        System.out.println("SessionCipher: round trip, random IV, tamper, wrong field/key, truncation passed");
    }
    private static void rejects(SecretKey key, String name, byte[] bytes) throws Exception {
        try { SessionCipher.decrypt(key, name, bytes); }
        catch (java.security.GeneralSecurityException expected) { return; }
        throw new AssertionError("Invalid envelope accepted");
    }
}
