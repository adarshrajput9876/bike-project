const express = require('express');
const https = require('https'); 
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3000;
const DISCORD_URL = "https://discord.com/api/webhooks/1486393518623690903/_ZxGaOR9yc63ECcOBZVkqznkIyxnBYyZEowlyNGV1dHcw2rMDyP2QI5juQXGpJIHaXFe";

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
app.use(express.static(__dirname));

const BIKES_FILE = path.join(__dirname, 'bikes.json');
const HISTORY_FILE = path.join(__dirname, 'history.json');

if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));

app.get('/api/bikes', (req, res) => res.json(JSON.parse(fs.readFileSync(BIKES_FILE))));

app.post('/api/book', (req, res) => {
    const { bikeName, customerName, phone, days } = req.body;
    let fleet = JSON.parse(fs.readFileSync(BIKES_FILE));
    let history = JSON.parse(fs.readFileSync(HISTORY_FILE));
    
    const bike = fleet.find(b => b.name === bikeName);
    if (bike && (bike.stock - bike.rented) > 0) {
        bike.rented += 1;
        const total = (bike.price + 50) * days;
        const newBooking = {
            id: Date.now(), bikeName, customerName, phone, days,
            totalPrice: total, status: "Reserved (Pending)", date: new Date().toLocaleString()
        };
        history.push(newBooking);
        fs.writeFileSync(BIKES_FILE, JSON.stringify(fleet, null, 2));
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
        sendDiscord(`🚀 **NEW BOOKING**\n**Customer:** ${customerName}\n**Bike:** ${bikeName}\n**Phone:** ${phone}`);
        return res.json({ success: true });
    }
    res.status(400).json({ success: false, message: "Not Available" });
});

app.get('/api/admin/history', (req, res) => res.json(JSON.parse(fs.readFileSync(HISTORY_FILE))));

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`Wheel Adventure running on ${PORT}`));