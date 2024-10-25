const examples = [
    "Milestone",
    "Locations",
    "Happiness",
    "Love",
    "Spotify",
    "About us"
];

// Dictionary object to map search terms to their corresponding HTML pages
const dictionary = {
    "milestone": "milestone.html",
    "love": "love.html",
    "happiness": "happiness.html",
    "locations": "Locations.html",
    "about us": "About us.html",
    "spotify": "Spotify.html"
    
    // Add more words and corresponding pages here
};

function search() {
    const query = document.getElementById("searchInput").value.toLowerCase(); // Convert input to lowercase for case-insensitive search

    if (dictionary[query]) {
        // Redirect to the corresponding page if the word is found in the dictionary
        window.location.href = dictionary[query];
    } else {
        // Display a message or handle the case when the word is not found
        document.getElementById("searchResults").innerHTML = "Sorry, no meaning found for '" + query + "' pookie so here are some examples pookie Milestone, Locations, Happiness, Love, Spotify, About us";
    }
}

