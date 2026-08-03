/**
 * Previous Year Question Papers - Dynamic Card Generator
 * This script dynamically generates cards for each year from the `years` array.
 * It also handles the search functionality to filter cards based on user input.
 */

// Configuration: Add or remove years here
const years = [
    { year: 2025, link: "pyqs/2025/" },
    { year: 2024, link: "pyqs/2024/" },
    { year: 2023, link: "pyqs/2023/" },
    { year: 2022, link: "pyqs/2022/" },
    { year: 2021, link: "pyqs/2021/" },
    { year: 2020, link: "pyqs/2020/" },
    { year: 2019, link: "pyqs/2019/" },
    { year: 2018, link: "pyqs/2018/" },
    { year: 2017, link: "pyqs/2017/" },
    { year: 2016, link: "pyqs/2016/" },
    { year: 2015, link: "pyqs/2015/" },
    { year: 2014, link: "pyqs/2014/" }
];

// DOM Elements
const cardsContainer = document.getElementById('cards-container');
const searchInput = document.getElementById('search');

/**
 * Creates a card element for a given year
 * @param {Object} yearData - Object containing year and link
 * @returns {HTMLElement} - The created card element
 */
function createCard(yearData) {
    const card = document.createElement('a');
    card.href = yearData.link;
    card.className = 'card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', `Previous Year Questions for ${yearData.year}`);
    
    card.innerHTML = `
        <div class="card-header">
            <h2 class="card-title">PY ${yearData.year}</h2>
            <p class="card-subtitle">Previous Year Questions</p>
        </div>
        <div class="card-footer">
            <span class="arrow-icon" aria-hidden="true">→</span>
        </div>
    `;
    
    return card;
}

/**
 * Renders all cards based on the current search query
 * @param {string} query - The search query to filter years
 */
function renderCards(query = '') {
    // Clear existing cards
    cardsContainer.innerHTML = '';
    
    // Filter years based on search query
    const filteredYears = years.filter(year => {
        return year.year.toString().includes(query);
    });
    
    // Check for empty state
    if (filteredYears.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'No Previous Year Papers Found';
        emptyState.setAttribute('role', 'status');
        cardsContainer.appendChild(emptyState);
        return;
    }
    
    // Create and append cards for each filtered year
    filteredYears.forEach(yearData => {
        const card = createCard(yearData);
        cardsContainer.appendChild(card);
    });
}

/**
 * Initializes the page
 */
function init() {
    // Initial render with all years
    renderCards();
    
    // Set up search event listener with debounce
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            renderCards(e.target.value);
        }, 100); // 100ms debounce delay
    });
}

// Initialize the page when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
