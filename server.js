const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https'); 
const app = express();

const PORT = process.env.PORT || 3000;

// VERIFIED CREDENTIALS
const TG_TOKEN = "8616007843:AAE1Q_LJ-ELpvhZLHDBdYvuAxbBJu_T5Hi4"; 
const TG_CHAT_ID = "5598413859";

function sendTelegram(message) {
    const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage?chat_id=${TG_CHAT_ID}&text=${encodeURIComponent(message)}&parse_mode=HTML`;
    https.get(url, (res) => {
        console.log(">>> TELEGRAM API CALLED. STATUS:", res.statusCode);
    });
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// LOG EVERY REQUEST
app.use((req, res, next) => {
    console.log(`>>> NEW REQUEST: ${req.method} ${req.url}`);
    next();
});

const BIKES_FILE = path.join(__dirname, 'bikes.json');

app.post('/api/book', (req, res) => {
    const { bikeName } = req.body;
    console.log(">>> BOOKING TRIGGERED FOR:", bikeName);
    
    // We send 200 immediately to verify connection
    sendTelegram(`🚀 <b>ALIGARH HUB:</b> Someone clicked book for ${bikeName}`);
    res.status(200).json({ success: true, debug: "Server received request" });
});

app.get('/api/bikes', (req, res) => {
    const data = JSON.parse(fs.readFileSync(BIKES_FILE, 'utf8'));
    res.json(data);
});

app.listen(PORT, () => {
    console.log("*****************************************");
    console.log(`WHEEL ADVENTURE DEPLOYED ON PORT ${PORT}`);
    console.log("*****************************************");
});

// HEARTBEAT LOG: Every 30 seconds, print to logs so we know they work
setInterval(() => {
    console.log(">>> SERVER HEARTBEAT: I am still alive and waiting for bookings...");
}, 30000);