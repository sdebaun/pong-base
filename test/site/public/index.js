angular.module('pong-base', ['firebase']).directive('login', [
  '$compile', 'fbAuth', function($compile, fbAuth) {
    return {
      restrict: 'A',
      priority: 1001,
      terminal: true,
      compile: function(el, attrs) {
        var linker, provider;
        provider = attrs.login;
        if (provider !== 'google' && provider !== 'facebook') {
          throw "Must specify login=provider of google or facebook.  Got " + provider + " instead.";
        }
        el.attr('ng-click', "login('" + provider + "')");
        el.attr('aria-label', "login with " + provider);
        el.addClass("login " + provider);
        linker = $compile(el, null, 1001);
        return function(scope) {
          scope.login = function(prov) {
            return fbAuth.$authWithOAuthRedirect(prov, {
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
]).directive('model', [
  '$compile', '$injector', '$parse', '$firebaseArray', function($compile, $injector, $parse, $firebaseArray) {
    return {
      restrict: 'A',
      priority: 2001,
      terminal: true,
      scope: true,
      compile: function(_el, _attrs) {
        var linker, model, modelName;
        modelName = _attrs.model;
        model = $injector.get(modelName);
        _el.attr('ng-repeat', modelName + " in " + modelName + "s");
        linker = $compile(_el, null, 1001);
        return function(scope, el, attrs) {
          var build_query, watch_attr_val;
          build_query = function(byChild, withValue, limitTo) {
            var query;
            if (typeof withValue === 'object') {
              withValue = withValue.join('|');
            }
            console.log(modelName, byChild, withValue, limitTo);
            query = byChild && model.orderByChild(byChild) || model.orderByKey();
            if (withValue) {
              query = query.equalTo(withValue);
            }
            if (!(withValue || byChild || limitTo)) {
              query = query.equalTo('SINGLE');
            }
            query = query.limitToFirst(limitTo || 1);
            return scope[modelName + 's'] = $firebaseArray(query);
          };
          watch_attr_val = function(attr_val) {
            return scope.$watch(attr_val, function() {
              return build_query(scope.$eval(attrs.by), scope.$eval(attrs["with"]), scope.$eval(attrs.limit));
            });
          };
          attrs.$observe('by', function() {
            return watch_attr_val(attrs.by);
          });
          attrs.$observe('with', function() {
            return watch_attr_val(attrs["with"]);
          });
          attrs.$observe('limit', function() {
            return watch_attr_val(attrs.limit);
          });
          return linker(scope);
        };
      }
    };
  }
]);

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
        return ref;
      };
      return decorate(fbRef);
    };
  }
]);

'use strict';
angular.module('app', ['ui.router', 'pong-base', 'firebase']).service('fbRoot', function(Firebase) {
  return new Firebase("http://sparks-development.firebaseio.com");
}).service('fbAuth', [
  '$firebaseAuth', 'fbRoot', function($firebaseAuth, fbRoot) {
    return $firebaseAuth(fbRoot);
  }
]).config(function($stateProvider, $urlRouterProvider, $locationProvider) {
  $urlRouterProvider.otherwise('/');
  $locationProvider.html5Mode(true);
  return $stateProvider.state('authed', {
    abstract: true,
    url: '',
    template: '<div ui-view></div>',
    resolve: {
      authed: [
        'fbAuth', function(fbAuth) {
          return fbAuth.$waitForAuth();
        }
      ]
    },
    controller: [
      '$scope', '$state', 'fbAuth', 'authed', 'Profile', function($scope, $state, fbAuth, authed, Profile) {
        return fbAuth.$onAuth(function(result) {
          $scope.auth = result;
          if (result != null ? result.uid : void 0) {
            return Profile.promise.get('uid', result.uid).then(function(snap) {
              if (!snap.val()) {
                return Profile.push({
                  uid: result.uid,
                  displayName: result.google.displayName
                });
              }
            });
          }
        });
      }
    ]
  }).state('authed.main', {
    url: '/',
    templateUrl: 'main.html'
  });
});

var di;

di = typeof window !== 'undefined' ? window.angular : require('pongular').pongular;

di.module('app').service('Profile', [
  'fbRoot', '$model', function(fbRoot, $model) {
    return $model(fbRoot.child('profile'));
  }
]);
