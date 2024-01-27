<template>
  <div>
    <canvas ref="experience"></canvas>
  </div>
</template>

<script setup>
import { Scene, AxesHelper, PerspectiveCamera, DirectionalLight, Vector2, Raycaster, SphereGeometry, WebGLRenderer, PlaneGeometry, AnimationMixer, Clock, LoopOnce, MathUtils, BoxGeometry, MeshBasicMaterial, Mesh, MeshStandardMaterial, Color } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import * as CANNON from 'cannon-es'



const { width, height } = useWindowSize()

const aspectRatio = computed(() => width.value / height.value)

const scene = new Scene()
const camera = new PerspectiveCamera(50, aspectRatio.value, 0.1, 1000);
camera.position.set(0, 2, 50)
camera.lookAt(0, 0, 0)
scene.add(camera)
const light = new DirectionalLight(0xffffff, 2);
light.position.set(0, 10, 20)
scene.add(light);

const world = new CANNON.World()
world.gravity.set(0, -9.82, 0)

let renderer;
let controls;
const experience = ref()
const initRenderer = () => {
  if (experience.value) {
    renderer = new WebGLRenderer({ canvas: experience.value });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    controls = new OrbitControls(camera, experience.value)
    updateRender()
  }
}

const updateRender = () => {
  renderer.setSize(width.value, height.value)
  renderer.render(scene, camera)
}

watch(aspectRatio, () => {
  camera.aspect = aspectRatio.value
  camera.updateProjectionMatrix()
  updateRender()
})

onMounted(() => {
  initRenderer()
  loop()
})

const createFloor = () => {
  const floor = new Mesh(new PlaneGeometry(25, 25), new MeshStandardMaterial());
  floor.rotateX(-Math.PI / 2);
  floor.position.y = -10;
  scene.add(floor);

  const planeShape = new CANNON.Plane()
  const planeBody = new CANNON.Body({ mass: 0 })
  planeBody.addShape(planeShape)
  planeBody.position.y = floor.position.y
  planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
  world.addBody(planeBody)

  const floor2 = new Mesh(new PlaneGeometry(1000, 1000), new MeshStandardMaterial());
  floor2.position.z = -2;
  scene.add(floor2);
  const planeShape2 = new CANNON.Plane()
  const planeBody2 = new CANNON.Body({ mass: 0 })
  planeBody2.addShape(planeShape2)
  planeBody2.position.z = floor2.position.z
  world.addBody(planeBody2)

  const planeShape3 = new CANNON.Plane()
  const planeBody3 = new CANNON.Body({ mass: 0.0001 })
  planeBody3.addShape(planeShape3)
  planeBody3.position.z = -floor2.position.z
  world.addBody(planeBody3)
};
createFloor();

const createBoard = () => {
  for (let i = 0; i < 4; i++) {
    const board1 = new Mesh(new BoxGeometry(20, 0.2, 4), new MeshStandardMaterial({ color: new Color('orange') }))
    board1.position.set(i % 2 == 0 ? -8 : 8, -5 + 5 * i, 0)
    board1.rotation.set(0, 0, i % 2 == 0 ? -Math.PI / 12 : Math.PI / 12)
    scene.add(board1)
    const board1Shape = new CANNON.Box(new CANNON.Vec3(10, 0.1, 2))
    const board1Body = new CANNON.Body({ mass: 0 })
    board1Body.material = new CANNON.Material()
    board1Body.material.friction = 0
    board1Body.addShape(board1Shape)
    board1Body.position.x = board1.position.x
    board1Body.position.y = board1.position.y
    board1Body.position.z = board1.position.z
    board1Body.quaternion.copy(board1.quaternion)
    world.addBody(board1Body)
  }
}
createBoard()

const dominoMesh = []
const dominoBody = []
for (let i = 0; i < 10; i++) {
  const cube = new Mesh(new BoxGeometry(0.2, 4, 1), new MeshStandardMaterial({ color: new Color('blue') }))
  cube.position.set(4 + i * 2, -8, 0)
  scene.add(cube)
  dominoMesh.push(cube)
  const dominohape = new CANNON.Box(new CANNON.Vec3(0.1, 2, 0.5))
  const cubeBody = new CANNON.Body({ mass: 1 })
  cubeBody.material = new CANNON.Material()
  cubeBody.material.friction = 0
  cubeBody.addShape(dominohape)
  cubeBody.position.x = cube.position.x
  cubeBody.position.y = cube.position.y
  cubeBody.position.z = cube.position.z
  world.addBody(cubeBody)
  dominoBody.push(cubeBody)
}

let ball, ballBody
const mouse = new Vector2();
const raycaster = new Raycaster();
useEventListener(document, 'click', (e) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(scene.children);

  if (intersects.length > 0) {
    const intersectionPoint = intersects[0].point;
    createBall(intersectionPoint.x, intersectionPoint.y)
  }
})

const ballsMesh = []
const ballsBody = []
const createBall = (x, y) => {
  ball = new Mesh(new SphereGeometry(0.5, 32, 32), new MeshStandardMaterial({ color: new Color('#eee') }))
  ball.position.set(x, y, 0)
  scene.add(ball)
  ballsMesh.push(ball)
  ballBody = new CANNON.Body({ mass: 100 })
  const ballShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))
  ballBody.addShape(ballShape)
  ballBody.material = new CANNON.Material()
  ballBody.material.friction = 0
  ballBody.position.x = ball.position.x
  ballBody.position.y = ball.position.y
  ballBody.position.z = ball.position.z
  world.addBody(ballBody)
  ballsBody.push(ballBody)
}

// const cannonDebugger = CannonDebugger(scene, world)

const loop = () => {
  controls.update()

  world.step(1 / 60)

  if (ballsMesh.length) {
    for (let i = 0; i < ballsMesh.length; i++) {
      ballsMesh[i].position.set(ballsBody[i].position.x, ballsBody[i].position.y, ballsBody[i].position.z)
      ballsMesh[i].quaternion.set(ballsBody[i].quaternion.x, ballsBody[i].quaternion.y, ballsBody[i].quaternion.z, ballsBody[i].quaternion.w)
    }
  }

  for (let i = 0; i < 10; i++) {
    dominoMesh[i].position.set(dominoBody[i].position.x, dominoBody[i].position.y, dominoBody[i].position.z)
    dominoMesh[i].quaternion.set(dominoBody[i].quaternion.x, dominoBody[i].quaternion.y, dominoBody[i].quaternion.z, dominoBody[i].quaternion.w)
  }


  renderer.render(scene, camera);
  requestAnimationFrame(loop);
};
</script>
