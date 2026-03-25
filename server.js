const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https'); 
const app = express();

const PORT = process.env.PORT || 3000;

const TG_TOKEN = "8616007843:AAE1Q_LJ-ELpvhZLHDBdYvuAxbBJu_T5Hi4"; 
const TG_CHAT_ID = "5598413859";

// Robust Notification Function
function sendTelegram(message) {
    const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage?chat_id=${TG_CHAT_ID}&text=${encodeURIComponent(message)}&parse_mode=HTML`;
    
    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log("Telegram API Status:", res.statusCode, data);
        });
    }).on('error', (e) => {
        console.error('Telegram Connection Error:', e.message);
    });
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const BIKES_FILE = path.join(__dirname, 'bikes.json');
const getFleet = () => JSON.parse(fs.readFileSync(BIKES_FILE, 'utf8'));
const saveFleet = (data) => fs.writeFileSync(BIKES_FILE, JSON.stringify(data, null, 2));

// --- DIAGNOSTIC ROUTE (Test your bot instantly) ---
// Visit yoursite.com/api/test-bot in your browser
app.get('/api/test-bot', (req, res) => {
    sendTelegram("✅ Wheel Adventure Bot is linked to the Server successfully!");
    res.send("Check your Telegram! If you got a message, the connection is perfect.");
});

// --- UPDATED BOOKING ROUTE (Case Insensitive) ---
app.post('/api/book', (req, res) => {
    const { bikeName } = req.body;
    console.log(`Incoming request for: "${bikeName}"`);

    let fleet = getFleet();
    
    // Pro-Fix: Trim spaces and ignore Case Sensitivity
    const bike = fleet.find(b => b.name.trim().toLowerCase() === bikeName.trim().toLowerCase());

    if (bike && (bike.stock - bike.rented) > 0) {
        bike.rented = (bike.rented || 0) + 1;
        saveFleet(fleet);

        console.log(`Booking confirmed for ${bike.name}. Notifying Adarsh...`);
        sendTelegram(`🚀 <b>WHEEL ADVENTURE: NEW BOOKING!</b>\n\nBike: <b>${bike.name}</b>\n📍 Hub: Aligarh\nInventory updated.`);

        return res.json({ success: true });
    } else {
        console.log(`Failed: Bike "${bikeName}" not found or out of stock.`);
        res.status(400).json({ success: false, message: "Bike not found or unavailable" });
    }
});

app.get('/api/bikes', (req, res) => res.json(getFleet()));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.listen(PORT, () => console.log(`Wheel Adventure Engine Live on Port ${PORT}`));
