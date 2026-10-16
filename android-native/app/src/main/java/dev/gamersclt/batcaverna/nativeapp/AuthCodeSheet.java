package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.text.InputType;
import android.widget.*;
final class AuthCodeSheet {
 static void show(Context c,String initialEmail,boolean recovery){
  final boolean[] busy={false};
  NativeSheet s=new NativeSheet(c,recovery?"Definir nova senha":"Confirmar cadastro");
  EditText email=NativeSheet.input(c,"E-mail da conta",254);email.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);email.setText(initialEmail);s.body.addView(email);
  s.body.addView(NativeSheet.text(c,"Digite o código recebido. Se o e-mail tiver apenas um botão, copie o link dele e cole abaixo, sem abri-lo.",13,0xffb4a7c4));
  EditText code=NativeSheet.input(c,"Código ou link recebido por e-mail",4096);code.setSaveEnabled(false);s.body.addView(code);
  EditText password=NativeSheet.input(c,"Nova senha (mínimo 12 caracteres)",256),confirm=NativeSheet.input(c,"Confirmar nova senha",256);
  for(EditText e:new EditText[]{password,confirm}){e.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);e.setSaveEnabled(false);if(recovery)s.body.addView(e);}
  TextView state=NativeSheet.text(c,"",13,0xffb4a7c4);s.body.addView(state);Button finish=new Button(c);finish.setText(recovery?"Salvar nova senha":"Confirmar e-mail");AppStyle.button(finish,true);s.body.addView(finish);
  finish.setOnClickListener(v->{if(busy[0])return;if(recovery&&!password.getText().toString().equals(confirm.getText().toString())){state.setText("As senhas devem coincidir.");return;}busy[0]=true;finish.setEnabled(false);email.setEnabled(false);code.setEnabled(false);password.setEnabled(false);confirm.setEnabled(false);s.busy(true);state.setText("Verificando…");NativeAuthFlow.finish(email.getText().toString(),code.getText().toString(),recovery,password.getText().toString(),(ok,msg)->{busy[0]=false;s.busy(false);if(!s.dialog.isShowing())return;state.setText(msg);code.setText("");password.setText("");confirm.setText("");if(ok){finish.setText("Voltar para entrar");finish.setEnabled(true);finish.setOnClickListener(x->s.dialog.dismiss());}else{finish.setEnabled(true);email.setEnabled(true);code.setEnabled(true);password.setEnabled(true);confirm.setEnabled(true);}});});
  if(!recovery){Button resend=new Button(c);resend.setText("Reenviar confirmação");AppStyle.button(resend,false);s.body.addView(resend);resend.setOnClickListener(v->{if(busy[0])return;busy[0]=true;s.busy(true);finish.setEnabled(false);resend.setEnabled(false);NativeAuthFlow.resend(email.getText().toString(),(ok,msg)->{busy[0]=false;s.busy(false);if(!s.dialog.isShowing())return;finish.setEnabled(true);state.setText(msg);resend.postDelayed(()->resend.setEnabled(true),60000);});});}
  s.show();
 }
}
