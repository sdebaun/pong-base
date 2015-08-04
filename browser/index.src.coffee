# browser specific code
angular.module 'pong-base', ['firebase']

.directive 'login', ['$compile', 'fbAuth', ($compile, fbAuth)->
  restrict: 'A'
  priority: 1001
  terminal: true
  compile: (el,attrs)->
    provider = attrs.login
    throw "Must specify login=provider of google or facebook.  Got #{provider} instead." unless provider in ['google','facebook']

    el.attr 'ng-click', "login('#{provider}')"
    el.attr 'aria-label', "login with #{provider}"
    el.addClass "login #{provider}"
    linker = $compile(el,null,1001)
    (scope)->
      scope.login = (prov)-> fbAuth.$authWithOAuthRedirect(prov, {scope: 'email'})
      # scope.login = (prov)-> fbAuth.$authWithOAuthPopup(prov, {scope: 'email'})
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

.directive 'model', ['$compile', '$injector', '$parse', '$firebaseArray', ($compile, $injector, $parse, $firebaseArray)->
  restrict: 'A'
  priority: 2001
  terminal: true
  scope: true
  compile: (_el,_attrs)->
    modelName = _attrs.model
    model = $injector.get(modelName)
    _el.attr 'ng-repeat', "#{modelName} in #{modelName}s"
    # _el.attr 'ng-show', "#{modelName}_loaded"
    linker = $compile(_el,null,1001)
    
    (scope,el,attrs)->
      build_query = (byChild,withValue,limitTo)->
        if typeof withValue == 'object' then withValue = withValue.join('|')
        console.log modelName, byChild, withValue, limitTo
        query = (byChild && model.orderByChild(byChild) || model.orderByKey())
        if withValue then query = query.equalTo withValue
        unless withValue || byChild || limitTo then query = query.equalTo 'SINGLE'
        query = query.limitToFirst(limitTo||1)
        scope[modelName + 's'] = $firebaseArray query
        # scope["#{modelName}_loaded"] = scope[modelName + 's'].$loaded()

      watch_attr_val = (attr_val)->
        scope.$watch attr_val, -> build_query( scope.$eval(attrs.by), scope.$eval(attrs.with), scope.$eval(attrs.limit) )

      attrs.$observe 'by', -> watch_attr_val(attrs.by)
      attrs.$observe 'with', -> watch_attr_val(attrs.with)
      attrs.$observe 'limit', -> watch_attr_val(attrs.limit)

      linker(scope)
]
