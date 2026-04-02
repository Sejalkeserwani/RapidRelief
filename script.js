const firebaseConfig = {
  apiKey: "AIzaSyBZZUyjFtCLq1XM0IyP3RDW85pREViN4Js",
  authDomain: "rapidrelief-48060.firebaseapp.com",
  databaseURL: "https://rapidrelief-48060-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "rapidrelief-48060",
  storageBucket: "rapidrelief-48060.firebasestorage.app",
  messagingSenderId: "642270133796",
  appId: "1:642270133796:web:f347db9754fd811c8222b1"
};

// Initialize the connection
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// User Database for Demo
const users = {
    "patient@med.com": { pass: "pass123", role: "Patient", page: "patient.html" },
    "driver@ems.com": { pass: "pass123", role: "Driver", page: "driver.html" },
    "admin@cityhope.com": { pass: "pass123", role: "Hospital", page: "hospital.html" }
};

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-msg');

    if (users[email] && users[email].pass === password) {
        errorMsg.style.display = 'none';
        const role = users[email].role;
        const targetPage = users[email].page;
        
        // Success animation
        document.querySelector('.login-card').innerHTML = `
            <div style="text-align:center; padding: 40px 0;">
                <div style="font-size: 4rem; animation: pop 0.3s ease;">✅</div>
                <h2 style="margin-top:20px; color: #0f172a;">Authenticated as ${role}</h2>
                <p style="color:#64748b;">Loading your secure dashboard...</p>
            </div>
        `;
        
        console.log("Redirecting to:", targetPage);

        // Wait 1.5 seconds so the user sees the success message, then redirect
        setTimeout(() => {
            window.location.href = targetPage;
        }, 1500);

    } else {
        errorMsg.style.display = 'block';
        errorMsg.innerText = "Invalid email or password. Please try again.";
    }
});