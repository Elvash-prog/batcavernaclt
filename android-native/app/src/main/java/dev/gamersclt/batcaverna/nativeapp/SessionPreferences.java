package dev.gamersclt.batcaverna.nativeapp;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.security.KeyStore;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;

/** Keeps existing preference consumers compatible while encrypting session credentials at rest. */
final class SessionPreferences implements SharedPreferences {
    private static final String ALIAS = "batcaverna.session.v1";
    private static final String PREFIX = "keystore:v1:";
    private static SessionPreferences instance;
    private final SharedPreferences raw;
    private SecretKey key;

    static synchronized SharedPreferences get(Context context) {
        if (instance == null) instance = new SessionPreferences(context.getApplicationContext()
                .getSharedPreferences("batcaverna", Context.MODE_PRIVATE));
        return instance;
    }
    private SessionPreferences(SharedPreferences raw) {
        this.raw = raw;
        // One atomic, synchronous replacement: never leave a plaintext copy behind.
        try {
            Editor editor = null;
            for (String name : new String[]{"access_token", "refresh_token"}) {
                String value = raw.getString(name, null);
                if (value != null && !value.isEmpty() && !value.startsWith(PREFIX)) {
                    if (editor == null) editor = edit();
                    editor.putString(name, value);
                }
            }
            if (editor != null && !editor.commit()) throw new IllegalStateException("Session migration failed");
        } catch (RuntimeException unavailable) {
            clearCredentials();
        }
    }
    private static boolean secret(String name) {
        return "access_token".equals(name) || "refresh_token".equals(name);
    }
    private synchronized SecretKey key() throws Exception {
        if (key == null) {
            KeyStore store = KeyStore.getInstance("AndroidKeyStore");
            store.load(null);
            key = (SecretKey) store.getKey(ALIAS, null);
            if (key == null) {
                KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
                generator.init(new KeyGenParameterSpec.Builder(ALIAS,
                        KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                        .setKeySize(256).setRandomizedEncryptionRequired(true).build());
                key = generator.generateKey();
            }
        }
        return key;
    }
    private void clearCredentials() {
        raw.edit().remove("access_token").remove("refresh_token").remove("expires_at")
                .putBoolean("authenticated", false).commit();
    }
    public String getString(String name, String fallback) {
        String value = raw.getString(name, fallback);
        if (!secret(name) || value == null || value.isEmpty()) return value;
        try {
            if (!value.startsWith(PREFIX)) throw new IllegalStateException("Unencrypted session");
            return SessionCipher.decrypt(key(), name, Base64.decode(value.substring(PREFIX.length()), Base64.NO_WRAP));
        } catch (Exception invalid) {
            // Corrupt or unavailable keys require login; never fall back to plaintext.
            clearCredentials();
            return fallback;
        }
    }
    public Map<String, ?> getAll() {
        Map<String, Object> values = new HashMap<>(raw.getAll());
        for (String name : new String[]{"access_token", "refresh_token"})
            if (values.containsKey(name)) values.put(name, getString(name, ""));
        return values;
    }
    public Set<String> getStringSet(String k, Set<String> d) { return raw.getStringSet(k, d); }
    public int getInt(String k, int d) { return raw.getInt(k, d); }
    public long getLong(String k, long d) { return raw.getLong(k, d); }
    public float getFloat(String k, float d) { return raw.getFloat(k, d); }
    public boolean getBoolean(String k, boolean d) { return raw.getBoolean(k, d); }
    public boolean contains(String k) { return raw.contains(k); }
    public void registerOnSharedPreferenceChangeListener(OnSharedPreferenceChangeListener l) { raw.registerOnSharedPreferenceChangeListener(l); }
    public void unregisterOnSharedPreferenceChangeListener(OnSharedPreferenceChangeListener l) { raw.unregisterOnSharedPreferenceChangeListener(l); }
    public Editor edit() { return new SecureEditor(raw.edit()); }
    private final class SecureEditor implements Editor {
        private final Editor editor;
        SecureEditor(Editor editor) { this.editor = editor; }
        public Editor putString(String name, String value) {
            if (secret(name) && value != null && !value.isEmpty()) {
                try { value = PREFIX + Base64.encodeToString(SessionCipher.encrypt(key(), name, value), Base64.NO_WRAP); }
                catch (Exception unavailable) { throw new IllegalStateException("Secure session storage unavailable", unavailable); }
            }
            editor.putString(name, value); return this;
        }
        public Editor putStringSet(String k, Set<String> v) { editor.putStringSet(k, v); return this; }
        public Editor putInt(String k, int v) { editor.putInt(k, v); return this; }
        public Editor putLong(String k, long v) { editor.putLong(k, v); return this; }
        public Editor putFloat(String k, float v) { editor.putFloat(k, v); return this; }
        public Editor putBoolean(String k, boolean v) { editor.putBoolean(k, v); return this; }
        public Editor remove(String k) { editor.remove(k); return this; }
        public Editor clear() { editor.clear(); return this; }
        public boolean commit() { return editor.commit(); }
        public void apply() { editor.apply(); }
    }
}
