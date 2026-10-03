function makeEl() {
  var listeners = {};
  var el = {
    innerHTML: '',
    value: '',
    textContent: '',
    style: {},
    dataset: {},
    classList: { add: function(){}, remove: function(){}, toggle: function(){}, contains: function(){ return false; } },
    addEventListener: function(type, fn) { listeners[type] = listeners[type] || []; listeners[type].push(fn); },
    removeEventListener: function(){},
    querySelector: function(){ return makeEl(); },
    querySelectorAll: function(){ return []; },
    appendChild: function(){},
    setAttribute: function(){},
    getAttribute: function(){ return null; },
    focus: function(){},
    closest: function(){ return null; },
    remove: function(){},
    matches: function(){ return false; },
    _listeners: listeners
  };
  return el;
}

var document = {
  getElementById: function(id) { return makeEl(); },
  querySelector: function() { return makeEl(); },
  querySelectorAll: function() { return []; },
  addEventListener: function(){},
  createElement: function() { return makeEl(); },
  body: makeEl()
};

var _store = {};
var window = {
  localStorage: {
    getItem: function(k) { return _store.hasOwnProperty(k) ? _store[k] : null; },
    setItem: function(k, v) { _store[k] = String(v); },
    removeItem: function(k) { delete _store[k]; }
  }
};
var localStorage = window.localStorage;

function alert(msg) { }
function confirm(msg) { return true; }
var __OUT__ = [];
function print(msg) { __OUT__.push(String(msg)); }

// ---- SCRIPT UNDER TEST ----
