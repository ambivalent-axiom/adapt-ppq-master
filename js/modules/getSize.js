define(['./getStyleProperty'], function(getStyleProperty) {
  'use strict';

  // -------------------------- helpers -------------------------- //
  const defView = document.defaultView;

  const getStyle = defView && defView.getComputedStyle ?
    function(elem) {
      return defView.getComputedStyle(elem, null);
    } :
    function(elem) {
      return elem.currentStyle;
    };

  // get a number from a string, not a percentage
  function getStyleSize(value) {
    const num = parseFloat(value);
    // not a percent like '100%', and a number
    const isValid = value.indexOf('%') === -1 && !isNaN(num);
    return isValid && num;
  }

  // -------------------------- measurements -------------------------- //
  const measurements = [
    'paddingLeft',
    'paddingRight',
    'paddingTop',
    'paddingBottom',
    'marginLeft',
    'marginRight',
    'marginTop',
    'marginBottom',
    'borderLeftWidth',
    'borderRightWidth',
    'borderTopWidth',
    'borderBottomWidth'
  ];

  function getZeroSize() {
    const size = {
      width: 0,
      height: 0,
      innerWidth: 0,
      innerHeight: 0,
      outerWidth: 0,
      outerHeight: 0
    };
    for (let i = 0, len = measurements.length; i < len; i++) {
      const measurement = measurements[i];
      size[measurement] = 0;
    }
    return size;
  }

  // -------------------------- setup -------------------------- //
  const boxSizingProp = getStyleProperty('boxSizing');
  let isBoxSizeOuter;

  // Determine if box-sizing is border-box
  (function() {
    if (!boxSizingProp) {
      return;
    }

    const div = document.createElement('div');
    div.style.width = '200px';
    div.style.padding = '1px 2px 3px 4px';
    div.style.borderStyle = 'solid';
    div.style.borderWidth = '1px 2px 3px 4px';
    div.style[boxSizingProp] = 'border-box';

    const body = document.body || document.documentElement;
    body.appendChild(div);
    const style = getStyle(div);

    isBoxSizeOuter = getStyleSize(style.width) === 200;
    body.removeChild(div);
  })();

  /**
     * Get element size
     * @param {Element|String} elem - Element to measure
     * @returns {Object} size
     */
  function getSize(elem) {
    // use querySelector if elem is string
    if (typeof elem === 'string') {
      elem = document.querySelector(elem);
    }

    // do not proceed on non-objects
    if (!elem || typeof elem !== 'object' || !elem.nodeType) {
      return;
    }

    const style = getStyle(elem);

    // if hidden, everything is 0
    if (style.display === 'none') {
      return getZeroSize();
    }

    const size = {};
    size.width = elem.offsetWidth;
    size.height = elem.offsetHeight;

    const isBorderBox = size.isBorderBox = !!(boxSizingProp &&
            style[boxSizingProp] && style[boxSizingProp] === 'border-box');

    // get all measurements
    for (let i = 0, len = measurements.length; i < len; i++) {
      const measurement = measurements[i];
      const value = style[measurement];
      const num = parseFloat(value);
      // any 'auto', 'medium' value will be 0
      size[measurement] = !isNaN(num) ? num : 0;
    }

    const paddingWidth = size.paddingLeft + size.paddingRight;
    const paddingHeight = size.paddingTop + size.paddingBottom;
    const marginWidth = size.marginLeft + size.marginRight;
    const marginHeight = size.marginTop + size.marginBottom;
    const borderWidth = size.borderLeftWidth + size.borderRightWidth;
    const borderHeight = size.borderTopWidth + size.borderBottomWidth;

    const isBorderBoxSizeOuter = isBorderBox && isBoxSizeOuter;

    // overwrite width and height if we can get it from style
    const styleWidth = getStyleSize(style.width);
    if (styleWidth !== false) {
      size.width = styleWidth +
                // add padding and border unless it's already including it
                (isBorderBoxSizeOuter ? 0 : paddingWidth + borderWidth);
    }

    const styleHeight = getStyleSize(style.height);
    if (styleHeight !== false) {
      size.height = styleHeight +
                // add padding and border unless it's already including it
                (isBorderBoxSizeOuter ? 0 : paddingHeight + borderHeight);
    }

    size.innerWidth = size.width - (paddingWidth + borderWidth);
    size.innerHeight = size.height - (paddingHeight + borderHeight);

    size.outerWidth = size.width + marginWidth;
    size.outerHeight = size.height + marginHeight;

    return size;
  }

  return getSize;
});
