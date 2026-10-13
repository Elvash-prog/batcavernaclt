import dev.gamersclt.batcaverna.nativeapp.ChatSyncPolicy;
public final class ChatSyncPolicyTest {
    private static void check(boolean result,String label){if(!result)throw new AssertionError(label);}
    public static void main(String[] args){
        ChatSyncPolicy p=new ChatSyncPolicy();
        check(p.delayMillis()==8000,"default interval");
        check(p.canPoll(true,true,true,false,false,false),"foreground conversation");
        check(!p.canPoll(false,true,true,false,false,false),"background pause");
        check(!p.canPoll(true,false,true,false,false,false),"detached pause");
        check(!p.canPoll(true,true,false,false,false,false),"list pause");
        check(!p.canPoll(true,true,true,true,false,false),"no overlapping reads");
        check(!p.canPoll(true,true,true,false,true,false),"no polls while sending");
        check(!p.canPoll(true,true,true,false,false,true),"no overlapping polls");
        p.failure();check(p.delayMillis()==16000,"first backoff");
        p.failure();check(p.delayMillis()==32000,"second backoff");
        for(int i=0;i<10;i++)p.failure();check(p.delayMillis()==60000,"capped backoff");
        p.success();check(p.delayMillis()==8000,"success resets");
        System.out.println("ChatSyncPolicy: 12 checks passed");
    }
}
