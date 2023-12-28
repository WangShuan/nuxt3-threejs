<template>
  <div>
    <div ref="css3DContainer" class="css3d-container"></div>
    <canvas ref="experience"></canvas>
  </div>
</template>

<script setup>
import { Scene, Color, PerspectiveCamera, PointLight, TextureLoader, Group, CylinderGeometry, MeshLambertMaterial, SphereGeometry, WebGLRenderer, PlaneGeometry, AnimationMixer, Clock, LoopOnce, MathUtils, BoxGeometry, MeshBasicMaterial, Mesh, MeshStandardMaterial } from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// 使用 vueuse 獲取螢幕寬高
const { width, height } = useWindowSize()
// 獲取即時的 Window 寬高 用 computed 換成比例
const aspectRatio = computed(() => width.value / height.value)
// 建立場景
const scene = new Scene()
scene.background = new Color('#000000')
// 建立相機
const camera = new PerspectiveCamera(50, aspectRatio.value, 0.1, 1000);
camera.position.set(0, 20, 40)
camera.lookAt(0, 0, 0)
scene.add(camera)
// 建立燈光
const light = new PointLight(0xffffff, 2, 45, 0);
light.position.set(0, 10, 20)
light.castShadow = true;
light.shadow.radius = 10;
scene.add(light);
// 載入模型
const { load } = useGLTFModel()
const { scene: model, animations } = await load('/models/ugly-naked-bunny.gltf')
model.position.y = -1.5
model.traverse((node) => {
  if (node.isMesh) node.castShadow = true;
});
scene.add(model)
// 設置動畫
const mixer = new AnimationMixer(model)
const animateAction = mixer.clipAction(animations[1])
animateAction.loop = LoopOnce
animateAction.setDuration = 5
const playAction = () => {
  animateAction.reset()
  animateAction.play()
}
// 設置預設的參數給模型用
const x = ref(0)
const z = ref(18)
const r = ref(Math.PI)
const hasOpen = ref(false)
const move = (axis, value, rotation) => {
  hasOpen.value = false;
  axis.value += value;
  r.value = rotation;
  playAction();
};
// 監聽鍵盤事件移動模型
useEventListener(document, 'keypress', (e) => {
  if (e.code === 'KeyW') move(z, -1, Math.PI);
  if (e.code === 'KeyS') move(z, 1, 0);
  if (e.code === 'KeyA') move(x, -1, -Math.PI / 2);
  if (e.code === 'KeyD') move(x, 1, Math.PI / 2);
})
// 宣告渲染器
let renderer;
// 宣告參數用來綁定 canvas
const experience = ref()
// 初始化渲染器
const initRenderer = () => {
  if (experience.value) {
    renderer = new WebGLRenderer({ canvas: experience.value });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
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
const createStars = () => {
  const stars = [];
  for (let i = 0; i < 200; i++) {
    const star = new Mesh(new SphereGeometry(0.05, 10, 64), new MeshBasicMaterial({ color: colorCode() }));
    const x = MathUtils.randFloat(-80, 80 * 2);
    const y = MathUtils.randFloatSpread(30);
    const z = MathUtils.randFloat(-50, -30);
    star.position.set(x, y, z);
    scene.add(star);
    stars.push(star);
  }
  return stars;
};
const stars = createStars();

// 建立樹木
const arr = [[25, 0, -5], [5, 0, 0], [15, 0, -15], [-10, 0, -5], [-20, 0, -15], [-23, 0, 7], [-12, 0, 18], [17, 0, 13]]
const createTrees = () => {
  for (let i = 0; i < 8; i++) {
    const treeGroup = new Group();
    const top = new Mesh(new CylinderGeometry(0.3, 0.5, 3, 10), new MeshLambertMaterial({ color: new Color('orange') }));
    treeGroup.add(top);
    top.castShadow = true
    const bottom = new Mesh(new SphereGeometry(2, 10, 64), new MeshLambertMaterial({ color: new Color('green') }));
    bottom.position.set(0, 3, 0);
    bottom.castShadow = true
    treeGroup.add(bottom);
    treeGroup.position.set(arr[i][0], arr[i][1], arr[i][2]);
    scene.add(treeGroup);
  }
}
createTrees()

const threejsLearningDemo = ref()
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
createDoor(14, 1.5, 10, threejsLearningDemo, 'black', `<div class="door-name">GitHub 連結</div>`)
createDoor(-2, 1.5, 0, threejsLearningNote, '#82DBC5', `<div class="door-name">Three.js 學習筆記</div>`)
createDoor(-19, 1.5, 5, threejsShootingGame, 'yellow', `<div class="door-name">Three.js 射擊小遊戲</div>`)

// 建立地板
const createFloor = () => {
  const material = new MeshStandardMaterial();
  const texture = new TextureLoader().load('/textures/floor.jpg');
  material.map = texture;
  const floor = new Mesh(new PlaneGeometry(80, 50), material);
  floor.rotateX(-Math.PI / 2);
  floor.position.y = -1.5;
  floor.receiveShadow = true;
  scene.add(floor);
};
createFloor();

// 處理門的開闔
const handleObject = (object, targetRotation) => {
  if (object.threejs.value) {
    const p = { x: object.threejs.value.position.x - 2, y: object.threejs.value.position.y, z: object.threejs.value.position.z };
    if (calculateDistance(model.position, p) <= 3) {
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
// 設定動畫
const clock = new Clock()
const loop = () => {
  const delta = clock.getDelta();
  // 處理模型動畫
  if (mixer) mixer.update(delta);
  // 處理星星
  stars.forEach((s) => (s.position.y += 0.01));
  // 判斷模型與門是否相交、處理模型移動
  if (model) {
    model.rotation.y = r.value;
    model.position.x = x.value;
    model.position.z = z.value;
    handleObject({ threejs: threejsLearningDemo, url: 'https://github.com/WangShuan/nuxt3-threejs' }, -Math.PI / 2);
    handleObject({ threejs: threejsLearningNote, url: 'https://hackmd.io/m1efJfseSTqB88oz8Qqm7g?view' }, -Math.PI / 2);
    handleObject({ threejs: threejsShootingGame, url: '/game' }, -Math.PI / 2);
  }

  // 執行渲染
  css3dRenderer.render(scene, camera);
  renderer.render(scene, camera);
  // 調用 requestAnimationFrame 讓動畫每幀執行
  requestAnimationFrame(loop);
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
