const firebaseConfig = {
    apiKey: "AIzaSyBZZUyjFtCLq1XM0IyP3RDW85pREViN4Js",
    authDomain: "rapidrelief-48060.firebaseapp.com",
    databaseURL: "https://rapidrelief-48060-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "rapidrelief-48060",
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const database = firebase.database(); 

let hospitalConfig = {
    totalBeds: 20,
    occupiedBeds: 0,
    manualOverride: false 
};

window.onload = () => {
    setNewTotal();
    
    // Listen for live emergency signals to process "Auto-Redirect" if busy
    database.ref('live_emergency/broadcast').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data.status === "searching") {
            const isBusy = hospitalConfig.occupiedBeds >= hospitalConfig.totalBeds || hospitalConfig.manualOverride;
            if (isBusy) {
                database.ref('live_emergency/broadcast').update({ 
                    status: "auto_dispatched",
                    note: "AI Bot: Facility Full. Automated Redirect."
                });
            }
        }
    });
};

function setNewTotal() {
    const inputVal = parseInt(document.getElementById('capacity-input').value);
    if (inputVal > 0) {
        hospitalConfig.totalBeds = inputVal;
        document.getElementById('total-beds-display').innerText = inputVal;
        runBotInference(); 
    }
}

function updateBeds(change) {
    let newCount = hospitalConfig.occupiedBeds + change;
    if (newCount >= 0 && newCount <= hospitalConfig.totalBeds) {
        hospitalConfig.occupiedBeds = newCount;
        document.getElementById('bed-count').innerText = newCount;
        runBotInference();
    }
}

function toggleManualOverride() {
    hospitalConfig.manualOverride = !hospitalConfig.manualOverride;
    runBotInference();
}

function runBotInference() {
    const card = document.getElementById('status-card');
    const statusText = document.getElementById('intake-text');
    const reasonText = document.getElementById('bot-reason');
    const progressBar = document.getElementById('progress-bar');
    const warning = document.getElementById('capacity-warning');

    const isFull = hospitalConfig.occupiedBeds >= hospitalConfig.totalBeds;
    const isManuallyClosed = hospitalConfig.manualOverride;
    const isBusy = isFull || isManuallyClosed;

    const percentFilled = (hospitalConfig.occupiedBeds / hospitalConfig.totalBeds) * 100;
    progressBar.style.width = percentFilled + "%";

    if (isBusy) {
        card.className = "card status-busy";
        statusText.innerText = "BOT STATUS: REDIRECTING";
        progressBar.style.background = "#ef4444";
        reasonText.innerText = isFull ? "Reason: 100% Capacity." : "Reason: Manual Diversion.";
        if (isFull) warning.classList.remove('hidden');
    } else {
        card.className = "card status-open";
        statusText.innerText = "BOT STATUS: ACCEPTING";
        reasonText.innerText = "AI Monitoring Resources...";
        progressBar.style.background = "#10b981";
        warning.classList.add('hidden');
    }

    // MANUAL UPDATE TO FIREBASE: This informs the Hospital Dashboard
    database.ref('hospital_status/city_emergency').update({
        isAvailable: !isBusy,
        occupied: hospitalConfig.occupiedBeds,
        total: hospitalConfig.totalBeds
    });
}