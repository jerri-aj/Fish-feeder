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

// MATCHED EXACTLY TO THE ARDUINO PATHS:
const manualFeedRef = db.ref('feednow');
const timersRef      = db.ref('timers');
const statusRef       = db.ref('feeder/lastActionStatus'); // mic-confirmed result

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
// 3. "FEED NOW" LOGIC — feedback now tied to the mic-confirmed spike,
//    not just the feednow handshake.
// ==========================================================================
const feedButton = document.getElementById('feedNowBtn');
const feedBtnText = document.getElementById('feedBtnText');

function feednow() {
    if (!feedButton || feedButton.classList.contains('loading')) return;

    feedButton.style.pointerEvents = 'none';
    if (feedBtnText) feedBtnText.innerText = 'Sending...';
    feedButton.classList.add('loading');

    manualFeedRef.set(1)
    .then(() => {
        if (feedBtnText) feedBtnText.innerText = 'Feeding...';
        console.log("Feed command registered on Firebase as 1.");
    })
    .catch((error) => {
        console.error("Firebase database error:", error);
        resetButtonNormal();
    });
}

// Ignore the very first 'value' fire — Firebase fires immediately with
// whatever status is already stored from a previous cycle, which would
// otherwise trigger a false animation on page load.
let statusListenerReady = false;

statusRef.on('value', (snapshot) => {
    if (!statusListenerReady) {
        statusListenerReady = true;
        return;
    }

    const status = snapshot.val();

    if (status === 'confirmed') {
        console.log("Mic confirmed the spin. Showing success.");
        if (feedBtnText) {
            feedBtnText.innerHTML = '✨ Success!';
            feedButton.style.background = '#2ecc71';
            feedButton.style.color = '#ffffff';
        }
        setTimeout(resetButtonNormal, 3000);
    } else if (status === 'failed') {
        console.log("Mic did not detect a spin. Showing failure.");
        if (feedBtnText) {
            feedBtnText.innerHTML = '⚠️ No spin detected';
            feedButton.style.background = '#e74c3c';
            feedButton.style.color = '#ffffff';
        }
        setTimeout(resetButtonNormal, 4000);
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

$(document).ready(function(){
    $('#timepicker').mdtimepicker({
        timeFormat: 'hh:mm:ss t',
        format: 'hh:mm t',
        theme: 'blue',
        readOnly: false,
        hourPadding: false
    }).on('timechanged', function(e){
        console.log("Time picked: ", e.value);
        const time24 = convertTo24Hour(e.value);
        saveTimeToFirebase(time24);
    });
});

function openScheduler() {
    $('#timepicker').mdtimepicker('show');
}

function convertTo24Hour(timeStr) {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM' || modifier === 'pm') {
        hours = parseInt(hours, 10) + 12;
    }
    return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function saveTimeToFirebase(timeString) {
    if (!timeString) return;

    timersRef.update({
        timer1: timeString
    })
    .then(() => {
        console.log("Success! Updated timer1 to:", timeString);
    })
    .catch((error) => {
        console.error("Firebase write error:", error);
    });
}

timersRef.on('value', (snapshot) => {
    const wrapper = document.getElementById("wrapper");
    if (!wrapper) return;

    wrapper.innerHTML = "";

    const data = snapshot.val();
    if (data) {
        Object.keys(data).forEach((key) => {
            const timeValue = data[key];

            const div = document.createElement("div");
            div.className = "btn2 btn__secondary2";
            div.id = key;
            div.innerHTML = `
                <p>${timeValue}</p>
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

function deleteSchedule(key) {
    if (confirm("Are you sure you want to remove this feed time?")) {
        timersRef.child(key).remove()
        .then(() => {
            console.log("Schedule entry removed successfully.");
        })
        .catch((error) => {
            console.error("Failed to delete entry: ", error);
        });
    }
}
