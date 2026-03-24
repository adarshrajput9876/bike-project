const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

// Render.com uses a dynamic port, so we use process.env.PORT
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serves your index.html and all images (scooter_1.jpg, etc.)
app.use(express.static(__dirname));

const BIKES_FILE = path.join(__dirname, 'bikes.json');

// --- Inventory Helper Functions ---
const getFleetData = () => {
    try {
        const data = fs.readFileSync(BIKES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Critical Error: bikes.json not found!");
        return [];
    }
};

const saveFleetData = (data) => {
    try {
        fs.writeFileSync(BIKES_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error saving inventory:", err);
    }
};

// --- API ROUTES ---

// Get all bikes for the frontend
app.get('/api/bikes', (req, res) => {
    res.json(getFleetData());
});

// Handle a new reservation
app.post('/api/book', (req, res) => {
    const { bikeName } = req.body;
    let fleet = getFleetData();
    
    const bike = fleet.find(b => b.name === bikeName);

    if (bike) {
        const stock = bike.stock || 0;
        const rented = bike.rented || 0;
        
        if (stock - rented > 0) {
            bike.rented = rented + 1;
            saveFleetData(fleet);
            return res.json({ success: true, message: "Booking confirmed!" });
        } else {
            return res.status(400).json({ success: false, message: "Sold out!" });
        }
    }
    res.status(404).json({ success: false, message: "Bike model not found." });
});

// Serve the main website for the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🚀 Two Wheel Adventure is active!`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Inventory tracking enabled for all 13 models.\n`);
});