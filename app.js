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

// Shanghai International Circuit coordinates
const SHANGHAI_COORDS = {
  longitude: 121.219722,
  latitude: 31.338889,
  height: 100,
};

const position = Cesium.Cartesian3.fromDegrees(
  SHANGHAI_COORDS.longitude,
  SHANGHAI_COORDS.latitude,
  SHANGHAI_COORDS.height
);

// Set the initial camera position to focus on Shanghai circuit
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(
    SHANGHAI_COORDS.longitude,
    SHANGHAI_COORDS.latitude,
    2000
  ),
  orientation: {
    heading: 0.0,
    pitch: -Cesium.Math.PI_OVER_FOUR,
    roll: 0.0,
  },
});

// Function to focus camera on Shanghai circuit
function focusOnShanghai() {
  viewer.camera.flyTo({
    destination: position,
    orientation: {
      heading: 0.0,
      pitch: -Cesium.Math.PI_OVER_FOUR,
      roll: 0.0,
    },
  });
}

// Create a variable to store the car entity reference
let car;

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

// Function to update car position with telemetry data
function updateCarPosition(longitude, latitude) {
  if (!car) return;
  const newPosition = Cesium.Cartesian3.fromDegrees(
    longitude,
    latitude,
    SHANGHAI_COORDS.height
  );
  car.position = newPosition;
}

// Create initial car entity
car = createCarEntity(position);

// Simulate movement
setInterval(() => {
  const time = Date.now() / 1000;
  const radius = 0.001;
  const centerLon = SHANGHAI_COORDS.longitude;
  const centerLat = SHANGHAI_COORDS.latitude;

  const longitude = centerLon + radius * Math.cos(time);
  const latitude = centerLat + radius * Math.sin(time);

  updateCarPosition(longitude, latitude);
}, 100);
