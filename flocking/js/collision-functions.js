var plane;
var vectorField;
var distanceField;
var avoidanceField;
var obstacle;
const fieldDimension = 13; // 13 for figures
const fieldSize = 40; // 40 for figures
const voxelSize = fieldSize / (fieldDimension - 1);
const textureSize = 1080; // 1080 for figures
const avoidRadius = 10; // 9 for figures

// TODO: work without server
function addObstacle(animateFunction) {
  const loader = new THREE.GLTFLoader();
  loader.load("rocks-original.glb", (gltf) => {
    const rocks = new THREE.Mesh(
      new THREE.Geometry().fromBufferGeometry(gltf.scene.children[0].geometry),
      new THREE.MeshBasicMaterial({
        wireframe: true,
        color: 0x333333,
      })
    );
    // rocks.scale.set(3, 3, 3);
    // rocks.position.set(21, 16, 20);

    // original rocks
    rocks.scale.set(5, 5, 5);
    rocks.position.set(20, 8, 20);

    const torus = new THREE.Mesh(
      // new THREE.TorusGeometry(12, 0.3, 4, 24),
      new THREE.TorusKnotGeometry(10, 0.4, 40, 4),
      // new THREE.TorusKnotGeometry(10, 0.4, 120, 6), // figures
      new THREE.MeshNormalMaterial({
        wireframe: false,
        // opacity: 0,
        // transparent: true,
      })
    );
    torus.position.set(24, 20, 20);

    const obstacles = [];
    obstacles.push(rocks);
    // obstacles.push(torus);
    obstacles.forEach((obstacle) => {
      scene.add(obstacle);
    });

    obstacle = rocks;

    addVectorField(obstacles);
    addGradientField();
    addPlane();
    changeObstacles();

    animateFunction();
  });
}

function addVectorField(obstacles) {
  distanceField = [];
  vectorField = [];

  for (let i1 = 0.0; i1 < fieldDimension; i1++) {
    const yArrayVec = [];
    const yArrayDist = [];
    for (let i2 = 0.0; i2 < fieldDimension; i2++) {
      const zArrayVec = [];
      const zArrayDist = [];
      for (let i3 = 0.0; i3 < fieldDimension; i3++) {
        const origin = new THREE.Vector3(i1, i2, i3).multiplyScalar(voxelSize);

        let steer = new THREE.Vector3();
        let length = 1e9;
        let inside;
        for (let i = 0; i < obstacles.length; i++) {
          const obstacle = obstacles[i];
          obstacle.updateMatrixWorld();
          const result = findClosestPosition(origin, obstacle);
          const closestPos = result[0];
          const vec = origin.clone().sub(closestPos);
          if (vec.length() < length) {
            inside = result[1];
            steer = vec;
            length = steer.length();
          }
        }

        if (length > avoidRadius) {
          length = 1;
        } else {
          length = length / avoidRadius;
        }

        steer.setLength(length);
        // if (i3 == 6) addArrow(steer, origin, length * 2, 0xff0000);

        zArrayVec.push(steer);
        zArrayDist.push(length);
      }
      yArrayVec.push(zArrayVec);
      yArrayDist.push(zArrayDist);
    }
    vectorField.push(yArrayVec);
    distanceField.push(yArrayDist);
  }
}

function addGradientField() {
  avoidanceField = [];

  for (let i1 = 0; i1 < fieldDimension; i1++) {
    const yArray = [];
    for (let i2 = 0; i2 < fieldDimension; i2++) {
      const zArray = [];
      for (let i3 = 0; i3 < fieldDimension; i3++) {
        dist = distanceField[i1][i2][i3];
        gradient = new THREE.Vector3();

        if (
          i1 == 0 ||
          i2 == 0 ||
          i3 == 0 ||
          i1 == fieldDimension - 1 ||
          i2 == fieldDimension - 1 ||
          i3 == fieldDimension - 1
        ) {
          zArray.push(gradient);
          continue;
        } else {
          for (let x = -1; x < 2; x++)
            for (let y = -1; y < 2; y++)
              for (let z = -1; z < 2; z++) {
                const vec = new THREE.Vector3(x, y, z);
                value = distanceField[i1 + x][i2 + y][i3 + z];

                vec.multiplyScalar(value);
                gradient.add(vec);
              }

          // gradient = new THREE.Vector3(
          //   (distanceField[i1 + 1][i2 + 0][i3 + 0] -
          //     distanceField[i1 - 1][i2 + 0][i3 + 0]) /
          //     2,
          //   (distanceField[i1 + 0][i2 + 1][i3 + 0] -
          //     distanceField[i1 + 0][i2 - 1][i3 + 0]) /
          //     2,
          //   (distanceField[i1 + 0][i2 + 0][i3 + 1] -
          //     distanceField[i1 + 0][i2 + 0][i3 - 1]) /
          //     2
          // );

          gradient.setLength(Math.pow(1 - dist, 2));
        }

        // const origin = new THREE.Vector3(i1, i2, i3).multiplyScalar(voxelSize);
        // if (i3 == 6)
        //   addArrow(gradient, origin, gradient.length() * 2, 0xff0000);

        zArray.push(gradient);
      }
      yArray.push(zArray);
    }
    avoidanceField.push(yArray);
  }
}

