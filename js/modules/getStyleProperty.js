define(function() {
  'use strict';

  const prefixes = 'Webkit Moz ms Ms O'.split(' ');
  const docElemStyle = document.documentElement.style;

  /**
     * Gets the vendor prefixed property if it exists
     * @param {String} propName - The property name to check
     * @returns {String|undefined} The prefixed property name or undefined
     */
  function getStyleProperty(propName) {
    if (!propName) {
      return;
    }

    // Test standard property first
    if (typeof docElemStyle[propName] === 'string') {
      return propName;
    }

    // Capitalize for vendor prefix
    propName = propName.charAt(0).toUpperCase() + propName.slice(1);

    // Test vendor specific properties
    for (let i = 0, len = prefixes.length; i < len; i++) {
      const prefixed = prefixes[i] + propName;
      if (typeof docElemStyle[prefixed] === 'string') {
        return prefixed;
      }
    }
  }

  return getStyleProperty;
});
