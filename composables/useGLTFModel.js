import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function useGLTFModel() {
  const gltfLoader = new GLTFLoader()
  function load(url) {
    return new Promise((res, rej) => {
      gltfLoader.load(url, res, undefined, rej)
    })
  }

  return { load }
}