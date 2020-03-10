function addFood() {
  for (let i = 0; i < 100; i++) {
    const mat = new THREE.SpriteMaterial({ color: 0x1dab70 });
    const food = new THREE.Sprite(mat);
    food.index = i;
    food.ownTime = 0;

    food.position.set(
      vars.boundSize * ran.nextFloat(),
      vars.boundSize * ran.nextFloat(),
      vars.boundSize * ran.nextFloat()
    );
    food.orgPos = food.position.clone();
    food.scale.set(0.15, 0.15, 0.15);

    foods.push(food);
    scene.add(food);
  }
}

function animateFood(delta) {
  for (let i = 0; i < 100; i++) {
    const playDelta = (vars.playSpeed * delta) / 16;
    const food = foods[i];

    const steer = new THREE.Vector3();
    const turbulence = new THREE.Vector3(
      simplex.noise2D(food.ownTime * 1, (food.index + 1) * 10),
      simplex.noise2D(food.ownTime * 1, (food.index + 1) * 100),
      simplex.noise2D(food.ownTime * 1, (food.index + 1) * 1000)
    );
    const keepOrg = food.orgPos.clone().sub(food.position);

    turbulence.multiplyScalar(2);
    keepOrg.multiplyScalar(1);
    steer.add(turbulence);
    steer.add(keepOrg);
    steer.multiplyScalar(0.1);
    food.position.add(steer);

    food.ownTime += playDelta / 5000;
  }
}

function eatFood(index) {
  const food = foods[index];
  food.visible = false;
  //   console.log(food);
}
