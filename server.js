const express = require('express');
const https = require('https'); 
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3000;

// --- YOUR VERIFIED DISCORD WEBHOOK ---
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
            'Content-Length': Buffer.byteLength(data), // Fixes the Status 400 Error
        },
    };

    const req = https.request(options, (res) => {
        console.log(`>>> Discord Sync Status: ${res.statusCode}`);
    });

    req.on('error', (e) => console.error(">>> Discord Connection Fail:", e.message));
    req.write(data);
    req.end();
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const BIKES_FILE = path.join(__dirname, 'bikes.json');

// Booking API
app.post('/api/book', (req, res) => {
    const { bikeName } = req.body;
    console.log(`>>> New Booking Request: ${bikeName}`);

    try {
        const fleet = JSON.parse(fs.readFileSync(BIKES_FILE, 'utf8'));
        const bike = fleet.find(b => b.name.trim().toLowerCase() === bikeName.trim().toLowerCase());

        if (bike && (bike.stock - bike.rented) > 0) {
            bike.rented += 1;
            fs.writeFileSync(BIKES_FILE, JSON.stringify(fleet, null, 2));

            // Send notification to your Discord server
            sendDiscord(`🚀 **WHEEL ADVENTURE: NEW BOOKING!**\n\n**Vehicle:** ${bike.name}\n**Location:** Aligarh Hub\n*Action:* Prepare for pickup.`);

            return res.json({ success: true });
        }
        res.status(400).json({ success: false, message: "Bike unavailable" });
    } catch (err) {
        console.error(">>> Server Error:", err);
        res.status(500).json({ success: false });
    }
});

// Inventory API
app.get('/api/bikes', (req, res) => {
    res.json(JSON.parse(fs.readFileSync(BIKES_FILE, 'utf8')));
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => {
    console.log(`>>> WHEEL ADVENTURE ONLINE: PORT ${PORT}`);
    // Initial test message to your Discord
    sendDiscord("✅ **SYSTEM ONLINE:** Wheel Adventure Server has successfully connected to Discord.");
});