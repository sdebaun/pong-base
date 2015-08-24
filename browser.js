var slice = [].slice;

angular.module('pong-base', ['firebase']).service('fbAuth', [
  '$firebaseAuth', 'fbRoot', function($firebaseAuth, fbRoot) {
    return $firebaseAuth(fbRoot);
  }
]).service('$authManager', [
  'fbAuth', '$rootScope', function(fbAuth, $rootScope) {
    return function(scope, property, callback) {
      if (scope == null) {
        scope = $rootScope;
      }
      if (property == null) {
        property = 'auth';
      }
      if (callback == null) {
        callback = null;
      }
      fbAuth.$waitForAuth().then(function(authed) {
        return scope[property] = authed;
      });
      return fbAuth.$onAuth(function(result) {
        console.log('auth changing to', result);
        scope[property] = result;
        if (callback) {
          return callback(result);
        }
      });
    };
  }
]).directive('login', [
  '$compile', 'fbAuth', function($compile, fbAuth) {
    return {
      restrict: 'A',
      priority: 1001,
      terminal: true,
      compile: function(_el, _attrs) {
        var linker, provider;
        provider = _attrs.login;
        if (provider !== 'google' && provider !== 'facebook') {
          throw "Must specify login=provider of google or facebook.  Got " + provider + " instead.";
        }
        _el.attr('ng-click', "login('" + provider + "','" + (_el.attr('method')) + "')");
        _el.attr('aria-label', "login with " + provider);
        _el.addClass("login " + provider);
        linker = $compile(_el, null, 1001);
        return function(scope, el) {
          scope.login = function(prov, method) {
            var authFn;
            authFn = (method === 'popup') && fbAuth.$authWithOAuthPopup || fbAuth.$authWithOAuthRedirect;
            return authFn(prov, {
              scope: 'email'
            });
          };
          return linker(scope);
        };
      }
    };
  }
]).directive('logout', [
  '$compile', 'fbAuth', function($compile, fbAuth) {
    return {
      restrict: 'A',
      priority: 1001,
      terminal: true,
      compile: function(el, attrs) {
        var linker;
        el.attr('ng-click', "logout()");
        el.attr('aria-label', "logout");
        el.addClass('logout');
        linker = $compile(el, null, 1001);
        return function(scope) {
          scope.logout = function() {
            return fbAuth.$unauth();
          };
          return linker(scope);
        };
      }
    };
  }
]).directive('collection', [
  '$compile', '$injector', '$parse', '$firebaseArray', function($compile, $injector, $parse, $firebaseArray) {
    return {
      restrict: 'A',
      scope: true,
      link: function(scope, el, attrs) {
        var model, modelName, update_scope;
        modelName = attrs.as || (attrs.collection + 's');
        model = $injector.get(attrs.collection);
        update_scope = function() {
          var withValue;
          if (attrs["with"] === 'true') {
            attrs["with"] = true;
          }
          if (attrs["with"] === 'false') {
            attrs["with"] = false;
          }
          if (attrs["with"] && !attrs.by) {
            scope[modelName] = null;
            return scope[modelName + "_loaded"] = false;
          } else {
            withValue = attrs.alsoWith && [attrs["with"], attrs.alsoWith].join('|') || attrs["with"];
            if (attrs.alsoAlsoWith) {
              withValue = [withValue, attrs.alsoAlsoWith].join('|');
            }
            scope[modelName] = $firebaseArray(model.buildQuery(attrs.by, withValue, scope.$eval(attrs.limit)));
            return scope[modelName + "_loaded"] = scope[modelName].$loaded();
          }
        };
        attrs.$observe('by', update_scope);
        attrs.$observe('with', update_scope);
        return attrs.$observe('limit', update_scope);
      }
    };
  }
]).directive('model', [
  '$compile', '$injector', '$parse', '$firebaseObject', '$firebaseArray', function($compile, $injector, $parse, $firebaseObject, $firebaseArray) {
    return {
      restrict: 'A',
      scope: true,
      link: function(scope, el, attrs) {
        var model, modelName, oldBy, oldLimit, oldWith, update_scope;
        modelName = attrs.as || attrs.model;
        model = $injector.get(attrs.model);
        oldBy = oldWith = oldLimit = null;
        update_scope = function() {
          var args, ref;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          if ((attrs.by === oldBy) && (attrs["with"] === oldWith) && (attrs.limit === oldLimit)) {
            return;
          }
          if (attrs.by && !attrs["with"]) {
            scope[modelName] = null;
          } else {
            scope[modelName + 's'] = $firebaseArray(model.buildQuery(attrs.by, attrs["with"], 1));
            scope[modelName + 's'].$watch(function(result) {
              if (result.event === 'child_removed') {
                scope[modelName] = null;
                return scope[modelName + "_loaded"] = false;
              } else if (result.event === 'child_added') {
                scope[modelName] = $firebaseObject(model.child(result.key));
                return scope[modelName + "_loaded"] = scope[modelName].$loaded();
              }
            });
          }
          return ref = [attrs.by, attrs["with"], attrs.limit], oldBy = ref[0], oldWith = ref[1], oldLimit = ref[2], ref;
        };
        attrs.$observe('by', update_scope);
        attrs.$observe('with', update_scope);
        return attrs.$observe('limit', update_scope);
      }
    };
  }
]);

var di, extend;

di = typeof window !== 'undefined' ? window.angular : require('pongular').pongular;

extend = typeof window !== 'undefined' ? window.angular.extend : require('extend');

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
          },
          getFirst: function(idx_or_key, key_for_idx) {
            return ref.promise.get(idx_or_key, key_for_idx).then(function(snap) {
              var key, rec, val;
              rec = snap.val();
              key = Object.keys(rec)[0];
              val = rec[key];
              val.$id = key;
              return val;
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
        ref.single = function() {
          return fbRef.child('SINGLE');
        };
        extend(ref, options.methods);
        return ref;
      };
      return decorate(fbRef);
    };
  }
]);
