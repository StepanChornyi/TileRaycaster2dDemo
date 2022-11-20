import { Component } from 'black-engine';

export default class ResizeActionComponent extends Component {
  constructor(onResizeCallback, context) {
    super();

    this._callback = onResizeCallback;
    this._context = context;

    this._cachedWidth = 0;
    this._cachedHeight = 0;
  }

  onAdded() {
    this._onResize();
  }

  onUpdate() {
    this._checkResize();
  }

  onRender() {
    this._checkResize();
  }

  _checkResize() {
    if (
      this._cachedWidth !== window.innerWidth ||
      this._cachedHeight !== window.innerHeight
    ) {
      this._onResize();
    }
  }

  _onResize() {
    this._cachedWidth = window.innerWidth;
    this._cachedHeight = window.innerHeight;

    this._callback.call(this._context, this.parent);
  }
}