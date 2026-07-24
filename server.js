const express = require('express');
const cors = require('cors');
const axios = require('axios');
const db = require('./database/db');
require('dotenv').config();

const app = express();
const port = 8080;

app.use(cors({
    origin: '*', // Allow all origins for development (or specify 'http://localhost:8081')
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Mock Data (Static)
const staticOutbreaks = [
    {
        disease: 'Dengue',
        location: 'Bangalore',
        riskLevel: 'High',
        cases: 120,
        latitude: 12.9716,
        longitude: 77.5946,
        source: 'Static'
    },
    {
        disease: 'Flu',
        location: 'Delhi',
        riskLevel: 'Medium',
        cases: 60,
        latitude: 28.7041,
        longitude: 77.1025,
        source: 'Static'
    },
    {
        disease: 'Malaria',
        location: 'Mumbai',
        riskLevel: 'Low',
        cases: 30,
        latitude: 19.0760,
        longitude: 72.8777,
        source: 'Static'
    }
];

const alerts = [
    {
        id: 1,
        title: 'High Risk Alert: Dengue in Bangalore',
        severity: 'high',
        message: 'Dengue cases have crossed 100 in Bangalore. Immediate action required.'
    },
    {
        id: 2,
        title: 'Medium Risk Alert: Flu in Delhi',
        severity: 'medium',
        message: 'Flu cases are rising in Delhi. Monitoring advised.'
    }
];

// NLP Module Constants
const diseaseKeywords = ['dengue', 'malaria', 'flu', 'covid', 'cholera', 'viral fever', 'infection'];
const locations = {
    'Bangalore': { latitude: 12.9716, longitude: 77.5946 },
    'Delhi': { latitude: 28.7041, longitude: 77.1025 },
    'Mumbai': { latitude: 19.0760, longitude: 72.8777 }
};

// Dynamic Geocoding using Nominatim
async function getCoordinates(locationName) {
    if (locations[locationName]) return locations[locationName];
    
    console.log(`[${new Date().toLocaleTimeString()}] Geocoding: ${locationName}`);
    try {
        const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
            params: { q: locationName, format: 'json', limit: 1 },
            headers: { 'User-Agent': 'HealthHorizon/1.0' }
        });
        
        if (response.data && response.data.length > 0) {
            const result = {
                latitude: parseFloat(response.data[0].lat),
                longitude: parseFloat(response.data[0].lon)
            };
            // Cache locally for this session
            locations[locationName] = result;
            return result;
        }
    } catch (err) {
        console.error(`Geocoding failed for ${locationName}:`, err.message);
    }
    return null;
}

// 6. Prevent Duplicate Entries & Save Logic (SQLite Migration)
async function saveOrUpdateOutbreak(data) {
    console.log(`[${new Date().toLocaleTimeString()}] Processing signal for SQLite: ${data.title}`);
    
    // Map riskLevel to numeric score if not provided
    let riskScore = data.risk_score;
    if (riskScore === undefined) {
        if (data.riskLevel === 'High') riskScore = 85;
        else if (data.riskLevel === 'Medium') riskScore = 55;
        else riskScore = 25;
    }

    const normalizedTitle = (data.title || '').trim();

    return new Promise((resolve, reject) => {
        // 1. Check for duplicate title
        db.get("SELECT id FROM health_signals WHERE title = ?", [normalizedTitle], (err, row) => {
            if (err) {
                console.error("Deduplication check error:", err);
                return resolve(null);
            }
            
            if (row) {
                console.log(`[${new Date().toLocaleTimeString()}] Duplicate skipped: ${data.title}`);
                return resolve(null);
            }

            // 2. Insert new record
            const query = `
                INSERT INTO health_signals (
                    timestamp, source, title, description, detected_disease, location, latitude, longitude, risk_score
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const params = [
                new Date().toISOString(),
                data.source || 'Unknown',
                data.title || 'No Title',
                data.description || data.message || '',
                data.disease || 'Unknown',
                data.location || 'Unknown',
                data.latitude || 0,
                data.longitude || 0,
                riskScore
            ];

            db.run(query, params, function(err) {
                if (err) {
                    console.error("SQLite Insertion error:", err);
                    return resolve(null);
                }
                console.log(`[${new Date().toLocaleTimeString()}] Saved to SQLite ID ${this.lastID}: ${data.title}`);
                resolve({ id: this.lastID, ...data });
            });
        });
    });
}

// NLP Detection Module
const DISEASE_VARIANTS = {
    "Dengue": ["dengue", "dengue fever"],
    "Cholera": ["cholera"],
    "Influenza": ["influenza", "flu", "viral fever"],
    "COVID": ["covid", "covid-19", "coronavirus"],
    "Malaria": ["malaria"],
    "Ebola": ["ebola"],
    "Tuberculosis": ["tuberculosis", "tb"],
    "Mpox": ["mpox", "monkeypox"]
};

async function detectDiseaseSignals(text) {
    if (!text) return null;
    const lowercaseText = text.toLowerCase();
    
    // Disease extraction with frequency logic across variants
    const counts = {};
    for (const [disease, variants] of Object.entries(DISEASE_VARIANTS)) {
        let totalCount = 0;
        variants.forEach(variant => {
            const regex = new RegExp(variant.toLowerCase(), 'g');
            totalCount += (lowercaseText.match(regex) || []).length;
        });
        if (totalCount > 0) {
            counts[disease] = totalCount;
        }
    }

    let detectedDisease = "Unknown";
    if (Object.keys(counts).length > 0) {
        detectedDisease = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }

    // Location extraction
    const detectedLocationName = Object.keys(locations).find(loc => lowercaseText.includes(loc.toLowerCase()));

    if (detectedLocationName) {
        const coords = await getCoordinates(detectedLocationName);
        if (!coords) return null;

        const cases = Math.floor(Math.random() * (150 - 20 + 1)) + 20;
        let riskLevel = 'Low';
        if (cases > 100) riskLevel = 'High';
        else if (cases > 50) riskLevel = 'Medium';

        return {
            disease: detectedDisease,
            location: detectedLocationName,
            riskLevel: riskLevel,
            cases: cases,
            latitude: coords.latitude,
            longitude: coords.longitude
        };
    }
    return null;
}

// 2. News Data Collector
const NEWS_API_KEY = process.env.NEWS_API_KEY; 

async function fetchNewsSignals() {
    if (!NEWS_API_KEY) {
        console.error(`[${new Date().toLocaleTimeString()}] Error: NEWS_API_KEY not found in environment.`);
        return;
    }
    console.log(`[${new Date().toLocaleTimeString()}] Fetching News signals...`);
    try {
        const response = await axios.get(`https://newsapi.org/v2/everything?q=disease OR outbreak&apiKey=${NEWS_API_KEY}`);
        const articles = response.data.articles || [];

        for (const article of articles) {
            const combinedText = `${article.title} ${article.description}`;
            const outbreakData = await detectDiseaseSignals(combinedText);
            if (outbreakData) {
                await saveOrUpdateOutbreak({ 
                    ...outbreakData, 
                    title: article.title,
                    description: article.description,
                    source: 'NewsAPI', 
                    link: article.url 
                });
            }
        }
    } catch (error) {
        console.error('Error fetching News signals:', error.message);
    }
}

// 3. Social Media Data Collector (Reddit)
async function fetchSocialSignals() {
    console.log(`[${new Date().toLocaleTimeString()}] Fetching Reddit signals...`);
    try {
        const response = await axios.get('https://www.reddit.com/search.json?q=disease');
        const posts = response.data.data.children || [];

        for (const post of posts) {
            const title = post.data.title;
            const description = post.data.selftext || "";
            const outbreakData = await detectDiseaseSignals(`${title} ${description}`);
            if (outbreakData) {
                await saveOrUpdateOutbreak({ 
                    ...outbreakData, 
                    title: title,
                    description: description,
                    source: 'Reddit', 
                    link: `https://reddit.com${post.data.permalink}` 
                });
            }
        }
        console.log(`[${new Date().toLocaleTimeString()}] Reddit fetch cycle complete.`);
    } catch (error) {
        console.error('Error fetching Reddit signals:', error.message);
    }
}

// Initial Data Fetch
fetchNewsSignals();
fetchSocialSignals();

// 6. Schedule Data Updates
setInterval(fetchNewsSignals, 300000); // 5 minutes
setInterval(fetchSocialSignals, 180000); // 3 minutes

// --- Analytics & Predictions Logic ---

async function calculateDiseaseTrends() {
    console.log(`[${new Date().toLocaleTimeString()}] Calculating disease trends from SQLite...`);
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                detected_disease as disease,
                COUNT(*) as totalReports,
                AVG(risk_score) as averageRisk,
                MAX(timestamp) as latestReport
            FROM health_signals
            GROUP BY detected_disease
        `;
        
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Error calculating disease trends:', err);
                return resolve([]);
            }
            
            const trends = rows.map(row => ({
                disease: row.disease,
                totalReports: row.totalReports,
                totalCases: Math.round(row.averageRisk * 10), // Legacy mapping for UI
                averageCases: Math.round(row.averageRisk * 5), // Legacy mapping for UI
                trend: row.totalReports > 5 ? "increasing" : "stable"
            }));
            resolve(trends);
        });
    });
}

async function predictOutbreakRisk() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                detected_disease as disease,
                location,
                COUNT(*) as reports,
                MAX(risk_score) as maxRisk
            FROM health_signals
            WHERE timestamp >= ?
            GROUP BY detected_disease, location
        `;

        db.all(query, [twentyFourHoursAgo], (err, rows) => {
            if (err) {
                console.error('Error generating predictions:', err);
                return resolve([]);
            }

            const predictions = rows.map(row => {
                // Score based on report count and risk density
                let score = (row.reports * 15) + (row.maxRisk * 8);
                score = Math.min(Math.round(score), 100);

                return {
                    disease: row.disease,
                    location: row.location,
                    riskProbability: score
                };
            });
            resolve(predictions);
        });
    });
}

let cachedAnalytics = [];

async function updateAnalytics() {
    console.log(`[${new Date().toLocaleTimeString()}] Periodic analytics update triggered...`);
    calculateDiseaseTrends().then(data => {
        cachedAnalytics = data;
    });
}

// Initial calculation
updateAnalytics();

// 5. Schedule Trend Updates (10 minutes)
setInterval(updateAnalytics, 600000);

// API Endpoints
// 3. GET /api/analytics
app.get('/api/analytics', (req, res) => {
    res.json({ diseases: cachedAnalytics });
});

// 4. GET /api/predictions
app.get('/api/predictions', async (req, res) => {
    const predictions = await predictOutbreakRisk();
    res.json(predictions);
});

// 5. Update API Endpoint (Fetch from SQLite)
app.get('/api/outbreaks', async (req, res) => {
    const query = "SELECT * FROM health_signals ORDER BY timestamp DESC LIMIT 200";
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("SQLite error fetching outbreaks:", err.message);
            return res.status(500).json({ error: 'Failed to fetch outbreaks' });
        }
        
        // Map SQLite fields to match legacy UI expectations
        const dbRecords = rows.map(row => ({
            ...row,
            disease: row.detected_disease,
            cases: row.risk_score,
            riskLevel: row.risk_score > 75 ? 'High' : (row.risk_score > 40 ? 'Medium' : 'Low')
        }));

        const mergedOutbreaks = [
            ...staticOutbreaks,
            ...dbRecords
        ];
        res.json(mergedOutbreaks);
    });
});

