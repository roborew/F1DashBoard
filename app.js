// Initialize the Cesium Viewer
const viewer = new Cesium.Viewer("cesiumContainer", {
  //   terrainProvider: Cesium.createWorldTerrain(),
  animation: true,
  baseLayerPicker: true,
  fullscreenButton: true,
  geocoder: true,
  homeButton: true,
  navigationHelpButton: true,
  sceneModePicker: true,
  timeline: false,
});

// Shanghai International Circuit coordinates as origin point
const SHANGHAI_COORDS = {
  longitude: 121.218726,
  latitude: 31.3388079,
  height: 0,
};

const positionStart = Cesium.Cartesian3.fromDegrees(
  SHANGHAI_COORDS.longitude,
  SHANGHAI_COORDS.latitude,
  SHANGHAI_COORDS.height
);

const POSITION_OFFSET = {
  longitude: 0.0035, // Adjust this value to move west (negative) or east (positive)
  latitude: -0.0, // Adjust this value to move south (negative) or north (positive)
};

// Scale factor to convert OpenF1 coordinates to real-world distances (meters)
const SCALE_FACTOR = 0.1; // This will need tuning based on actual track size

// Function to convert OpenF1 coordinates to geographic coordinates
function convertToGeographic(x, y, z) {
  // Create a local coordinate frame centered at the origin point
  const origin = Cesium.Cartesian3.fromDegrees(
    SHANGHAI_COORDS.longitude,
    SHANGHAI_COORDS.latitude,
    SHANGHAI_COORDS.height
  );

  // Convert scaled OpenF1 coordinates to meters
  const xMeters = x * SCALE_FACTOR;
  const yMeters = y * SCALE_FACTOR;
  const zMeters = z * SCALE_FACTOR;

  // Create a local transform at the origin
  const transform = Cesium.Transforms.eastNorthUpToFixedFrame(origin);

  // Convert local coordinates to ECEF
  const localPosition = new Cesium.Cartesian3(xMeters, yMeters, zMeters);
  const worldPosition = Cesium.Matrix4.multiplyByPoint(
    transform,
    localPosition,
    new Cesium.Cartesian3()
  );

  // Convert ECEF to geographic coordinates
  const cartographic = Cesium.Cartographic.fromCartesian(worldPosition);
  return {
    longitude:
      Cesium.Math.toDegrees(cartographic.longitude) + POSITION_OFFSET.longitude,
    latitude:
      Cesium.Math.toDegrees(cartographic.latitude) + POSITION_OFFSET.latitude,
    height: cartographic.height,
  };
}

// Set the initial camera position to focus on Shanghai circuit
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(0.0, 0.0, 25000000.0), // Centered at (0,0) with a high altitude
  orientation: {
    heading: 0.0,
    pitch: -Cesium.Math.PI_OVER_TWO, // Look straight down
    roll: 0.0,
  },
});

// Function to focus camera on Shanghai circuit
function focusOnShanghai() {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      SHANGHAI_COORDS.longitude,
      SHANGHAI_COORDS.latitude,
      2500
    ),
    orientation: {
      heading: 0.0,
      pitch: -Cesium.Math.PI_OVER_TWO, // Look straight down
      roll: 0.0,
    },
  });
}

// Create a variable to store the car entity reference
let car;
let currentYawAngle = 0;
function createCarEntity(position) {
  car = viewer.entities.add({
    name: "F1 Car",
    position: position,
    model: {
      uri: "objs/f1_car.glb",
      minimumPixelSize: 64,
      maximumScale: 1000,
      scale: 0.08,
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
    },
  });
  return car;
}

// Update car position using OpenF1 coordinates
function updateCarPositionFromOpenF1(x, y, z) {
  if (!car) return;
  console.log("x", x, "y", y, "z", z);
  const geoPosition = convertToGeographic(x, y, z);
  const position = Cesium.Cartesian3.fromDegrees(
    geoPosition.longitude,
    geoPosition.latitude,
    geoPosition.height
  );
  console.log("position", position);
  car.position = position;
}

// Create initial car entity
car = createCarEntity(positionStart);

// Load and parse the race data
async function loadRaceData() {
  try {
    const response = await fetch("race.json");
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error loading race data:", error);
    return [];
  }
}

let currentIndex = 0;

// Initialize the data
async function initialize() {
  raceData = await loadRaceData();
  if (raceData.length > 0) {
    // Start the position updates once data is loaded
    startPositionUpdates(raceData);
  }
}

function startPositionUpdates(raceData) {
  setInterval(() => {
    if (currentIndex >= raceData.length) {
      currentIndex = 0; // Loop back to start
    }
    const position = raceData[currentIndex];
    updateCarPositionFromOpenF1(position.x, position.y, position.z);
    currentIndex++;
  }, 100); // Update every 100ms
}

// Start the initialization
initialize();
