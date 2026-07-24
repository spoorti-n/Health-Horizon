/**
 * Smart Hospital and Drug Exchange System Logic
 * Handles resource tracking, nearest supplier matching, and SLA escalation tracking.
 */

// --- Simulated Hospital & Resource Data ---
const hospitals = [
    { id: "H1", name: "Central City Hospital", lat: 12.9716, lng: 77.5946, inventory: { icuBeds: 5, oxygen: 120, ventilators: 12, medicines: 500 } },
    { id: "H2", name: "Metro General Care", lat: 12.9352, lng: 77.6245, inventory: { icuBeds: 0, oxygen: 15, ventilators: 2, medicines: 50 } }, // Low resources
    { id: "H3", name: "Apex Healthcare Clinic", lat: 13.0279, lng: 77.5409, inventory: { icuBeds: 15, oxygen: 300, ventilators: 25, medicines: 1000 } }, // High resources
    { id: "H4", name: "Global Health Institute", lat: 12.9141, lng: 77.6308, inventory: { icuBeds: 2, oxygen: 50, ventilators: 5, medicines: 200 } },
    { id: "H5", name: "St. John's Medical Center", lat: 12.9298, lng: 77.6200, inventory: { icuBeds: 8, oxygen: 200, ventilators: 15, medicines: 800 } }
];

// Formatting helper
const formatResourceName = (key) => {
    const map = { icuBeds: 'ICU Beds', oxygen: 'O2 Cylinders', ventilators: 'Ventilators', medicines: 'Medicines' };
    return map[key] || key;
};

// State for Tracking Requests
let activeRequests = [
    // Pre-seed an escalated example
    { reqId: "REQ-001", requesterId: "H2", targetHospitalId: "H4", resourceType: "ventilators", qty: 2, status: "escalated", daysRemaining: 0, timestamp: Date.now() }
];

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
    populateDashboard();
    populateSelects();
    renderTrackingTable();
    updateKPIs();
    
    // Start Delivery SLA Simulation Loop
    setInterval(simulateSLAProgression, 5000); // Check every 5s for demo purposes (representing days)
});

// --- Core Logic ---

// Find Nearest Supplier Algorithm
function findNearestSupplier(requesterId, resourceType, requiredQty, excludeIds = []) {
    const requester = hospitals.find(h => h.id === requesterId);
    if (!requester) return null;

    let bestMatch = null;
    let shortestDistance = Infinity;

    hospitals.forEach(h => {
        // Skip self and excluded hospitals (failed to deliver)
        if (h.id === requesterId || excludeIds.includes(h.id)) return;

        // Check if hospital has enough inventory
        if (h.inventory[resourceType] >= requiredQty) {
            // Calculate distance (simple Euclidean for demo)
            const dist = Math.sqrt(Math.pow(h.lat - requester.lat, 2) + Math.pow(h.lng - requester.lng, 2));
            if (dist < shortestDistance) {
                shortestDistance = dist;
                bestMatch = h;
            }
        }
    });

    return bestMatch;
}

// Handle Form Submission
window.handleResourceRequest = function(event) {
    event.preventDefault();
    
    const reqHospitalId = document.getElementById('req-hospital').value;
    const resourceType = document.getElementById('req-resource').value;
    const qty = parseInt(document.getElementById('req-quantity').value);

    // Find nearest supplier
    const supplier = findNearestSupplier(reqHospitalId, resourceType, qty);

    if (supplier) {
        // Deduct from supplier locally for demo persistence
        supplier.inventory[resourceType] -= qty;
        
        // Log Request
        const newReq = {
            reqId: 'REQ-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
            requesterId: reqHospitalId,
            targetHospitalId: supplier.id,
            resourceType: resourceType,
            qty: qty,
            status: "dispatched",
            daysRemaining: 3, // SLA requirement
            timestamp: Date.now(),
            excludeHistory: [] // To track failed suppliers
        };

        activeRequests.unshift(newReq); // Add to top

        alert(`Match Found! Alerting ${supplier.name} to dispatch ${qty} ${formatResourceName(resourceType)} to your location. ETA: 3 Days.`);
        
        // Refresh UI
        populateDashboard();
        renderTrackingTable();
        updateKPIs();
        event.target.reset();

    } else {
        alert("CRITICAL WARNING: No nearby hospital has the required inventory to fulfill this request!");
    }
}

