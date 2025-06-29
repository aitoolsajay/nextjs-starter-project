// Global variables to manage speech synthesis
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let isReading = false;
let currentSpeed = 1.0;
let bidQueue = [];
let currentBidIndex = 0;

// Function to extract bid data from the page
function extractBidData() {
    const bids = [];
    
    // Handle both URLs
    if (window.location.href.includes('all-bids')) {
        // Extract from all-bids page
        const rows = document.querySelectorAll('table tbody tr');
        rows.forEach(row => {
            const columns = row.querySelectorAll('td');
            if (columns.length > 0) {
                const bidData = {
                    title: columns[1]?.textContent?.trim() || 'No title',
                    bidNumber: columns[0]?.textContent?.trim() || 'No bid number',
                    endDate: columns[3]?.textContent?.trim() || 'No end date',
                    organization: columns[2]?.textContent?.trim() || 'No organization'
                };
                bids.push(bidData);
            }
        });
    } else if (window.location.href.includes('advance-search')) {
        // Extract from advance-search page
        const bidCards = document.querySelectorAll('.bid-card, .bid-list-item');
        bidCards.forEach(card => {
            const bidData = {
                title: card.querySelector('.bid-title')?.textContent?.trim() || 'No title',
                bidNumber: card.querySelector('.bid-number')?.textContent?.trim() || 'No bid number',
                endDate: card.querySelector('.end-date')?.textContent?.trim() || 'No end date',
                organization: card.querySelector('.organization')?.textContent?.trim() || 'No organization'
            };
            bids.push(bidData);
        });
    }

    return bids;
}

// Function to create speech text from bid data
function createSpeechText(bid) {
    return `Bid Number: ${bid.bidNumber}. 
            Title: ${bid.title}. 
            Organization: ${bid.organization}. 
            End Date: ${bid.endDate}.`;
}

// Function to start reading bids
function startReading() {
    if (isReading) return;
    
    bidQueue = extractBidData();
    
    if (bidQueue.length === 0) {
        notifyPopup('error', 'No bids found on this page');
        return;
    }

    isReading = true;
    currentBidIndex = 0;
    readNextBid();
}

// Function to read the next bid in queue
function readNextBid() {
    if (!isReading || currentBidIndex >= bidQueue.length) {
        isReading = false;
        notifyPopup('readingComplete');
        return;
    }

    const bid = bidQueue[currentBidIndex];
    const text = createSpeechText(bid);
    
    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.rate = currentSpeed;
    
    currentUtterance.onend = () => {
        currentBidIndex++;
        readNextBid();
    };

    currentUtterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        notifyPopup('error', 'Error reading bid');
    };

    notifyPopup('updateStatus', {
        status: `Reading bid ${currentBidIndex + 1} of ${bidQueue.length}`,
        currentBid: `${bid.bidNumber}: ${bid.title}`
    });

    speechSynthesis.speak(currentUtterance);
}

// Function to pause reading
function pauseReading() {
    if (speechSynthesis.speaking) {
        speechSynthesis.pause();
        notifyPopup('updateStatus', { status: 'Paused' });
    }
}

// Function to resume reading
function resumeReading() {
    if (speechSynthesis.paused) {
        speechSynthesis.resume();
        notifyPopup('updateStatus', {
            status: `Reading bid ${currentBidIndex + 1} of ${bidQueue.length}`,
            currentBid: bidQueue[currentBidIndex].bidNumber
        });
    }
}

// Function to stop reading
function stopReading() {
    isReading = false;
    speechSynthesis.cancel();
    currentBidIndex = 0;
    notifyPopup('updateStatus', { status: 'Stopped' });
}

// Function to update reading speed
function updateSpeed(newSpeed) {
    currentSpeed = newSpeed;
    if (currentUtterance) {
        currentUtterance.rate = newSpeed;
    }
}

// Function to notify popup
function notifyPopup(type, data = {}) {
    chrome.runtime.sendMessage({
        type,
        ...(typeof data === 'string' ? { error: data } : data)
    });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        switch (request.action) {
            case 'startReading':
                startReading();
                break;
            case 'pauseReading':
                pauseReading();
                break;
            case 'resumeReading':
                resumeReading();
                break;
            case 'stopReading':
                stopReading();
                break;
            case 'updateSpeed':
                updateSpeed(request.speed);
                break;
        }
        sendResponse({ success: true });
    } catch (error) {
        console.error('Error in content script:', error);
        sendResponse({ success: false, error: error.message });
    }
    return true; // Required for async response
});

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on a valid GeM bids page
    if (window.location.href.includes('bidplus.gem.gov.in')) {
        notifyPopup('updateStatus', { status: 'Ready to read bids' });
    }
});
