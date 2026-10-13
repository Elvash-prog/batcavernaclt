package dev.gamersclt.batcaverna.nativeapp;
final class LibrarySectionStyle {
 static int color(String group){switch(group){case "Zerados":case "Assistidos":return 0xff7ae0a5;case "Platinados":return 0xff77d7ef;case "Em progresso":case "Assistindo":return 0xff82b9ff;case "Jogando agora":return 0xffffab71;case "Backlog":case "Para assistir":return 0xffc3a0ff;case "Wishlist":case "Favoritos":return 0xffff91bb;case "Pausados":return 0xffffd179;case "Abandonados":return 0xffff8a91;default:return 0xffaaaee9;}}
 static String icon(String group){switch(group){case "Zerados":return "🏁";case "Platinados":return "💎";case "Em progresso":return "⚡";case "Jogando agora":return "🎮";case "Backlog":return "📚";case "Wishlist":return "💜";case "Biblioteca Steam":return "🕹️";case "Pausados":return "⏸️";case "Abandonados":return "🚫";case "Assistidos":return "✅";case "Assistindo":return "▶️";case "Para assistir":return "🍿";case "Favoritos":return "⭐";default:return "📦";}}
}