// Simulate Time Passing and Automatic Escalation
function simulateSLAProgression() {
    let uiNeedsUpdate = false;

    activeRequests.forEach(req => {
        if (req.status === 'dispatched') {
            // Decrease time to simulate days passing fast
            req.daysRemaining -= 1;
            uiNeedsUpdate = true;

            // Trigger Escalation!
            if (req.daysRemaining <= 0) {
                req.status = 'escalated';
                
                // Add current supplier to exclude history so we don't ask them again
                if (!req.excludeHistory) req.excludeHistory = [];
                req.excludeHistory.push(req.targetHospitalId);

                // Find next best supplier
                const newSupplier = findNearestSupplier(req.requesterId, req.resourceType, req.qty, req.excludeHistory);

                if (newSupplier) {
                    // Update request with new supplier
                    newSupplier.inventory[req.resourceType] -= req.qty;
                    req.targetHospitalId = newSupplier.id;
                    req.daysRemaining = 3; // Reset SLA
                    req.status = "dispatched"; // Back to active track
                    console.log(`[ESCALATION] Reassigned ${req.reqId} to ${newSupplier.name}`);
                } else {
                    req.status = "failed"; // No one else can help
                }
            }
        }
    });

    if (uiNeedsUpdate) {
        renderTrackingTable();
        populateDashboard(); // In case inventory changed due to escalation
    }
}

// --- Rendering Logic ---

function populateDashboard() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    grid.innerHTML = '';

    hospitals.forEach(h => {
        // Style thresholds
        const bedClass = h.inventory.icuBeds < 5 ? 'critical' : 'good';
        const o2Class = h.inventory.oxygen < 50 ? 'critical' : (h.inventory.oxygen < 100 ? 'warning' : 'good');
        
        const card = `
            <div class="inventory-card">
                <div class="inventory-header">
                    <span class="hospital-name"><i class="fa-solid fa-square-h text-neon-blue" style="margin-right:8px;"></i>${h.name}</span>
                </div>
                <!-- Resource Items -->
                <div class="resource-stat"><span>ICU Beds:</span> <span class="stat-val ${bedClass}">${h.inventory.icuBeds}</span></div>
                <div class="resource-stat"><span>Oxygen Cyl.:</span> <span class="stat-val ${o2Class}">${h.inventory.oxygen}</span></div>
                <div class="resource-stat"><span>Ventilators:</span> <span class="stat-val">${h.inventory.ventilators}</span></div>
                <div class="resource-stat"><span>Medicines:</span> <span class="stat-val">${h.inventory.medicines} units</span></div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', card);
    });
}

function renderTrackingTable() {
    const tBody = document.getElementById('tracking-table-body');
    if (!tBody) return;
    tBody.innerHTML = '';

    if (activeRequests.length === 0) {
        tBody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#666;">No active transfers.</td></tr>`;
        return;
    }

    activeRequests.forEach(req => {
        const requester = hospitals.find(h => h.id === req.requesterId)?.name || 'Unknown';
        const supplier = hospitals.find(h => h.id === req.targetHospitalId)?.name || 'Unknown';
        
        let statusBadge = `<span class="status-badge dispatched"><i class="fa-solid fa-truck-fast"></i> ${req.daysRemaining} Days</span>`;
        if (req.status === 'escalated') statusBadge = `<span class="status-badge escalated"><i class="fa-solid fa-triangle-exclamation"></i> Re-routing...</span>`;
        if (req.status === 'failed') statusBadge = `<span class="status-badge escalated"><i class="fa-solid fa-ban"></i> FAILED</span>`;

        const html = `
            <tr>
                <td>
                    <div style="font-weight:bold; color:#fff;">${requester}</div>
                    <div style="font-size:0.75rem; color:#888;"><i class="fa-solid fa-arrow-turn-up text-neon-green"></i> From: ${supplier}</div>
                </td>
                <td style="color:var(--neon-cyan);">${req.qty}x ${formatResourceName(req.resourceType)}</td>
                <td>${statusBadge}</td>
            </tr>
        `;
        tBody.insertAdjacentHTML('beforeend', html);
    });
}

