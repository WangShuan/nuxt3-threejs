<template>
  <div>
    <div class="score">
      <div>分數：{{ score }} | 等級：{{ speed + 1 }}</div>
    </div>
    <canvas ref="game"></canvas>
    <div class="mask" v-if="gameover">
      GAMEOVER.
      <button class="btn" @click="reloadNuxtApp()">RESTART</button>
    </div>
    <div class="mask" v-if="!start">
      使用滑鼠控制飛機位置、使用鍵盤空白鍵射擊，若飛機撞到障礙物則遊戲失敗。
      <button class="btn" @click="start = true">START</button>
    </div>
  </div>
</template>

<script setup>
import { Scene, Color, TextureLoader, PointLight, DodecahedronGeometry, PerspectiveCamera, MeshToonMaterial, SphereGeometry, WebGLRenderer, Clock, MathUtils, BoxGeometry, MeshBasicMaterial, Mesh, MeshStandardMaterial } from 'three';
// 使用 vueuse 獲取視窗寬高
const { width, height } = useWindowSize()
const aspectRatio = computed(() => width.value / height.value)
// 建立場景
const scene = new Scene()
scene.background = new Color('#012128')
// 建立相機
const camera = new PerspectiveCamera(50, aspectRatio.value, 0.1, 1000);
camera.position.set(0, 0, 5)
camera.lookAt(0, 0, 0)
scene.add(camera)
// 建立燈光
const light = new PointLight(0xffffff, 10, 100);
light.position.set(0, 3, 3)
scene.add(light);
const light2 = new PointLight(0xffffff, 30, 100);
light2.position.set(0, 2, -3)
light2.castShadow = true;
light2.shadow.radius = 3;
scene.add(light2);
// 初始化渲染器
let renderer;
const game = ref()
const initRenderer = () => {
  if (game.value) {
    renderer = new WebGLRenderer({ canvas: game.value, alpha: true });
    renderer.sortObjects = true;
    renderer.shadowMap.enabled = true
    updateRender()
  }
}
// 更新渲染器
const updateRender = () => {
  renderer.setSize(width.value, height.value)
  renderer.render(scene, camera);
}
// 監聽螢幕寬高變化 更新相機與渲染器
watch(aspectRatio, () => {
  camera.aspect = aspectRatio.value
  camera.updateProjectionMatrix()
  updateRender()
})

// 建立星星背景
const createStars = () => {
  const stars = [];
  for (let i = 0; i < 200; i++) {
    const star = new Mesh(new SphereGeometry(0.015, 10, 64), new MeshBasicMaterial({ color: colorCode() }))
    star.position.set(
      MathUtils.randFloatSpread(20),
      MathUtils.randFloatSpread(20),
      MathUtils.randFloatSpread(10) > -5 ? MathUtils.randFloatSpread(10) - 10 : MathUtils.randFloatSpread(10)
    );
    stars.push(star)
    scene.add(star)
  }
  return stars;
};
const stars = createStars();

// 建立子彈
const bullets = ref([])
const createBullets = (bullet) => {
  const b = new Mesh(new BoxGeometry(0.1, 0.01, 0.05), new MeshBasicMaterial())
  b.position.set(bullet.x, bullet.y, bullet.z)
  b.material.transparent = true;
  b.castShadow = true
  scene.add(b)
  bullets.value.push(b)
}

// 建立障礙物
const obstacles = ref([])
const createObstacles = () => {
  const o = new Mesh(new DodecahedronGeometry(0.1, 0, 0), new MeshToonMaterial({ color: 'gold' }))
  o.userData.theta = MathUtils.randFloatSpread(Math.PI / 12)
  o.userData.x = MathUtils.randFloatSpread(10) / 10;
  o.userData.y = MathUtils.randFloatSpread(10) / 10;
  o.castShadow = true
  scene.add(o);
  obstacles.value.push(o);
}

// 做一個旋轉的星球當底
const material = new MeshStandardMaterial({ normalMap: new TextureLoader().load('/textures/Rock035_2K_NormalGL.jpg') })
const floor = new Mesh(new SphereGeometry(3, 64, 64), material)
floor.position.y = -4
floor.renderOrder = 100
floor.receiveShadow = true
floor.material.depthTest = false;
scene.add(floor)

