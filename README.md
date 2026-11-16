# KABILIN

A reproduction of the supplied **KABILIN – A Filipino Recipe That Feels Like Home (1).html**, with a custom interactive homepage logo. The sculpted four-leaf clover and extruded KABILIN wordmark rotate together slowly in perspective. Drag the clover or title with a mouse or touch, or focus the logo and use arrow keys to rotate; Home resets its orientation and Space pauses or resumes rotation. Reduced-motion support is included.

## Open the site

Open `index.html` in a modern browser. Keep the `.css` and `.js` files and the `assets/` folder alongside it. No installation or build is required. For hosting, serve this directory as a static website with `index.html` as its entry point.

Google Fonts supplies Caveat and Lora when connected to the internet; the original fallback fonts remain available offline. The 14 recipe illustrations are local JPEGs in `assets/recipes/`, shared between the cards and recipe detail pages. They use a pencil-and-watercolor sketchbook style on warm paper, generated with the built-in image generation tool. The shared art direction and dish prompts are recorded in `assets/recipes/prompts.json`. The clover logo remains an inline vector illustration.

## Included features

- Home page with featured recipes, family favorites, and food stories.
- Live search by recipe name, description, and region, including an empty state.
- All 14 complete recipes with ingredient checklists, numbered cooking instructions, origins, preparation/cooking times, servings, and difficulty.
- Chef’s tips, substitutions, serving suggestions, storage/reheating advice, variations, and cultural significance for every recipe.
- Six category filters and regional cuisine groupings.
- About page, both creator profiles, and the original footer.
- Hash navigation, active navigation states, responsive layouts, hover effects, and system dark mode.

The experience layer adds gentle page transitions (with a fallback for older browsers), staggered scroll reveals, card and image hover effects, responsive navigation, live search by dish/ingredient/region, category feedback, and a back-to-top shortcut. All animation respects reduced-motion preferences.

Ingredient checklists show preparation progress and remember checks for each recipe during the current browser session. Reset clears that recipe’s checks. If browser storage is unavailable, progress is retained in memory while the page is open. Search, filters, and ingredient progress run locally in the browser.

## Your kitchen

- **Lola’s Recipe Box:** bookmark recipes from cards or detail pages. The Recipe Box in navigation collects your saved dishes. Bookmarks stay in this browser’s local storage.
- **Cooking Mode:** a focused modal with large instructions, step navigation, completion tracking, and the current scaled ingredient list. The adjustable timer suggests a duration from the written step when available. It supports pause, resume, reset, and a completion message. Closing the modal keeps the timer running in a small shortcut; it accounts for elapsed time when a background tab returns. One timer runs at a time, while this page is open.
- **Servings:** adjust quantities from half a recipe to four times the recipe, with a one-click reset. Fractional quantities and serving ranges scale together. Whole-pig lechon scales by complete roasts. Unmeasured seasonings and cooking times remain as written.
- **Shared-ingredient recommendations:** three compact links at the bottom of each recipe suggest other dishes using some of its ingredients. Each explains the overlap. The selected recipe stays open until a recommendation is clicked.
- **Kitchen notes:** private notes for each dish save as you type on this device. Clear notes empties that dish’s note. Saved recipes and notes fall back to page memory if local storage is unavailable; they do not sync between devices.

## Clover and kitchen music

About uses the same extruded, draggable, slowly rotating four-leaf clover as the homepage, without the wordmark. Pointer, touch, arrow-key, Home, and Space controls work on both. Empty space stays outside the drag hitbox, and reduced-motion preferences stop automatic rotation.

Recipe pages include a pencil-and-watercolor record player linked to **This Music Feels Like a Memory** by Timeless Hour: `https://open.spotify.com/album/0t09jqNM8q30erGVmLvT9L`. On wide screens it sits to the right; on narrower screens it appears below the recipe, reachable through the Kitchen music shortcut. Its separate oval vinyl disc spins, the tonearm lowers, the player subtly moves, and decorative waveform bars animate only after Spotify reports active, non-buffering playback. Pause freezes the disc at its current orientation. The wave is a playback indicator, not an audio spectrum analyzer.

The integration uses Spotify’s official iFrame API (`https://developer.spotify.com/documentation/embeds/references/iframe-api`). Spotify’s playback frame runs out of view; the visible player provides Previous, Play, Pause, and Next. The song title follows Spotify’s playing track URI, with the artist and position in the eight-track album shown below. Previous restarts the current song after three seconds, or selects the preceding track near the beginning. Next selects the following track and wraps to the first at the end. Playback automatically advances through the album, while changing tracks during a pause keeps playback paused.

The verified album order, titles, and Spotify track IDs are in `assets/music/album.js`, sourced from the public Spotify album embed. The player never autoplays, preserves its playback frame between recipes, and requests pause when leaving recipe pages. A small Spotify attribution link and reconnection control remain available if needed. Full playback and previews are governed by Spotify and browser support: `https://developer.spotify.com/documentation/embeds/tutorials/troubleshooting`. No Spotify credentials are stored by this site.

Layered illustrations were generated with the built-in image generation tool and optimized as transparent PNGs: `assets/music/turntable.png` and `assets/music/vinyl.png`. Their prompts are recorded in `assets/music/prompts.json`.