function populateSelects() {
    const sel = document.getElementById('req-hospital');
    if (!sel) return;
    hospitals.forEach(h => {
        sel.insertAdjacentHTML('beforeend', `<option value="${h.id}">${h.name}</option>`);
    });
}

function updateKPIs() {
    let totalBeds = 0; let totalO2 = 0;
    hospitals.forEach(h => { totalBeds += h.inventory.icuBeds; totalO2 += h.inventory.oxygen; });
    
    const countBeds = document.getElementById('stat-total-beds');
    const countO2 = document.getElementById('stat-total-o2');
    const countTransfers = document.getElementById('stat-active-transfers');

    if(countBeds) countBeds.innerText = totalBeds;
    if(countO2) countO2.innerText = totalO2;
    if(countTransfers) countTransfers.innerText = activeRequests.filter(r => r.status === 'dispatched' || r.status === 'escalated').length;
}

// --- Authentication Logic ---
let authState = 'login'; // 'login' or 'signup'

window.switchAuthTab = function(state) {
    authState = state;
    const tabs = document.querySelectorAll('.auth-tab');
    if (tabs.length >= 2) {
        tabs[0].classList.toggle('active', state === 'login');
        tabs[1].classList.toggle('active', state === 'signup');
    }

    const hospitalNameGroup = document.getElementById('group-hospital-name');
    const hospitalNameInput = document.getElementById('auth-hospital-name');
    const submitBtn = document.getElementById('auth-submit-btn');

    if (state === 'signup') {
        if (hospitalNameGroup) hospitalNameGroup.style.display = 'flex';
        if (hospitalNameInput) hospitalNameInput.required = true;
        if (submitBtn) submitBtn.innerHTML = 'Register Hospital <i class="fa-solid fa-user-plus" style="margin-left: 8px;"></i>';
    } else {
        if (hospitalNameGroup) hospitalNameGroup.style.display = 'none';
        if (hospitalNameInput) hospitalNameInput.required = false;
        if (submitBtn) submitBtn.innerHTML = 'Access Portal <i class="fa-solid fa-arrow-right-to-bracket" style="margin-left: 8px;"></i>';
    }
}

window.handleAuthSubmit = function(event) {
    event.preventDefault(); // Prevent page reload
    
    const emailInput = document.getElementById('auth-email');
    if(emailInput) {
        console.log('[Auth] Success for: ' + emailInput.value);
    }
    
    // Store simple token to prevent re-login on refresh
    sessionStorage.setItem('resourceExchangeAuth', 'true');
    
    // Hide overlay and show dashboard
    hideAuthAndShowDashboard();
}

function hideAuthAndShowDashboard() {
    const overlay = document.getElementById('auth-overlay');
    const dashboard = document.getElementById('dashboard-content');
    
    if (overlay && dashboard) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
            dashboard.style.display = 'block';
            
            // Re-trigger layout updates for grid/charts if any exist here
            window.dispatchEvent(new Event('resize'));
        }, 500); // match CSS transition duration
    }
}

// Check auth state on load
document.addEventListener('DOMContentLoaded', () => {
    // If we're on the resource exchange page, check auth
    if (window.location.pathname.includes('hospital-resource-exchange')) {
        const isAuth = sessionStorage.getItem('resourceExchangeAuth');
        if (isAuth === 'true') {
            // Already logged in, hide overlay immediately without animation
            const overlay = document.getElementById('auth-overlay');
            const dashboard = document.getElementById('dashboard-content');
            if (overlay) overlay.style.display = 'none';
            if (dashboard) dashboard.style.display = 'block';
        }
    }
});
