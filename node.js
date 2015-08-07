var pongular;

pongular = require('pongular').pongular;

pongular.module('pong-base', []).service('Firebase', function() {
  return require('firebase');
}).service('$q', function() {
  return require('q');
}).service('$watch', function() {
  return function(model) {
    return console.log('starting watchers for', model.name());
  };
}).service('$modelManager', function() {
  return function(model) {
    return model;
  };
});

var di;

di = typeof window !== 'undefined' ? window.angular : require('pongular').pongular;

di.module('pong-base').service('$encodeKey', function() {
  return function(key) {
    return encodeURIComponent(key).replace(/\./g, '%2E');
  };
}).service('$promise', [
  '$q', function($q) {
    return function(fn) {
      var d;
      d = $q.defer();
      fn(d);
      return d.promise;
    };
  }
]).service('$model', [
  '$encodeKey', '$promise', function($encodeKey, $promise) {
    return function(fbRef, options) {
      var decorate;
      if (options == null) {
        options = {};
      }
      decorate = function(ref) {
        ref.promise = {
          push: function(obj) {
            return $promise(function(d) {
              var newRef;
              return newRef = ref.push(obj, function() {
                return d.resolve(decorate(newRef));
              });
            });
          },
          get: function(idx_or_key, key_for_idx) {
            var query;
            query = idx_or_key && key_for_idx ? ref.orderByChild(idx_or_key).equalTo(key_for_idx) : idx_or_key && !key_for_idx ? ref.orderByKey().equalTo(idx_or_key) : ref;
            return $promise(function(d) {
              return query.once('value', d.resolve);
            });
          }
        };
        ref.buildQuery = function(byChild, withValue, limitTo) {
          var query;
          if (typeof withValue === 'object') {
            withValue = withValue.join('|');
          }
          query = byChild && ref.orderByChild(byChild) || ref.orderByKey();
          if (withValue) {
            query = query.equalTo(withValue);
          }
          if (!(withValue || byChild || limitTo)) {
            query = query.equalTo('SINGLE');
          }
          return query = query.limitToFirst(limitTo || 1);
        };
        return ref;
      };
      return decorate(fbRef);
    };
  }
]);
