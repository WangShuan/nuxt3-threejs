<template>
  <div>
    <div ref="css3DContainer" class="css3d-container"></div>
    <canvas ref="experience"></canvas>
  </div>
</template>

<script setup>
import { Scene, Color, Fog, RepeatWrapping, PerspectiveCamera, PointLight, TextureLoader, Group, TorusKnotGeometry, CylinderGeometry, SphereGeometry, WebGLRenderer, PlaneGeometry, AnimationMixer, Clock, LoopOnce, MathUtils, BoxGeometry, MeshBasicMaterial, Mesh, MeshStandardMaterial } from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import * as CANNON from 'cannon-es';
// import CannonDebugger from 'cannon-es-debugger' // 用來查看 world 中的物體

// 使用 vueuse 獲取螢幕寬高
const { width, height } = useWindowSize()
// 獲取即時的 Window 寬高 用 computed 換成比例
const aspectRatio = computed(() => width.value / height.value)
// 建立場景
const scene = new Scene()
scene.background = new Color('#010629');
scene.fog = new Fog(0xffffff, 1000, 4000);
// 建立相機
const camera = new PerspectiveCamera(50, aspectRatio.value, 0.1, 1000);
camera.position.set(0, 15, 45)
camera.lookAt(0, 0, 0)
scene.add(camera)
// 建立燈光
const light2 = new PointLight(0xffffff, 1, 60, 0);
light2.castShadow = true;
light2.shadow.radius = 5;
light2.position.set(-10, 14, 10)
scene.add(light2)

// 創建世界
const world = new CANNON.World()
world.gravity.set(0, -9.82, 0) // 設定物理重力

// 載入模型
const { load } = useGLTFModel()
const { scene: model, animations } = await load('/models/ugly-naked-bunny.gltf')
model.traverse((node) => {
  if (node.isMesh) node.castShadow = true;
});
scene.add(model)

const modelShape = new CANNON.Box(new CANNON.Vec3(2 / 2, 2.5 / 2, 2 / 2))
const modelBody = new CANNON.Body({ mass: 1 }) // 設定質量為 1 讓其擁有重力效果
modelBody.addShape(modelShape)
world.addBody(modelBody)

// 設置動畫
const mixer = new AnimationMixer(model)
const animateAction = mixer.clipAction(animations[1])
animateAction.loop = LoopOnce
animateAction.setDuration = 1
const playAction = () => {
  animateAction.reset()
  animateAction.play()
}
// 設置預設的參數給模型用
const x = ref(0)
const z = ref(18)
const r = ref(Math.PI)
const hasOpen = ref(false)
// 監聽鍵盤事件移動模型
useEventListener(document, 'keypress', (e) => {
  hasOpen.value = false;
  if (e.repeat) return
  if (e.code === 'KeyW') {
    z.value -= 1
    r.value = Math.PI
    playAction();
    modelBody.position.z -= 1
  }
  if (e.code === 'KeyS') {
    z.value += 1
    r.value = 0
    playAction();
    modelBody.position.z += 1
  }
  if (e.code === 'KeyA') {
    x.value -= 1
    r.value = -Math.PI / 2
    playAction();
    modelBody.position.x -= 1
  }
  if (e.code === 'KeyD') {
    x.value += 1
    r.value = Math.PI / 2
    playAction();
    modelBody.position.x += 1
  }
})
// 宣告渲染器
let renderer, controls;
// 宣告參數用來綁定 canvas
const experience = ref()
// 初始化渲染器
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
// 監聽螢幕寬高變化 更新相機與渲染器
watch(aspectRatio, () => {
  camera.aspect = aspectRatio.value
  camera.updateProjectionMatrix()
  updateRender()
})

const css3DContainer = ref();
// 創建 CSS3DRenderer
const css3dRenderer = new CSS3DRenderer();
css3dRenderer.setSize(width.value, height.value);
css3dRenderer.domElement.style.position = 'absolute';
css3dRenderer.domElement.style.top = '0';

onMounted(() => {
  initRenderer()
  loop()
  if (css3DContainer.value) css3DContainer.value.appendChild(css3dRenderer.domElement);
})

