// Store references to DOM elements
document.addEventListener('DOMContentLoaded', function() {
    const readBidsBtn = document.getElementById('readBids');
    const pauseBtn = document.getElementById('pauseReading');
    const resumeBtn = document.getElementById('resumeReading');
    const stopBtn = document.getElementById('stopReading');
    const statusText = document.getElementById('statusText');
    const currentBid = document.getElementById('currentBid');
    const speedSelect = document.getElementById('readingSpeed');

    // Initially disable pause, resume and stop buttons
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    stopBtn.disabled = true;

    // Function to update the UI state
    function updateUIState(state) {
        switch(state) {
            case 'reading':
                readBidsBtn.disabled = true;
                pauseBtn.disabled = false;
                resumeBtn.disabled = true;
                stopBtn.disabled = false;
                break;
            case 'paused':
                readBidsBtn.disabled = true;
                pauseBtn.disabled = true;
                resumeBtn.disabled = false;
                stopBtn.disabled = false;
                break;
            case 'stopped':
            case 'ready':
                readBidsBtn.disabled = false;
                pauseBtn.disabled = true;
                resumeBtn.disabled = true;
                stopBtn.disabled = true;
                break;
        }
    }

    // Function to send message to content script
    async function sendMessage(action, data = {}) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            try {
                return await chrome.tabs.sendMessage(tab.id, {
                    action,
                    ...data,
                    speed: parseFloat(speedSelect.value)
                });
            } catch (error) {
                console.error('Error sending message:', error);
                statusText.textContent = 'Error: Please refresh the page and try again';
                updateUIState('stopped');
            }
        }
    }

    // Event Listeners for buttons
    readBidsBtn.addEventListener('click', async () => {
        statusText.textContent = 'Reading bids...';
        updateUIState('reading');
        await sendMessage('startReading');
    });

    pauseBtn.addEventListener('click', async () => {
        statusText.textContent = 'Paused';
        updateUIState('paused');
        await sendMessage('pauseReading');
    });

    resumeBtn.addEventListener('click', async () => {
        statusText.textContent = 'Resuming...';
        updateUIState('reading');
        await sendMessage('resumeReading');
    });

    stopBtn.addEventListener('click', async () => {
        statusText.textContent = 'Ready to read bids';
        currentBid.textContent = '';
        updateUIState('stopped');
        await sendMessage('stopReading');
    });

    // Listen for speed changes
    speedSelect.addEventListener('change', async () => {
        await sendMessage('updateSpeed', { speed: parseFloat(speedSelect.value) });
    });

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'updateStatus') {
            statusText.textContent = message.status;
            if (message.currentBid) {
                currentBid.textContent = message.currentBid;
            }
        }
        if (message.type === 'readingComplete') {
            statusText.textContent = 'Reading complete';
            currentBid.textContent = '';
            updateUIState('stopped');
        }
        if (message.type === 'error') {
            statusText.textContent = `Error: ${message.error}`;
            updateUIState('stopped');
        }
    });
});
