# Cover resolution and saved artwork

The saved `capa` identifies the selected artwork. Resolution selection never writes another URL to the library, searches another title, or substitutes Steam/IGDB/SteamGridDB art for that choice. Custom, signed, credentialed and unrecognized URLs remain unchanged.

Recognized public variants retain the same asset filename and host, with the original URL as fallback:

| Provider | Preferred variant |
| --- | --- |
| AniList | `coverImage.extraLarge`; existing `/small/` and `/medium/` cover paths can use `/large/` |
| IGDB | `t_1080p`, retaining the image ID |
| TMDB | `original`, retaining the image filename |
| Steam headers | `header_2x.jpg`, retaining the app and asset directory |

AniList API field names differ from CDN paths: `extraLarge` is `/large/`, `large` is `/medium/`, and `medium` is `/small/`. Do not invent an `/extraLarge/` CDN path.

Desktop failures of a larger variant are held for five minutes in a bounded map; the selected original remains available. The home hero is dispatched before ordinary cover hydration and snapshots the source from its own element. Per-element request tickets and account checks reject late results. Portrait images use `contain` in a separate part of the hero.

Android waits for the first layout of public images, chooses a 512/1024/2048 edge budget, and includes it in the memory-cache key. The public disk cache retains original bytes and decodes for that budget. Private media keeps its prior 1024 limit and session validation.

Validation includes same-art variants, custom and signed URL preservation, failed-variant fallback, hero source changes, account changes, portrait layout at two desktop widths, AniList selection, and Android disk decoding at thumbnail/detail sizes.
