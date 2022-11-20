import { Black, CapsStyle, DisplayObject, FontStyle, FontWeight, Graphics, TextField, Vector, Rectangle, ColorHelper, RGB } from "black-engine";
import ResizeActionComponent from "./libs/resize-action-component";

const GRID_SIZE = 100;
const TILE_SIZE = 40;
const LINE_WIDTH = 0.4;

export class TileRaycaster2dDemo extends DisplayObject {
  constructor() {
    super();

    this.touchable = true;

    this.tiles = [];

    this.gridViewContainer = null;
    this.gridView = null;

    this.startPoint = null;
    this.endPoint = null;
    this.connectingLine = null;
    this.collisionsView = null;

    this.scale = 0.9;
    this.visible = false;

    this._init();
  }

  onAdded() {
    this.addComponent(new ResizeActionComponent(this.onResize, this));
  }

  start() {
    this.onResize();
    this.visible = true;
  }

  onResize() {
    this.gridViewContainer.x = -GRID_SIZE * TILE_SIZE * 0.5;
    this.gridViewContainer.y = -GRID_SIZE * TILE_SIZE * 0.5;

    const stageBounds = Black.stage.bounds;
    const screenBounds = new Rectangle(
      -stageBounds.width * 0.5 / this.scaleX,
      -stageBounds.height * 0.5 / this.scaleY,
      stageBounds.width / this.scaleX,
      stageBounds.height / this.scaleX,
    );

    this.debugText.alignAnchor(0, 1);
    this.debugText.x = screenBounds.left;
    this.debugText.y = screenBounds.bottom;
    this.debugText.scale = 0.5;

    this.title.alignAnchor(0.5, 0);
    this.title.x = 0;
    this.title.y = screenBounds.top + 2;
    this.title.scale = 0.7;

    this.tutorial.alignAnchor(0.5, 0);
    this.tutorial.x = 0;
    this.tutorial.y = this.title.bounds.bottom + 5;
    this.tutorial.scale = 0.7;

    this.background.x = screenBounds.left;
    this.background.y = screenBounds.top;
    this.background.clear();
    this.background.fillStyle(TILE_COLORS[TILE_TYPE.EMPTY]);
    this.background.beginPath();
    this.background.rect(0, 0, screenBounds.width, screenBounds.height);
    this.background.closePath();
    this.background.fill();

    Black.stage.bounds.center().copyTo(this);
  }

  onRender() {
    this.connectingLine.drawConnection(this.startPoint, this.endPoint);

    this._clearCollision();

    this._castRay(this._toGrid(this.startPoint), this._toGrid((this.endPoint)));

    this._drawCollisions();
  }

  _toGrid(pos) {
    return new Vector(pos.x / TILE_SIZE, pos.y / TILE_SIZE);
  }

  _getTile(x, y) {
    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];

