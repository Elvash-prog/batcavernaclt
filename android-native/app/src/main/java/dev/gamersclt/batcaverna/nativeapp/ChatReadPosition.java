package dev.gamersclt.batcaverna.nativeapp;
import android.widget.*;
final class ChatReadPosition {
 static boolean atEnd(ScrollView scroll,LinearLayout messages){return scroll.getHeight()>0&&messages.getHeight()>0&&messages.getHeight()-scroll.getScrollY()-scroll.getHeight()<=NativeSheet.dp(scroll.getContext(),24);}
}
