// ==========================================================================
// 1. FIREBASE INITIALIZATION 
// ==========================================================================
// Make sure this matches your project configuration snippet exactly
const firebaseConfig = {
    databaseURL: "https://auto-fish-feeder-5ac75-default-rtdb.firebaseio.com"
};

// Initialize Firebase if it hasn't been already
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
const commandRef = db.ref('feeder/command');
const statusRef = db.ref('feeder/lastActionStatus');
const countRef = db.ref('feeder/count');

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

// Run clock every second
setInterval(setClock, 1000);
setClock();

// ==========================================================================
// 3. STEP 3: "FEED NOW" HANDSHAKE LOGIC
// ==========================================================================
const feedButton = document.getElementById('feedNowBtn');
const feedBtnText = document.getElementById('feedBtnText');

function feednow() {
    if (!feedButton || feedButton.classList.contains('loading')) return;

    // 1. Visually change the button to show the instruction is on its way
    feedButton.style.pointerEvents = 'none'; // Disable clicking
    if (feedBtnText) feedBtnText.innerText = 'Sending...';
    feedButton.classList.add('loading');

    // 2. Set the command node to "feed"
    commandRef.set('feed')
    .then(() => {
        if (feedBtnText) feedBtnText.innerText = 'Feeding...';
        console.log("Feed command registered on Firebase. Waiting for WeMos...");
    })
    .catch((error) => {
        console.error("Firebase database error:", error);
        resetButtonNormal();
    });
}

// 3. The Live Listener: Watches for the WeMos to echo "success" back
statusRef.on('value', (snapshot) => {
    const statusValue = snapshot.val();
    
    if (statusValue === 'success') {
        console.log("Handshake verified! Servo confirmed movement.");
        
        if (feedBtnText) {
            feedBtnText.innerHTML = '✨ Success!';
            feedButton.style.background = '#2ecc71'; // Pop bright green on verification
            feedButton.style.color = '#ffffff';
        }

        // Wait 3 seconds, clean up database flags, and restore UI base design
        setTimeout(() => {
            resetButtonNormal();
            statusRef.set('idle'); // Prepare verification pipeline for next instance
        }, 3000);
    }
});

function resetButtonNormal() {
    if (feedButton) {
        feedButton.style.pointerEvents = 'auto';
        feedButton.style.background = ''; // Drops back to CSS template baseline variables
        feedButton.style.color = '';
        feedButton.classList.remove('loading');
    }
    if (feedBtnText) {
        feedBtnText.innerText = 'Feed Now';
    }
}

// ==========================================================================
// 4. UI INTERACTION & SCHEDULER LOGIC
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

// Placeholder setups for your mdtimepicker triggers and listing layout builders
// Keep your existing addStore() and scheduler mechanics underneath this layout block