      if (tile.x === x && tile.y === y) {
        return tile;
      }
    }

    const tile = new Tile(x, y, TILE_TYPE.EMPTY);

    this.tiles.push(tile);

    return tile;
  }

  _setTile(x, y, type) {
    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];

      if (tile.x === x && tile.y === y) {
        tile.type = type;

        return;
      }
    }

    if (type !== TILE_TYPE.EMPTY) {
      this.tiles.push(new Tile(x, y, type));
    }
  }

  _castRay(a, b) {
    const dX = b.x - a.x;
    const dY = b.y - a.y;

    const castRange = Math.sqrt(dX * dX + dY * dY);

    const sX = Math.abs(castRange / dX);
    const sY = Math.abs(castRange / dY);

    let distByX = 0;
    let distByY = 0;

    let gridX = Math.floor(a.x);
    let gridY = Math.floor(a.y);

    let prevX = gridX;
    let prevY = gridY;

    let offsetX = dX < 0 ? a.x % 1 : 1 - a.x % 1;
    let offsetY = dY < 0 ? a.y % 1 : 1 - a.y % 1;

    offsetX += (a.x < 0) ? sign(-dX) : 0;
    offsetY += (a.y < 0) ? sign(-dY) : 0;

    this.debugText.text = `offsetX: ${offsetX.toFixed(1)} | offsetY: ${offsetY.toFixed(1)} | dX: ${dX.toFixed(1)} | dY: ${dY.toFixed(1)}`;

    const tileType = this._setTileCollided(gridX, gridY);

    if (tileType === TILE_TYPE.WALL_COLLIDE) {
      return; //returning if start position inside a wall
    }

    while (true) {
      distByX = Math.abs(sX * offsetX);
      distByY = Math.abs(sY * offsetY);

      if (Math.min(distByX, distByY) >= castRange) {
        //change colors if zero collisions with walls
        this._setAllCollidesConnected();
        this._setTileCollided(prevX, prevY, TILE_TYPE.CONNECT_LAST);
        this._setTileCollided(gridX, gridY, TILE_TYPE.CONNECT_END);

        break;
      }

      prevX = gridX;
      prevY = gridY;

      if (distByX < distByY) {
        offsetX += 1;
        gridX += sign(dX);
      } else {
        offsetY += 1;
        gridY += sign(dY);
      }

      const tileType = this._setTileCollided(gridX, gridY);

      if (tileType === TILE_TYPE.WALL_COLLIDE) {
        this._setTileCollided(prevX, prevY, TILE_TYPE.EMPTY_LAST_COLLIDE);
        return;
      }
    }
  }

  _setTileCollided(x, y, collideType = null) {
    const tile = this._getTile(x, y);

    if (collideType === null) {
      collideType = (tile.is(TILE_TYPE.WALL)) ? TILE_TYPE.WALL_COLLIDE : TILE_TYPE.EMPTY_COLLIDE
    }

    this._setTile(x, y, collideType);

    return collideType;
  }

  _setAllCollidesConnected() {
    for (let i = 0; i < this.tiles.length; i++) {
      if (!this.tiles[i])
        continue;

      if (this.tiles[i].is(TILE_TYPE.EMPTY_COLLIDE)) {
        this.tiles[i].type = TILE_TYPE.CONNECT;
      }
    }
  }

  _clearCollision() {
    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];

      if (tile.is(TILE_TYPE.WALL_COLLIDE) || tile.is(TILE_TYPE.WALL)) {
        tile.type = TILE_TYPE.WALL;
      } else {
        tile.type = TILE_TYPE.EMPTY;
      }
    }
  }

  _drawCollisions() {
    const g = this.collisionsView;

    g.clear();

    for (let i = 0; i < this.tiles.length; i++) {
      const { x, y, type } = this.tiles[i];
      const color = TILE_COLORS[type];

      g.fillStyle(color);
      g.beginPath();
      g.rect(x * TILE_SIZE + LINE_WIDTH, y * TILE_SIZE + LINE_WIDTH, TILE_SIZE - LINE_WIDTH * 2, TILE_SIZE - LINE_WIDTH * 2);
      g.closePath();
      g.fill();
    }
  }

  _drawDebPoint(gridX, gridY) {
    const deb = this.deb;

    deb.lineStyle(0.5, 0x000000, 1);
    deb.fillStyle(0xff4dff);
    deb.beginPath();
    deb.circle(gridX * TILE_SIZE, gridY * TILE_SIZE, 1.8);
    deb.closePath();
    deb.fill();
    deb.stroke();
  }

  _init() {
    const background = this.background = new Graphics();
    const gridViewContainer = this.gridViewContainer = this._createGridView();
    const startPoint = this.startPoint = this._createDraggablePoint(0x00e600);
    const endPoint = this.endPoint = this._createDraggablePoint(0xff4d4d);
    const connectingLine = this.connectingLine = this._createConnectingLine(0x1a75ff);
    const collisionsView = this.collisionsView = new Graphics();
    const debugText = this.debugText = new TextField('', 'arial', 0xaaaaaa, 20, FontStyle.NORMAL, FontWeight.NORMAL, 1, 0x000000);
    const title = this.title = new TextField(titleStr, 'arial', 0xeeeeee, 27, FontStyle.NORMAL, FontWeight.NORMAL, 1, 0x000000);
    const tutorial = this.tutorial = new TextField(tutorialStr, 'arial', 0xbbbbbb, 25, FontStyle.NORMAL, FontWeight.NORMAL, 1, 0x000000);

    this.add(background, collisionsView, gridViewContainer, connectingLine, startPoint, endPoint, debugText, tutorial, title);


    this._initWallsAndPositions();
  }

  _initWallsAndPositions() {
    this.startPoint.x = initData.start.x;
    this.startPoint.y = initData.start.y;

    this.endPoint.x = initData.end.x;
    this.endPoint.y = initData.end.y;

    for (let i = 0; i < initData.walls.length; i++) {
      const { x, y } = initData.walls[i];

      this.tiles.push(new Tile(x, y, TILE_TYPE.WALL));
    }
  }

  _createGridView() {
    const gridViewContainer = new DisplayObject();
    const gridView = this.gridView = new Graphics();

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        gridView.lineStyle(LINE_WIDTH, 0x555555);
        gridView.beginPath();
        gridView.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        gridView.closePath();
        gridView.stroke();
      }
    }

    //drawing x axis
    gridView.lineStyle(1, 0xff4d4d, 0.8);
    gridView.beginPath();
    gridView.moveTo(0, GRID_SIZE * TILE_SIZE * 0.5);
    gridView.lineTo(GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE * 0.5);
    gridView.stroke();
    gridView.closePath();

    //drawing y axis
    gridView.lineStyle(1, 0x00e600, 0.7);
    gridView.beginPath();
    gridView.moveTo(GRID_SIZE * TILE_SIZE * 0.5, 0);
    gridView.lineTo(GRID_SIZE * TILE_SIZE * 0.5, GRID_SIZE * TILE_SIZE);
    gridView.stroke();
    gridView.closePath();

    //drawing center point
    gridView.fillStyle(0x6900ac);
    gridView.beginPath();
    gridView.circle(GRID_SIZE * TILE_SIZE * 0.5, GRID_SIZE * TILE_SIZE * 0.5, 0.7);
    gridView.closePath();
    gridView.fill();

    gridViewContainer.add(gridView);

    gridViewContainer.cacheAsBitmap = true;
    gridViewContainer.cacheAsBitmapDynamic = false;

    gridViewContainer.touchable = true;
    gridView.touchable = true;

    let isPressed = false;
    let isClearing = false;

    gridViewContainer.on('pointerDown', (_, pointerInfo) => {
      const { x, y } = this._toGrid(this.globalToLocal(pointerInfo));
      const tile = this._getTile(Math.floor(x), Math.floor(y));

      isPressed = true;
      isClearing = (tile.is(TILE_TYPE.WALL) || tile.is(TILE_TYPE.WALL_COLLIDE));
    });

    gridViewContainer.on('pointerUp', () => {
      isPressed = false;
    });

    gridViewContainer.onUpdate = () => {
      if (!isPressed)
        return;

      const { x, y } = this._toGrid(this.globalToLocal(new Vector(Black.input.pointerX, Black.input.pointerY)));
      const tile = this._getTile(Math.floor(x), Math.floor(y));

      if (isClearing && (tile.is(TILE_TYPE.WALL) || tile.is(TILE_TYPE.WALL_COLLIDE))) {
        this._setTile(Math.floor(x), Math.floor(y), TILE_TYPE.EMPTY);
      } else if (!isClearing) {
        this._setTile(Math.floor(x), Math.floor(y), TILE_TYPE.WALL);
      }
    };

    return gridViewContainer;
  }

  _createDraggablePoint(color) {
    const container = new DisplayObject();
    const point = new Graphics();
    const textField = new TextField('', 'arial', color, 20, FontStyle.NORMAL, FontWeight.NORMAL, 2, 0x111111);

    textField.scale = 0.8 / this.scale;

    container.touchable = true;
    point.touchable = true;

    const startPos = new Vector();
    const pressPos = new Vector();
    const currPos = new Vector();
    let isPressed = false;

    container.on('pointerDown', (_, pointerInfo) => {
      startPos.copyFrom(container);
      pressPos.copyFrom(this.globalToLocal(pointerInfo));
      isPressed = true;
    });

    container.on('pointerUp', () => {
      isPressed = false;
    });

    point.draw = (withGrabCircle) => {
      point.clear();

      if (withGrabCircle) {
        point.fillStyle(color, 0.2);
        point.lineStyle(1, color, 0.3);
        point.beginPath();
        point.circle(0, 0, 30);
        point.closePath();
        point.fill();
        point.stroke();
      }

      point.lineStyle(1, 0x555555, 1);
      point.fillStyle(color);
      point.beginPath();
      point.circle(0, 0, 3);
      point.closePath();
      point.fill();
      point.stroke();
    };

    container.onUpdate = () => {
      point.draw(!isPressed);

      if (isPressed) {
        this.globalToLocal(currPos.set(Black.input.pointerX, Black.input.pointerY), currPos);

        container.x = startPos.x + currPos.x - pressPos.x;
        container.y = startPos.y + currPos.y - pressPos.y;
      }

      textField.text = `${(container.x / TILE_SIZE).toFixed(1)} | ${(container.y / TILE_SIZE).toFixed(1)}`;
    };

    textField.alignAnchor();
    textField.y = -15;

    container.add(point);
    container.add(textField);

    return container;
  }

  _createConnectingLine(color) {
    const line = new Graphics();

    line.drawConnection = (a, b) => {
      line.clear();
      line.lineStyle(1.5, color, 1, CapsStyle.ROUND);
      line.beginPath();
      line.moveTo(a.x, a.y);
      line.lineTo(b.x, b.y);
      line.stroke();
      line.closePath();
    };

    return line;
  }
}

