package dev.gamersclt.batcaverna.nativeapp;
import android.graphics.Rect;
import android.view.*;
import android.widget.ScrollView;
/** Preserve the first visible title's offset when edits reorder a collection. */
final class LibraryViewport {
 final String id;final int offset,y;
 private LibraryViewport(String id,int offset,int y){this.id=id;this.offset=offset;this.y=y;}
 static LibraryViewport capture(ScrollView scroll,View list){Rect viewport=new Rect();if(!scroll.getGlobalVisibleRect(viewport))return new LibraryViewport("",0,scroll.getScrollY());View anchor=find(list,viewport,null);if(anchor==null)return new LibraryViewport("",0,scroll.getScrollY());int[] root=new int[2],item=new int[2];scroll.getLocationOnScreen(root);anchor.getLocationOnScreen(item);return new LibraryViewport(String.valueOf(anchor.getTag()),item[1]-root[1],scroll.getScrollY());}
 private static View find(View view,Rect viewport,View best){if(view.getTag() instanceof String){Rect visible=new Rect();if(view.getGlobalVisibleRect(visible)&&Rect.intersects(viewport,visible)){if(best==null)return view;int[] at=new int[2],previous=new int[2];view.getLocationOnScreen(at);best.getLocationOnScreen(previous);if(at[1]<previous[1]||at[1]==previous[1]&&at[0]<previous[0])return view;}return best;}if(view instanceof ViewGroup){ViewGroup group=(ViewGroup)view;for(int i=0;i<group.getChildCount();i++)best=find(group.getChildAt(i),viewport,best);}return best;}
 void restore(ScrollView scroll,View list){View anchor=id.isEmpty()?null:list.findViewWithTag(id);if(anchor==null){scroll.scrollTo(0,y);return;}int[] root=new int[2],item=new int[2];scroll.getLocationOnScreen(root);anchor.getLocationOnScreen(item);scroll.scrollTo(0,scroll.getScrollY()+item[1]-root[1]-offset);}
}
