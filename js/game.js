import { AssetManager, GameObject, Timer } from 'black-engine';

import { TileRaycaster2dDemo } from './tile-raycaster';

export class Game extends GameObject {
  constructor() {
    super();

    const assets = new AssetManager();

    assets.on('complete', this.onAssetsLoadded, this);

    assets.loadQueue();
  }

  onAssetsLoadded(m) {
    this.touchable = true;

    const demo = this.addChild(new TileRaycaster2dDemo());

    this.addComponent(new Timer(0.1, 1)).on('tick', () => demo.start());
  }
}