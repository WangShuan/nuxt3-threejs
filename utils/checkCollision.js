import { Box3 } from 'three';

export const checkCollision = (object1, object2) => {
  const box1 = new Box3().setFromObject(object1);
  const box2 = new Box3().setFromObject(object2);
  return box1.intersectsBox(box2);
}