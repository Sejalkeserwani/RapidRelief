const firebaseConfig = {
    apiKey: "AIzaSyBZZUyjFtCLq1XM0IyP3RDW85pREViN4Js",
    authDomain: "rapidrelief-48060.firebaseapp.com",
    databaseURL: "https://rapidrelief-48060-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "rapidrelief-48060",
    storageBucket: "rapidrelief-48060.firebasestorage.app",
    messagingSenderId: "642270133796",
    appId: "1:642270133796:web:f347db9754fd811c8222b1"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const database = firebase.database();

let map, routingControl, ambMarker, isUnknown = false;

function setPatientMode(mode) {
    isUnknown = (mode === 'unknown');
    document.getElementById('btn-known').classList.toggle('active', !isUnknown);
    document.getElementById('btn-unknown').classList.toggle('active', isUnknown);
    document.getElementById('med-info-fields').style.opacity = isUnknown ? "0.3" : "1";
}

function confirmBooking() {
    const name = document.getElementById('p-name').value || "Anonymous";
    const desc = document.getElementById('p-desc').value || "Emergency";
    const blood = document.getElementById('p-blood').value;

    navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;

        // Writing to the unified path
        database.ref('emergency_system/current_case').set({
            patientName: name, description: desc, bloodGroup: blood,
            latitude: lat, longitude: lng, status: "pending", time: Date.now()
        });
        
        document.getElementById('stage-1').classList.add('hidden');
        document.getElementById('stage-3').classList.remove('hidden');
        document.getElementById('map').classList.add('show-map');
        
        loadAid(desc);
        initMap(lat, lng);
        listenForResponse(lat, lng);
    }, (err) => alert("Please enable GPS."));
}

function listenForResponse(pLat, pLng) {
    // Listening to the SAME path for the "accepted" trigger
    database.ref('emergency_system/current_case/status').on('value', (snap) => {
        const status = snap.val();
        if (status === "accepted" || status === "auto_dispatched") {
            document.getElementById('live-eta').innerText = "Ambulance Dispatched!";
            document.getElementById('dispatch-label').innerText = "Mark Stevens (Driver)";
            document.getElementById('driver-details').classList.remove('hidden');
            // Hide the "Waiting" label if you have one
            if(document.getElementById('waiting-label')) {
                document.getElementById('waiting-label').classList.add('hidden');
            }
            startAmbulanceRouting(pLat, pLng);
        }
    });
}

function initMap(lat, lng) {
    if (map) map.remove();
    map = L.map('map', { zoomControl: false }).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    L.marker([lat, lng]).addTo(map);
    setTimeout(() => map.invalidateSize(), 300);
}

function startAmbulanceRouting(lat, lng) {
    if (ambMarker) return; 
    let aLat = lat + 0.007, aLng = lng + 0.007;
    const icon = L.divIcon({ html: '🚑', className: 'amb-icon', iconSize: [35, 35] });
    ambMarker = L.marker([aLat, aLng], { icon: icon }).addTo(map);

    routingControl = L.Routing.control({
        waypoints: [L.latLng(aLat, aLng), L.latLng(lat, lng)],
        lineOptions: { styles: [{ color: '#3b82f6', weight: 6 }] },
        createMarker: () => null,
        addWaypoints: false
    }).addTo(map);

    routingControl.on('routesfound', (e) => {
        const route = e.routes[0], coords = route.coordinates;
        let i = 0;
        const drive = setInterval(() => {
            if (i >= coords.length) return clearInterval(drive);
            ambMarker.setLatLng([coords[i].lat, coords[i].lng]);
            const p = 1 - (i / coords.length);
            document.getElementById('dist-display').innerText = (route.summary.totalDistance * p / 1000).toFixed(1) + " km away";
            document.getElementById('live-eta').innerText = "Arriving in " + Math.ceil(route.summary.totalTime * p / 60) + " Mins";
            i += 2;
        }, 800);
    });
}

function loadAid(desc) {
    const list = document.getElementById('aid-list');
    let tips = ["Keep patient still.", "Ensure open airway."];
    if (desc.toLowerCase().includes("bleed")) tips = ["Apply firm pressure.", "Check breathing."];
    list.innerHTML = tips.map(t => `<li><span>✓</span> ${t}</li>`).join('');
}