// 4. Hospital Report Upload Endpoint
app.post('/api/hospital-report', async (req, res) => {
    const { hospital, location, disease, cases } = req.body;

    if (!location || !disease || cases === undefined) {
        return res.status(400).json({ error: 'Missing required fields: location, disease, cases' });
    }

    const locationData = locations[location];
    if (!locationData) {
        return res.status(400).json({ error: 'Unsupported location' });
    }

    // Map cases to risk score (simple 1:1 or scaled)
    const riskScore = Math.min(parseInt(cases), 100);

    const reportData = {
        title: `Hospital Report: ${disease} found in ${location}`,
        description: `Official report from ${hospital || 'Local Hospital'}. Current case count: ${cases}.`,
        disease: disease,
        location: location,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        source: 'Hospital',
        risk_score: riskScore
    };

    const saved = await saveOrUpdateOutbreak(reportData);
    if (saved) {
        res.status(201).json({ message: 'Report submitted successfully', signal: saved });
    } else {
        res.status(500).json({ error: 'Failed to save hospital report' });
    }
});

app.get('/api/alerts', (req, res) => {
    res.json(alerts);
});

// Initial calculation
updateAnalytics();

// 5. Schedule Trend Updates (10 minutes)
setInterval(updateAnalytics, 600000);

// API Endpoints
app.get("/api/signals", async (req, res) => {
    console.log("Internal API call: GET /api/signals");
    
    db.all("SELECT * FROM health_signals ORDER BY timestamp DESC", [], (err, rows) => {
        if (err) {
            console.error("SQLite error:", err.message);
            res.status(500).json({error: err.message});
            return;
        }
        res.json(rows);
    });
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});
