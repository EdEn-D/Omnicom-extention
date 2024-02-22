// const ALERT_SOUND_PATH = 'notification.mp3'; 
const ALERT_SOUND_PATH = chrome.runtime.getURL('notification.m4a');
const DEFAULT_BG_COLOR = 'lightblue';
const TRIGGER_BG_COLOR = 'red';
const ALERT_INTERVAL = 5000;

const TELEGRAM_TOKEN = '6406293699:AAHfs7oIonXCN7WX5ni85FctPlYa0ClGTsA';
const TELEGRAM_CHAT_ID = '-1001998994957';
const TELEGRAM_CHAT_ID_TEST = '-1002107398827';




function sendMessageToTelegramGroup(message) {
    const apiUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

    const payload = {
        chat_id: TELEGRAM_CHAT_ID,
        text: message
    };

    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.ok) {
            console.log('Message sent successfully:', data.result.text);
        } else {
            console.error('Failed to send message:', data.description);
        }
    })
    .catch(error => {
        console.error('Error sending message:', error);
    });
}

function parseRowToMessage(dict) {
    let messageParts = [];
    messageParts.push("Caller waiting for agent");
    messageParts.push("Queue : Installers B");
    for (var key in dict) {
        if (dict.hasOwnProperty(key)) 
        {
            if (key == "callerid")
                messageParts.push(`${key}: ${dict[key]}`);                
            if (key == "timer")
                messageParts.push(`${key}: ${dict[key]}`);
            // console.log(key + ': ' + dict[key]);
        }
    }


    return messageParts.join('\n');
}

function handleNewCallsNotification(rows){
    for (let row of rows) {
        const message = parseRowToMessage(row);
        sendMessageToTelegramGroup(message);
    }
}

// returns array with each row as an array of data about caller
function parseTableData_old(data) {
    let tableData = [];
    
    // Get all rows from the table except the header row
    const rows = document.querySelectorAll("#WaitingCallsRealTime table.RealTimeGridStyle tr:not(.RealTimeGridHeaderStyle)");

    rows.forEach(row => {
        let rowData = [];

        // Get all cells from the row
        const cells = row.querySelectorAll("td");
        cells.forEach(cell => {
            rowData.push(cell.textContent.trim());
        });

        tableData.push(rowData);
    });

    return tableData;
}

function parseTableData() {
    // Select all elements with the class 'grid__item' and 'callTR'
    var elements = document.querySelectorAll('.grid__item.callTR');

    // Initialize an array to hold your data
    var dataArray = [];

    // Loop through each element and extract the data
    elements.forEach(function(element) {
        // Create an object to hold the data for this element
        var elementData = {
            callerid: element.getAttribute('callerid'), // Get the callerid attribute
            id: element.id, // Get the id attribute
            queue: element.textContent.trim().split("\n")[0], // Get the queue name, assuming it's the first text
            timer: element.querySelector('.timer').textContent, // Get the timer text
            phoneNumber: element.textContent.trim().split("\n")[1] // Get the phone number, assuming it's after the timer
        };
        
        // Add the object to the array
        dataArray.push(elementData);
    });

    // Now dataArray contains all the extracted data
    // console.log(dataArray);
    return dataArray;

}

// returns minutes from each row of callers
function extractMinutesFromData(tableData) {
    let minutesArray = [];

    tableData.forEach(row => {
        const timestamp = row[6]; // Getting the 7th element
        const [hours, minutes, seconds] = timestamp.split(':').map(Number);

        const totalMinutes = hours * 60 + minutes + seconds / 60;
        minutesArray.push(totalMinutes);
    });

    return minutesArray;
}

// returns an array of callers which are exceeding the triger time
function getExeedingCallerList(tableData, minutesToTrigger) {
    var resultRows = [];

    tableData.forEach(function(item) {
        if (item.timer && item.queue && item.queue.includes('Installers_(B)_Queue')) {
            var timeParts = item.timer.split(':');
            var itemMinutes = parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1], 10);

            if (itemMinutes >= minutesToTrigger) {
                resultRows.push(item);
            }
        }
    });

    return resultRows;
}

