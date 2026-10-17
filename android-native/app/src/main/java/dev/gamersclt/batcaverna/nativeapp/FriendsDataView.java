package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.widget.*;
import org.json.*;
/** Private text chat with foreground-only polling. No read receipts or push yet. */
public final class FriendsDataView extends LinearLayout {
    private final TextView heading,state;
    private final LinearLayout list;
    private final Button more,refresh,back,send;
    private final EditText draft;
    private final EditText search;
    private final LinearLayout friendActions;
    private final ImageView headerAvatar;private String activeAvatar="";
    private final LinearLayout composer;
    private final ScrollView scroll;
    private final AccountRepository repository;
    private final boolean chatTab;
    private JSONArray records=new JSONArray();
    private JSONObject unreadCounts=new JSONObject();private String readThrough="";
    void unread(JSONObject counts){unreadCounts=counts==null?new JSONObject():counts;if(activeId==null)render();}
    private void markRead(){if(!foreground||!attached||activeId==null||records.length()==0)return;String through=records.optJSONObject(0).optString("created_at");if(!UnreadPolicy.advance(MessageTime.epoch(through),MessageTime.epoch(readThrough),true))return;String target=activeId;repository.chatRead(target,through,(r,e)->{if(e==null){if(target.equals(activeId))readThrough=through;if(getContext() instanceof MainActivity)((MainActivity)getContext()).refreshChatCounts();}});}
    private String activeId=null,activeName="";
    private int offset=0,generation=0;
    private boolean busy=false,sending=false,scrollAfterSend=false;
    private final java.util.Set<String> seen=new java.util.HashSet<>();
    public FriendsDataView(Context c,boolean chat){
        super(c);chatTab=chat;repository=new AccountRepository(c);setOrientation(VERTICAL);setPadding(dp(18),dp(14),dp(18),dp(12));setBackgroundColor(0x00101419);
        LinearLayout header=new LinearLayout(c);header.setGravity(Gravity.CENTER_VERTICAL);addView(header);headerAvatar=new ImageView(c);headerAvatar.setScaleType(ImageView.ScaleType.CENTER_CROP);headerAvatar.setBackground(AppStyle.shape(headerAvatar,0xff303449,24));headerAvatar.setClipToOutline(true);headerAvatar.setVisibility(GONE);header.addView(headerAvatar,new LayoutParams(dp(40),dp(40)));heading=text(chat?"Mensagens":"Meus amigos",17,0xfff3f4f8);heading.setTypeface(null,Typeface.BOLD);heading.setPadding(dp(8),0,0,0);heading.setMaxLines(1);heading.setEllipsize(android.text.TextUtils.TruncateAt.END);header.addView(heading,new LayoutParams(0,dp(40),1));
        state=text("",11,0xff9ca9b8);addView(state);
        friendActions=new LinearLayout(c);friendActions.setOrientation(VERTICAL);addView(friendActions);
        Button addFriend=new Button(c);addFriend.setAllCaps(false);addFriend.setText("＋ Adicionar amigo");AppStyle.button(addFriend,true);addFriend.setOnClickListener(v->new FriendSearchSheet(c));friendActions.addView(addFriend,new LayoutParams(-1,-2));
        Button invitations=new Button(c);invitations.setAllCaps(false);invitations.setText("Convites recebidos");AppStyle.button(invitations,false);invitations.setOnClickListener(v->new FriendRequestsSheet(c,()->{if(activeId==null)reset();}));friendActions.addView(invitations,new LayoutParams(-1,-2));
        search=NativeSheet.input(c,"Buscar amigos",80);search.setSingleLine(true);addView(search);search.addTextChangedListener(new android.text.TextWatcher(){public void beforeTextChanged(CharSequence s,int st,int count,int after){}public void onTextChanged(CharSequence s,int st,int before,int count){if(activeId==null)render();}public void afterTextChanged(android.text.Editable e){}});
        back=new Button(c);back.setText("‹");back.setContentDescription("Voltar às conversas");back.setMinWidth(0);back.setAllCaps(false);back.setVisibility(GONE);back.setOnClickListener(v->back());AppStyle.button(back,false);header.addView(back,0,new LayoutParams(dp(48),dp(48)));
        scroll=new ScrollView(c);scroll.setVerticalScrollBarEnabled(false);list=new LinearLayout(c);list.setOrientation(VERTICAL);scroll.addView(list);addView(scroll,new LayoutParams(-1,0,1));
        more=new Button(c);more.setAllCaps(false);more.setText("Carregar mais amigos");more.setVisibility(GONE);more.setOnClickListener(v->load());AppStyle.button(more,false);addView(more);
        refresh=new Button(c);refresh.setAllCaps(false);refresh.setText("Atualizar");refresh.setOnClickListener(v->{if(!busy&&!sending)reset();});AppStyle.button(refresh,false);refresh.setText("↻");refresh.setContentDescription("Atualizar conversas");header.addView(refresh,new LayoutParams(dp(44),dp(40)));
        composer=new LinearLayout(c);composer.setGravity(Gravity.CENTER_VERTICAL);
        draft=new EditText(c);draft.setHint("Mensagem");draft.setHintTextColor(0xff9ca9b8);draft.setTextColor(0xfff3f4f8);draft.setTextSize(14);draft.setMaxLines(4);draft.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE|android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);draft.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(4000)});
        AppStyle.input(draft);composer.addView(draft,new LayoutParams(0,-2,1));Button sticker=new Button(c);sticker.setText("");sticker.setContentDescription("Figurinhas");sticker.setOnClickListener(v->chooseSticker());AppStyle.button(sticker,false);AppStyle.icon(sticker,ActionIcon.STICKER,0xffffce7d);sticker.setPadding(dp(12),dp(8),dp(12),dp(8));composer.addView(sticker,new LayoutParams(dp(48),dp(48)));send=new Button(c);send.setAllCaps(false);send.setText("Enviar");send.setOnClickListener(v->send());AppStyle.button(send,true);send.setText("");send.setContentDescription("Enviar mensagem");AppStyle.icon(send,ActionIcon.SEND,0xffffffff);send.setPadding(dp(12),dp(8),dp(12),dp(8));LayoutParams sendParams=new LayoutParams(dp(48),dp(48));sendParams.setMargins(dp(8),0,0,0);composer.addView(send,sendParams);composer.setVisibility(GONE);addView(composer);reset();
    }
    private final android.os.Handler syncHandler=new android.os.Handler(android.os.Looper.getMainLooper());
    private final ChatSyncPolicy syncPolicy=new ChatSyncPolicy();
    private boolean realtimeReady,liveDirty;private final Runnable liveDrain=()->drainLive();
    void realtimeConnection(boolean ready){realtimeReady=ready;scheduleSync();}
    void realtimeEvent(String table,String type,String id){if(!foreground||!attached||(!table.isEmpty()&&!table.equals("clt_chat_messages")&&!table.equals("clt_chat_reactions")))return;if(table.equals("clt_chat_messages")&&type.equals("DELETE")&&!id.isEmpty()&&activeId!=null){JSONArray next=new JSONArray();for(int i=0;i<records.length();i++){JSONObject row=records.optJSONObject(i);if(!id.equals(row.optString("id")))next.put(row);}if(next.length()!=records.length()){int y=scroll.getScrollY();records=next;render();scroll.scrollTo(0,y);}}if(activeId!=null&&!id.isEmpty()&&(table.equals("clt_chat_reactions")||type.equals("UPDATE"))){boolean known=false;for(int i=50;i<records.length();i++)known|=id.equals(records.optJSONObject(i).optString("id"));if(known){String friend=activeId;int ticket=generation;repository.messageCurrent(friend,id,(rows,error)->{if(error!=null||ticket!=generation||!foreground||!attached||!friend.equals(activeId))return;JSONArray next=new JSONArray();for(int i=0;i<records.length();i++){JSONObject old=records.optJSONObject(i);if(!id.equals(old.optString("id")))next.put(old);else if(rows.length()>0)next.put(rows.optJSONObject(0));}int y=scroll.getScrollY();records=next;render();scroll.post(()->scroll.scrollTo(0,y));});}}liveDirty=true;syncHandler.removeCallbacks(liveDrain);syncHandler.postDelayed(liveDrain,120);}
    private void drainLive(){if(!foreground||!attached){liveDirty=false;return;}if(busy||sending||syncing){syncHandler.postDelayed(liveDrain,250);return;}liveDirty=false;if(activeId!=null){synchronize();return;}busy=true;int request=generation;repository.friends(0,(rows,error)->{if(request!=generation)return;busy=false;if(error==null&&activeId==null){int y=scroll.getScrollY();records=rows;offset=rows.length();seen.clear();for(int i=0;i<rows.length();i++)seen.add(rows.optJSONObject(i).optString("id"));render();scroll.scrollTo(0,y);}if(liveDirty)syncHandler.post(liveDrain);});}
    private boolean foreground=false,attached=false,syncing=false;
    private int syncEpoch=0;
    private final Runnable syncTick=()->synchronize();
    public void setForeground(boolean value){foreground=value;if(!value){syncHandler.removeCallbacks(liveDrain);liveDirty=false;}syncEpoch++;syncing=false;syncHandler.removeCallbacks(syncTick);scheduleSync();if(value)markRead();}
    @Override protected void onAttachedToWindow(){super.onAttachedToWindow();attached=true;scheduleSync();}
    @Override protected void onDetachedFromWindow(){attached=false;syncHandler.removeCallbacks(liveDrain);liveDirty=false;syncEpoch++;syncing=false;syncHandler.removeCallbacks(syncTick);super.onDetachedFromWindow();}
    private void scheduleSync(){
        syncHandler.removeCallbacks(syncTick);
        if(foreground&&attached&&activeId!=null&&SessionPreferences.get(getContext()).getBoolean("chat_sync",true))syncHandler.postDelayed(syncTick,realtimeReady?Math.max(45000,syncPolicy.delayMillis()):syncPolicy.delayMillis());
    }
    private void synchronize(){if(!SessionPreferences.get(getContext()).getBoolean("chat_sync",true))return;
        if(!syncPolicy.canPoll(foreground,attached,activeId!=null,busy,sending,syncing)){scheduleSync();return;}
        syncing=true;int epoch=syncEpoch,request=generation;String target=activeId;
        repository.messages(target,0,(rows,error)->{
            if(epoch!=syncEpoch)return;syncing=false;
            if(!foreground||!attached||request!=generation||!target.equals(activeId)||sending||busy){scheduleSync();return;}
            if(error!=null){syncPolicy.failure();state.setText("Sincronização adiada • "+error);scheduleSync();return;}
            syncPolicy.success();
            JSONArray merged=new JSONArray();java.util.Set<String> ids=new java.util.HashSet<>();
            for(int i=0;i<rows.length();i++){JSONObject m=rows.optJSONObject(i);if(m!=null&&ids.add(m.optString("id")))merged.put(m);}
            // Keep previously loaded history older than the server's newest page.
            if(rows.length()==50){String boundary=rows.optJSONObject(rows.length()-1).optString("created_at");
                for(int i=0;i<records.length();i++){JSONObject m=records.optJSONObject(i);if(m!=null&&m.optString("created_at").compareTo(boundary)<=0&&ids.add(m.optString("id")))merged.put(m);}
            }
            if(!merged.toString().equals(records.toString())){
                int y=scroll.getScrollY();boolean atBottom=list.getHeight()-scroll.getHeight()-y<dp(64);String anchor=null;int relative=0;
                for(int i=0;i<list.getChildCount();i++){android.view.View v=list.getChildAt(i);if(v.getBottom()>y){anchor=(String)v.getTag();relative=v.getTop()-y;break;}}
                records=merged;seen.clear();seen.addAll(ids);offset=records.length();render();
                String keep=anchor;int delta=relative;int route=generation;
                scroll.post(()->{if(route!=generation||!target.equals(activeId))return;if(atBottom){scroll.fullScroll(FOCUS_DOWN);return;}for(int i=0;i<list.getChildCount();i++){android.view.View v=list.getChildAt(i);if(keep!=null&&keep.equals(v.getTag())){scroll.scrollTo(0,v.getTop()-delta);return;}}scroll.scrollTo(0,y);});
            }else state.setText("Conversa privada");
            if(rows.length()<50)more.setVisibility(GONE);markRead();
            scheduleSync();
        });
    }
    public boolean back(){if(sending){state.setText("Aguarde a confirmação do envio.");return true;}if(activeId==null)return false;activeId=null;activeName="";reset();return true;}
    private void reset(){readThrough="";syncEpoch++;syncing=false;syncPolicy.success();scheduleSync();generation++;busy=false;offset=0;records=new JSONArray();seen.clear();list.removeAllViews();composer.setVisibility(activeId==null?GONE:VISIBLE);friendActions.setVisibility(activeId==null?VISIBLE:GONE);search.setVisibility(activeId==null?VISIBLE:GONE);refresh.setVisibility(activeId==null?VISIBLE:GONE);headerAvatar.setVisibility(activeId==null?GONE:VISIBLE);headerAvatar.setTag(new Object());headerAvatar.setImageResource(R.drawable.app_logo);if(activeId!=null)AccountImageLoader.load(headerAvatar,activeAvatar);heading.setTextSize(activeId==null?17:16);back.setVisibility(activeId==null?GONE:VISIBLE);heading.setText(activeId==null?(chatTab?"Mensagens":"Meus amigos"):activeName);more.setVisibility(GONE);load();}
    void openNotification(String id){state.setText("Abrindo conversa…");repository.friendProfile(id,(rows,error)->{if(!isAttachedToWindow())return;if(error!=null){state.setText(error);return;}JSONObject friend=rows.optJSONObject(0);if(friend!=null)open(friend);});}
 private void open(JSONObject friend){activeId=friend.optString("id");activeName=friend.optString("nome","Amigo");activeAvatar=friend.optString("avatar_url","");draft.setText("");reset();}
    private void load(){if(busy||sending)return;busy=true;send.setEnabled(false);more.setEnabled(false);refresh.setEnabled(false);state.setText("Carregando…");int request=generation;
        AccountRepository.Callback callback=(rows,error)->{
            if(request!=generation)return;busy=false;send.setEnabled(true);more.setEnabled(true);refresh.setEnabled(true);
            if(error!=null){state.setText(error);return;}
            for(int i=0;i<rows.length();i++){JSONObject item=rows.optJSONObject(i);if(item!=null&&seen.add(item.optString("id")))records.put(item);}offset+=rows.length();render();markRead();more.setText(activeId==null?"Carregar mais amigos":"Carregar mensagens anteriores");more.setVisibility(rows.length()==50?VISIBLE:GONE);
        };
        if(activeId==null)repository.friends(offset,callback);else repository.messages(activeId,offset,callback);
    }
    private void send(){
        if(sending||activeId==null)return;String message=draft.getText().toString().trim();if(message.isEmpty()){state.setText("Escreva uma mensagem.");return;}
        sending=true;send.setEnabled(false);draft.setEnabled(false);refresh.setEnabled(false);more.setEnabled(false);state.setText("Enviando…");String target=activeId;int request=generation;
        repository.sendText(target,message,(rows,error)->{
            sending=false;send.setEnabled(true);draft.setEnabled(true);refresh.setEnabled(true);more.setEnabled(true);
            if(request!=generation||!target.equals(activeId))return;
            if(error!=null){state.setText(error);return;}
            draft.setText("");android.widget.Toast.makeText(getContext(),"Mensagem enviada",android.widget.Toast.LENGTH_SHORT).show();
            scrollAfterSend=true;reset();
        });
    }
    private void render(){
        list.removeAllViews();String me=SessionPreferences.get(getContext()).getString("user_id","");search.setVisibility(activeId==null?VISIBLE:GONE);friendActions.setVisibility(activeId==null?VISIBLE:GONE);
        if(activeId==null){
            String q=search.getText().toString().trim().toLowerCase(java.util.Locale.ROOT);int visible=0;
            for(int i=0;i<records.length();i++){JSONObject friend=records.optJSONObject(i);if(friend==null)continue;String label=friend.optString("nome","Amigo");if(!label.toLowerCase(java.util.Locale.ROOT).contains(q)&&!friend.optString("slug","").toLowerCase(java.util.Locale.ROOT).contains(q))continue;visible++;LinearLayout card=card(0xff211c2e);card.setPadding(dp(12),dp(8),dp(12),dp(8));card.setOrientation(HORIZONTAL);card.setGravity(Gravity.CENTER_VERTICAL);
                ImageView avatar=new ImageView(getContext());avatar.setImageResource(R.drawable.app_logo);avatar.setScaleType(ImageView.ScaleType.CENTER_CROP);avatar.setBackground(AppStyle.shape(avatar,0xff303449,30));avatar.setClipToOutline(true);card.addView(avatar,new LayoutParams(dp(42),dp(42)));AccountImageLoader.load(avatar,friend.optString("avatar_url",""));if(!friend.optBoolean("unavailable"))avatar.setOnClickListener(v->new FriendProfileSheet(getContext(),friend));
                LinearLayout info=new LinearLayout(getContext());info.setOrientation(VERTICAL);info.setPadding(dp(14),0,dp(8),0);card.addView(info,new LayoutParams(0,-2,1));TextView name=text(label,14,0xfff3f4f8);name.setTypeface(null,Typeface.BOLD);name.setMaxLines(1);name.setEllipsize(android.text.TextUtils.TruncateAt.END);info.addView(name);if(!friend.optBoolean("unavailable")){name.setContentDescription("Ver perfil de "+label);name.setOnClickListener(v->new FriendProfileSheet(getContext(),friend));}if(!chatTab)info.addView(text(friend.optBoolean("unavailable")?"Perfil indisponível":"@"+friend.optString("slug",""),12,0xff9ca9b8));if(chatTab){JSONObject preview=friend.optJSONObject("_preview");TextView snippet=text(preview==null?"Abrir conversa":preview.isNull("texto")?"📷 Imagem":preview.optString("texto",""),12,0xffb3a6c4);snippet.setMaxLines(1);snippet.setEllipsize(android.text.TextUtils.TruncateAt.END);info.addView(snippet);if(preview!=null){TextView stamp=text(MessageTime.time(preview.optString("created_at")),10,0xffaa9bbe);card.addView(stamp);}}int unread=unreadCounts.optInt(friend.optString("id"));if(unread>0){TextView badge=text(unread>99?"99+":String.valueOf(unread),11,0xffffffff);badge.setGravity(Gravity.CENTER);badge.setPadding(dp(5),dp(3),dp(5),dp(3));badge.setBackground(AppStyle.shape(badge,0xffbf477f,10));card.addView(badge);}if(!friend.optBoolean("unavailable")){TextView arrow=text("›",28,0xffb7a6ff);card.addView(arrow);card.setContentDescription((chatTab?"Conversar com ":"Ver perfil de ")+label);card.setOnClickListener(v->{if(chatTab)open(friend);else new FriendProfileSheet(getContext(),friend);});}list.addView(card);
            }
            state.setText(records.length()==0?"Você ainda não tem amigos nesta conta.":visible+" exibidos • "+records.length()+" amigos carregados");
        }else{
            state.setText(records.length()==0?"Nenhuma mensagem nesta conversa.":"Conversa privada");String day="";
            for(int i=records.length()-1;i>=0;i--){JSONObject message=records.optJSONObject(i);if(message==null)continue;String newDay=MessageTime.day(message.optString("created_at",""));if(!newDay.equals(day)){TextView divider=text(newDay,11,0xff8f9aad);divider.setGravity(Gravity.CENTER);divider.setTag("day:"+newDay);list.addView(divider);day=newDay;}
                boolean mine=me.equals(message.optString("remetente_id"));LinearLayout envelope=new LinearLayout(getContext());envelope.setGravity(mine?Gravity.RIGHT:Gravity.LEFT);envelope.setTag(message.optString("id"));LayoutParams ep=new LayoutParams(-1,-2);ep.setMargins(mine?dp(36):0,0,mine?0:dp(36),dp(8));list.addView(envelope,ep);
                LinearLayout bubble=card(mine?0xff593795:0xff262033);bubble.setPadding(dp(14),dp(8),dp(14),dp(8));envelope.addView(bubble,new LayoutParams(-2,-2));
                String content=message.isNull("texto")?"":message.optString("texto","");final String messageContent=content;boolean mediaOnly=content.trim().isEmpty()&&!message.optString("midia_url","").isEmpty();
                if(mediaOnly){GradientDrawable transparent=new GradientDrawable();transparent.setColor(0x00000000);bubble.setBackground(transparent);bubble.setPadding(dp(4),dp(4),dp(4),dp(4));}
                String visibleText=content;if(content.startsWith("> ")&&content.indexOf('\n')>0){int split=content.indexOf('\n');TextView quote=text(content.substring(2,split),12,0xffd1c3ed);quote.setMaxLines(3);quote.setPadding(dp(10),dp(8),dp(10),dp(8));quote.setBackground(AppStyle.shape(quote,0x33342252,10));bubble.addView(quote);visibleText=content.substring(split+1);}
                if(!visibleText.trim().isEmpty()){TextView messageText=text(visibleText,15,0xfff3f4f8);messageText.setMaxWidth(dp(Math.max(120,Math.min(300,getResources().getConfiguration().screenWidthDp-100))));bubble.addView(messageText);}
                if(!message.isNull("midia_url")&&!message.optString("midia_url","").isEmpty()){String path=message.optString("midia_url");if(path.matches("[a-zA-Z0-9-]+/[a-zA-Z0-9._-]+\\.(jpg|jpeg|png|webp)")){ImageView attachment=new ImageView(getContext());attachment.setScaleType(ImageView.ScaleType.FIT_CENTER);attachment.setContentDescription("Imagem da mensagem • segure para ver opções");bubble.addView(attachment,new LayoutParams(dp(180),dp(180)));AccountImageLoader.load(attachment,BuildConfig.SUPABASE_URL+"/storage/v1/object/public/chat-media/"+path);}else bubble.addView(text("Imagem indisponível",11,0xffbdc6d5));}
                TextView time=text(MessageTime.time(message.optString("created_at","")),10,mine?0xffd0c4eb:0xff9ca9b8);time.setGravity(Gravity.RIGHT);time.setPadding(dp(6),dp(2),dp(6),dp(2));bubble.addView(time);
                JSONArray reactions=message.optJSONArray("_reactions");StringBuilder counts=new StringBuilder();if(reactions!=null)for(String emoji:new String[]{"❤️","😂","🔥","👍"}){int count=0;for(int k=0;k<reactions.length();k++){JSONObject reaction=reactions.optJSONObject(k);if(reaction!=null&&emoji.equals(reaction.optString("emoji")))count++;}if(count>0)counts.append(emoji).append(" ").append(count).append("  ");}
                if(counts.length()>0){TextView badges=text(counts.toString().trim(),12,0xffefe2ff);badges.setPadding(dp(8),dp(4),dp(8),dp(4));badges.setBackground(AppStyle.shape(badges,0xff302340,12));bubble.addView(badges);}
                installMessagePress(bubble,message,messageContent);bubble.setContentDescription((mine?"Sua mensagem":"Mensagem de "+activeName)+" • "+(mediaOnly?"figurinha":content)+" • segure para responder ou reagir");

            }
            if(scrollAfterSend){scrollAfterSend=false;scroll.post(()->scroll.fullScroll(FOCUS_DOWN));}
        }
    }
    private LinearLayout card(int color){LinearLayout c=new LinearLayout(getContext());c.setOrientation(VERTICAL);c.setPadding(dp(14),dp(12),dp(14),dp(12));GradientDrawable bg=new GradientDrawable();bg.setColor(color);bg.setCornerRadius(dp(20));bg.setStroke(dp(1),0xff3d314e);c.setBackground(bg);LayoutParams p=new LayoutParams(-1,-2);p.setMargins(0,0,0,dp(10));c.setLayoutParams(p);return c;}
    private void installMessagePress(android.view.View view,JSONObject message,String content){view.setOnLongClickListener(v->{messageActions(message,content);return true;});if(view instanceof android.view.ViewGroup){android.view.ViewGroup group=(android.view.ViewGroup)view;for(int i=0;i<group.getChildCount();i++)installMessagePress(group.getChildAt(i),message,content);}}
    private void messageActions(JSONObject message,String content){
        String target=activeId;if(target==null||sending)return;NativeSheet sheet=new NativeSheet(getContext(),"Mensagem");
        TextView preview=NativeSheet.text(getContext(),content.isEmpty()?"Figurinha":content,14,0xffbfb1d1);preview.setMaxLines(3);sheet.body.addView(preview);
        Button reply=new Button(getContext());reply.setText("Responder mensagem");AppStyle.button(reply,false);AppStyle.icon(reply,ActionIcon.REPLY,0xff9fdff5);sheet.body.addView(reply);
        reply.setOnClickListener(v->{sheet.dialog.dismiss();if(!target.equals(activeId))return;String quote=(content.isEmpty()?"Figurinha":content).replace("\n"," ");draft.setText("> "+quote.substring(0,Math.min(180,quote.length()))+"\n"+draft.getText());draft.setSelection(draft.length());draft.requestFocus();draft.post(()->((android.view.inputmethod.InputMethodManager)getContext().getSystemService(Context.INPUT_METHOD_SERVICE)).showSoftInput(draft,android.view.inputmethod.InputMethodManager.SHOW_IMPLICIT));});
        if(!content.isEmpty()){Button copy=new Button(getContext());copy.setText("Copiar texto");AppStyle.button(copy,false);AppStyle.icon(copy,ActionIcon.COPY,0xffccb0ff);sheet.body.addView(copy);copy.setOnClickListener(v->{((android.content.ClipboardManager)getContext().getSystemService(Context.CLIPBOARD_SERVICE)).setPrimaryClip(android.content.ClipData.newPlainText("Mensagem",content));sheet.dialog.dismiss();});}
        sheet.body.addView(NativeSheet.text(getContext(),"Reagir",12,0xffb3a3c8));LinearLayout reactionsRow=new LinearLayout(getContext());sheet.body.addView(reactionsRow);String me=SessionPreferences.get(getContext()).getString("user_id","");
        for(String emoji:new String[]{"❤️","😂","🔥","👍"}){boolean own=false;JSONArray reactions=message.optJSONArray("_reactions");if(reactions!=null)for(int i=0;i<reactions.length();i++){JSONObject r=reactions.optJSONObject(i);if(r!=null&&me.equals(r.optString("user_id"))&&emoji.equals(r.optString("emoji")))own=true;}boolean add=!own;Button react=new Button(getContext());react.setText(emoji);react.setContentDescription(own?"Remover minha reação "+emoji:"Reagir com "+emoji);AppStyle.button(react,own);react.setTextSize(23);react.setPadding(dp(4),dp(8),dp(4),dp(8));LayoutParams rp=new LayoutParams(0,dp(40),1);rp.setMargins(dp(2),dp(4),dp(2),dp(8));reactionsRow.addView(react,rp);
            react.setOnClickListener(v->{if(!target.equals(activeId)){sheet.dialog.dismiss();return;}sheet.busy(true);enableChildren(sheet.body,false);repository.reaction(message.optString("id"),emoji,add,(rows,error)->{sheet.busy(false);if(error!=null){preview.setText(error);enableChildren(sheet.body,true);return;}sheet.dialog.dismiss();if(target.equals(activeId))synchronize();});});
        }
        if(me.equals(message.optString("remetente_id"))){Button remove=new Button(getContext());remove.setText("Apagar mensagem");AppStyle.button(remove,false);AppStyle.icon(remove,ActionIcon.TRASH,0xffff9ca9);sheet.body.addView(remove);remove.setOnClickListener(v->{sheet.dialog.dismiss();NativeSheet confirmation=new NativeSheet(getContext(),"Apagar mensagem?");TextView feedback=NativeSheet.text(getContext(),"A mensagem será removida desta conversa.",14,0xffbfb1d1);confirmation.body.addView(feedback);Button confirm=new Button(getContext());confirm.setText("Apagar");AppStyle.button(confirm,true);confirmation.body.addView(confirm);confirm.setOnClickListener(x->{confirm.setEnabled(false);confirmation.busy(true);repository.deleteMessage(message.optString("id"),(r,e)->{confirmation.busy(false);if(e!=null){feedback.setText(e);confirm.setEnabled(true);return;}confirmation.dialog.dismiss();if(target.equals(activeId))reset();});});confirmation.show();});}
        sheet.show();
    }
    private static void enableChildren(android.view.View view,boolean enabled){view.setEnabled(enabled);if(view instanceof android.view.ViewGroup){android.view.ViewGroup group=(android.view.ViewGroup)view;for(int i=0;i<group.getChildCount();i++)enableChildren(group.getChildAt(i),enabled);}}
    private void chooseSticker(){if(activeId==null||sending)return;String target=activeId;int ticket=generation;StickerSheet.show(getContext(),sticker->{if(ticket!=generation||!target.equals(activeId)||sending)return;sending=true;send.setEnabled(false);draft.setEnabled(false);state.setText("Enviando figurinha…");repository.sendSticker(target,sticker.optString("id"),(rows,error)->{sending=false;send.setEnabled(true);draft.setEnabled(true);if(ticket!=generation||!target.equals(activeId))return;if(error!=null){state.setText(error);return;}scrollAfterSend=true;reset();});});}
    private TextView text(String s,int size,int color){TextView t=new TextView(getContext());t.setText(s);t.setTextColor(color);t.setTextSize(size);t.setPadding(0,dp(2),0,dp(2));return t;}
    private int dp(int v){return Math.round(v*getResources().getDisplayMetrics().density);}
}
