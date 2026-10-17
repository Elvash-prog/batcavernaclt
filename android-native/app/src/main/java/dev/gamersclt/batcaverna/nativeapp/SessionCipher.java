package dev.gamersclt.batcaverna.nativeapp;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Authenticated envelope; the preference name prevents swapping access and refresh tokens. */
final class SessionCipher {
    static byte[] encrypt(SecretKey key, String name, String value) throws GeneralSecurityException {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key);
        cipher.updateAAD(name.getBytes(StandardCharsets.UTF_8));
        byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
        return ByteBuffer.allocate(12 + encrypted.length).put(cipher.getIV()).put(encrypted).array();
    }
    static String decrypt(SecretKey key, String name, byte[] envelope) throws GeneralSecurityException {
        if (envelope.length < 28) throw new GeneralSecurityException("Invalid session envelope");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, envelope, 0, 12));
        cipher.updateAAD(name.getBytes(StandardCharsets.UTF_8));
        return new String(cipher.doFinal(envelope, 12, envelope.length - 12), StandardCharsets.UTF_8);
    }
}