class Tile {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
  }

  is(type) {
    return this.type === type;
  }
}

const TILE_TYPE = {
  EMPTY: 'EMPTY',
  EMPTY_COLLIDE: 'EMPTY_COLLIDE',
  EMPTY_LAST_COLLIDE: 'EMPTY_LAST_COLLIDE',
  CONNECT: 'CONNECT',
  CONNECT_LAST: 'CONNECT_LAST',
  CONNECT_END: 'CONNECT_END',
  WALL: 'WALL',
  WALL_COLLIDE: 'WALL_COLLIDE'
};

const TILE_COLORS = {};

TILE_COLORS[TILE_TYPE.EMPTY] = 0x111111;
TILE_COLORS[TILE_TYPE.EMPTY_COLLIDE] = 0x3e022b;
TILE_COLORS[TILE_TYPE.EMPTY_LAST_COLLIDE] = 0x6a1b51;
TILE_COLORS[TILE_TYPE.CONNECT] = 0x184823;
TILE_COLORS[TILE_TYPE.CONNECT_LAST] = 0x40833e;
TILE_COLORS[TILE_TYPE.CONNECT_END] = 0x37e334;
TILE_COLORS[TILE_TYPE.WALL] = 0x4d58f0;
TILE_COLORS[TILE_TYPE.WALL_COLLIDE] = 0xbd318e;