// 建立星星背景
const stars = [];
for (let i = 0; i < 20; i++) {
  const sr = Math.random() < 0.3 ? Math.random() : 0.3
  const star = new Mesh(new TorusKnotGeometry(sr, sr / 5, 5, 5, 20, 2), new MeshBasicMaterial({ color: 'gold' }))
  const x = MathUtils.randFloat(-80, 80 * 2);
  const y = MathUtils.randFloatSpread(50);
  const z = MathUtils.randFloat(-50, -80);
  star.position.set(x, y, z);
  star.rotation.x = Math.PI / 2
  scene.add(star);
  stars.push(star);
}

// 建立雲
const coulds = [];
const posis = [[3, 10, -20], [15, 13, 18], [-15, 10, 6], [-35, 10, 6], [-80, 10, -8]]
const createCould = () => {
  for (let i in posis) {
    const couldGroup = new Group()
    for (let j = -2; j <= 2; j++) {
      const could = new Mesh(new SphereGeometry(1, 64, 64), new MeshStandardMaterial({ color: 0xffffff }));
      could.position.set(j, j == 1 || j == -1 ? 1 : 0, 0);
      couldGroup.add(could)
    }
    couldGroup.position.set(posis[i][0], posis[i][1], posis[i][2])
    scene.add(couldGroup);
    coulds.push(couldGroup)
  }
}
createCould()

// 建立月亮
const moon = new Mesh(new SphereGeometry(2, 64, 64, Math.PI / 6, Math.PI / 3), new MeshStandardMaterial({ color: 'yellow', emissiveIntensity: 1, metalness: 0.5, roughness: 0.5, emissive: '#cccca3', side: 2 }))
moon.position.set(-10, 14, 10)
moon.rotation.y = -Math.PI / 2.5
scene.add(moon)

// 建立樹木
const arr = []
for (let j = 0; j <= 5; j++) {
  for (let i = 0; i <= 4; i++) {
    arr.push({ i: i, j: j, x: 1.5 + (i * 2.25), y: -1, z: 2 + j })
    arr.push({ i: i, j: j, x: -12.75 + (i * 2.25), y: -1, z: 2 + j })
  }
}
const boleColors = ['#896f47', '#806742', '#987B4E']
const leafColors = ['#407f3f', '#417b40', '#427640']
const createTrees = () => {
  arr.forEach(item => {
    const treeGroup = new Group();

    const body1 = new Mesh(new CylinderGeometry(0.2, 0.24, 2, 5), new MeshStandardMaterial({ color: new Color(boleColors[Math.floor(Math.random() * 3)]) }));
    body1.position.set(-0.75, 0, 0)
    body1.rotation.z = Math.PI / 4
    treeGroup.add(body1);
    body1.castShadow = true

    const body2 = new Mesh(new SphereGeometry(2, 8, 4), new MeshStandardMaterial({ color: new Color(leafColors[Math.floor(Math.random() * 3)]) }));
    body2.position.set(-1, 1.5, 0)
    treeGroup.add(body2);
    body2.castShadow = true

    const body3 = new Mesh(new CylinderGeometry(0.2, 0.24, 2, 5), new MeshStandardMaterial({ color: new Color(boleColors[Math.floor(Math.random() * 3)]) }));
    body3.position.set(0.75, 0, 0)
    body3.rotation.z = -Math.PI / 4
    treeGroup.add(body3);
    body3.castShadow = true

    const body4 = new Mesh(new SphereGeometry(1.5, 8, 4), new MeshStandardMaterial({ color: new Color(leafColors[Math.floor(Math.random() * 3)]) }));
    body4.position.set(1, 1, 0)
    treeGroup.add(body4);
    body4.castShadow = true

    treeGroup.position.set(item.x, item.y, item.z - 1);
    treeGroup.rotation.y = Math.PI / item.i + item.j
    treeGroup.scale.set(0.5, 0.5, 0.5)
    scene.add(treeGroup);
  })
}
createTrees()

for (let i = 0; i < 20; i++) {
  const { load } = useGLTFModel()
  const { scene: model } = await load('/models/autumn_lowpoly_grass/scene.gltf')
  model.traverse((node) => {
    if (node.isMesh) node.castShadow = true;
  });
  model.position.set(i % 2 ? 18 : -18, -1, MathUtils.randFloat(-12, 12) + 12)

  const rock = new Mesh(new SphereGeometry(MathUtils.randFloat(0.12, 0.07), 8, 4), new MeshStandardMaterial({ color: new Color(i % 2 ? '#aaa' : '#eee') }));
  rock.position.set(MathUtils.randFloat(-17, 17), -1.5, MathUtils.randFloat(-10, 10) + 15)
  scene.add(model, rock)
}

