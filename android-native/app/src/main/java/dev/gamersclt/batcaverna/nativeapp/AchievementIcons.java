package dev.gamersclt.batcaverna.nativeapp;
final class AchievementIcons {
 private static final String[] ICONS={"👣","📚","🎮","👑","🌌","🏁","🔥","🚀","💎","🏆","🥇","⏱️","⚡","🌙","🎬","🍿","✨","🎯","🕹️","🛰️","🧭","⭐","📦","🏰","🎨","🌐","🐉","🪐","🌟","✅","🦇","📖"};
 static String forIndex(int index){return index>=0&&index<ICONS.length?ICONS[index]:"🏅";}
}
