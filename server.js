const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https'); 
const app = express();

const PORT = process.env.PORT || 3000;

// --- VERIFIED CREDENTIALS ---
const TG_TOKEN = "8616007843:AAE1Q_LJ-ELpvhZLHDBdYvuAxbBJu_T5Hi4"; 
const TG_CHAT_ID = "5598413859";

// Robust Notification Function with extra logging
function sendTelegram(message) {
    console.log("Attempting to send Telegram message...");
    const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage?chat_id=${TG_CHAT_ID}&text=${encodeURIComponent(message)}&parse_mode=HTML`;
    
    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log("Telegram API Response:", data); // THIS WILL SHOW THE ERROR IN RENDER LOGS
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

// --- THE CRITICAL BOOKING ROUTE ---
app.post('/api/book', (req, res) => {
    const { bikeName } = req.body;
    console.log(`Booking request received for: ${bikeName}`); // Check if this shows in logs!

    let fleet = getFleet();
    const bike = fleet.find(b => b.name === bikeName);

    if (bike && (bike.stock - bike.rented) > 0) {
        bike.rented = (bike.rented || 0) + 1;
        saveFleet(fleet);

        // TRIGGER NOTIFICATION
        console.log(`Found ${bikeName} in inventory. Sending notification...`);
        sendTelegram(`🚀 <b>WHEEL ADVENTURE: NEW BOOKING!</b>\n\nBike: <b>${bikeName}</b>\n📍 Hub: Aligarh`);

        return res.json({ success: true });
    } else {
        console.log(`Booking failed: ${bikeName} not found or out of stock.`);
        res.status(400).json({ success: false });
    }
});

app.get('/api/bikes', (req, res) => res.json(getFleet()));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.listen(PORT, () => console.log(`Wheel Adventure Engine Started on Port ${PORT}`));