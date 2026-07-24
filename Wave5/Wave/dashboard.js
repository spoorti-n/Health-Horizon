// KPIs will be updated via updateOutbreaksUI


// --- 2. Populate AI Symptoms Feed (Left Panel) ---
const symptomsFeed = document.getElementById('symptoms-feed');
const liveDataFeed = document.getElementById('live-data-feed');

if (symptomsFeed) {
    // Dynamic alerts will populate this via generateAlerts()
}
if (liveDataFeed) {
    // Dynamic alerts will populate this
}

// --- 2.b Populate Top Diseases List (Dashboard Right Panel) ---
const topDiseasesList = document.getElementById('top-diseases-list');
if (topDiseasesList) {
    // This could be made dynamic in the future using apiData
}


// --- 3. Populate Outbreak Alerts (Right Panel) ---
const alertsFeed = document.getElementById('alerts-feed');
if (alertsFeed) {
    // Dynamic alerts will populate this
}

// --- Charts and Heatmaps removed from Dashboard per requirements ---

// --- API Fetch Logic ---
async function fetchOutbreakData() {
    try {
        const response = await fetch('http://localhost:8000/api/signals');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching outbreak data:', error);
        return [];
    }
}

async function fetchAnalytics() {
    try {
        const response = await fetch('http://localhost:8000/api/analytics');
        const data = await response.json();
        return data.diseases || [];
    } catch (error) {
        console.error('Error fetching analytics:', error);
        return [];
    }
}

async function fetchPredictions() {
    try {
        const response = await fetch('http://localhost:8000/api/predictions');
        const data = await response.json();
        return data || [];
    } catch (error) {
        console.error('Error fetching predictions:', error);
        return [];
    }
}

// --- 6. Outbreaks Page Specific Logic ---
let obMap;
let globalLeafletMap = null;
let trendChartInstance = null;
let srcChartInstance = null;
let riskChartInstance = null;
let severityChartInstance = null;

