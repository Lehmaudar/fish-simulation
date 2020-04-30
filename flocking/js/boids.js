function addBoids() {
  const { boundSize } = vars;
  for (let i = 0; i < boidTotalCount; i++) {
    const boid = addBoid([boundSize / 2, boundSize / 2, boundSize / 2], i);
    setBoidColor(boid);
    boids.push(boid);
  }
  shuffleBoids();

  boids[0].subject = true;
  subject = boids[0];

  changeBoidCount(boids, vars.boidCount);
}

function addPredators() {
  for (let i = 0; i < predatorTotalCount; i++) {
    const predator = addBoid([0, 0, 0], i);
    predator.predator = true;
    predator.rest = true;
    predator.restStartTime = 0;
    predator.scale.set(2, 2, 2);
    predator.mesh.material.color.setHex(0xff5555);
    predators.push(predator);
  }

  changeBoidCount(predators, vars.predatorCount);
}

function addBoid(position, index) {
  const boid = new THREE.Group();
  boid.index = index;
  boid.ownTime = 0;
  scene.add(boid);

  const mesh = new THREE.Mesh(
    new THREE.ConeBufferGeometry(0.3, 1),
    new THREE.MeshBasicMaterial({ wireframe: true })
  );
  mesh.geometry.rotateX(THREE.Math.degToRad(90));
  boid.mesh = mesh;
  boid.add(mesh);

  boid.velocity = new THREE.Vector3(rand(), rand(), rand());
  boid.velocity.setLength(vars.maxSpeed);
  boid.acceleration = new THREE.Vector3();
  boid.position.set(...position);
  boidDirection(boid.velocity.clone(), boid);

  // start data for noise
  boid.noise = {
    x: { a: 0, b: rand(), cumWavLen: 0 },
    y: { a: 0, b: rand(), cumWavLen: 0 },
    z: { a: 0, b: rand(), cumWavLen: 0 },
  };

  // helper arrows
  addArrows(boid);

  // travelled path line
  var tailLine = new THREE.Group();
  tailLine.name = "tailLine";
  tailLine.color = 0xff00ff;
  boid.tailLine = tailLine;
  scene.add(tailLine);

  return boid;
}

function moveBoids(delta) {
  for (let i = 0; i < vars.predatorCount; i++) {
    const predator = predators[i];
    moveBoid(delta, predator, vars.ruleScalar_p, vars.maxSpeed_p);
    setBoidColor(predator);
  }

  for (let i = 0; i < vars.boidCount; i++) {
    const boid = boids[i];
    moveBoid(delta, boid, vars.ruleScalar, vars.maxSpeed);
    setBoidColor(boid);
  }
}

function moveBoid(delta, boid, ruleScalar, maxSpeed) {
  const { velocity, position } = boid;
  const { playSpeed, drawTail } = vars;

  if (playSpeed == 0 || maxSpeed == 0) return;
  let playDelta = playSpeed * delta * 100;
  boid.ownTime += playDelta * 0.0002;

  const acceleration = accelerationRules(boid);
  acceleration.multiplyScalar(playDelta * ruleScalar * 0.005);
  acceleration.y *= 0.8; // to reduce vertical movement

  velocity.add(acceleration);
  if (boid.predator) velocityRules(boid, playDelta);

  velocity.clampLength(0, maxSpeed);
  const velClone = velocity.clone();
  velClone.multiplyScalar(playDelta);
  position.add(velClone);

  boidDirection(velClone, boid);
  if (boid.subject && drawTail) addLineSegment(boid.tailLine, boid.position);
}

function velocityRules(boid, playDelta) {
  const atk = velattack(boid);
  atk.multiplyScalar(playDelta);
  rules = [{ vec: atk, scalar: vars.attackScalar }];
  applyRules(rules, boid.velocity);
}

function accelerationRules(boid) {
  const acceleration = new THREE.Vector3();
  let rules;

  if (boid.predator) {
    rules = [
      { vec: reynolds(boid, predators)[0], scalar: vars.separationScalar },
      { vec: bounds(boid), scalar: vars.boundsScalar / 1.5 },
      { vec: random(boid), scalar: vars.randomScalar / 2 },
      { vec: obstacles(boid), scalar: vars.obstacleScalar * 4 },
    ];
  } else {
    const rey = reynolds(boid, boids);
    rules = [
      {
        name: "sep",
        vec: rey[0],
        enabled: vars.separation,
        scalar: vars.separationScalar,
      },
      {
        name: "ali",
        vec: rey[1],
        enabled: vars.alignment,
        scalar: vars.alignmentScalar,
      },
      {
        name: "coh",
        vec: rey[2],
        enabled: vars.cohesion,
        scalar: vars.cohesionScalar,
      },
      {
        name: "bnd",
        vec: bounds(boid),
        enabled: vars.bounds,
        scalar: vars.boundsScalar,
      },
      {
        name: "ran",
        vec: random(boid),
        enabled: vars.random,
        scalar: vars.randomScalar,
      },
      {
        name: "fle",
        vec: flee(boid),
        enabled: vars.flee,
        scalar: vars.fleeScalar,
      },
      {
        name: "obs",
        vec: obstacles(boid),
        enabled: vars.obstacle,
        scalar: vars.obstacleScalar,
      },
      { enabled: vars.towardsMesh, vec: towards(boid), scalar: 1 },
    ];
  }

  applyRules(rules, acceleration);

  if (boid.subject) {
    setInfo(rules);
    setInfoItem({ name: "acc", vec: acceleration.clone() });
  }

  return acceleration;
}

function applyRules(rules, vector) {
  for (let i = 0; i < rules.length; i++) {
    const { scalar, vec, enabled } = rules[i];
    if (enabled == false) continue;
    vec.multiplyScalar(scalar);
    vector.add(vec);
  }
}
