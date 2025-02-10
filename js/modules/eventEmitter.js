/* eslint-disable no-prototype-builtins */
define(function() {
  'use strict';

  function EventEmitter() {}

  const proto = EventEmitter.prototype;

  function indexOfListener(listeners, listener) {
    let i = listeners.length;
    while (i--) {
      if (listeners[i].listener === listener) {
        return i;
      }
    }
    return -1;
  }

  function alias(name) {
    return function aliasClosure() {
      return this[name].apply(this, arguments);
    };
  }

  proto.getListeners = function getListeners(evt) {
    const events = this._getEvents();
    let response;
    let key;

    // Return a concatenated array of all matching events if
    // the selector is a regular expression.
    if (typeof evt === 'object') {
      response = {};
      for (key in events) {
        if (events.hasOwnProperty(key) && evt.test(key)) {
          response[key] = events[key];
        }
      }
    } else {
      response = events[evt] || (events[evt] = []);
    }

    return response;
  };

  proto.flattenListeners = function flattenListeners(listeners) {
    const flatListeners = [];
    let i;

    for (i = 0; i < listeners.length; i += 1) {
      flatListeners.push(listeners[i].listener);
    }

    return flatListeners;
  };

  proto.getListenersAsObject = function getListenersAsObject(evt) {
    const listeners = this.getListeners(evt);
    let response;

    if (listeners instanceof Array) {
      response = {};
      response[evt] = listeners;
    }

    return response || listeners;
  };

  proto.addListener = function addListener(evt, listener) {
    const listeners = this.getListenersAsObject(evt);
    const listenerIsWrapped = typeof listener === 'object';
    let key;

    for (key in listeners) {
      if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
        listeners[key].push(listenerIsWrapped
          ? listener
          : {
            listener,
            once: false
          });
      }
    }

    return this;
  };

  proto.on = proto.addListener;

  proto.addOnceListener = function addOnceListener(evt, listener) {
    return this.addListener(evt, {
      listener,
      once: true
    });
  };

  proto.once = alias('addOnceListener');

  proto.defineEvent = function defineEvent(evt) {
    this.getListeners(evt);
    return this;
  };

  proto.defineEvents = function defineEvents(evts) {
    for (let i = 0; i < evts.length; i += 1) {
      this.defineEvent(evts[i]);
    }
    return this;
  };

  proto.removeListener = function removeListener(evt, listener) {
    const listeners = this.getListenersAsObject(evt);
    let index;
    let key;

    for (key in listeners) {
      if (listeners.hasOwnProperty(key)) {
        index = indexOfListener(listeners[key], listener);

        if (index !== -1) {
          listeners[key].splice(index, 1);
        }
      }
    }

    return this;
  };

  proto.off = alias('removeListener');

  proto.addListeners = function addListeners(evt, listeners) {
    // Pass through to manipulateListeners
    return this.manipulateListeners(false, evt, listeners);
  };

  proto.removeListeners = function removeListeners(evt, listeners) {
    // Pass through to manipulateListeners
    return this.manipulateListeners(true, evt, listeners);
  };

  proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
    let i;
    let value;
    const single = remove ? this.removeListener : this.addListener;
    const multiple = remove ? this.removeListeners : this.addListeners;

    // If evt is an object then pass each of it's properties to this method
    if (typeof evt === 'object' && !(evt instanceof RegExp)) {
      for (i in evt) {
        if (evt.hasOwnProperty(i) && (value = evt[i])) {
          // Pass the single listener straight through to the singular method
          if (typeof value === 'function') {
            single.call(this, i, value);
          } else {
            // Otherwise pass back to the multiple function
            multiple.call(this, i, value);
          }
        }
      }
    } else {
      // So evt must be a string
      // And listeners must be an array of listeners
      // Loop over it and pass each one to the multiple method
      i = listeners.length;
      while (i--) {
        single.call(this, evt, listeners[i]);
      }
    }

    return this;
  };

  proto.removeEvent = function removeEvent(evt) {
    const type = typeof evt;
    const events = this._getEvents();
    let key;

    // Remove different things depending on the state of evt
    if (type === 'string') {
      // Remove all listeners for the specified event
      delete events[evt];
    } else if (type === 'object') {
      // Remove all events matching the regex.
      for (key in events) {
        if (events.hasOwnProperty(key) && evt.test(key)) {
          delete events[key];
        }
      }
    } else {
      // Remove all listeners in all events
      delete this._events;
    }

    return this;
  };

  proto.emitEvent = function emitEvent(evt, args) {
    const listeners = this.getListenersAsObject(evt);
    let listener;
    let i;
    let key;
    let response;

    for (key in listeners) {
      if (listeners.hasOwnProperty(key)) {
        i = listeners[key].length;

        while (i--) {
          // If the listener returns true then it shall be removed from the event
          // The function is executed either with a basic call or an apply if there is an args array
          listener = listeners[key][i];
          response = listener.listener.apply(this, args || []);
          if (response === this._getOnceReturnValue() || listener.once === true) {
            this.removeListener(evt, listener.listener);
          }
        }
      }
    }

    return this;
  };

  proto.trigger = alias('emitEvent');

  proto.emit = function emit(evt) {
    const args = Array.prototype.slice.call(arguments, 1);
    return this.emitEvent(evt, args);
  };

  proto.setOnceReturnValue = function setOnceReturnValue(value) {
    this._onceReturnValue = value;
    return this;
  };

  proto._getOnceReturnValue = function _getOnceReturnValue() {
    if (this.hasOwnProperty('_onceReturnValue')) {
      return this._onceReturnValue;
    } else {
      return true;
    }
  };

  proto._getEvents = function _getEvents() {
    return this._events || (this._events = {});
  };

  return EventEmitter;
});
