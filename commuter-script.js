// 1. FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyBZZUyjFtCLq1XM0IyP3RDW85pREViN4Js",
  authDomain: "rapidrelief-48060.firebaseapp.com",
  databaseURL: "https://rapidrelief-48060-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "rapidrelief-48060",
  storageBucket: "rapidrelief-48060.firebasestorage.app",
  messagingSenderId: "642270133796",
  appId: "1:642270133796:web:f347db9754fd811c8222b1"
};

// 2. INITIALIZE CONNECTION
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database(); 

// 3. GLOBAL STATE & THRESHOLDS
const ALERT_RADIUS = 500; // Trigger distance (meters)
const RESET_RADIUS = 1000; // Distance to reset for next alert
let userPos = { lat: 28.6139, lon: 77.2090 }; // Default, will update via GPS

let isAlertActive = false;
let isEncounterComplete = false;
let audioCtx = null;
let sirenInterval = null;

// 4. AUDIO OSCILLATOR (Siren Logic)
function playSiren() {
    if (!audioCtx) return;
    
    // Force resume if browser suspended audio
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle'; 
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.9);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 1);
}

// 5. INITIALIZATION & USER GESTURE
document.getElementById('start-btn').onclick = function() {
    // Create AudioContext on click to bypass browser blocks
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    this.disabled = true;
    this.innerText = "Monitoring Active...";
    document.getElementById('status-card').classList.add('active-monitoring');
    document.getElementById('main-status').innerText = "Scanning for Sirens...";

    // Request Notification Permission
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    // TEST BEEP: Confirms audio is working 1 second after click
    setTimeout(() => { 
        console.log("Playing test beep...");
        playSiren(); 
    }, 1000); 

    // Start GPS Tracking
    navigator.geolocation.watchPosition((pos) => {
        userPos.lat = pos.coords.latitude;
        userPos.lon = pos.coords.longitude;
        console.log("User GPS Updated:", userPos);
    }, (err) => console.error("GPS Error:", err), { enableHighAccuracy: true });

    // Start listening to Firebase
    startLiveTracking();
};

// 6. DISTANCE CALCULATION (Haversine)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// 7. EMERGENCY TRIGGER
function triggerEmergency(distance) {
    if (isAlertActive || isEncounterComplete) return;

    isAlertActive = true;
    document.getElementById('emergency-overlay').classList.remove('hidden');
    document.getElementById('live-dist').innerText = Math.round(distance);

    // Start siren loop
    sirenInterval = setInterval(playSiren, 1000);

    if (Notification.permission === "granted") {
        new Notification("🚨 MOVE LEFT!", { body: "Ambulance approaching nearby!" });
    }

    // Auto-dismiss after 8 seconds of warning
    setTimeout(() => {
        stopEmergency();
    }, 8000);
}

function stopEmergency() {
    clearInterval(sirenInterval);
    isAlertActive = false;
    isEncounterComplete = true; 
    document.getElementById('emergency-overlay').classList.add('hidden');
    document.getElementById('mini-banner').classList.remove('hidden');
    document.getElementById('main-status').innerText = "Ambulance Passed";
}

// 8. LIVE DATA LISTENER
function startLiveTracking() {
    // Listens to the 'active_trip' node updated by the Driver App
    database.ref('live_emergency/active_trip').on('value', (snapshot) => {
        const trip = snapshot.val();
        
        if (trip && trip.isMoving) {
            const dist = getDistance(userPos.lat, userPos.lon, trip.lat, trip.lng);
            console.log("Distance to Ambulance: " + Math.round(dist) + "m");

            if (dist <= ALERT_RADIUS) {
                triggerEmergency(dist);
            } 
            else if (dist > RESET_RADIUS && isEncounterComplete) {
                // Reset for the next ambulance encounter
                isEncounterComplete = false;
                document.getElementById('mini-banner').classList.add('hidden');
                document.getElementById('main-status').innerText = "Scanning for Sirens...";
            }
        }
    });
}