// Dashboard specific chart instances
let diseaseTrendChartInstance = null;
let predictionChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {

    async function updateOutbreaksUI() {
        let apiData = [];
        try { apiData = await fetchOutbreakData(); } catch (e) { }
        const hasData = apiData && apiData.length > 0;

        // --- Generate Dynamic Alerts ---
        generateAlerts(apiData);

        // Store globally for chart usage
        window.outbreakCaseCounts = hasData ? apiData.map(d => d.risk_score || 0) : null;
        window.outbreakDiseaseNames = hasData ? apiData.map(d => d.detected_disease || 'Unknown') : null;

        // --- Update KPI Stats ---
        if (hasData) {
            const kpiTotal = document.getElementById('kpi-total');
            const kpiRegions = document.getElementById('kpi-regions');
            const kpiHospitals = document.getElementById('kpi-hospitals');
            const kpiSocial = document.getElementById('kpi-social');
            const kpiMonitored = document.getElementById('kpi-monitored');
            const kpiActive = document.getElementById('kpi-active-outbreaks');
            const kpiAlerts = document.getElementById('kpi-alerts-today');
            const kpiSourcesCount = document.getElementById('kpi-sources');

            if (kpiTotal) kpiTotal.innerText = apiData.length.toLocaleString();

            const uniqueLocs = new Set(apiData.map(d => d.location)).size;
            if (kpiRegions) kpiRegions.innerText = uniqueLocs.toLocaleString();

            const hospitalCount = apiData.filter(d => d.source === 'Hospital').length;
            if (kpiHospitals) kpiHospitals.innerText = hospitalCount.toLocaleString();

            const socialCount = apiData.filter(d => ['NewsAPI', 'Reddit', 'Twitter'].includes(d.source)).length;
            if (kpiSocial) kpiSocial.innerText = socialCount.toLocaleString();

            const uniqueDiseases = new Set(apiData.map(d => d.detected_disease)).size;
            if (kpiMonitored) kpiMonitored.innerText = uniqueDiseases.toLocaleString();

            const activeOutbreaks = apiData.filter(d => (d.risk_score || 0) > 7).length;
            if (kpiActive) kpiActive.innerText = activeOutbreaks.toLocaleString();

            const today = new Date().toISOString().split('T')[0];
            const alertsToday = apiData.filter(d => d.timestamp && d.timestamp.startsWith(today)).length;
            if (kpiAlerts) kpiAlerts.innerText = alertsToday.toLocaleString();

            const sourceCount = new Set(apiData.map(d => d.source)).size;
            if (kpiSourcesCount) kpiSourcesCount.innerText = sourceCount.toLocaleString();
        }

        const outbreaksTableBody = document.querySelector('#outbreaks-table tbody');
        const obMapEl = document.getElementById('outbreaks-map');
        const globalLevelMapEl = document.getElementById('leaflet-map');
        const obTrendChartEl = document.getElementById('outbreakTrendChart');
        const srcBreakdownChartEl = document.getElementById('sourceBreakdownChart');

        if (outbreaksTableBody) {
            outbreaksTableBody.innerHTML = ''; // Clear existing table data
            // Populate Table
            const tableData = hasData ? apiData.map(d => ({
                title: d.title || 'Unknown',
                disease: d.detected_disease || 'Unknown',
                loc: d.location || 'Unknown',
                timestamp: d.timestamp ? new Date(d.timestamp).toLocaleString() : 'N/A',
                risk: d.risk_score || 0
            })) : [];

            tableData.forEach(row => {
                const riskClass = row.risk > 7 ? 'high' : row.risk > 4 ? 'medium' : 'low';
                const html = `
            <tr>
                <td style="font-weight: bold; color: #fff;">${row.title}</td>
                <td>${row.disease}</td>
                <td><i class="fa-solid fa-location-dot" style="opacity: 0.5;"></i> ${row.loc}</td>
                <td>${row.timestamp}</td>
                <td><span class="dt-risk ${riskClass}">${row.risk.toFixed(2)}</span></td>
            </tr>
        `;
                outbreaksTableBody.insertAdjacentHTML('beforeend', html);
            });
        }

        if (obMapEl && typeof L !== 'undefined') {
            // Initialize Outbreaks Interactive Map if not already created
            if (!obMap) {
                obMap = L.map('outbreaks-map').setView([20, 0], 2);
                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 18 }).addTo(obMap);
            } else {
                // Clear existing markers
                obMap.eachLayer(layer => {
                    if (layer instanceof L.CircleMarker) {
                        obMap.removeLayer(layer);
                    }
                });
            }

            // Add clickable regions/markers
            const locations = hasData ? apiData.map((d, i) => ({
                coords: (d.latitude && d.longitude) ? [d.latitude, d.longitude] : [20 + i, i * 2],
                name: d.location || 'Unknown',
                risk_score: d.risk_score || 0,
                disease: d.detected_disease || 'Unknown'
            })) : [];

            locations.forEach(loc => {
                const color = loc.risk_score > 7 ? '#ff2a5f' : loc.risk_score > 4 ? '#ffb700' : '#00ff88';
                const circle = L.circleMarker(loc.coords, {
                    radius: loc.risk_score > 7 ? 12 : 8,
                    fillColor: color,
                    color: color,
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.6
                }).addTo(obMap);

                circle.bindPopup(`
                    <div style="background: #0a0f1e; border: 1px solid ${color}; padding: 10px; border-radius: 8px; color: #fff; font-family: 'Outfit', sans-serif;">
                        <h4 style="margin: 0 0 5px 0; color: ${color};">${loc.name}</h4>
                        <div style="font-size: 12px; margin-bottom: 5px;">Risk Score: <b>${loc.risk_score.toFixed(1)}</b></div>
                        <div style="font-size: 12px; font-family: monospace;">Disease: ${loc.disease}</div>
                    </div>
                `, { closeButton: false, className: 'glass-popup' });
            });
        }

        // --- Global Map Page Dynamic Data ---
        if (globalLevelMapEl && typeof L !== 'undefined') {
            const indiaBounds = [
                [6.75, 68.1], // Southwest bound
                [35.5, 97.4]  // Northeast bound
            ];

            if (!globalLeafletMap) {
                globalLeafletMap = L.map('leaflet-map', {
                    zoomControl: true,
                    attributionControl: false,
                    maxBounds: indiaBounds,
                    maxBoundsViscosity: 1.0,
                    minZoom: 4
                }).setView([20.5937, 78.9629], 5);

                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
                    maxZoom: 18
                }).addTo(globalLeafletMap);
            } else {
                // Clear existing markers and heatlayers
                globalLeafletMap.eachLayer(layer => {
                    if (layer instanceof L.Marker || layer instanceof L.HeatLayer) {
                        globalLeafletMap.removeLayer(layer);
                    }
                });
            }

            if (hasData) {
                const heatPoints = [];
                apiData.forEach(d => {
                    if (d.latitude && d.longitude) {
                        const lat = d.latitude;
                        const lng = d.longitude;
                        // Use risk_score for intensity (assuming 0-10 range)
                        const intensity = Math.min((d.risk_score || 0) / 10, 1.0);
                        heatPoints.push([lat, lng, intensity]);

                        // Add pulse markers
                        const risk = d.risk_score || 0;
                        const type = risk > 7 ? 'critical' : risk > 4 ? 'warning' : 'info';
                        const icon = L.divIcon({ className: `pulse-marker pulse-${type}`, iconSize: [20, 20] });
                        L.marker([lat, lng], { icon: icon }).addTo(globalLeafletMap)
                            .bindPopup(`<b>${d.detected_disease || 'Unknown'}</b><br>${d.location || 'Unknown'} - Risk: ${risk.toFixed(1)}`);
                    }
                });

                if (typeof L.heatLayer === 'function' && heatPoints.length > 0) {
                    L.heatLayer(heatPoints, {
                        radius: 25,
                        blur: 25,
                        maxZoom: 8,
                        gradient: { 0.3: '#00ff88', 0.6: '#ffb700', 1.0: '#ff2a5f' }
                    }).addTo(globalLeafletMap);
                }
            }
        }

        if (obTrendChartEl && srcBreakdownChartEl) {
            const ctxTimeline = obTrendChartEl.getContext('2d');
            const ctxSrc = srcBreakdownChartEl.getContext('2d');
            const riskDistChartEl = document.getElementById('riskDistributionChart');

            if (document.getElementById('outbreakTrendChart')) {
                // 1. Outbreak Trend Graph (Chart.js line chart with dynamic data based on fetched results)
                const trendData = {
                    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
                    datasets: hasData ? window.outbreakDiseaseNames.slice(0, 3).map((name, i) => {
                        const cCount = window.outbreakCaseCounts[i] || 100;
                        const colors = ['#ff2a5f', '#00e5ff', '#ffb700'];
                        const bgColors = ['rgba(255, 42, 95, 0.1)', 'rgba(0, 229, 255, 0.1)', 'rgba(255, 183, 0, 0.1)'];
                        return {
                            label: name,
                            data: [
                                Math.floor(cCount * 0.2),
                                Math.floor(cCount * 0.35),
                                Math.floor(cCount * 0.5),
                                Math.floor(cCount * 0.65),
                                Math.floor(cCount * 0.8),
                                Math.floor(cCount * 0.95),
                                cCount
                            ],
                            borderColor: colors[i % colors.length],
                            backgroundColor: bgColors[i % bgColors.length],
                            borderWidth: 2, fill: false, tension: 0.4
                        };
                    }) : [
                        {
                            label: 'Dengue',
                            data: [45, 60, 85, 120, 190, 240, 310],
                            borderColor: '#ff2a5f',
                            backgroundColor: 'rgba(255, 42, 95, 0.1)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.4
                        },
                        {
                            label: 'Flu',
                            data: [200, 210, 205, 190, 185, 170, 150],
                            borderColor: '#00e5ff',
                            backgroundColor: 'rgba(0, 229, 255, 0.1)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.4
                        },
                        {
                            label: 'Malaria',
                            data: [100, 110, 115, 130, 150, 160, 180],
                            borderColor: '#ffb700',
                            backgroundColor: 'rgba(255, 183, 0, 0.1)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.4
                        }
                    ]
                };

                if (trendChartInstance) {
                    trendChartInstance.data = trendData;
                    trendChartInstance.update();
                } else {
                    trendChartInstance = new Chart(ctxTimeline, {
                        type: 'line',
                        data: trendData,
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'top', labels: { color: '#fff', font: { size: 10 } } }
                            },
                            scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }
                        }
                    });
                }
            }

            if (document.getElementById('sourceBreakdownChart')) {
                // Compute dynamic source distribution (example logic)
                let social = 45, news = 15, hosp = 30, pub = 10;
                if (hasData && window.outbreakCaseCounts.length > 0) {
                    const totalCases = window.outbreakCaseCounts.reduce((a, b) => a + b, 0);
                    social = Math.floor(totalCases * 0.45) || 45;
                    news = Math.floor(totalCases * 0.15) || 15;
                    hosp = Math.floor(totalCases * 0.3) || 30;
                    pub = Math.floor(totalCases * 0.1) || 10;
                }

                // 2. Source Breakdown Chart (Pie)
                const srcData = {
                    labels: ['Social Media', 'News Reports', 'Hospital Data', 'Public Health Reports'],
                    datasets: [{
                        data: [social, news, hosp, pub],
                        backgroundColor: ['#b537f2', '#00e5ff', '#00ff88', '#ffb700'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                };

                if (srcChartInstance) {
                    srcChartInstance.data = srcData;
                    srcChartInstance.update();
                } else {
                    srcChartInstance = new Chart(ctxSrc, {
                        type: 'pie',
                        data: srcData,
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'right', labels: { color: '#fff', font: { size: 10 } } }
                            }
                        }
                    });
                }
            }

            // 3. Risk Distribution Chart (Donut)
            if (document.getElementById('riskDistributionChart')) {
                const ctxRisk = riskDistChartEl.getContext('2d');

                let highRisk = 25, medRisk = 40, lowRisk = 35;
                if (hasData && apiData.length > 0) {
                    highRisk = apiData.filter(d => (d.riskLevel || '').toLowerCase() === 'high').length;
                    medRisk = apiData.filter(d => (d.riskLevel || '').toLowerCase() === 'medium').length;
                    lowRisk = apiData.filter(d => (d.riskLevel || '').toLowerCase() === 'low').length;
                    // Fallback if the data lacks 'riskLevel' properties entirely:
                    if (highRisk === 0 && medRisk === 0 && lowRisk === 0) {
                        highRisk = 25; medRisk = 40; lowRisk = 35;
                    }
                }

                const riskData = {
                    labels: ['High Risk', 'Medium Risk', 'Low Risk'],
                    datasets: [{
                        data: [highRisk, medRisk, lowRisk],
                        backgroundColor: ['#ff2a5f', '#ffb700', '#00ff88'],
                        borderWidth: 0,
                        hoverOffset: 6
                    }]
                };

                if (riskChartInstance) {
                    riskChartInstance.data = riskData;
                    riskChartInstance.update();
                } else {
                    riskChartInstance = new Chart(ctxRisk, {
                        type: 'doughnut',
                        data: riskData,
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            cutout: '70%',
                            plugins: {
                                legend: { position: 'right', labels: { color: '#fff', font: { size: 10 } } }
                            }
                        }
                    });
                }
            }
        }

        // --- Alerts Page Dynamic Severity Chart ---
        if (document.getElementById('severityBreakdownChart')) {
            const ctxSev = document.getElementById('severityBreakdownChart').getContext('2d');
            let critCount = 14, warnCount = 45, infoCount = 120;
            if (hasData) {
                critCount = apiData.filter(ob => (ob.risk_score || 0) > 7).length;
                warnCount = apiData.filter(ob => (ob.risk_score || 0) > 4 && (ob.risk_score || 0) <= 7).length;
                infoCount = apiData.filter(ob => (ob.risk_score || 0) <= 4).length;
            }

            const sevData = {
                labels: ['Critical (High)', 'Elevated (Medium)', 'Monitor (Low)'],
                datasets: [{
                    data: [critCount, warnCount, infoCount],
                    backgroundColor: ['#ff2a5f', '#ffb700', '#00ff88'],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            };

            if (severityChartInstance) {
                severityChartInstance.data = sevData;
                severityChartInstance.update();
            } else {
                severityChartInstance = new Chart(ctxSev, {
                    type: 'pie',
                    data: sevData,
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', labels: { color: '#fff', font: { size: 11 }, padding: 20 } }
                        }
                    }
                });
            }
        }
    }

    // Call once immediately
    await updateOutbreaksUI();
    await updateDashboardAnalytics();

    // Setup polling
    setInterval(updateOutbreaksUI, 10000); // 10s for live data
    setInterval(updateDashboardAnalytics, 60000); // 60s for analytics
});

