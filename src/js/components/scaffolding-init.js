import { startScaffolding, addStick, buildFullScaffold } from './scaffolding-animation.js';

// Get references to the interactive elements
const interactionArea = document.getElementById('interactionArea');
const addMoreButton = document.getElementById('addMoreButton');

// State variable to track if the full build has been triggered
let fullBuildTriggered = false;

// Initialize the scaffolding animation setup (e.g., canvas sizing, drawing initial pile)
startScaffolding();

// Event listener for the initial interaction area
interactionArea.addEventListener('click', () => {
    console.log('Interaction area clicked.');
    // Only allow adding sticks manually if the full build hasn't started
    if (!fullBuildTriggered) {
        const currentStickCount = addStick(); // Add a stick and get the count

        // Check if the manual limit is reached
        if (currentStickCount === 5) { // STICK_LIMIT_MANUAL is 5 in animation.js
            console.log('Manual stick limit reached. Showing button.');
            interactionArea.style.display = 'none'; // Hide the initial text
            addMoreButton.style.display = 'block'; // Show the button
        }
    }
});

// Event listener for the "Add 1000 more?" button
addMoreButton.addEventListener('click', () => {
    console.log('Add More button clicked.');
    if (!fullBuildTriggered) {
        fullBuildTriggered = true;
        addMoreButton.style.display = 'none'; // Hide the button after clicking
        // Optionally, add text like "Building..."
        const buildingText = document.createElement('p');
        buildingText.textContent = 'Building scaffold and growing vines...';
        buildingText.style.fontFamily = "\'Space Mono\', monospace";
        interactionArea.parentNode.appendChild(buildingText);

        buildFullScaffold(); // Trigger the full build and vine growth
    }
}); 