// 建立柵欄
const arr2 = []
for (let i = 0; i <= 24; i++) {
  if (i <= 7) {
    arr2.push([2.5, -1, 1 * i + 0.5, true])
    arr2.push([-2.5, -1, 1 * i + 0.5, true])
    arr2.push([-12.5, -1, 1 * i + 0.5, true])
    arr2.push([12.5, -1, 1 * i + 0.5, true])
  }
  if (i <= 9) {
    arr2.push([-3 + -1 * i, -1, 8, false])
    arr2.push([3 + 1 * i, -1, 8, false])
  }
  arr2.push([17.5, -1, 1 * i, true])
  arr2.push([-17.5, -1, 1 * i, true])
}
const createFences = () => {
  arr2.forEach(item => {
    const fencesGroup = new Group();
    const a = new Mesh(new BoxGeometry(0.25, 0.25, 1), new MeshStandardMaterial({ color: new Color('#f3ce96') }));
    a.rotation.y = item[3] === false ? Math.PI / 2 : 0
    fencesGroup.add(a);
    a.castShadow = true

    const b = new Mesh(new BoxGeometry(0.25, 1, 0.25), new MeshStandardMaterial({ color: new Color('#f3ce96') }));
    fencesGroup.add(b);
    b.castShadow = true

    const bShape = new CANNON.Box(new CANNON.Vec3(0.25 / 2, 1 / 2, 0.25 / 2))
    const bBody = new CANNON.Body({ mass: 0 })
    bBody.addShape(bShape)
    bBody.position.x = item[0]
    bBody.position.y = item[1]
    bBody.position.z = item[2]
    world.addBody(bBody)

    fencesGroup.position.set(item[0], item[1], item[2]);
    scene.add(fencesGroup);
  })
}
createFences()

const threejsBallsGame = ref()
const threejsLearningNote = ref()
const threejsShootingGame = ref()
// 建立門
const createDoor = (a, b, c, threejs, color, htmlContent) => {
  const doorGroup = new Group();
  doorGroup.position.x = a + 2;
  doorGroup.position.y = b;
  doorGroup.position.z = c;
  // 門片
  const door = new Mesh(new BoxGeometry(4, 6, 0.2), new MeshStandardMaterial({ color }));
  door.position.x = -2
  door.castShadow = true;
  doorGroup.add(door)
  // 門把
  const doorknob = new Mesh(new SphereGeometry(0.3, 64, 64), new MeshStandardMaterial({ color: 'white' }))
  doorknob.position.x = -3.25
  doorknob.position.y = -0.5
  doorknob.castShadow = true;
  doorGroup.add(doorknob)
  // 建立 CSS3DObject
  const details = document.createElement('div');
  details.innerHTML = htmlContent;
  const objectCSS = new CSS3DObject(details);
  objectCSS.position.x = -2
  objectCSS.position.y = 1
  objectCSS.scale.set(0.1, 0.1, 0.1)
  doorGroup.add(objectCSS);
  scene.add(doorGroup);
  threejs.value = doorGroup
  // 建立門框
  const doorframe1 = new Mesh(new BoxGeometry(0.3, 6.2, 0.3), new MeshStandardMaterial({ color: 'white' }));
  doorframe1.position.x = a - 2;
  doorframe1.position.y = b;
  doorframe1.position.z = c;
  scene.add(doorframe1)
  const doorframe2 = new Mesh(new BoxGeometry(0.3, 6.2, 0.3), new MeshStandardMaterial({ color: 'white' }));
  doorframe2.position.x = a + 2;
  doorframe2.position.y = b;
  doorframe2.position.z = c;
  scene.add(doorframe2)
  const doorframe3 = new Mesh(new BoxGeometry(4, 0.3, 0.3), new MeshStandardMaterial({ color: 'white' }));
  doorframe3.position.x = a;
  doorframe3.position.y = b + 2.95;
  doorframe3.position.z = c;
  scene.add(doorframe3)
}
createDoor(15, 1.5, 0, threejsBallsGame, 'black', `<div class="door-name">Three.js 碰撞小遊戲</div>`)
createDoor(0, 1.5, 0, threejsLearningNote, '#82DBC5', `<div class="door-name">Three.js 學習筆記</div>`)
createDoor(-15, 1.5, 0, threejsShootingGame, 'yellow', `<div class="door-name">Three.js 射擊小遊戲</div>`)