// --- Dashboard Analytics Logic ---
async function updateDashboardAnalytics() {
    // Only run if we are on the dashboard (check for specific elements)
    const trendCtxEl = document.getElementById('diseaseTrendChart');
    const predCtxEl = document.getElementById('predictionRadarChart');
    if (!trendCtxEl && !predCtxEl) return;

    let analyticsData = [];
    let predictionData = [];
    try {
        analyticsData = await fetchAnalytics();
        predictionData = await fetchPredictions();
    } catch (e) { console.error('Error fetching analytics/predictions', e); }

    // 1. Disease Trend Analytics
    if (trendCtxEl && analyticsData && analyticsData.length > 0) {
        const labels = analyticsData.map(d => d.disease);
        const cases = analyticsData.map(d => d.totalCases);

        const trendData = {
            labels: labels,
            datasets: [{
                label: 'Total Reports', // Changed to reports to match dashboard context better
                data: analyticsData.map(d => d.totalReports),
                backgroundColor: 'rgba(0, 229, 255, 0.4)',
                borderColor: '#00e5ff',
                borderWidth: 1,
                borderRadius: 4
            }]
        };

        if (diseaseTrendChartInstance) {
            diseaseTrendChartInstance.data = trendData;
            diseaseTrendChartInstance.update();
        } else {
            const ctxTrend = trendCtxEl.getContext('2d');
            diseaseTrendChartInstance = new Chart(ctxTrend, {
                type: 'bar',
                data: trendData,
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // Trend Status Indicators
        const indicatorsContainer = document.getElementById('trend-indicators');
        if (indicatorsContainer) {
            indicatorsContainer.innerHTML = '';
            analyticsData.forEach(d => {
                let iconClass = 'fa-minus';
                let colorClass = 'text-neon-yellow';
                if (d.trend === 'increasing') { iconClass = 'fa-arrow-trend-up'; colorClass = 'text-neon-red'; }
                else if (d.trend === 'decreasing') { iconClass = 'fa-arrow-trend-down'; colorClass = 'text-neon-green'; }

                indicatorsContainer.insertAdjacentHTML('beforeend', `
                    <div style="text-align: center; flex: 1;">
                        <div style="color: #fff; font-weight: bold; margin-bottom: 5px;">${d.disease}</div>
                        <i class="fa-solid ${iconClass} ${colorClass}" style="font-size: 1.2rem;"></i>
                        <div style="font-size: 0.7rem; color: #888; margin-top: 5px; text-transform: uppercase;">${d.trend}</div>
                    </div>
                `);
            });
        }
    }

    // 2. Outbreak Risk Predictions
    if (predCtxEl && predictionData && predictionData.length > 0) {
        // Take top 6 predictions for chart to avoid clutter
        const topPredictions = [...predictionData].sort((a, b) => b.riskProbability - a.riskProbability).slice(0, 6);
        const labels = topPredictions.map(p => `${p.disease}\n(${p.location.substring(0, 6)})`);
        const probabilities = topPredictions.map(p => p.riskProbability);

        const predChartData = {
            labels: labels,
            datasets: [{
                label: 'Risk Probability %',
                data: probabilities,
                backgroundColor: 'rgba(255, 42, 95, 0.2)',
                borderColor: '#ff2a5f',
                pointBackgroundColor: '#ff2a5f',
                borderWidth: 2
            }]
        };

        if (predictionChartInstance) {
            predictionChartInstance.data = predChartData;
            predictionChartInstance.update();
        } else {
            const ctxPred = predCtxEl.getContext('2d');
            predictionChartInstance = new Chart(ctxPred, {
                type: 'radar', // fallback to bar if radar fails, but radar is specified
                data: predChartData,
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: {
                        r: {
                            min: 0, max: 100,
                            ticks: { display: false, stepSize: 20 },
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            pointLabels: { color: '#fff', font: { size: 10 } },
                            angleLines: { color: 'rgba(255,255,255,0.1)' }
                        }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }

        // Render Prediction Cards
        const cardsContainer = document.getElementById('prediction-cards');
        if (cardsContainer) {
            cardsContainer.innerHTML = '';
            predictionData.forEach(p => {
                let severityClass = 'low';
                let colorLabel = 'var(--neon-green)';
                let glowClass = 'glow-green';

                if (p.riskProbability >= 80) {
                    severityClass = 'critical'; colorLabel = 'var(--neon-red)'; glowClass = 'glow-red';
                } else if (p.riskProbability >= 50) {
                    severityClass = 'warning'; colorLabel = 'var(--neon-yellow)'; glowClass = 'glow-yellow';
                }

                const html = `
                    <div style="background: rgba(255,255,255,0.03); border-left: 3px solid ${colorLabel}; padding: 10px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="color: #fff; font-weight: bold;">${p.disease} <span style="font-size: 0.8rem; color: #aaa; margin-left: 5px;">${p.location}</span></div>
                            <div style="font-size: 0.8rem; color: ${colorLabel}; text-transform: uppercase;">${severityClass} Risk</div>
                        </div>
                        <div style="font-size: 1.2rem; font-weight: bold; color: ${colorLabel};" class="text-neon-${glowClass.split('-')[1]}">
                            ${p.riskProbability}%
                        </div>
                    </div>
                `;
                cardsContainer.insertAdjacentHTML('beforeend', html);
            });
        }
    }
}

// --- 7. Alerts Page Specific Logic ---
const alertTimelineEl = document.getElementById('alert-timeline');
const systemNotifsEl = document.getElementById('system-notifications');
const severityChartEl = document.getElementById('severityBreakdownChart');

function generateAlerts(outbreaks) {
    const symptomsFeedEl = document.getElementById('symptoms-feed');
    const alertsFeedEl = document.getElementById('alerts-feed');
    const statCrit = document.getElementById('stat-alerts-critical');
    const statWarn = document.getElementById('stat-alerts-warning');
    const statRes = document.getElementById('stat-alerts-resolved');

    if (!alertTimelineEl && !symptomsFeedEl && !alertsFeedEl && !statCrit) return;

    // Clear out either timeline
    if (alertTimelineEl) alertTimelineEl.innerHTML = '';
    if (symptomsFeedEl) symptomsFeedEl.innerHTML = '';
    if (alertsFeedEl) alertsFeedEl.innerHTML = '';

    if (!outbreaks || outbreaks.length === 0) {
        const noAlertsHtml = '<div style="color:#aaa; text-align:center; padding:20px;">No alerts detected.</div>';
        if (alertTimelineEl) alertTimelineEl.innerHTML = noAlertsHtml;
        if (symptomsFeedEl) symptomsFeedEl.innerHTML = noAlertsHtml;
        if (alertsFeedEl) alertsFeedEl.innerHTML = noAlertsHtml;
        return;
    }

    let critCount = 0;
    let warnCount = 0;
    let infoCount = 0;

    outbreaks.forEach(ob => {
        let typeClass = 'info';
        let nodeClass = '';
        let colorStyle = '#fff';
        let severityLabel = 'MONITOR';

        const risk = ob.risk_score || 0;

        // Categorize based on risk_score
        if (risk > 7) {
            typeClass = 'critical';
            nodeClass = 'critical';
            colorStyle = 'var(--neon-red)';
            severityLabel = 'CRITICAL';
            critCount++;
        } else if (risk > 4) {
            typeClass = 'warning';
            nodeClass = 'warning';
            colorStyle = 'var(--neon-yellow)';
            severityLabel = 'WARNING';
            warnCount++;
        } else {
            typeClass = 'info';
            nodeClass = 'info';
            colorStyle = 'var(--neon-green)';
            severityLabel = 'INFO';
            infoCount++;
        }

        const timeStr = ob.timestamp ? new Date(ob.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now';

        const title = `${severityLabel}: ${ob.location || 'Unknown Region'}`;
        const desc = `${ob.detected_disease || 'Condition'} detected with risk score ${risk.toFixed(1)}.`;

        const html = `
            <div class="vt-item">
                <div class="vt-node ${nodeClass}"></div>
                <div class="vt-time">${timeStr}</div>
                <div class="vt-content" style="color: ${colorStyle};">${title}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.3rem;">${desc}</div>
            </div>
        `;

        // Populate specific HTML block based on container matching existing layouts styles (vt-item vs feed-card depending on presence)
        const feedHtml = `
            <div class="feed-item" style="border-left: 3px solid ${colorStyle}; padding-left: 10px; margin-bottom: 12px;">
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom:4px;">${timeStr}</div>
                <div style="font-size: 0.95rem; color: ${colorStyle}; font-weight: bold;">${title}</div>
                <div style="font-size: 0.85rem; color: #ccc;">${desc}</div>
            </div>
        `;

        if (alertTimelineEl) alertTimelineEl.insertAdjacentHTML('beforeend', html);
        if (symptomsFeedEl) symptomsFeedEl.insertAdjacentHTML('beforeend', feedHtml);
        if (alertsFeedEl) alertsFeedEl.insertAdjacentHTML('beforeend', feedHtml);
    });

    // Update KPI panels dynamically
    if (statCrit) statCrit.textContent = critCount;
    if (statWarn) statWarn.textContent = warnCount;
    if (statRes) statRes.textContent = infoCount;
}

if (systemNotifsEl) {
    const notifData = [
        { icon: 'fa-server', color: 'var(--neon-blue)', title: 'Server Sync Successful', desc: 'Data mirrored across 4 global nodes automatically.', time: '2 mins ago' },
        { icon: 'fa-shield-halved', color: 'var(--neon-green)', title: 'Firewall Updated', desc: 'Defensive cybersecurity patches applied to central DB.', time: '1 hour ago' },
        { icon: 'fa-robot', color: 'var(--neon-purple)', title: 'NLP Engine Calibrated', desc: 'Social media language scraping models adjusted for new slang variants.', time: '4 hours ago' },
        { icon: 'fa-database', color: 'var(--neon-yellow)', title: 'Database Cleanup', desc: '3.4GB of archaic temporary EMR hashes purged.', time: '12 hours ago' }
    ];

    notifData.forEach(n => {
        const html = `
            <div class="notification-card">
                <div class="nc-icon" style="color: ${n.color}; border: 1px solid ${n.color}40;"><i class="fa-solid ${n.icon}"></i></div>
                <div class="nc-info">
                    <h5 style="color: ${n.color};">${n.title}</h5>
                    <p>${n.desc}</p>
                    <div class="nc-time">${n.time}</div>
                </div>
            </div>
        `;
        systemNotifsEl.insertAdjacentHTML('beforeend', html);
    });
}
