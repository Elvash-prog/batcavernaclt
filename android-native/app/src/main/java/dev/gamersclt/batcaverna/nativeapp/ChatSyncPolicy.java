package dev.gamersclt.batcaverna.nativeapp;
/** Small testable policy: foreground-only polling, capped failure backoff. */
public final class ChatSyncPolicy {
    private int failures;
    public boolean canPoll(boolean foreground,boolean attached,boolean conversation,boolean loading,boolean sending,boolean syncing){
        return foreground&&attached&&conversation&&!loading&&!sending&&!syncing;
    }
    public void success(){failures=0;}
    public void failure(){failures=Math.min(3,failures+1);}
    public long delayMillis(){return Math.min(60000L,8000L*(1L<<failures));}
}
