// ==========================================================================
// 1. FIREBASE INITIALIZATION 
// ==========================================================================
const firebaseConfig = {
    databaseURL: "https://auto-fish-feeder-5ac75-default-rtdb.firebaseio.com"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
const commandRef = db.ref('feeder/command');
const statusRef = db.ref('feeder/lastActionStatus');
const scheduleRef = db.ref('feeder/schedule'); // Path where schedules are saved

// ==========================================================================
// 2. NEUMORPHIC ANALOG CLOCK LOGIC
// ==========================================================================
const hours = document.querySelector('.hours');
const minutes = document.querySelector('.minutes');
const seconds = document.querySelector('.seconds');

function setClock() {
    const currentDate = new Date();
    const secondsRatio = currentDate.getSeconds() / 60;
    const minutesRatio = (secondsRatio + currentDate.getMinutes()) / 60;
    const hoursRatio = (minutesRatio + currentDate.getHours()) / 12;
    
    setRotation(seconds, secondsRatio);
    setRotation(minutes, minutesRatio);
    setRotation(hours, hoursRatio);
}

function setRotation(element, rotationRatio) {
    if(element) {
        element.style.setProperty('--rotation', rotationRatio * 360);
    }
}

setInterval(setClock, 1000);
setClock();

// ==========================================================================
// 3. "FEED NOW" HANDSHAKE LOGIC
// ==========================================================================
const feedButton = document.getElementById('feedNowBtn');
const feedBtnText = document.getElementById('feedBtnText');

function feednow() {
    if (!feedButton || feedButton.classList.contains('loading')) return;

    feedButton.style.pointerEvents = 'none';
    if (feedBtnText) feedBtnText.innerText = 'Sending...';
    feedButton.classList.add('loading');

    commandRef.set('feed')
    .then(() => {
        if (feedBtnText) feedBtnText.innerText = 'Feeding...';
        console.log("Feed command registered on Firebase.");
    })
    .catch((error) => {
        console.error("Firebase database error:", error);
        resetButtonNormal();
    });
}

statusRef.on('value', (snapshot) => {
    const statusValue = snapshot.val();
    
    if (statusValue === 'success') {
        console.log("Handshake verified!");
        if (feedBtnText) {
            feedBtnText.innerHTML = '✨ Success!';
            feedButton.style.background = '#2ecc71';
            feedButton.style.color = '#ffffff';
        }

        setTimeout(() => {
            resetButtonNormal();
            statusRef.set('idle');
        }, 3000);
    }
});

function resetButtonNormal() {
    if (feedButton) {
        feedButton.style.pointerEvents = 'auto';
        feedButton.style.background = '';
        feedButton.style.color = '';
        feedButton.classList.remove('loading');
    }
    if (feedBtnText) {
        feedBtnText.innerText = 'Feed Now';
    }
}

// ==========================================================================
// 4. UI SCREEN TOGGLE
// ==========================================================================
function toggleDiv() {
    var comp1 = document.getElementById("1");
    var comp2 = document.getElementById("2");
    if (comp1.style.display === "none") {
        comp1.style.display = "block";
        comp2.style.display = "none";
    } else {
        comp1.style.display = "none";
        comp2.style.display = "block";
    }
}

// ==========================================================================
// 5. WORKING SCHEDULER & MDTIMEPICKER INTEGRATION
// ==========================================================================

// Initialize the mdtimepicker plugin on your timepicker element
$(document).ready(function(){
    $('#timepicker').mdtimepicker({ 
        timeFormat: 'hh:mm:ss t', 
        format: 'hh:mm t',            
        theme: 'blue',                
        readOnly: false,              
        hourPadding: false            
    }).on('timechanged', function(e){
        console.log("Time selected: ", e.value);
        // Automatically run addStore with the chosen time string
        saveTimeToFirebase(e.value);
    });
});

// Directly push the scheduled time straight to your Firebase backend database
function saveTimeToFirebase(timeString) {
    if (!timeString) return;

    // Push new time entry to Firebase under 'feeder/schedule'
    scheduleRef.push({
        time: timeString,
        timestamp: Date.now()
    })
    .then(() => {
        console.log("Schedule successfully written to Firebase!");
    })
    .catch((error) => {
        console.error("Error saving schedule to Firebase: ", error);
    });
}

// Real-time listener that builds the UI list every time a schedule is added/removed
scheduleRef.on('value', (snapshot) => {
    const wrapper = document.getElementById("wrapper");
    if (!wrapper) return;
    
    wrapper.innerHTML = ""; // Clear existing UI list elements
    
    const data = snapshot.val();
    if (data) {
        Object.keys(data).forEach((key) => {
            const item = data[key];
            
            // Build the Neumorphic schedule cards dynamically
            const div = document.createElement("div");
            div.className = "btn2 btn__secondary2";
            div.id = key;
            div.innerHTML = `
                <p>${item.time}</p>
                <div class="icon2" style="display:inline-block; margin-left:15px; cursor:pointer;" onclick="deleteSchedule('${key}')">
                    <ion-icon name="trash-outline" style="color:#d11a2a; font-size:1.8rem; vertical-align:middle;"></ion-icon>
                </div>
            `;
            wrapper.appendChild(div);
        });
    } else {
        wrapper.innerHTML = "<p style='color:var(--greyDark); font-size:1.4rem;'>No schedules set.</p>";
    }
});

// Delete function to wipe entries from the cloud DB when clicking trash icon
function deleteSchedule(key) {
    if (confirm("Are you sure you want to remove this feed time?")) {
        scheduleRef.child(key).remove()
        .then(() => {
            console.log("Schedule entry removed successfully.");
        })
        .catch((error) => {
            console.error("Failed to delete entry: ", error);
        });
    }
}
