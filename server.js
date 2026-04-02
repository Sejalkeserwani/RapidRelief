// server.js
const express = require("express");
const path = require("path");
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

// Fake users (demo only)
const fakeUsers = [
  {
    email: "patient1@medride.com",
    password: "patientpass",
    role: "patient",
    name: "Patient One",
  },
  {
    email: "driver1@medride.com",
    password: "driverpass",
    role: "driver",
    name: "Driver One",
  },
  {
    email: "hospital1@medride.com",
    password: "hospitalpass",
    role: "hospital",
    name: "Hospital One",
  },
];

// Login endpoint
app.post("/login", (req, res) => {
  const { email, password, role } = req.body;

  const user = fakeUsers.find(
    (u) =>
      u.email === email &&
      u.password === password &&
      u.role === role
  );

  if (user) {
    return res.json({
      success: true,
      message: "Login successful",
      user: {
        name: user.name,
        role: user.role,
      },
    });
  } else {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials or role.",
    });
  }
});

app.listen(3000, () => {
  console.log("MedRide app running on http://localhost:3000");
});
