package dev.gamersclt.batcaverna.nativeapp;

import org.junit.Test;
import static org.junit.Assert.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class UpdateDownloadStateTest {
 @Test public void onlyOneConcurrentDownloadOwnsSharedFiles() throws Exception {
  UpdateDownloadState state = new UpdateDownloadState();
  ExecutorService pool = Executors.newFixedThreadPool(8);
  CountDownLatch start = new CountDownLatch(1), done = new CountDownLatch(8);
  AtomicInteger acquired = new AtomicInteger();
  try {
   for (int i=0; i<8; i++) pool.execute(() -> {
    try { start.await(); if(state.begin()) acquired.incrementAndGet(); }
    catch(InterruptedException e) { Thread.currentThread().interrupt(); }
    finally { done.countDown(); }
   });
   start.countDown(); assertTrue(done.await(5,TimeUnit.SECONDS));
   assertEquals(1, acquired.get()); assertTrue(state.isRunning());
   state.finish(); assertFalse(state.isRunning()); assertTrue(state.begin());
  } finally { pool.shutdownNow(); }
 }
 @Test public void unknownSizeShowsReceivedBytesWithoutFalseZeroPercent() {
  assertEquals(-1, UpdateDownloadState.percent(1048576, -1));
  assertEquals("1,0 MB recebidos", UpdateDownloadState.text(1048576, -1));
  assertEquals("50% · 1,0 MB de 2,0 MB", UpdateDownloadState.text(1048576,2097152));
  assertEquals(100, UpdateDownloadState.percent(300,200));
 }
}
