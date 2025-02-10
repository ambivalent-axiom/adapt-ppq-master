/* eslint-disable no-useless-call */
define(function() {
  'use strict';

  const docElem = document.documentElement;
  // Initialize bind as empty function
  let bind = function() {};

  // Modern browsers
  if (docElem.addEventListener) {
    bind = function(obj, type, fn) {
      obj.addEventListener(type, fn, false);
    };
  } else if (docElem.attachEvent) { // IE8 and below
    bind = function(obj, type, fn) {
      obj[type + fn] = fn.handleEvent ?
        function() {
          const event = window.event;
          // add event.target
          event.target = event.target || event.srcElement;
          fn.handleEvent.call(fn, event);
        } :
        function() {
          const event = window.event;
          // add event.target
          event.target = event.target || event.srcElement;
          fn.call(obj, event);
        };
      obj.attachEvent('on' + type, obj[type + fn]);
    };
  }

  // Initialize unbind as empty function
  let unbind = function() {};

  // Modern browsers
  if (docElem.removeEventListener) {
    unbind = function(obj, type, fn) {
      obj.removeEventListener(type, fn, false);
    };
  } else if (docElem.detachEvent) { // IE8 and below
    unbind = function(obj, type, fn) {
      obj.detachEvent('on' + type, obj[type + fn]);
      try {
        delete obj[type + fn];
      } catch (err) {
        // can't delete window object properties
        obj[type + fn] = undefined;
      }
    };
  }

  // Return the public API
  return {
    bind,
    unbind
  };
});
