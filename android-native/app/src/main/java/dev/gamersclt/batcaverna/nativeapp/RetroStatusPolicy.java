package dev.gamersclt.batcaverna.nativeapp;

import java.util.Arrays;

final class RetroStatusPolicy {
    static final String[] KEYS = {"backlog", "progress", "finished", "platinum", "paused", "abandoned"};
    static final String[] LABELS = {"📌 Backlog", "🎮 Em progresso", "✅ Zerado", "🏆 Platinado", "⏸️ Pausado", "❌ Abandonado"};

    private RetroStatusPolicy() {}

    static boolean isValid(String value) {
        return value != null && Arrays.asList(KEYS).contains(value);
    }

    static String resolve(String saved, boolean hasAward, int total, int unlocked) {
        if (isValid(saved)) return saved;
        if (hasAward || (total > 0 && unlocked >= total)) return "platinum";
        if (unlocked > 0) return "progress";
        return "backlog";
    }

    static String label(String key) {
        for (int i = 0; i < KEYS.length; i++) {
            if (KEYS[i].equals(key)) return LABELS[i];
        }
        return LABELS[0];
    }
}