// Returns an array of new callers based on the 'callerid'
function getNewExceedingCalls(currentExceedingCalls, newExceedingCalls) {
    let newCalls = []; // Array to hold new calls

    // Check if the newExceedingCalls list is empty
    if (newExceedingCalls.length === 0) {
        return newCalls;
    }

    // Extract 'callerid' from currentExceedingCalls
    const currentCallerIds = currentExceedingCalls.map(call => call.callerid);

    // Iterate over newExceedingCalls to find new callers
    for (let call of newExceedingCalls) {
        if (!currentCallerIds.includes(call.callerid)) {
            // If a new callerid is found that wasn't in the previous list
            newCalls.push(call);
        }
    }

    return newCalls; // Returns an array of new calls
}

function handleSound(soundOn, lastPlayedTime){
    const now = Date.now();
    if (soundOn && (now - lastPlayedTime > ALERT_INTERVAL)) {
        const audio = new Audio(ALERT_SOUND_PATH);
        audio.play();

        lastPlayedTime = now;
        chrome.storage.local.set({ lastPlayedTime: now });
    }
}


function changeLayout(){
    // Remove left col
    var leftCol = document.querySelector('.left-column.ltr');
    if (leftCol){
        leftCol.remove();
    }

    // Move agents and waiting calls to top
    var dropArea = document.getElementById('drop-area');
    var waitingCalls = document.querySelector('.panel.waiting-calls');
    var parent = document.body;
    parent.insertBefore(waitingCalls, parent.firstChild);
    parent.insertBefore(dropArea, parent.firstChild);
}

function isTimeExceeded(minutesToTrigger) {
    var callItems = document.querySelectorAll('.grid__item.callTR');
    if(callItems.length) {
        callItems.forEach(function(item) {
            var itemText = item.textContent.trim();
            var timerSpan = item.querySelector('.timer');
            var timerText = timerSpan ? timerSpan.textContent.trim() : "";
            var timeExceedsThreshold = isTimeGreaterThanTrigger(timerText, minutesToTrigger);
            console.log("Timer: ", itemText);
            console.log(timerText);
            console.log(timeExceedsThreshold);
            
    
            return timeExceedsThreshold;
        }
        )
    }
    console.log("\n\n");
}


function isTimeGreaterThanTrigger(timeString, minutesToTrigger) {
    var parts = timeString.split(':');
    var minutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    return minutes >= minutesToTrigger; // 180 seconds = 3 minutes
}

function isTimeExceededPerItem(item ,minutesToTrigger) {    
    var itemText = item.textContent.trim();
    var timerSpan = item.querySelector('.timer');
    var timerText = timerSpan ? timerSpan.textContent.trim() : "";
    var timeExceedsThreshold = isTimeGreaterThanTrigger(timerText, minutesToTrigger);

    console.log("Timer: ", itemText);
    console.log(timerText);
    console.log(timeExceedsThreshold);
    console.log("\n\n");
    
    return timeExceedsThreshold;
}

function changeColors(minutesToTrigger){
        // Incoming calls container
        var container = document.querySelector('.panel.waiting-calls');

        
        var callItems = document.querySelectorAll('.grid__item.callTR');
        if(callItems.length) {
            callItems.forEach(function(item) {
                var itemText = item.textContent.trim();
    
                if (itemText.includes('Installers_(A)_Queue')) {
                    let Trigger = isTimeExceededPerItem(item, minutesToTrigger)

                    if (Trigger){
                        item.style.backgroundColor = 'orange'; // Color for Installers_(B)_Queue
                        container.style.backgroundColor = 'red'; // Replace 'lightblue' with your desired color

                    } else {
                        item.style.backgroundColor = 'lightgreen';
                    }                
                } else if (itemText.includes('Installers_(B)_Queue')) {
                    let Trigger = isTimeExceededPerItem(item, minutesToTrigger)

                    if (Trigger){
                        item.style.backgroundColor = 'orange'; // Color for Installers_(B)_Queue
                        container.style.backgroundColor = 'red'; // Replace 'lightblue' with your desired color

                    } else {
                        item.style.backgroundColor = 'lightgreen';
                    }

                } else {
                    item.style.backgroundColor = 'lightgrey'; // Default color for other types
                }
            });
        }
}



