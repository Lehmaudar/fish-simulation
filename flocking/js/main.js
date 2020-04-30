var scene, renderer;
var camera, cameraControls, fishCamera, axesHelper, bounds, subject;
var simplex = new SimplexNoise(1);
var stats = new Stats();
var clock = new THREE.Clock();

let prevBoundSize;
let fishCameraDist = 1.5;
let fishCameraFOV = 90;

const boids = [];
const predators = [];
const foods = [];
const boidTotalCount = 700;
const boidStartCount = 500;
const predatorTotalCount = 15;
const predatorStartCount = 1;
const foodTotalCount = 100;
const foodStartCount = 0;

function init() {
  let w = window.innerWidth;
  let h = window.innerHeight;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setClearColor("#fff");
  renderer.setSize(w, h);

  const container = document.getElementById("container");
  container.appendChild(renderer.domElement);
  container.appendChild(stats.domElement);
  window.addEventListener("resize", onWindowResize, false);
  window.addEventListener("fullscreenchange", onWindowResize, false);

  initControls();

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, w / h, 1, 1000);
  fishCamera = new THREE.PerspectiveCamera(90, w / h, 0.1, 1000);
  w /= 40; // figures 40
  h /= 40;
  // camera = new THREE.OrthographicCamera(-w, w, h, -h, 1, 1000);
  scene.add(camera);
  // scene.add(fishCamera);

  const b = vars.boundSize;
  camera.position.set(b * 2.2, b * 0.7, b * 3.3); // figures
  // camera.position.set(b * 3, b * 3, b * 300);
  // camera.position.set(
  //   // figures in 2D
  //   20.932490428341506,
  //   18.265853946124924,
  //   419.9976011344496
  // );
  // camera.position.set(b * 0.9, b * 0.3, b * 2);
  // camera.position.set(10.001, 30, 10);

  cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
  cameraControls.rotateSpeed = 0.3;
  cameraControls.maxDistance = 400;
  cameraControls.minDistance = 1;
  cameraControls.enabled = !vars.boidCamera;
  // cameraControls.enabled = false;

  axesHelper = new THREE.AxesHelper(vars.boundSize * 0.8);
  axesHelper.visible = vars.showAxes;
  scene.add(axesHelper);

  addBoids();
  addBoidCamera();
  addPredators();
  addBounds();
  addNoiseCurve();

  // animate frame(s) for paused analysis (problem with loading rocks)
  // moveBoids(0.001);
  updateInfo();

  addObstacle(animate);

  // animate();
}

function animate() {
  let delta = clock.getDelta();

  if (delta && vars.play) {
    if (delta > 1) delta = 0; // when tab not open for some time
    cameraChase();
    moveBoids(delta);
    updateInfo();
    if (vars.drawRandomFunction) animateNoise();
    // if (vars.movePlane && vars.enabled) updatePlaneTexture(delta);
    if (plane.changePos) updatePlaneTexture();
  }

  requestAnimationFrame(animate);
  render();
  stats.update();
}

function render() {
  cameraControls.update();

  if (vars.boidCamera) renderer.render(scene, fishCamera);
  else renderer.render(scene, camera);
}