const titleStr = "Demo of ray casting using DDA algorithm in tiled world (including negative coordinates)";
const tutorialStr = "Press any mouse button on grid to draw/clear walls or drag start/end point";

const initData = {
  start: { x: TILE_SIZE * -3.7, y: TILE_SIZE * -0.7 },
  end: { x: TILE_SIZE * 3.5, y: TILE_SIZE * 2.1 },
  walls: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -2 }, { x: 0, y: -1 }, { x: 0, y: 2 }, { x: 3, y: -3 }, { x: 3, y: -2 }, { x: 4, y: -2 }, { x: 4, y: -3 }, { x: -7, y: 1 }, { x: -7, y: 2 }, { x: -6, y: 1 }, { x: -5, y: 1 }, { x: -5, y: 2 }, { x: -6, y: -5 }, { x: -6, y: -4 }, { x: -6, y: -3 }, { x: -5, y: -4 }, { x: 5, y: 3 }, { x: 5, y: 4 }, { x: 4, y: 4 }]
}

function sign(x) {
  return x < 0 ? -1 : 1;
}

// function getDOMBackgroundColor(baseColor = 0x000000) {
//   const color = document.body.style.color;

//   if (color && color.indexOf("rgb(") >= 0) {
//     const [r, g, b] = color.split('(')[1].split(')')[0].split(', ');

//     return ColorHelper.rgb2hex(new RGB(parseInt(r), parseInt(g), parseInt(b)));
//   }

//   return baseColor;
// }