// The main function which orchestrates everything
function main() {
    let lastPlayedTime = 0;  // Default value
    let currentExceedingCalls = []; // To store rows from the last check
    let currColor = DEFAULT_BG_COLOR;

    // Fetch user settings from storage
    chrome.storage.local.get(['minutesToTrigger', 'isEnabled', 'flashOn', 'changeLayoutOn','soundOn', 'lastPlayedTime', 'notificationOn', 'currentExceedingCalls'], function(items) {
        lastPlayedTime = items.lastPlayedTime || 0;
        let currentExceedingCalls = items.currentExceedingCalls || [];

        // Only proceed if the feature is enabled
        if (items.isEnabled) {
            console.log("-+-+-+-+-+-+-+-+-+-+-+-+-+-")
            
            if (items.changeLayoutOn)
                changeLayout();
            if (items.flashOn)
                changeColors(items.minutesToTrigger);



            // const minutesData = extractMinutesFromData(tableData);
            // const deviationTrigger = isTimeExceeded(minutesData, items.minutesToTrigger);
            // console.log("extractMinutesFromData");
            // console.log(minutesData);
            

            var tableData = parseTableData();
            console.log(tableData);
            // Iterate over the list
            tableData.forEach(function(dict) {
                // Iterate over each dictionary
                for (var key in dict) {
                    if (dict.hasOwnProperty(key)) {
                        console.log(key + ': ' + dict[key]);
                    }
                }
            });
            const exeedingCalls = getExeedingCallerList(tableData, items.minutesToTrigger)

            console.log("exeedingCalls: ");
            console.log(exeedingCalls);
            console.log('current exeedingCalls : ');
            console.log(currentExceedingCalls);

            const newExeedingCalls = getNewExceedingCalls(currentExceedingCalls, exeedingCalls)
            console.log('newExeedingCalls : ');
            console.log(newExeedingCalls);

            chrome.storage.local.set({'currentExceedingCalls': exeedingCalls});
            console.log("---")
            // if there are new callers exeeding the time, play sound and notify telegram
            if (newExeedingCalls.length > 0){
                console.log("new client is calling")
                handleSound(items.soundOn, lastPlayedTime); // change to play every time a new caller exeeds
                if (items.notificationOn) {
                    //sendMessageToTelegramGroup('Hello from my Telegram bot!');
                    handleNewCallsNotification(newExeedingCalls);
                }
            }

            // The bg will be red whenever there is at least one caller that is exeeding the time
            // if (deviationTrigger) {
            //     if (items.flashOn){
            //         flashScreen()
            //     }
            //     else
            //     {
            //         document.body.style.backgroundColor = TRIGGER_BG_COLOR;
            //         currColor = TRIGGER_BG_COLOR;
            //     }
            // } else {
            //     document.body.style.backgroundColor = DEFAULT_BG_COLOR;
            //     currColor = DEFAULT_BG_COLOR;
            // }
            
        } 
        // else {
        //     document.body.style.backgroundColor = DEFAULT_BG_COLOR;
        //     currColor = DEFAULT_BG_COLOR;
        // }

        setTimeout(function() {
            console.log("refreshing...")
            location.reload();
            // Code to execute after the delay
        }, 60000);
    });
}



// Setting an interval to run the main function every second
setInterval(main, 1000);