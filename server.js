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

// Ensure history file exists
if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));

// --- ROUTES ---

// 1. Get Inventory
app.get('/api/bikes', (req, res) => res.json(JSON.parse(fs.readFileSync(BIKES_FILE))));

// 2. Process Booking
app.post('/api/book', (req, res) => {
    const { bikeName, customerName, phone, days } = req.body;
    let fleet = JSON.parse(fs.readFileSync(BIKES_FILE));
    let history = JSON.parse(fs.readFileSync(HISTORY_FILE));
    
    const bike = fleet.find(b => b.name === bikeName);
    if (bike && (bike.stock - bike.rented) > 0) {
        bike.rented += 1;
        
        const total = (bike.price + 50) * days; // Rent + Helmet
        const newBooking = {
            id: Date.now(),
            bikeName, customerName, phone, days,
            totalPrice: total,
            status: "Reserved (Pending Pickup)",
            date: new Date().toLocaleString()
        };
        
        history.push(newBooking);
        fs.writeFileSync(BIKES_FILE, JSON.stringify(fleet, null, 2));
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

        sendDiscord(`🚀 **NEW BOOKING**\n**Customer:** ${customerName}\n**Bike:** ${bikeName}\n**Total:** ₹${total}\n**Hub:** Aligarh`);
        return res.json({ success: true });
    }
    res.status(400).json({ success: false });
});

// 3. Admin: Get History
app.get('/api/admin/history', (req, res) => res.json(JSON.parse(fs.readFileSync(HISTORY_FILE))));

// 4. Admin: Update Status (Handover/Return)
app.post('/api/admin/update', (req, res) => {
    const { id, status } = req.body;
    let history = JSON.parse(fs.readFileSync(HISTORY_FILE));
    let fleet = JSON.parse(fs.readFileSync(BIKES_FILE));
    
    const booking = history.find(h => h.id === id);
    if (booking) {
        if (status === "Returned") {
            const bike = fleet.find(b => b.name === booking.bikeName);
            if (bike) bike.rented = Math.max(0, bike.rented - 1);
            booking.status = "Completed (Returned)";
        } else {
            booking.status = status;
        }
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
        fs.writeFileSync(BIKES_FILE, JSON.stringify(fleet, null, 2));
        res.json({ success: true });
    } else res.status(404).json({ success: false });
});

// --- PAGE ROUTING (The fix for "Cannot GET") ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.listen(PORT, () => console.log(`Server LIVE on ${PORT}`));