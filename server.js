const express = require('express');
const https = require('https'); 
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3000;
const DISCORD_URL = "https://discord.com/api/webhooks/1486393518623690903/_ZxGaOR9yc63ECcOBZVkqznkIyxnBYyZEowlyNGV1dHcw2rMDyP2QI5juQXGpJIHaXFe";

// Database Files
const BIKES_FILE = path.join(__dirname, 'bikes.json');
const HISTORY_FILE = path.join(__dirname, 'history.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const REQUESTS_FILE = path.join(__dirname, 'requests.json');

// Initialize Storage
[HISTORY_FILE, USERS_FILE, REQUESTS_FILE].forEach(file => {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify([]));
});

function sendDiscord(message) {
    const data = JSON.stringify({ content: message });
    const urlParts = new URL(DISCORD_URL);
    const options = {
        hostname: urlParts.hostname, path: urlParts.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = https.request(options);
    req.write(data);
    req.end();
}

app.use(cors());
app.use(express.json());

// FIX: Explicitly define the admin route BEFORE static files to guarantee it opens
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve static files (like images or CSS) after explicit routes
app.use(express.static(__dirname));

// --- AUTH ---
app.post('/api/signup', (req, res) => {
    const { name, email, password } = req.body;
    let users = JSON.parse(fs.readFileSync(USERS_FILE));
    if (users.find(u => u.email === email)) return res.status(400).json({ success: false });
    users.push({ name, email, password });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    res.json({ success: true });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    const user = users.find(u => u.email === email && u.password === password);
    if (user) return res.json({ success: true, name: user.name });
    res.status(401).json({ success: false });
});

// --- CLIENT BOOKING REQUEST (UTR ONLY) ---
app.get('/api/bikes', (req, res) => res.json(JSON.parse(fs.readFileSync(BIKES_FILE))));

app.post('/api/request-booking', (req, res) => {
    const { bikeName, customerName, phone, days, transactionId } = req.body;
    
    // Check if UTR is valid (at least 10 characters)
    if (!transactionId || transactionId.length < 10) return res.status(400).json({ success: false, message: "Invalid UTR" });

    let requests = JSON.parse(fs.readFileSync(REQUESTS_FILE));
    const newRequest = {
        id: Date.now(), bikeName, customerName, phone, days, transactionId,
        date: new Date().toLocaleString()
    };
    
    requests.push(newRequest);
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2));

    sendDiscord(`🎫 **NEW REQUEST FOR BIKE**\n**UTR:** ${transactionId}\n**Customer:** ${customerName}\n**Bike:** ${bikeName}\n*Check Admin Panel to Reserve.*`);
    res.json({ success: true });
});

// --- ADMIN CONTROL (MANUAL RESERVATION) ---
app.get('/api/admin/requests', (req, res) => res.json(JSON.parse(fs.readFileSync(REQUESTS_FILE))));

app.post('/api/admin/approve', (req, res) => {
    const { requestId } = req.body;
    let requests = JSON.parse(fs.readFileSync(REQUESTS_FILE));
    let history = JSON.parse(fs.readFileSync(HISTORY_FILE));
    let fleet = JSON.parse(fs.readFileSync(BIKES_FILE));

    const reqIdx = requests.findIndex(r => r.id === requestId);
    if (reqIdx === -1) return res.status(404).json({ success: false });

    const booking = requests[reqIdx];
    const bike = fleet.find(b => b.name === booking.bikeName);

    if (bike && (bike.stock - bike.rented) > 0) {
        bike.rented += 1; // Update availability
        booking.status = "Reserved Manually";
        history.push(booking);
        requests.splice(reqIdx, 1); // Remove from pending

        fs.writeFileSync(BIKES_FILE, JSON.stringify(fleet, null, 2));
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
        fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2));
        return res.json({ success: true });
    }
    res.status(400).json({ success: false, message: "Out of Stock" });
});

app.post('/api/admin/reject', (req, res) => {
    let requests = JSON.parse(fs.readFileSync(REQUESTS_FILE));
    requests = requests.filter(r => r.id !== req.body.requestId);
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2));
    res.json({ success: true });
});

app.get('/api/admin/history', (req, res) => res.json(JSON.parse(fs.readFileSync(HISTORY_FILE))));

app.post('/api/admin/reset-bike', (req, res) => {
    const { bikeId } = req.body;
    let fleet = JSON.parse(fs.readFileSync(BIKES_FILE));
    const bike = fleet.find(b => b.id === bikeId);
    if (bike) { bike.rented = 0; fs.writeFileSync(BIKES_FILE, JSON.stringify(fleet, null, 2)); res.json({ success: true }); }
});

app.listen(PORT, () => console.log(`Wheel Adventure Engine Live on ${PORT}`));