// 載入飛機模型
const { load } = useGLTFModel()
const { scene: model } = await load('/models/airplane.gltf')
model.rotation.set(0, Math.PI / 2, 0.3)
model.position.y = 2;
model.scale.set(1.5, 1.5, 1.5)
model.traverse((node) => {
  if (node.isMesh) {
    node.material.transparent = true
    node.castShadow = true
  }
});
scene.add(model)

// 使用 vuesue 獲取滑鼠鼠標位置
const { x, y } = useMouse()
const gameover = ref(false)
const score = ref(0)
const speed = ref(0)
// 處理動畫
const clock = new Clock()
const loop = () => {
  const delta = clock.getDelta();
  // 讓底部星球旋轉
  floor.rotation.z += delta * 0.25
  // 處理星星
  stars.forEach((s, i) => {
    s.position.y += i % 2 ? -0.0002 : 0.0005
    s.position.x += i % 2 ? -0.0006 : 0.0004
  });

  if (bullets.value.length) {
    bullets.value.forEach((bullet, i) => {
      if (bullet) {
        // 讓子彈一直往 x 方向移動
        bullets.value[i].position.x += delta * 2;
        // 超過一定範圍後將障礙物刪除（不然無限增加障礙物電腦會跑不動）
        if (bullet.position.x > 6) {
          bullet.geometry.dispose();
          bullet.material.dispose();
          bullet.parent.remove(bullet)
          bullets.value.splice(i, 1);
        }
      }
    });
  }

  if (obstacles.value.length > 0) {
    obstacles.value.forEach((obstacle, i) => {
      if (obstacle) {
        // 障礙物繞著底部星球旋轉移動
        obstacle.rotation.z += Math.abs(obstacle.userData.x + obstacle.userData.y) / 30
        obstacle.userData.theta += Math.abs(obstacle.userData.x + obstacle.userData.y) / 300 + speed.value / 1000
        const x = 3.3 * Math.cos(obstacle.userData.theta) + obstacle.userData.x;
        const y = 3.3 * Math.sin(obstacle.userData.theta) - obstacle.userData.y - 3;
        obstacle.position.set(x, y, 0);
        // 處理飛機與障礙物相撞
        if (checkCollision(model, obstacle)) {
          gameover.value = true;
          stop()
        }
        // 處理子彈與障礙物相撞
        bullets.value.forEach((bullet, j) => {
          if (bullet && obstacle && checkCollision(bullet, obstacle)) {
            bullet.geometry.dispose();
            bullet.material.dispose();
            bullet.parent.remove(bullet)
            bullets.value.splice(j, 1);
            obstacle.geometry.dispose();
            obstacle.material.dispose();
            obstacle.parent.remove(obstacle)
            obstacles.value.splice(i, 1);
            // 分數增加、每十分加速度
            score.value += 1
            if (score.value % 10 === 0) speed.value += 1
          }
        });
      }
    })
  }
  // 處理飛機移動
  if (gameover.value) {
    model.rotation.z = lerp(model.rotation.z, Math.PI / 2, 0.5)
    model.position.y -= delta
  } else {
    model.position.x = lerp(model.position.x, x.value / width.value * 2 - 1, 0.05)
    model.position.y = lerp(model.position.y, 1 - y.value / height.value * 2, 0.05)
  }
  // 渲染
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
};

onMounted(() => {
  initRenderer()
  loop()
})

// 使用 vueuse 監聽鍵盤事件發射子彈
const stop = useEventListener(document, 'keyup', (e) => {
  if (e.code == 'Space') {
    createBullets({
      x: model.position.x + 0.325,
      y: model.position.y,
      z: model.position.z
    })
  }
})
// 遊戲開始後每兩秒生成一個障礙物
const start = ref(false)
watch(start, () => {
  if (start.value) {
    setInterval(() => {
      createObstacles()
    }, 2000)
  }
})
</script>

<style >
.mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  font-size: 24px;
  background: #0000007c;
  color: #fff;
}

.btn {
  background: #000;
  color: #fff;
  border: 1px solid #fff;
  border-radius: 8px;
  padding: 4px 8px;
  margin-top: 8px;
  cursor: pointer;
}

.btn:hover {
  background: #fff;
  color: #000;
}

.score {
  position: fixed;
  top: 50px;
  width: 100%;
  text-align: center;
  color: #fff;
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
}
</style>