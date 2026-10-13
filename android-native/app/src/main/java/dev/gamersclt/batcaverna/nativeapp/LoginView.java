package dev.gamersclt.batcaverna.nativeapp;

import android.content.Context;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.text.InputType;
import android.text.method.PasswordTransformationMethod;
import android.view.*;
import android.widget.*;

/** Native counterpart of the site's public login and registration card. */
public final class LoginView extends FrameLayout {
    private static final int TEXT=0xfff5f3fc,MUTED=0xffaaa6ba,PURPLE=0xffb9afff;
    private final LinearLayout form;
    private final ScrollView scroll;
    private EditText username,password,name,email,confirmation;
    private TextView feedback;
    private Button submit;
    private CheckBox remember;
    private boolean registering,busy;
    public LoginView(Context c){
        super(c);setBackground(new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{0xff302044,0xff151123,0xff34223e}));
        ImageView wallpaper=new ImageView(c);wallpaper.setScaleType(ImageView.ScaleType.CENTER_CROP);addView(wallpaper,new LayoutParams(-1,-1));
        View shade=new View(c);shade.setBackgroundColor(0x66000000);addView(shade,new LayoutParams(-1,-1));
        scroll=new ScrollView(c);scroll.setFillViewport(true);scroll.setVerticalScrollBarEnabled(false);scroll.setClipToPadding(false);addView(scroll,new LayoutParams(-1,-1));
        LinearLayout outside=new LinearLayout(c);outside.setOrientation(LinearLayout.VERTICAL);outside.setGravity(Gravity.CENTER_HORIZONTAL);outside.setPadding(dp(14),dp(28),dp(14),dp(40));scroll.addView(outside,new ScrollView.LayoutParams(-1,-2));
        LinearLayout shell=new LinearLayout(c);shell.setOrientation(LinearLayout.VERTICAL);shell.setBackground(round(0xee0e0b18,28,0x30ffffff));shell.setClipToOutline(true);
        int width=Math.min(getResources().getDisplayMetrics().widthPixels-dp(28),dp(560));outside.addView(shell,new LinearLayout.LayoutParams(width,-2));
        LinearLayout brand=new LinearLayout(c);brand.setOrientation(LinearLayout.VERTICAL);brand.setPadding(dp(26),dp(32),dp(26),dp(28));brand.setBackground(new GradientDrawable(GradientDrawable.Orientation.TR_BL,new int[]{0xee332553,0xee151122,0xdd102634}));shell.addView(brand,new LinearLayout.LayoutParams(-1,-2));
        ImageView logo=new ImageView(c);logo.setImageResource(R.drawable.app_logo);logo.setScaleType(ImageView.ScaleType.FIT_CENTER);logo.setContentDescription("BatCaverna dos CLTs");brand.addView(logo,new LinearLayout.LayoutParams(dp(64),dp(64)));
        TextView kicker=label("SUA BIBLIOTECA PESSOAL",11,PURPLE,false);kicker.setLetterSpacing(.18f);brand.addView(kicker,params(-1,-2,0,36,0,10));
        brand.addView(label("BatCaverna dos\nCLTs",34,TEXT,true),params(-1,-2,0,0,0,12));
        TextView description=label("Organize seus jogos, acompanhe o que está jogando e mantenha sua coleção inteira em um só lugar.",15,0xffc7c5d7,false);description.setLineSpacing(dp(4),1);brand.addView(description,new LinearLayout.LayoutParams(-1,-2));
        LinearLayout pills=new LinearLayout(c);pills.setOrientation(LinearLayout.VERTICAL);brand.addView(pills,params(-1,-2,0,22,0,0));
        LinearLayout row=new LinearLayout(c);pills.addView(row);pill(row,"🎮 Jogos");pill(row,"🎬 Filmes & séries");
        LinearLayout row2=new LinearLayout(c);pills.addView(row2,params(-1,-2,0,8,0,0));pill(row2,"Steam");pill(row2,"🏆 Conquistas");
        View divider=new View(c);divider.setBackgroundColor(0x22ffffff);shell.addView(divider,new LinearLayout.LayoutParams(-1,dp(1)));
        form=new LinearLayout(c);form.setOrientation(LinearLayout.VERTICAL);form.setPadding(dp(26),dp(30),dp(26),dp(32));shell.addView(form,new LinearLayout.LayoutParams(-1,-2));
        showForm(false);new SupabaseAuthClient().loginBackground(wallpaper,dim->shade.setBackgroundColor((Math.round(dim*255f/100)<<24)));
    }
    private void showForm(boolean registration){
        if(busy)return;registering=registration;form.removeAllViews();
        if(registration){TextView back=link("← Voltar para entrar");back.setGravity(Gravity.START);form.addView(back,params(-1,44,0,0,0,14));back.setOnClickListener(v->showForm(false));}
        form.addView(label(registration?"Criar meu perfil":"Bem-vindo de volta",26,TEXT,true),params(-1,-2,0,0,0,28));
        if(registration)name=field("NOME DO PERFIL",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_CAP_WORDS,40);
        username=field("USUÁRIO",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD,24);
        if(registration)email=field("E-MAIL",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS,254);
        password=field("SENHA",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD,0);password.setTransformationMethod(PasswordTransformationMethod.getInstance());
        if(registration){confirmation=field("CONFIRMAR SENHA",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD,0);confirmation.setTransformationMethod(PasswordTransformationMethod.getInstance());}
        else {remember=new CheckBox(getContext());remember.setText("Permanecer logado neste aparelho");remember.setTextColor(MUTED);remember.setTextSize(13);remember.setButtonTintList(ColorStateList.valueOf(PURPLE));remember.setChecked(true);form.addView(remember,params(-1,-2,0,0,0,16));}
        submit=new Button(getContext());submit.setText(registration?"Criar meu perfil":"Entrar na minha biblioteca");submit.setAllCaps(false);submit.setTextColor(Color.WHITE);submit.setTextSize(15);submit.setTypeface(null,Typeface.BOLD);submit.setBackground(new android.graphics.drawable.StateListDrawable());
        GradientDrawable red=new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT,new int[]{0xffe60012,0xffb70410});red.setCornerRadius(dp(12));submit.setBackground(red);submit.setElevation(dp(3));form.addView(submit,params(-1,50,0,4,0,10));submit.setOnClickListener(v->submit());
        feedback=label("",13,MUTED,false);feedback.setGravity(Gravity.CENTER);feedback.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);form.addView(feedback,params(-1,-2,0,0,0,16));
        if(!registration){TextView recovery=link("Esqueci minha senha");form.addView(recovery,params(-1,48,0,0,0,4));recovery.setOnClickListener(v->{if(!busy)recovery();});
            TextView register=link("Ainda não tem perfil? Criar meu perfil");form.addView(register,params(-1,48,0,0,0,0));register.setOnClickListener(v->showForm(true));}
        password.setImeOptions(registration?android.view.inputmethod.EditorInfo.IME_ACTION_NEXT:android.view.inputmethod.EditorInfo.IME_ACTION_DONE);
        (registration?confirmation:password).setOnEditorActionListener((v,action,event)->{if(action==android.view.inputmethod.EditorInfo.IME_ACTION_DONE){submit();return true;}return false;});
    }
    private void submit(){
        if(busy)return;String user=username.getText().toString().trim(),pass=password.getText().toString();
        String error=registering?AuthInput.registration(name.getText().toString(),user,email.getText().toString(),pass,confirmation.getText().toString()):AuthInput.login(user,pass);
        if(!error.isEmpty()){feedback.setText(error);return;}
        busy=true;submit.setEnabled(false);username.setEnabled(false);password.setEnabled(false);feedback.setText(registering?"Criando seu perfil…":"Entrando…");
        if(registering){name.setEnabled(false);email.setEnabled(false);confirmation.setEnabled(false);new SupabaseAuthClient().signUp(name.getText().toString().trim(),user,email.getText().toString().trim(),pass,(ok,msg)->complete(ok,msg));}
        else{remember.setEnabled(false);new SupabaseAuthClient().signIn(user,pass,remember.isChecked(),(ok,msg)->complete(ok,msg));}
    }
    private void complete(boolean ok,String message){
        // Ignore a result belonging to a login screen the activity has already left.
        if(!isAttachedToWindow())return;busy=false;submit.setEnabled(true);username.setEnabled(true);password.setEnabled(true);if(registering){name.setEnabled(true);email.setEnabled(true);confirmation.setEnabled(true);}else remember.setEnabled(true);feedback.setText(message);
        if(ok){password.setText("");if(confirmation!=null)confirmation.setText("");((MainActivity)getContext()).openProfile();}
    }
    boolean back(){if(registering&&!busy){showForm(false);return true;}return false;}
    private void recovery(){
        NativeSheet sheet=new NativeSheet(getContext(),"Recuperar senha");EditText address=NativeSheet.input(getContext(),"E-mail da conta",254);address.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);sheet.body.addView(address);
        TextView state=NativeSheet.text(getContext(),"",13,MUTED);sheet.body.addView(state);Button send=new Button(getContext());send.setText("Enviar link de recuperação");AppStyle.button(send,true);sheet.body.addView(send);
        send.setOnClickListener(v->{String mail=address.getText().toString().trim();if(!android.util.Patterns.EMAIL_ADDRESS.matcher(mail).matches()){state.setText("Informe um e-mail válido.");return;}send.setEnabled(false);sheet.busy(true);new SupabaseAuthClient().recover(mail,(ok,msg)->{sheet.busy(false);send.setEnabled(!ok);state.setText(msg);});});sheet.show();
    }
    private EditText field(String caption,int input,int max){
        TextView label=label(caption,11,MUTED,false);label.setLetterSpacing(.04f);form.addView(label,params(-1,-2,0,0,0,9));
        EditText field=new EditText(getContext());field.setSingleLine(true);field.setInputType(input);if(caption.contains("SENHA"))field.setSaveEnabled(false);field.setTextSize(16);field.setTextColor(TEXT);field.setPadding(dp(14),0,dp(14),0);field.setContentDescription(caption);if(max>0)field.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(max)});
        field.setBackground(round(0xff0c0b11,12,0x30ffffff));field.setOnFocusChangeListener((v,focus)->field.setBackground(round(0xff0c0b11,12,focus?PURPLE:0x30ffffff)));
        if(android.os.Build.VERSION.SDK_INT>=26)field.setAutofillHints(caption.equals("USUÁRIO")?View.AUTOFILL_HINT_USERNAME:caption.equals("E-MAIL")?View.AUTOFILL_HINT_EMAIL_ADDRESS:caption.contains("SENHA")?View.AUTOFILL_HINT_PASSWORD:View.AUTOFILL_HINT_NAME);
        form.addView(field,params(-1,52,0,0,0,18));return field;
    }
    private TextView link(String value){TextView v=label(value,13,PURPLE,true);v.setGravity(Gravity.CENTER);v.setBackgroundResource(android.R.drawable.list_selector_background);v.setClickable(true);v.setFocusable(true);return v;}
    private void pill(LinearLayout parent,String value){TextView v=label(value,12,0xffddd9ed,false);v.setPadding(dp(10),dp(7),dp(10),dp(7));v.setBackground(round(0x14ffffff,24,0x22ffffff));parent.addView(v,params(-2,-2,0,0,8,0));}
    private TextView label(String value,int size,int color,boolean bold){TextView v=new TextView(getContext());v.setText(value);v.setTextSize(size);v.setTextColor(color);if(bold)v.setTypeface(null,Typeface.BOLD);return v;}
    private GradientDrawable round(int color,int radius,int stroke){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));d.setStroke(dp(1),stroke);return d;}
    private LinearLayout.LayoutParams params(int width,int height,int left,int top,int right,int bottom){LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(width<0?width:dp(width),height<0?height:dp(height));p.setMargins(dp(left),dp(top),dp(right),dp(bottom));return p;}
    private int dp(int value){return NativeSheet.dp(getContext(),value);}
}
