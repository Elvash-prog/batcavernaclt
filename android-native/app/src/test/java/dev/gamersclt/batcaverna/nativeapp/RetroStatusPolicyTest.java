package dev.gamersclt.batcaverna.nativeapp;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class RetroStatusPolicyTest {
    @Test public void preservesManualStatus() {
        assertEquals("finished", RetroStatusPolicy.resolve("finished", false, 10, 2));
    }

    @Test public void derivesProgressAndPlatinum() {
        assertEquals("progress", RetroStatusPolicy.resolve("", false, 10, 2));
        assertEquals("platinum", RetroStatusPolicy.resolve("", false, 10, 10));
        assertEquals("platinum", RetroStatusPolicy.resolve("", true, 10, 2));
    }

    @Test public void fallsBackToBacklog() {
        assertEquals("backlog", RetroStatusPolicy.resolve("unknown", false, 10, 0));
        assertEquals("📌 Backlog", RetroStatusPolicy.label("unknown"));
    }
}
