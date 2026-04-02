const firebaseConfig = {
    apiKey: "AIzaSyBZZUyjFtCLq1XM0IyP3RDW85pREViN4Js",
    authDomain: "rapidrelief-48060.firebaseapp.com",
    databaseURL: "https://rapidrelief-48060-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "rapidrelief-48060",
    storageBucket: "rapidrelief-48060.firebasestorage.app",
    messagingSenderId: "642270133796",
    appId: "1:642270133796:web:f347db9754fd811c8222b1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let map, routing;
let driverLoc = [28.4744, 77.4835]; 
let patientLoc = [28.4770, 77.4880];
let hospitalLoc = null;

function initMap() {
    map = L.map('map', { zoomControl: false }).setView(driverLoc, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    setTimeout(() => map.invalidateSize(), 500);
}

function startEmergency() {
    document.getElementById('dispatch-screen').classList.add('hidden');
    document.getElementById('driver-hud').classList.remove('hidden');
    
    // Begin navigation to Patient
    setRoute(driverLoc, patientLoc, '#3b82f6');
    document.getElementById('eta-val').innerText = "4 mins";
}

function broadcastSignal() {
    const btn = document.getElementById('signal-btn');
    btn.innerText = "SIGNALING HOSPITALS...";
    btn.style.opacity = "0.7";

    // Pinging Firebase
    db.ref('live_emergency/broadcast').set({ status: "searching" });

    // Listen for Hospital Acceptance
    db.ref('live_emergency/broadcast/accepted_by').on('value', (snap) => {
        const data = snap.val();
        if (data) {
            hospitalLoc = [data.lat, data.lng];
            btn.innerText = "HOSPITAL ACQUIRED ✅";
            btn.style.background = "#059669";
            
            // REVEAL HOSPITAL INFO ONLY NOW
            document.getElementById('h-name').innerText = data.name;
            document.getElementById('h-phone').innerText = data.phone;
            document.getElementById('hospital-data').classList.remove('hidden');
        }
    });
}

function confirmPickup() {
    if (!hospitalLoc) return alert("Please wait for a hospital signal first!");
    
    document.getElementById('nav-mode').innerText = "EN ROUTE TO HOSPITAL";
    document.getElementById('pickup-btn').classList.add('hidden');
    document.getElementById('drop-btn').classList.remove('hidden');
    document.getElementById('eta-val').innerText = "9 mins";

    // RE-ROUTE TO HOSPITAL
    setRoute(driverLoc, hospitalLoc, '#ef4444');
}

function setRoute(start, end, color) {
    if (routing) map.removeControl(routing);
    routing = L.Routing.control({
        waypoints: [L.latLng(start), L.latLng(end)],
        lineOptions: { styles: [{ color: color, weight: 7 }] },
        createMarker: () => null,
        addWaypoints: false
    }).addTo(map);
}

initMap();