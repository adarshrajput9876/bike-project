const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https'); 
const app = express();

const PORT = process.env.PORT || 3000;
const ADMIN_PIN = "1234";

// --- TELEGRAM CONFIG (REPLACE WITH YOUR REAL DETAILS) ---
const TG_TOKEN = "PASTE_YOUR_BOT_TOKEN_HERE"; 
const TG_CHAT_ID = "PASTE_YOUR_CHAT_ID_HERE";

// Robust Telegram Function
function sendTelegram(message) {
    if (TG_TOKEN.includes("PASTE")) return; // Don't run if still using placeholders
    const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage?chat_id=${TG_CHAT_ID}&text=${encodeURIComponent(message)}&parse_mode=HTML`;
    https.get(url, (res) => {}).on('error', (e) => console.error('Telegram Error:', e));
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const BIKES_FILE = path.join(__dirname, 'bikes.json');

// Helper to read data safely
const getFleet = () => {
    try {
        if (!fs.existsSync(BIKES_FILE)) {
            console.error("CRITICAL: bikes.json is missing from the folder!");
            return [];
        }
        return JSON.parse(fs.readFileSync(BIKES_FILE, 'utf8'));
    } catch (err) {
        console.error("Error reading bikes.json:", err);
        return [];
    }
};

const saveFleet = (data) => fs.writeFileSync(BIKES_FILE, JSON.stringify(data, null, 2));

// --- ROUTES ---

// 1. Send bike data to frontend
app.get('/api/bikes', (req, res) => {
    const fleet = getFleet();
    res.json(fleet); 
});

// 2. Booking Logic
app.post('/api/book', (req, res) => {
    const { bikeName } = req.body;
    let fleet = getFleet();
    const bike = fleet.find(b => b.name === bikeName);

    if (bike && (bike.stock - bike.rented) > 0) {
        bike.rented = (bike.rented || 0) + 1;
        saveFleet(fleet);
        sendTelegram(`🚀 <b>New Booking!</b>\n\n<b>Bike:</b> ${bikeName}\n<b>Hub:</b> Aligarh`);
        return res.json({ success: true });
    }
    res.status(400).json({ success: false });
});

// Admin routes
app.post('/api/admin/reset', (req, res) => {
    const { pin, bikeId, resetAll } = req.body;
    if (pin !== ADMIN_PIN) return res.status(401).json({ success: false });
    let fleet = getFleet();
    if (resetAll) fleet.forEach(b => b.rented = 0);
    else { const bike = fleet.find(b => b.id === bikeId); if (bike) bike.rented = 0; }
    saveFleet(fleet);
    res.json({ success: true, message: "Inventory Updated!" });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.listen(PORT, () => console.log(`Wheel Adventure running on ${PORT}`));