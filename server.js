const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;
const ADMIN_PIN = "1234"; // Change this to your secret PIN

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const BIKES_FILE = path.join(__dirname, 'bikes.json');

const getFleet = () => JSON.parse(fs.readFileSync(BIKES_FILE, 'utf8'));
const saveFleet = (data) => fs.writeFileSync(BIKES_FILE, JSON.stringify(data, null, 2));

// --- EXISTING ROUTES ---
app.get('/api/bikes', (req, res) => res.json(getFleet()));

app.post('/api/book', (req, res) => {
    const { bikeName } = req.body;
    let fleet = getFleet();
    const bike = fleet.find(b => b.name === bikeName);
    if (bike && (bike.stock - bike.rented) > 0) {
        bike.rented = (bike.rented || 0) + 1;
        saveFleet(fleet);
        return res.json({ success: true });
    }
    res.status(400).json({ success: false });
});

// --- NEW ADMIN ROUTE ---
app.post('/api/admin/reset', (req, res) => {
    const { pin, bikeId, resetAll } = req.body;

    if (pin !== ADMIN_PIN) {
        return res.status(401).json({ success: false, message: "Wrong PIN!" });
    }

    let fleet = getFleet();

    if (resetAll) {
        fleet.forEach(b => b.rented = 0);
    } else {
        const bike = fleet.find(b => b.id === bikeId);
        if (bike) bike.rented = 0;
    }

    saveFleet(fleet);
    res.json({ success: true, message: "Inventory Updated!" });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
// Route for the admin page
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.listen(PORT, () => console.log(`Admin Panel active on port ${PORT}`));