// 建立大地板
const createFloor = () => {
  const material = new MeshStandardMaterial();
  const texture = new TextureLoader().load('/textures/floor.jpg');
  material.map = texture;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.offset.set(0, 0);
  texture.repeat.set(4, 2);
  const floor = new Mesh(new PlaneGeometry(160, 50), material);
  floor.rotateX(-Math.PI / 2);
  floor.position.y = -1.5;
  floor.position.z = 15;
  floor.receiveShadow = true;
  scene.add(floor);

  const planeShape = new CANNON.Plane() // CANNON 的地板預設就是無限大，無法設定尺寸
  const planeBody = new CANNON.Body({ mass: 0 }) // 設定重力為 0 讓平面靜止不動
  planeBody.addShape(planeShape)
  planeBody.position.y = -1.5;
  planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
  world.addBody(planeBody)
};
createFloor();

// 建立小地板
const createRoad = () => {
  const material = new MeshStandardMaterial({ color: 'gold' });
  const texture = new TextureLoader().load('/textures/road.jpeg');
  material.map = texture;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.offset.set(0, 0);
  texture.repeat.set(1.73, 1.2);
  const floor = new Mesh(new PlaneGeometry(36, 25), material);
  floor.rotateX(-Math.PI / 2);
  floor.position.y = -1.49;
  floor.position.z = 12;
  floor.receiveShadow = true;
  scene.add(floor);
};
createRoad();

// 處理門的開闔
const handleObject = (object, targetRotation) => {
  if (object.threejs.value) {
    const p = { x: object.threejs.value.position.x - 2, y: object.threejs.value.position.y - 1, z: object.threejs.value.position.z };
    if (calculateDistance(model.position, p) <= 3.5) {
      if (!hasOpen.value) {
        hasOpen.value = true;
        setTimeout(() => {
          navigateTo(object.url, {
            external: true,
            open: {
              target: '_blank',
            },
          });
        }, 800);
      } else {
        if (object.threejs.value.rotation.y > targetRotation) {
          object.threejs.value.rotation.y = lerp(object.threejs.value.rotation.y, targetRotation, 0.1);
        }
      }
    } else {
      object.threejs.value.rotation.y = lerp(object.threejs.value.rotation.y, 0, 0.1);
    }
  }
};
// const cannonDebugger = CannonDebugger(scene, world)

// 設定動畫
const clock = new Clock()
const loop = () => {
  // cannonDebugger.update()

  const delta = clock.getDelta();
  // 處理模型動畫
  if (mixer) mixer.update(delta);

  stars.forEach((s) => (s.position.y += 0.005));
  coulds.forEach(c => c.position.x += 0.01)
  world.fixedStep()

  // 判斷模型與門是否相交、處理模型移動
  if (model) {
    model.rotation.y = r.value;
    model.position.x = x.value;
    model.position.z = z.value;
    modelBody.position.z = model.position.z
    model.position.set(modelBody.position.x, modelBody.position.y - 1.3, modelBody.position.z)
    modelBody.quaternion.copy(model.quaternion)
    handleObject({ threejs: threejsBallsGame, url: '/balls' }, -Math.PI / 2);
    handleObject({ threejs: threejsLearningNote, url: 'https://hackmd.io/m1efJfseSTqB88oz8Qqm7g?view' }, -Math.PI / 2);
    handleObject({ threejs: threejsShootingGame, url: '/game' }, -Math.PI / 2);
  }

  // 執行渲染
  css3dRenderer.render(scene, camera);
  renderer.render(scene, camera);
  // 調用 requestAnimationFrame 讓動畫每幀執行
  requestAnimationFrame(loop);

  controls.update()
};
</script>

<style>
.css3d-container {
  position: absolute;
  top: 0;
  pointer-events: none;
}

.door-name {
  width: 80px;
  text-align: center;
  transform: scale(0.35);
  color: #fff;
  pointer-events: auto;
}
</style>
