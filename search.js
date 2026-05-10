/* Search dictionary — keyword -> URL. Used by the home-page search box. */

const examples = [
    "Milestone", "Locations", "About us", "Spotify",
    "Games", "Polly", "Tamagotchi"
];

const dictionary = {
    "home": "index.html",
    "index": "index.html",

    "milestone":  "milestone.html",
    "milestones": "milestone.html",
    "memory":     "milestone.html",
    "memories":   "milestone.html",

    "locations":  "Locations.html",
    "location":   "Locations.html",
    "map":        "Locations.html",
    "places":     "Locations.html",

    "about us":   "About us.html",
    "about":      "About us.html",
    "story":      "About us.html",
    "us":         "About us.html",

    "spotify":    "Spotify.html",
    "music":      "Spotify.html",
    "playlist":   "Spotify.html",
    "song":       "Spotify.html",

    "games":      "games.html",
    "game":       "games.html",
    "play":       "games.html",

    "polly":      "games.html#game-polly",
    "pocket":     "games.html#game-polly",
    "dollhouse":  "games.html#game-polly",
    "doll":       "games.html#game-polly",
    "compact":    "games.html#game-polly",

    "tamagotchi": "games.html#game-tama",
    "tama":       "games.html#game-tama",
    "pet":        "games.html#game-tama",
    "egg":        "games.html#game-tama",

    "love":       "About us.html",
    "happiness":  "milestone.html",
    "carlos":     "About us.html",
    "ishi":       "About us.html",
    "pookie":     "About us.html"
};

function search() {
    const input = document.getElementById("searchInput");
    const out = document.getElementById("searchResults");
    if (!input) return;
    const raw = input.value || '';
    const query = raw.toLowerCase().trim().replace(/\s+/g, ' ');

    if (!query) {
        if (out) out.textContent = "Type a memory to find, pookie ✨";
        return;
    }

    if (dictionary[query]) {
        if (out) out.textContent = "Taking you to " + query + "…";
        window.location.href = dictionary[query];
        return;
    }

    // partial-match fallback
    const partial = Object.keys(dictionary).find(k => k.includes(query) || query.includes(k));
    if (partial) {
        if (out) out.textContent = "Taking you to " + partial + "…";
        window.location.href = dictionary[partial];
        return;
    }

    if (out) {
        out.textContent =
            "Sorry pookie, I couldn't find '" + raw +
            "'. Try one of these: " + examples.join(", ") + ".";
    }
}

// Submit on Enter
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('searchInput');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); search(); }
        });
    }
});
