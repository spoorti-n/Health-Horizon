// Generate mock data for the globe
const N = 100;
const gData = [...Array(N).keys()].map(() => {
    // Random locations, but weighted slightly towards landmasses (heuristic)
    const lat = (Math.random() - 0.5) * 140; // -70 to 70
    const lng = (Math.random() - 0.5) * 360; // -180 to 180
    
    // Determine severity
    const random = Math.random();
    let severity, color, size;
    
    if (random > 0.95) {
        severity = 'Critical';
        color = '#ff3366'; // neon-red
        size = Math.random() * 0.5 + 0.3; // larger
    } else if (random > 0.75) {
        severity = 'Warning';
        color = '#ffcc00'; // neon-yellow
        size = Math.random() * 0.2 + 0.15;
    } else {
        severity = 'Info';
        color = '#00f3ff'; // neon-cyan
        size = Math.random() * 0.1 + 0.05;
    }

    return {
        lat: lat,
        lng: lng,
        maxR: size,
        propagationSpeed: (Math.random() - 0.5) * 0.05 + 0.01,
        repeatPeriod: Math.random() * 2000 + 1000,
        color: color
    };
});

// Initialize Globe
const elem = document.getElementById('globe-viz');
const world = Globe()(elem)
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-dark.jpg') // Base map
    .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundColor('rgba(0,0,0,0)') // Transparent background to show our css gradient
    .showAtmosphere(true)
    .atmosphereColor('#00f3ff')
    .atmosphereAltitude(0.15);

// Add animated rings to represent hotspots/outbreaks
world.ringsData(gData)
    .ringColor('color')
    .ringMaxRadius('maxR')
    .ringPropagationSpeed('propagationSpeed')
    .ringRepeatPeriod('repeatPeriod')
    .ringResolution(64);

// Setup controls and initial animation
setTimeout(() => {
    world.controls().autoRotate = true;
    world.controls().autoRotateSpeed = 0.5;
    world.controls().enableZoom = false; // Disable zooming on landing page
    
    // Position camera to place the globe exactly in the center
    world.camera().position.z = 250;
    world.camera().position.x = 0;
}, 100);

// Handle window resize
window.addEventListener('resize', () => {
    world.width(window.innerWidth);
    world.height(window.innerHeight);
});