function texturePosToWorldPos(pos) {
  for (let i = 0; i < 2; i++) {
    const worldAxisPos = (pos[i] / textureSize) * fieldSize;
    pos[i] = worldAxisPos;
  }

  return pos;
}

function worldPosToFieldValues(pos, field, deltas = []) {
  const voxels = [];

  for (let i = 0; i < 3; i++) {
    const worldAxisPos = pos[i];
    if (worldAxisPos < 0 || worldAxisPos > fieldSize) return false;
    const voxel = worldAxisPos / voxelSize;
    const flooredVoxel = Math.floor(voxel);
    deltas.push(voxel - flooredVoxel);
    voxels.push(flooredVoxel);
  }

  const fieldValues = [];
  for (let x = 0; x < 2; x++)
    for (let y = 0; y < 2; y++)
      for (let z = 0; z < 2; z++) {
        let xVal = voxels[0] + x;
        let yVal = voxels[1] + y;
        let zVal = voxels[2] + z;
        fieldValues.push(field[xVal][yVal][zVal]);
      }

  return fieldValues;
}

function lerp(x, q0, q1) {
  return (1 - x) * q0 + x * q1;
}

function lerpVecs(x, q0, q1) {
  if (!q0) return q1;
  if (!q1) return q0;
  return new THREE.Vector3().lerpVectors(q0, q1, x);
}

function triLerp(fun, x, y, z, q000, q001, q010, q011, q100, q101, q110, q111) {
  const q00 = fun(x, q000, q100);
  const q01 = fun(x, q001, q101);
  const q10 = fun(x, q010, q110);
  const q11 = fun(x, q011, q111);
  const q0 = fun(y, q00, q10);
  const q1 = fun(y, q01, q11);
  return fun(z, q0, q1);
}

function worldPosToFieldValue(pos, field, deltas = []) {
  const voxels = [];

  for (let i = 0; i < 3; i++) {
    const worldAxisPos = pos[i];
    if (worldAxisPos < 0 || worldAxisPos > fieldSize) return false;
    const voxel = worldAxisPos / voxelSize;
    const floorVoxel = Math.floor(voxel);
    deltas.push(voxel - floorVoxel);
    voxels.push(floorVoxel);
  }

  return field[voxels[0]][voxels[1]][voxels[2]];
}

function addPlane() {
  const planeSize = vars.boundSize;

  plane = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(planeSize, planeSize),
    new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      map: new THREE.DataTexture(
        new Uint8Array(textureSize * textureSize * 4),
        textureSize,
        textureSize
      ),
    })
  );
  plane.position.set(planeSize / 2, planeSize / 2, planeSize / 2);
  plane.size = planeSize;
  plane.ownTime = 0;
  obstacle.plane = plane;
  scene.add(plane);

  plane.changePos = true;
  updatePlaneTexture();
}

function updatePlaneTexture() {
  if (!plane.visible) return;
  plane.position.z = vars.planePosition;

  const pixelData = [];
  for (let y = 0; y < textureSize; ++y) {
    for (let x = 0; x < textureSize; ++x) {
      worldPos = texturePosToWorldPos([x, y]);
      worldPos[2] = plane.position.z;
      let deltas = [];

      // // show distance field
      // const field = distanceField;
      // const lerpFunc = lerp;
      // const valueCalc = (value) => value;

      // show vector field
      // const field = vectorField;
      const field = avoidanceField;
      const lerpFunc = lerpVecs;
      const valueCalc = (value) => value.length();

      fieldVectors = worldPosToFieldValues(worldPos, field, deltas);
      value = valueCalc(triLerp(lerpFunc, ...deltas, ...fieldVectors));

      // pixelData.push(255, 255 - value * 255, 255 - value * 255, value * 255);
      pixelData.push(255, 0, 0, value * 255);
      // pixelData.push(0, 0, 255, value * 255);
    }
  }

  plane.material.map.image.data.set(Uint8Array.from(pixelData));
  plane.material.map.needsUpdate = true;
  plane.changePos = false;
}

// helper func for visuals
function addArrow(target, origin, length = 1, color = 0x000000) {
  if (length === 0) {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: color })
    );
    sphere.position.copy(origin);
    scene.add(sphere);
  } else {
    const arrow = new THREE.ArrowHelper(
      target.clone().normalize(),
      origin,
      length,
      color,
      0.44,
      0.36
    );
    scene.add(arrow);
  }
}
