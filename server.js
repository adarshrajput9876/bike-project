const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https'); 
const app = express();

const PORT = process.env.PORT || 3000;
const ADMIN_PIN = "1234";

// TELEGRAM CREDENTIALS
const TG_TOKEN = "8616007843:AAE1Q_LJ-ELpvhZLHDBdYvuAxbBJu_T5Hi4"; 
const TG_CHAT_ID = "5598413859";

function sendTelegram(message) {
    const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage?chat_id=${TG_CHAT_ID}&text=${encodeURIComponent(message)}&parse_mode=HTML`;
    https.get(url, (res) => {}).on('error', (e) => console.error(e));
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const BIKES_FILE = path.join(__dirname, 'bikes.json');
const getFleet = () => JSON.parse(fs.readFileSync(BIKES_FILE, 'utf8'));
const saveFleet = (data) => fs.writeFileSync(BIKES_FILE, JSON.stringify(data, null, 2));

app.get('/api/bikes', (req, res) => res.json(getFleet()));

app.post('/api/book', (req, res) => {
    const { bikeName } = req.body;
    let fleet = getFleet();
    const bike = fleet.find(b => b.name === bikeName);
    if (bike && (bike.stock - bike.rented) > 0) {
        bike.rented = (bike.rented || 0) + 1;
        saveFleet(fleet);
        sendTelegram(`🚀 <b>WHEEL ADVENTURE ALERT</b>\n\nSomeone just booked a <b>${bikeName}</b>!`);
        return res.json({ success: true });
    }
    res.status(400).json({ success: false });
});

app.post('/api/admin/reset', (req, res) => {
    const { pin, bikeId, resetAll } = req.body;
    if (pin !== ADMIN_PIN) return res.status(401).json({ success: false });
    let fleet = getFleet();
    if (resetAll) fleet.forEach(b => b.rented = 0);
    else { const bike = fleet.find(b => b.id === bikeId); if (bike) bike.rented = 0; }
    saveFleet(fleet);
    res.json({ success: true });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.listen(PORT, () => console.log(`Wheel Adventure Live on ${PORT}`));