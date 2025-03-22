/**
 * ScorecardComponent - Handles displaying the end-of-hole scorecard
 * Responsible for showing score information and handling continue action
 */
export class ScorecardComponent {
    /**
     * Create a new scorecard component
     */
    constructor() {
        this.element = null;
        this.clickListener = null;
    }

    /**
     * Show the scorecard with score data
     * @param {Object} scoreData - Data containing score information (strokes, par, etc.)
     * @param {Function} onContinue - Callback to execute when player clicks to continue
     * @param {HTMLElement} parent - Parent element to attach the scorecard to
     */
    show(scoreData, onContinue, parent) {
        // Create and cache the element
        this.element = document.createElement('div');
        this.element.className = 'scorecard-container';
        this.element.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.85);
            border: 2px solid #FFD700;
            border-radius: 10px;
            color: white;
            padding: 20px;
            text-align: center;
            min-width: 300px;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
            z-index: 1000;
        `;

        // Populate the scorecard with data
        this.populateScorecard(this.element, scoreData);

        // Add continue prompt
        const continuePrompt = document.createElement('div');
        continuePrompt.className = 'continue-prompt';
        continuePrompt.textContent = 'Click to continue';
        continuePrompt.style.cssText = `
            margin-top: 20px;
            padding: 10px;
            background-color: #FFD700;
            color: black;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
        `;

        this.element.appendChild(continuePrompt);

        // Add click handler with a slight delay to prevent accidental clicks
        setTimeout(() => {
            this.clickListener = () => {
                this.hide();
                if (onContinue) onContinue();
            };
            this.element.addEventListener('click', this.clickListener);
        }, 300);

        // Add to parent element
        parent.appendChild(this.element);
    }

    /**
     * Populate the scorecard container with score data
     * @param {HTMLElement} container - The container element
     * @param {Object} scoreData - Data containing score information
     */
    populateScorecard(container, scoreData) {
        // Title
        const title = document.createElement('h2');
        title.textContent = 'Hole Complete!';
        title.style.cssText = `
            margin: 0 0 15px 0;
            color: #FFD700;
            font-size: 24px;
        `;
        container.appendChild(title);

        // Score table
        const scoreTable = document.createElement('table');
        scoreTable.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        `;

        // Parse and display score information
        const { strokes, par } = scoreData;
        const scoreDiff = strokes - par;
        let resultText = '';
        let resultColor = '';

        // Determine result text based on score difference
        if (scoreDiff === 0) {
            resultText = 'Par';
            resultColor = '#FFFFFF';
        } else if (scoreDiff === 1) {
            resultText = 'Bogey';
            resultColor = '#FFA07A';
        } else if (scoreDiff > 1) {
            resultText = `+${scoreDiff}`;
            resultColor = '#FF6347';
        } else if (scoreDiff === -1) {
            resultText = 'Birdie';
            resultColor = '#98FB98';
        } else if (scoreDiff === -2) {
            resultText = 'Eagle';
            resultColor = '#00FF7F';
        } else if (scoreDiff < -2) {
            resultText = `${scoreDiff}`;
            resultColor = '#00CED1';
        }

        // Create table rows with score data
        const rows = [
            { label: 'Strokes', value: strokes },
            { label: 'Par', value: par },
            { label: 'Result', value: resultText, color: resultColor }
        ];

        rows.forEach(row => {
            const tr = document.createElement('tr');
            
            const tdLabel = document.createElement('td');
            tdLabel.textContent = row.label;
            tdLabel.style.cssText = `
                text-align: left;
                padding: 8px;
                border-bottom: 1px solid #444;
                font-weight: bold;
            `;
            
            const tdValue = document.createElement('td');
            tdValue.textContent = row.value;
            tdValue.style.cssText = `
                text-align: right;
                padding: 8px;
                border-bottom: 1px solid #444;
                ${row.color ? `color: ${row.color};` : ''}
                ${row.color ? 'font-weight: bold;' : ''}
            `;
            
            tr.appendChild(tdLabel);
            tr.appendChild(tdValue);
            scoreTable.appendChild(tr);
        });

        container.appendChild(scoreTable);
    }

    /**
     * Hide and clean up the scorecard
     */
    hide() {
        if (this.element) {
            // Remove click listener
            if (this.clickListener) {
                this.element.removeEventListener('click', this.clickListener);
                this.clickListener = null;
            }
            
            // Remove from DOM
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            
            this.element = null;
        }
    }
} 