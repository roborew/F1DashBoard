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
const SCALE_FACTOR = 0.099; // This will need tuning based on actual track size

// Global variable to store the previous geographic position
let previousGeoPosition = null;

// Global playback speed factor. Default is 1x (real time)
let playbackSpeed = 1.0;

let playbackStartTime = null;
let startTimestamp = null;
let currentIndex = 0;

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
      maximumScale: 1,
      scale: 0.01,
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
    },
  });
  return car;
}

// Update car position using OpenF1 coordinates
function updateCarPositionFromOpenF1(x, y, z) {
  // Convert the OpenF1 coordinates to geographic coordinates
  const geoPosition = convertToGeographic(x, y, z);

  // Create a Cartesian3 position from the geographic position
  const newPosition = Cesium.Cartesian3.fromDegrees(
    geoPosition.longitude,
    geoPosition.latitude,
    geoPosition.height
  );

  // Update the car's position
  car.position = newPosition;

  // If we have a previous position, calculate the heading
  if (previousGeoPosition) {
    // Calculate differences (assumes small movements so simple subtraction works)
    const dLon = Cesium.Math.toRadians(
      geoPosition.longitude - previousGeoPosition.longitude
    );
    const dLat = Cesium.Math.toRadians(
      geoPosition.latitude - previousGeoPosition.latitude
    );

    // Calculate heading: note the order in atan2 may need adjusting
    // depending on your model's forward direction.
    let heading = Math.atan2(dLon, dLat) + Math.PI;

    // If your car model's forward (zero rotation) isn't aligned with north,
    // you might need to add a constant offset, for example Math.PI/2
    // heading += Math.PI / 2;

    // Create a quaternion that represents the new orientation using the computed heading.
    // Since it's a flat plane, pitch and roll stay 0.
    const newOrientation = Cesium.Transforms.headingPitchRollQuaternion(
      newPosition,
      new Cesium.HeadingPitchRoll(heading, 0, 0)
    );

    // Update the car's orientation
    car.orientation = newOrientation;
  }

  // Store the current geographic position for the next update
  previousGeoPosition = geoPosition;
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

// Assume raceData is already loaded (or defined globally) and sorted by date asc
async function startRacePlayback() {
  raceData = await loadRaceData();
  if (raceData.length === 0) {
    console.error("No race data loaded");
    return;
  }
  // Use the earliest timestamp as the race start (in milliseconds)
  startTimestamp = Date.parse(raceData[0].date);
  playbackStartTime = Date.now();
  currentIndex = 0;
  // Start the Playback Loop
  requestAnimationFrame(updatePlayback);
}

function updatePlayback() {
  // Multiply elapsed time by playbackSpeed to accelerate the virtual clock
  const elapsed = (Date.now() - playbackStartTime) * playbackSpeed;
  const currentVirtualTime = startTimestamp + elapsed;

  // Process race records with timestamps <= currentVirtualTime
  while (
    currentIndex < raceData.length &&
    Date.parse(raceData[currentIndex].date) <= currentVirtualTime
  ) {
    const record = raceData[currentIndex];
    updateCarPositionFromOpenF1(record.x, record.y, record.z);
    currentIndex++;
  }

  // Request next frame if there is data to process
  if (currentIndex < raceData.length) {
    requestAnimationFrame(updatePlayback);
  } else {
    console.log("Race playback finished.");
  }
}

// Setup event listeners for playback speed buttons
function setupPlaybackControls() {
  const buttons = document.querySelectorAll(".playback-btn");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      // Get the desired speed from the data-speed attribute and update the playback factor
      playbackSpeed = parseFloat(button.dataset.speed);
      console.log("Playback speed set to x" + playbackSpeed);
    });
  });
}

// Initialize the playback
setupPlaybackControls();
startRacePlayback();
