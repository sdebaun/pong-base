# browser specific code
angular.module 'pong-base', ['firebase']

.service 'fbAuth', ['$firebaseAuth', 'fbRoot', ($firebaseAuth, fbRoot)->$firebaseAuth(fbRoot)]

.service '$authManager', ['fbAuth', '$rootScope', (fbAuth, $rootScope)->
  (scope=$rootScope,property='auth',callback=null)->
      fbAuth.$waitForAuth().then (authed)-> scope[property] = authed
      fbAuth.$onAuth (result)->
        console.log 'auth changing to', result
        scope[property] = result
        if callback then callback(result)
]

.directive 'login', ['$compile', 'fbAuth', ($compile, fbAuth)->
  restrict: 'A'
  priority: 1001
  terminal: true
  compile: (_el,_attrs)->
    provider = _attrs.login
    throw "Must specify login=provider of google or facebook.  Got #{provider} instead." unless provider in ['google','facebook']

    _el.attr 'ng-click', "login('#{provider}','#{_el.attr('method')}')"
    _el.attr 'aria-label', "login with #{provider}"
    _el.addClass "login #{provider}"
    linker = $compile(_el,null,1001)
    (scope, el)->
      scope.login = (prov,method)->
        authFn = (method=='popup') && fbAuth.$authWithOAuthPopup || fbAuth.$authWithOAuthRedirect
        authFn(prov, {scope: 'email'})
      linker(scope)
]

.directive 'logout', ['$compile', 'fbAuth', ($compile, fbAuth)->
  restrict: 'A'
  priority: 1001
  terminal: true
  compile: (el,attrs)->
    el.attr 'ng-click', "logout()"
    el.attr 'aria-label', "logout"
    el.addClass 'logout'
    linker = $compile(el,null,1001)
    (scope)->
      scope.logout = ()-> fbAuth.$unauth()
      linker(scope)
]

.directive 'collection', ['$compile', '$injector', '$parse', '$firebaseArray', ($compile, $injector, $parse, $firebaseArray)->
  restrict: 'A'
  scope: true
  link: (scope,el,attrs)->
    modelName = attrs.as || (attrs.collection + 's')
    model = $injector.get(attrs.collection)

    update_scope = ->
      if attrs.with == 'true' then attrs.with = true # hackery
      if attrs.with == 'false' then attrs.with = false
      if attrs.with && !attrs.by
        scope[modelName] = null
        scope[modelName+"_loaded"] = false
      else
        withValue = attrs.alsoWith && [attrs.with,attrs.alsoWith].join('|') || attrs.with
        if attrs.alsoAlsoWith then withValue = [withValue,attrs.alsoAlsoWith].join('|') # TRWTF...
        scope[modelName] = $firebaseArray model.buildQuery( attrs.by, withValue, scope.$eval(attrs.limit) )
        scope[modelName+"_loaded"] = scope[modelName].$loaded()

    attrs.$observe 'by', update_scope
    attrs.$observe 'with', update_scope
    attrs.$observe 'alsoWith', update_scope
    attrs.$observe 'alsoAlsoWith', update_scope
    attrs.$observe 'limit', update_scope
]

.directive 'model', ['$compile', '$injector', '$parse', '$firebaseObject', '$firebaseArray', ($compile, $injector, $parse, $firebaseObject, $firebaseArray)->
  restrict: 'A'
  scope: true
  link: (scope,el,attrs)->
    modelName = attrs.as || attrs.model
    model = $injector.get(attrs.model)
    oldBy = oldWith = oldLimit = null # to prevent multiple-creation of query at beginning

    update_scope = (args...)->
      return if (attrs.by == oldBy) && (attrs.with == oldWith) && (attrs.limit == oldLimit)
      if (attrs.by && !attrs.with) then scope[modelName] = null
      else # some hackery with a $fbA translating to a $fbO so we dont have to ng-repeat
        scope[modelName+'s'] = $firebaseArray model.buildQuery( attrs.by, attrs.with, 1 )
        scope[modelName+'s'].$watch (result)->
          if result.event == 'child_removed'
            scope[modelName] = null
            scope[modelName+"_loaded"] = false
          else if result.event == 'child_added'
            scope[modelName] = $firebaseObject model.child(result.key)
            scope[modelName+"_loaded"] = scope[modelName].$loaded()
      [oldBy, oldWith, oldLimit] = [attrs.by, attrs.with, attrs.limit]

    attrs.$observe 'by', update_scope
    attrs.$observe 'with', update_scope
    attrs.$observe 'limit', update_scope

]
