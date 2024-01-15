document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings when the popup opens
    chrome.storage.local.get(['minutesToTrigger', 'isEnabled', 'flashOn', 'changeLayoutOn', 'soundOn', 'notificationOn'], function(items) {
        if (chrome.runtime.lastError) {
            console.log("Error retrieving settings:", chrome.runtime.lastError);
        }
        document.getElementById('minutesInput').value = items.minutesToTrigger || 10;
        document.getElementById('enableCheckbox').checked = items.isEnabled || false;
        document.getElementById('enableColor').checked = items.flashOn || true;
        document.getElementById('changeLayout').checked = items.changeLayoutOn || true;
        document.getElementById('enableSound').checked = items.soundOn || false;
        document.getElementById('enableNotification').checked = items.notificationOn || false; 

    });

    // Save settings when the Save button is clicked
    document.getElementById('saveButton').addEventListener('click', function() {
        const minutes = parseInt(document.getElementById('minutesInput').value, 10);
        const isEnabled = document.getElementById('enableCheckbox').checked;
        const flashOn = document.getElementById('enableColor').checked;
        const changeLayoutOn = document.getElementById('changeLayout').checked;
        const soundOn = document.getElementById('enableSound').checked;
        const notificationOn = document.getElementById('enableNotification').checked;  

        chrome.storage.local.set({
            'minutesToTrigger': minutes,
            'isEnabled': isEnabled,
            'flashOn' : flashOn,
            'changeLayoutOn' : changeLayoutOn,
            'soundOn': soundOn,
            'notificationOn': notificationOn  
        }, function() {
            if (chrome.runtime.lastError) {
                console.log("Error saving settings:", chrome.runtime.lastError);
            } else {
                console.log("Settings saved successfully.");
                // window.close(); // Uncomment if you want to close the popup after saving
            }
        });
    });

});
