const express = require('express');
const https = require('https'); 
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer'); 
const app = express();

const PORT = process.env.PORT || 3000;
const DISCORD_URL = "https://discord.com/api/webhooks/1486393518623690903/_ZxGaOR9yc63ECcOBZVkqznkIyxnBYyZEowlyNGV1dHcw2rMDyP2QI5juQXGpJIHaXFe";

const upload = multer({ dest: 'uploads/' }); 
const BIKES_FILE = path.join(__dirname, 'bikes.json');
const HISTORY_FILE = path.join(__dirname, 'history.json');
const USERS_FILE = path.join(__dirname, 'users.json');

if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

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
app.use('/uploads', express.static('uploads'));

// --- USER AUTHENTICATION ---
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

// --- BOOKING LOGIC ---
app.get('/api/bikes', (req, res) => res.json(JSON.parse(fs.readFileSync(BIKES_FILE))));

app.post('/api/book', upload.single('screenshot'), (req, res) => {
    const { bikeName, customerName, phone, days, transactionId } = req.body;
    let fleet = JSON.parse(fs.readFileSync(BIKES_FILE));
    let history = JSON.parse(fs.readFileSync(HISTORY_FILE));
    const bike = fleet.find(b => b.name === bikeName);

    if (bike && (bike.stock - bike.rented) > 0) {
        bike.rented += 1;
        const total = (bike.price + 50) * days;
        const deposit = (total * 0.20).toFixed(2);
        history.push({ 
            id: Date.now(), bikeName, customerName, phone, days, 
            totalPrice: total, depositPaid: deposit, transactionId, 
            proofImage: req.file ? req.file.filename : null,
            status: "Auto-Verified", date: new Date().toLocaleString() 
        });
        fs.writeFileSync(BIKES_FILE, JSON.stringify(fleet, null, 2));
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
        sendDiscord(`✅ **AUTO-VERIFIED:** ${customerName}\n**UTR:** ${transactionId}\n**Deposit:** ₹${deposit}\n**Vehicle:** ${bikeName}`);
        res.json({ success: true });
    } else res.status(400).json({ success: false });
});

// --- ADMIN API ---
app.get('/api/admin/history', (req, res) => res.json(JSON.parse(fs.readFileSync(HISTORY_FILE))));
app.delete('/api/admin/history/:id', (req, res) => {
    let h = JSON.parse(fs.readFileSync(HISTORY_FILE)).filter(x => x.id !== parseInt(req.params.id));
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(h, null, 2));
    res.json({ success: true });
});
app.post('/api/admin/reset-bike', (req, res) => {
    const { bikeId } = req.body;
    let fleet = JSON.parse(fs.readFileSync(BIKES_FILE));
    const bike = fleet.find(b => b.id === bikeId);
    if (bike) { bike.rented = 0; fs.writeFileSync(BIKES_FILE, JSON.stringify(fleet, null, 2)); res.json({ success: true }); }
});

app.listen(PORT, () => console.log(`Wheel Adventure Engine Live on ${PORT}`));