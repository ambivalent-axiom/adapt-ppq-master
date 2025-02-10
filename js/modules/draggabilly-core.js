/* eslint-disable multiline-ternary */
// modules/draggabilly-core.js
define([
  './classie',
  './eventEmitter',
  './eventie',
  './getStyleProperty',
  './getSize'
], function(classie, EventEmitter, eventie, getStyleProperty, getSize) {
  'use strict';

  // -------------------------- helpers -------------------------- //
  function extend(a, b) {
    for (const prop in b) {
      a[prop] = b[prop];
    }
    return a;
  }

  function noop() {}

  // get style helper
  const defView = document.defaultView;
  const getStyle = defView && defView.getComputedStyle ?
    function(elem) {
      return defView.getComputedStyle(elem, null);
    } :
    function(elem) {
      return elem.currentStyle;
    };

  // element checking
  const isElement = (typeof HTMLElement === 'object') ?
    function(obj) {
      return obj instanceof HTMLElement;
    } :
    function(obj) {
      return obj && typeof obj === 'object' &&
                obj.nodeType === 1 && typeof obj.nodeName === 'string';
    };

  // -------------------------- requestAnimationFrame -------------------------- //
  let lastTime = 0;
  const prefixes = 'webkit moz ms o'.split(' ');
  let requestAnimationFrame = window.requestAnimationFrame;
  let cancelAnimationFrame = window.cancelAnimationFrame;

  // find vendor prefix
  for (let i = 0; !requestAnimationFrame && i < prefixes.length; i++) {
    const prefix = prefixes[i];
    requestAnimationFrame = window[prefix + 'RequestAnimationFrame'];
    cancelAnimationFrame = window[prefix + 'CancelAnimationFrame'] ||
                              window[prefix + 'CancelRequestAnimationFrame'];
  }

  // fallback to setTimeout/clearTimeout if either request/cancel is not supported
  if (!requestAnimationFrame || !cancelAnimationFrame) {
    requestAnimationFrame = function(callback) {
      const currTime = new Date().getTime();
      const timeToCall = Math.max(0, 16 - (currTime - lastTime));
      const id = window.setTimeout(function() {
        // eslint-disable-next-line n/no-callback-literal
        callback(currTime + timeToCall);
      }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };

    cancelAnimationFrame = function(id) {
      window.clearTimeout(id);
    };
  }

  // -------------------------- Draggabilly -------------------------- //
  function Draggabilly(element, options) {
    // querySelector if string
    this.element = typeof element === 'string' ?
      document.querySelector(element)
      : element;

    this.options = extend({}, this.options);
    extend(this.options, options);

    this._create();
  }

  // inherit EventEmitter methods
  extend(Draggabilly.prototype, EventEmitter.prototype);

  // default options
  Draggabilly.prototype.options = {};

  // get transform property
  const transformProperty = getStyleProperty('transform');
  const is3d = !!getStyleProperty('perspective');

  // ----- create ----- //
  Draggabilly.prototype._create = function() {
    this.position = {};
    this._getPosition();

    this.startPoint = { x: 0, y: 0 };
    this.dragPoint = { x: 0, y: 0 };

    this.startPosition = extend({}, this.position);

    // set relative positioning
    const style = getStyle(this.element);
    if (style.position !== 'relative' && style.position !== 'absolute') {
      this.element.style.position = 'relative';
    }

    this.enable();
    this.setHandles();
  };

  // Rest of your Draggabilly prototype methods...
  // [Include all the prototype methods from the original file]

  // set this.handles and bind start events to 'em
  Draggabilly.prototype.setHandles = function() {
    this.handles = this.options.handle ?
      this.element.querySelectorAll(this.options.handle)
      : [ this.element ];

    this.bindHandles(true);
  };

  // -------------------------- bind -------------------------- //

  Draggabilly.prototype.bindHandles = function(isBind) {
    let binder;
    if (window.navigator.pointerEnabled) {
      binder = this.bindPointer;
    } else if (window.navigator.msPointerEnabled) {
      binder = this.bindMSPointer;
    } else {
      binder = this.bindMouseTouch;
    }
    // munge isBind, default to true
    isBind = isBind === undefined ? true : !!isBind;
    for (let i = 0, len = this.handles.length; i < len; i++) {
      const handle = this.handles[i];
      binder.call(this, handle, isBind);
    }
  };

  Draggabilly.prototype.bindPointer = function(handle, isBind) {
    // W3C Pointer Events, IE11. See https://coderwall.com/p/mfreca
    const bindMethod = isBind ? 'bind' : 'unbind';
    eventie[bindMethod](handle, 'pointerdown', this);
    // disable scrolling on the element
    handle.style.touchAction = isBind ? 'none' : '';
  };

  Draggabilly.prototype.bindMSPointer = function(handle, isBind) {
    // IE10 Pointer Events
    const bindMethod = isBind ? 'bind' : 'unbind';
    eventie[bindMethod](handle, 'MSPointerDown', this);
    // disable scrolling on the element
    handle.style.msTouchAction = isBind ? 'none' : '';
  };

  Draggabilly.prototype.bindMouseTouch = function(handle, isBind) {
    // listen for both, for devices like Chrome Pixel
    //   which has touch and mouse events
    const bindMethod = isBind ? 'bind' : 'unbind';
    eventie[bindMethod](handle, 'mousedown', this);
    eventie[bindMethod](handle, 'touchstart', this);
    // TODO re-enable img.ondragstart when unbinding
    if (isBind) {
      disableImgOndragstart(handle);
    }
  };

  // remove default dragging interaction on all images in IE8
  // IE8 does its own drag thing on images, which messes stuff up

  function noDragStart() {
    return false;
  }

  // TODO replace this with a IE8 test
  const isIE8 = 'attachEvent' in document.documentElement;

  // IE8 only
  const disableImgOndragstart = !isIE8
    ? noop
    : function(handle) {

      if (handle.nodeName === 'IMG') {
        handle.ondragstart = noDragStart;
      }

      const images = handle.querySelectorAll('img');
      for (let i = 0, len = images.length; i < len; i++) {
        const img = images[i];
        img.ondragstart = noDragStart;
      }
    };

  // -------------------------- position -------------------------- //

  // get left/top position from style
  Draggabilly.prototype._getPosition = function() {
    // properties
    const style = getStyle(this.element);

    const x = parseInt(style.left, 10);
    const y = parseInt(style.top, 10);

    // clean up 'auto' or other non-integer values
    this.position.x = isNaN(x) ? 0 : x;
    this.position.y = isNaN(y) ? 0 : y;

    this._addTransformPosition(style);
  };

  // add transform: translate( x, y ) to position
  Draggabilly.prototype._addTransformPosition = function(style) {
    if (!transformProperty) {
      return;
    }
    const transform = style[transformProperty];
    // bail out if value is 'none'
    if (transform.indexOf('matrix') !== 0) {
      return;
    }
    // split matrix(1, 0, 0, 1, x, y)
    const matrixValues = transform.split(',');
    // translate X value is in 12th or 4th position
    const xIndex = transform.indexOf('matrix3d') === 0 ? 12 : 4;
    const translateX = parseInt(matrixValues[xIndex], 10);
    // translate Y value is in 13th or 5th position
    const translateY = parseInt(matrixValues[xIndex + 1], 10);
    this.position.x += translateX;
    this.position.y += translateY;
  };

  // -------------------------- events -------------------------- //

  // trigger handler methods for events
  Draggabilly.prototype.handleEvent = function(event) {
    const method = 'on' + event.type;
    if (this[method]) {
      this[method](event);
    }
  };

  // returns the touch that we're keeping track of
  Draggabilly.prototype.getTouch = function(touches) {
    for (let i = 0, len = touches.length; i < len; i++) {
      const touch = touches[i];
      if (touch.identifier === this.pointerIdentifier) {
        return touch;
      }
    }
  };

  // ----- start event ----- //

  Draggabilly.prototype.onmousedown = function(event) {
    // dismiss clicks from right or middle buttons
    const button = event.button;
    if (button && (button !== 0 && button !== 1)) {
      return;
    }
    this.dragStart(event, event);
  };

  Draggabilly.prototype.ontouchstart = function(event) {
    // disregard additional touches
    if (this.isDragging) {
      return;
    }

    this.dragStart(event, event.changedTouches[0]);
  };

  Draggabilly.prototype.onMSPointerDown =
Draggabilly.prototype.onpointerdown = function(event) {
// disregard additional touches
  if (this.isDragging) {
    return;
  }

  this.dragStart(event, event);
};

  function setPointerPoint(point, pointer) {
    point.x = pointer.pageX !== undefined ? pointer.pageX : pointer.clientX;
    point.y = pointer.pageY !== undefined ? pointer.pageY : pointer.clientY;
  }

  // hash of events to be bound after start event
  const postStartEvents = {
    mousedown: [ 'mousemove', 'mouseup' ],
    touchstart: [ 'touchmove', 'touchend', 'touchcancel' ],
    pointerdown: [ 'pointermove', 'pointerup', 'pointercancel' ],
    MSPointerDown: [ 'MSPointerMove', 'MSPointerUp', 'MSPointerCancel' ]
  };

  /**
 * drag start
 * @param {Event} event
 * @param {Event or Touch} pointer
 */
  Draggabilly.prototype.dragStart = function(event, pointer) {
    if (!this.isEnabled) {
      return;
    }

    if (event.preventDefault) {
      event.preventDefault();
    } else {
      event.returnValue = false;
    }

    // save pointer identifier to match up touch events
    this.pointerIdentifier = pointer.pointerId !== undefined ?
    // pointerId for pointer events, touch.indentifier for touch events
      pointer.pointerId : pointer.identifier;

    this._getPosition();

    this.measureContainment();

    // point where drag began
    setPointerPoint(this.startPoint, pointer);
    // position _when_ drag began
    this.startPosition.x = this.position.x;
    this.startPosition.y = this.position.y;

    // reset left/top style
    this.setLeftTop();

    this.dragPoint.x = 0;
    this.dragPoint.y = 0;

    // bind move and end events
    this._bindEvents({
      // get proper events to match start event
      events: postStartEvents[event.type],
      // IE8 needs to be bound to document
      node: event.preventDefault ? window : document
    });

    classie.add(this.element, 'is-dragging');

    // reset isDragging flag
    this.isDragging = true;

    this.emitEvent('dragStart', [ this, event, pointer ]);

    // start animation
    this.animate();
  };

  Draggabilly.prototype._bindEvents = function(args) {
    for (let i = 0, len = args.events.length; i < len; i++) {
      const event = args.events[i];
      eventie.bind(args.node, event, this);
    }
    // save these arguments
    this._boundEvents = args;
  };

  Draggabilly.prototype._unbindEvents = function() {
    const args = this._boundEvents;
    // IE8 can trigger dragEnd twice, check for _boundEvents
    if (!args || !args.events) {
      return;
    }

    for (let i = 0, len = args.events.length; i < len; i++) {
      const event = args.events[i];
      eventie.unbind(args.node, event, this);
    }
    delete this._boundEvents;
  };

  Draggabilly.prototype.measureContainment = function() {
    const containment = this.options.containment;
    if (!containment) {
      return;
    }

    this.size = getSize(this.element);
    const elemRect = this.element.getBoundingClientRect();

    // use element if element
    const container = isElement(containment) ? containment :
    // fallback to querySelector if string
      typeof containment === 'string' ? document.querySelector(containment) :
      // otherwise just `true`, use the parent
        this.element.parentNode;

    this.containerSize = getSize(container);
    const containerRect = container.getBoundingClientRect();

    this.relativeStartPosition = {
      x: elemRect.left - containerRect.left,
      y: elemRect.top - containerRect.top
    };
  };

  // ----- move event ----- //

  Draggabilly.prototype.onmousemove = function(event) {
    this.dragMove(event, event);
  };

  Draggabilly.prototype.onMSPointerMove =
  Draggabilly.prototype.onpointermove = function(event) {
    if (event.pointerId === this.pointerIdentifier) {
      this.dragMove(event, event);
    }
  };

  Draggabilly.prototype.ontouchmove = function(event) {
    const touch = this.getTouch(event.changedTouches);
    if (touch) {
      this.dragMove(event, touch);
    }
  };

  /**
 * drag move
 * @param {Event} event
 * @param {Event or Touch} pointer
 */
  Draggabilly.prototype.dragMove = function(event, pointer) {

    setPointerPoint(this.dragPoint, pointer);
    let dragX = this.dragPoint.x - this.startPoint.x;
    let dragY = this.dragPoint.y - this.startPoint.y;

    const grid = this.options.grid;
    const gridX = grid && grid[0];
    const gridY = grid && grid[1];

    dragX = applyGrid(dragX, gridX);
    dragY = applyGrid(dragY, gridY);

    dragX = this.containDrag('x', dragX, gridX);
    dragY = this.containDrag('y', dragY, gridY);

    // constrain to axis
    // dragX = this.options.axis === 'y' ? 0 : dragX;
    // dragY = this.options.axis === 'x' ? 0 : dragY;

    this.position.x = this.startPosition.x + dragX;
    this.position.y = this.startPosition.y + dragY;

    // set dragPoint properties
    this.dragPoint.x = dragX;
    this.dragPoint.y = dragY;

    this.emitEvent('dragMove', [ this, event, pointer ]);
  };

  function applyGrid(value, grid, method) {
    method = method || 'round';
    return grid ? Math[method](value / grid) * grid : value;
  }

  Draggabilly.prototype.containDrag = function(axis, drag, grid) {
    if (!this.options.containment) {
      return drag;
    }
    const measure = axis === 'x' ? 'width' : 'height';

    const rel = this.relativeStartPosition[axis];
    const min = applyGrid(-rel, grid, 'ceil');
    let max = this.containerSize[measure] - rel - this.size[measure];
    max = applyGrid(max, grid, 'floor');
    return Math.min(max, Math.max(min, drag));
  };

  // ----- end event ----- //

  Draggabilly.prototype.onmouseup = function(event) {
    this.dragEnd(event, event);
  };

  Draggabilly.prototype.onMSPointerUp =
  Draggabilly.prototype.onpointerup = function(event) {
    if (event.pointerId === this.pointerIdentifier) {
      this.dragEnd(event, event);
    }
  };

  Draggabilly.prototype.ontouchend = function(event) {
    const touch = this.getTouch(event.changedTouches);
    if (touch) {
      this.dragEnd(event, touch);
    }
  };

  /**
 * drag end
 * @param {Event} event
 * @param {Event or Touch} pointer
 */
  Draggabilly.prototype.dragEnd = function(event, pointer) {
    this.isDragging = false;

    delete this.pointerIdentifier;

    // use top left position when complete
    if (transformProperty) {
      this.element.style[transformProperty] = '';
      this.setLeftTop();
    }

    // remove events
    this._unbindEvents();

    classie.remove(this.element, 'is-dragging');

    this.emitEvent('dragEnd', [ this, event, pointer ]);

  };

  // ----- cancel event ----- //
  // coerce to end event

  Draggabilly.prototype.onMSPointerCancel =
  Draggabilly.prototype.onpointercancel = function(event) {
    if (event.pointerId === this.pointerIdentifier) {
      this.dragEnd(event, event);
    }
  };

  Draggabilly.prototype.ontouchcancel = function(event) {
    const touch = this.getTouch(event.changedTouches);
    this.dragEnd(event, touch);
  };

  // -------------------------- animation -------------------------- //
  Draggabilly.prototype.animate = function() {
    // only render and animate if dragging
    if (!this.isDragging) {
      return;
    }

    this.positionDrag();

    const _this = this;
    requestAnimationFrame(function animateFrame() {
      _this.animate();
    });
  };

  // transform translate function
  const translate = is3d ?
    function(x, y) {
      return 'translate3d( ' + x + 'px, ' + y + 'px, 0)';
    } :
    function(x, y) {
      return 'translate( ' + x + 'px, ' + y + 'px)';
    };

  // left/top positioning
  Draggabilly.prototype.setLeftTop = function() {
    this.element.style.left = this.position.x + 'px';
    this.element.style.top = this.position.y + 'px';
  };

  Draggabilly.prototype.positionDrag = transformProperty ?
    function() {
      // position with transform
      this.element.style[transformProperty] = translate(this.dragPoint.x, this.dragPoint.y);
    } :
    function() {
      // position with left/top
      this.setLeftTop();
    }; // Draggabilly.prototype.setLeftTop;

  // -----  ----- //
  Draggabilly.prototype.enable = function() {
    this.isEnabled = true;
  };

  Draggabilly.prototype.disable = function() {
    this.isEnabled = false;
    if (this.isDragging) {
      this.dragEnd();
    }
  };

  Draggabilly.prototype.destroy = function() {
    this.disable();
    // reset styles
    if (transformProperty) {
      this.element.style[transformProperty] = '';
    }
    this.element.style.left = '';
    this.element.style.top = '';
    this.element.style.position = '';
    // unbind handles
    this.bindHandles(false);
  };

  // -----  ----- //
  return Draggabilly;
});
