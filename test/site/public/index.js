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
        ref.single = function() {
          return fbRef.child('SINGLE');
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
}).config(function($stateProvider, $urlRouterProvider, $locationProvider) {
  $urlRouterProvider.otherwise('/');
  $locationProvider.html5Mode(true);
  return $stateProvider.state('authed', {
    abstract: true,
    url: '',
    template: '<div model=\'Site\' with=\'SINGLE\'>\n<div model=\'Profile\' as=\'UserProfile\' by=\'uid\' with=\'{{auth.uid}}\'>\n  <appbar></appbar><profilebar></profilebar>\n  <div ui-view></div>\n</div></div>',
    resolve: {
      authed: [
        'fbAuth', function(fbAuth) {
          return fbAuth.$waitForAuth();
        }
      ]
    },
    controller: [
      '$scope', '$authManager', 'Profile', 'ProfileBuilder', function($scope, $authManager, Profile, ProfileBuilder) {
        return $authManager($scope, 'auth', function(result) {
          if (result != null ? result.uid : void 0) {
            return Profile.promise.get('uid', result.uid).then(function(snap) {
              if (!snap.val()) {
                return Profile.push(ProfileBuilder[result.provider](result));
              }
            });
          }
        });
      }
    ]
  }).state('authed.main', {
    url: '/',
    templateUrl: 'main.html'
  }).state('authed.event', {
    url: '/event/:event_id',
    templateUrl: 'event.html',
    controller: [
      '$scope', '$stateParams', function($scope, $stateParams) {
        return $scope.event_id = $stateParams.event_id;
      }
    ]
  });
}).service('ProfileBuilder', function() {
  return {
    google: function(auth) {
      return {
        uid: auth.uid,
        name_first: auth.google.cachedUserProfile.given_name,
        name_last: auth.google.cachedUserProfile.family_name,
        email: auth.google.email,
        profile_pic_url: auth.google.profileImageURL
      };
    },
    facebook: function(auth) {
      return {
        uid: auth.uid
      };
    }
  };
}).directive('appbar', function() {
  return {
    restrict: 'E',
    template: '<div class=\'navbar container\'>\n  <div><a href=\'#\' ui-sref=\'authed.main()\'>My App!</a></div>\n  <div>{{Site.profile_count}} total profiles.  {{Site.event_count}} total events.  {{Site.karma_earned_total}} total karma earned.</div>\n  <div ng-hide=\'auth.uid\'>\n    <button login=\'google\' method=\'popup\'>Login w Popup</button>\n    <button login=\'google\'>Login w Redirect</button>\n  </div>\n  <div ng-show=\'auth.uid && UserProfile_loaded\'>\n    NAME: {{UserProfile.name_first}} {{UserProfile.name_last}}\n    UID: {{auth.uid}}\n    <button logout ng-show=\'auth.uid\'>Logout</button>\n  </div>\n  <hr/>\n</div>'
  };
}).directive('profilebar', function() {
  return {
    restrict: 'E',
    template: '<div class=\'user container\' ng-show=\'UserProfile_loaded\'>\n  <h2>Your Profile (model directive)</h2>\n  <img ng-src=\'{{UserProfile.profile_pic_url}}\' width=64 height=64 style=\'border-radius: 32px\'/>\n  <h3>{{UserProfile.name_first}} {{UserProfile.name_last}}</h3>\n</div>'
  };
});

var di;

di = typeof window !== 'undefined' ? window.angular : require('pongular').pongular;

di.module('app').service('Site', [
  '$model', 'fbRoot', function($model, fbRoot) {
    return $model(fbRoot.child('site'));
  }
]).service('Profile', [
  '$model', 'fbRoot', function($model, fbRoot) {
    return $model(fbRoot.child('profile'));
  }
]).service('Ob', [
  '$model', 'fbRoot', function($model, fbRoot) {
    return $model(fbRoot.child('ob'));
  }
]).service('Event', [
  '$model', 'fbRoot', function($model, fbRoot) {
    return $model(fbRoot.child('event'));
  }
]).service('EventOwner', [
  '$model', 'fbRoot', function($model, fbRoot) {
    return $model(fbRoot.child('eventOwner'));
  }
]);
