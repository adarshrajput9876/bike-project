const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https'); // Native Node.js https module
const app = express();

const PORT = process.env.PORT || 3000;
const ADMIN_PIN = "1234";

// --- TELEGRAM CONFIGURATION ---
const TG_TOKEN = "8616007843:AAE1Q_LJ-ELpvhZLHDBdYvuAxbBJu_T5Hi4";
const TG_CHAT_ID = "5598413859";

function sendTelegram(message) {
    const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage?chat_id=${TG_CHAT_ID}&text=${encodeURIComponent(message)}&parse_mode=HTML`;
    
    https.get(url, (res) => {
        console.log('Telegram Notification Sent Status:', res.statusCode);
    }).on('error', (e) => {
        console.error('Telegram Error:', e);
    });
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const BIKES_FILE = path.join(__dirname, 'bikes.json');
const getFleet = () => JSON.parse(fs.readFileSync(BIKES_FILE, 'utf8'));
const saveFleet = (data) => fs.writeFileSync(BIKES_FILE, JSON.stringify(data, null, 2));

// --- BOOKING ROUTE WITH NOTIFICATION ---
app.post('/api/book', (req, res) => {
    const { bikeName } = req.body;
    let fleet = getFleet();
    const bike = fleet.find(b => b.name === bikeName);

    if (bike && (bike.stock - bike.rented) > 0) {
        bike.rented = (bike.rented || 0) + 1;
        saveFleet(fleet);

        // SEND CHATBOT NOTIFICATION
        const alertMsg = `🚀 <b>New Booking!</b>\n\n<b>Bike:</b> ${bikeName}\n<b>Status:</b> Confirmed\n\nCheck the Admin Panel to prepare the vehicle for pickup.`;
        sendTelegram(alertMsg);

        return res.json({ success: true });
    }
    res.status(400).json({ success: false });
});

// Admin and Static Routes...
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.post('/api/admin/reset', (req, res) => { /* same as before */ });

app.listen(PORT, () => console.log(`Wheel Adventure Live with Chatbot Notifications`));