const express = require('express');
const https = require('https'); 
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3000;

// YOUR DISCORD WEBHOOK
const DISCORD_URL = "https://discord.com/api/webhooks/1486393518623690903/_ZxGaOR9yc63ECcOBZVkqznkIyxnBYyZEowlyNGV1dHcw2rMDyP2QI5juQXGpJIHaXFe";

function sendDiscord(message) {
    const data = JSON.stringify({ content: message });
    const urlParts = new URL(DISCORD_URL);
    
    const options = {
        hostname: urlParts.hostname,
        path: urlParts.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
        },
    };

    const req = https.request(options, (res) => {
        console.log(`>>> Discord Notification Status: ${res.statusCode}`);
    });

    req.on('error', (e) => console.error(">>> Discord Error:", e.message));
    req.write(data);
    req.end();
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const BIKES_FILE = path.join(__dirname, 'bikes.json');

// LOG EVERY REQUEST FOR DEBUGGING
app.use((req, res, next) => {
    console.log(`>>> Incoming Request: ${req.method} ${req.url}`);
    next();
});

app.post('/api/book', (req, res) => {
    const { bikeName } = req.body;
    console.log(`>>> BOOKING TRIGGERED: ${bikeName}`);

    try {
        const fleet = JSON.parse(fs.readFileSync(BIKES_FILE, 'utf8'));
        const bike = fleet.find(b => b.name.trim().toLowerCase() === bikeName.trim().toLowerCase());

        if (bike && (bike.stock - bike.rented) > 0) {
            bike.rented += 1;
            fs.writeFileSync(BIKES_FILE, JSON.stringify(fleet, null, 2));

            sendDiscord(`🚀 **NEW BOOKING AT ALIGARH HUB**\n\n**Bike:** ${bike.name}\n**Status:** Confirmed\n*Prepare for customer pickup.*`);

            return res.json({ success: true });
        }
        res.status(400).json({ success: false, message: "Out of stock or invalid bike" });
    } catch (err) {
        console.error(">>> Internal Server Error:", err);
        res.status(500).json({ success: false });
    }
});

app.get('/api/bikes', (req, res) => {
    res.json(JSON.parse(fs.readFileSync(BIKES_FILE, 'utf8')));
});

app.post('/api/admin/reset', (req, res) => {
    const { pin, bikeId, resetAll } = req.body;
    if (pin !== "1234") return res.status(401).json({ success: false });
    let fleet = JSON.parse(fs.readFileSync(BIKES_FILE, 'utf8'));
    if (resetAll) fleet.forEach(b => b.rented = 0);
    else { const bike = fleet.find(b => b.id === bikeId); if (bike) bike.rented = 0; }
    fs.writeFileSync(BIKES_FILE, JSON.stringify(fleet, null, 2));
    res.json({ success: true });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.listen(PORT, () => {
    console.log(`************************************`);
    console.log(`WHEEL ADVENTURE LIVE ON PORT ${PORT}`);
    console.log(`************************************`);
    sendDiscord("✅ **SYSTEM RESTART:** The Aligarh Hub server is now monitoring for bookings.");
});