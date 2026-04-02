const firebaseConfig = {
    apiKey: "AIzaSyBZZUyjFtCLq1XM0IyP3RDW85pREViN4Js",
    authDomain: "rapidrelief-48060.firebaseapp.com",
    databaseURL: "https://rapidrelief-48060-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "rapidrelief-48060",
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const database = firebase.database();

let botTimer; 
let isHospitalAvailable = true;
let hospitalConfig = { totalBeds: 20, occupiedBeds: 0, manualOverride: false };

function updateTotalCapacity() {
    const newTotal = parseInt(document.getElementById('total-beds-input').value);
    if (!isNaN(newTotal) && newTotal > 0) {
        hospitalConfig.totalBeds = newTotal;
        syncBotUI();
    }
}

function updateBeds(change) {
    let newCount = hospitalConfig.occupiedBeds + change;
    if (newCount >= 0 && newCount <= hospitalConfig.totalBeds) {
        hospitalConfig.occupiedBeds = newCount;
        document.getElementById('bed-count').innerText = hospitalConfig.occupiedBeds;
        syncBotUI();
    }
}

function toggleManualOverride() {
    hospitalConfig.manualOverride = !hospitalConfig.manualOverride;
    syncBotUI();
}

function syncBotUI() {
    const isFull = hospitalConfig.occupiedBeds >= hospitalConfig.totalBeds;
    const isBusy = isFull || hospitalConfig.manualOverride;
    isHospitalAvailable = !isBusy;

    const progressBar = document.getElementById('progress-bar');
    const statusText = document.getElementById('intake-status');
    const acceptBtn = document.getElementById('accept-btn-main');

    const percent = (hospitalConfig.occupiedBeds / hospitalConfig.totalBeds) * 100;
    if (progressBar) {
        progressBar.style.width = percent + "%";
        progressBar.style.backgroundColor = isBusy ? "#ef4444" : "#10b981";
    }
    if (statusText) {
        statusText.innerText = isBusy ? "STATUS: REDIRECTING" : "STATUS: ACCEPTING";
        statusText.style.color = isBusy ? "#ef4444" : "#10b981";
    }
    if (acceptBtn) {
        acceptBtn.disabled = isBusy;
        acceptBtn.style.opacity = isBusy ? "0.5" : "1";
    }

    database.ref('hospital_status/city_emergency').update({
        isAvailable: !isBusy,
        occupied: hospitalConfig.occupiedBeds,
        total: hospitalConfig.totalBeds
    });
}

// --- EMERGENCY SIGNAL LISTENER (UPDATED PATH) ---
database.ref('emergency_system/current_case').on('value', (snapshot) => {
    const data = snapshot.val();
    
    // Trigger if status is "pending"
    if (data && data.status === "pending") {
        if (!isHospitalAvailable) {
            database.ref('emergency_system/current_case').update({ 
                status: "auto_dispatched", 
                note: "Redirect: Facility at Capacity." 
            });
            return;
        }

        const cBar = document.getElementById('countdown-bar');
        if (cBar) {
            cBar.classList.remove('shrink-animation');
            cBar.style.width = "100%";
            setTimeout(() => { cBar.classList.add('shrink-animation'); }, 50);
        }

        clearTimeout(botTimer); 
        botTimer = setTimeout(() => {
            database.ref('emergency_system/current_case').update({ 
                status: "auto_dispatched",
                note: "Timeout: AI Redirecting."
            });
            alert("No response. Auto-dispatching!");
        }, 60000); 

        document.getElementById('no-alerts').classList.add('hidden');
        document.getElementById('emergency-card').classList.remove('hidden');
        
        document.getElementById('p-name').innerText = data.patientName || "Unknown";
        document.getElementById('p-cond').innerText = data.description || "Emergency";
        document.getElementById('p-blood').innerText = data.bloodGroup || "--";
    }
});

function acceptCase() {
    clearTimeout(botTimer); 
    database.ref('emergency_system/current_case').update({
        status: "accepted",
        accepted_by: "City Emergency Center"
    });
    
    document.getElementById('emergency-card').classList.add('hidden');
    document.getElementById('contact-hub').classList.remove('hidden');
}

syncBotUI();