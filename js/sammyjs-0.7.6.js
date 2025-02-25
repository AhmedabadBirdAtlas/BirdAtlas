// -- Sammy.js -- /sammy.js
// http://sammyjs.org
// Version: 0.7.6
// Built: 2014-08-26 10:45:34 +0300
(function (factory) {
  if (typeof define === "function" && define.amd) {
    define(["jquery"], factory);
  } else {
    jQuery.sammy = window.Sammy = factory(jQuery);
  }
})(function ($) {
  var Sammy,
    PATH_REPLACER = "([^/]+)",
    PATH_NAME_MATCHER = /:([\w\d]+)/g,
    QUERY_STRING_MATCHER = /\?([^#]*)?$/,
    _makeArray = function (nonarray) {
      return Array.prototype.slice.call(nonarray);
    },
    _isFunction = function (obj) {
      return Object.prototype.toString.call(obj) === "[object Function]";
    },
    _isArray = function (obj) {
      return Object.prototype.toString.call(obj) === "[object Array]";
    },
    _isRegExp = function (obj) {
      return Object.prototype.toString.call(obj) === "[object RegExp]";
    },
    _decode = function (str) {
      return decodeURIComponent((str || "").replace(/\+/g, " "));
    },
    _encode = encodeURIComponent,
    _escapeHTML = function (s) {
      return String(s)
        .replace(/&(?!\w+;)/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    },
    _routeWrapper = function (verb) {
      return function () {
        return this.route.apply(
          this,
          [verb].concat(Array.prototype.slice.call(arguments))
        );
      };
    },
    _template_cache = {},
    _has_history = !!(window.history && history.pushState),
    loggers = [];
  Sammy = function () {
    var args = _makeArray(arguments),
      app,
      selector;
    Sammy.apps = Sammy.apps || {};
    if (args.length === 0 || (args[0] && _isFunction(args[0]))) {
      return Sammy.apply(Sammy, ["body"].concat(args));
    } else if (typeof (selector = args.shift()) == "string") {
      app = Sammy.apps[selector] || new Sammy.Application();
      app.element_selector = selector;
      if (args.length > 0) {
        $.each(args, function (i, plugin) {
          app.use(plugin);
        });
      }
      if (app.element_selector != selector) {
        delete Sammy.apps[selector];
      }
      Sammy.apps[app.element_selector] = app;
      return app;
    }
  };
  Sammy.VERSION = "0.7.6";
  Sammy.addLogger = function (logger) {
    loggers.push(logger);
  };
  Sammy.log = function () {
    var args = _makeArray(arguments);
    args.unshift("[" + Date() + "]");
    $.each(loggers, function (i, logger) {
      logger.apply(Sammy, args);
    });
  };
  if (typeof window.console != "undefined") {
    if (
      typeof window.console.log === "function" &&
      _isFunction(window.console.log.apply)
    ) {
      Sammy.addLogger(function () {
        window.console.log.apply(window.console, arguments);
      });
    } else {
      Sammy.addLogger(function () {
        window.console.log(arguments);
      });
    }
  } else if (typeof console != "undefined") {
    Sammy.addLogger(function () {
      console.log.apply(console, arguments);
    });
  }
  $.extend(Sammy, {
    makeArray: _makeArray,
    isFunction: _isFunction,
    isArray: _isArray,
  });
  Sammy.Object = function (obj) {
    return $.extend(this, obj || {});
  };
  $.extend(Sammy.Object.prototype, {
    escapeHTML: _escapeHTML,
    h: _escapeHTML,
    toHash: function () {
      var json = {};
      $.each(this, function (k, v) {
        if (!_isFunction(v)) {
          json[k] = v;
        }
      });
      return json;
    },
    toHTML: function () {
      var display = "";
      $.each(this, function (k, v) {
        if (!_isFunction(v)) {
          display += "<strong>" + k + "</strong> " + v + "<br />";
        }
      });
      return display;
    },
    keys: function (attributes_only) {
      var keys = [];
      for (var property in this) {
        if (!_isFunction(this[property]) || !attributes_only) {
          keys.push(property);
        }
      }
      return keys;
    },
    has: function (key) {
      return this[key] && $.trim(this[key].toString()) !== "";
    },
    join: function () {
      var args = _makeArray(arguments);
      var delimiter = args.shift();
      return args.join(delimiter);
    },
    log: function () {
      Sammy.log.apply(Sammy, arguments);
    },
    toString: function (include_functions) {
      var s = [];
      $.each(this, function (k, v) {
        if (!_isFunction(v) || include_functions) {
          s.push('"' + k + '": ' + v.toString());
        }
      });
      return "Sammy.Object: {" + s.join(",") + "}";
    },
  });
  Sammy.targetIsThisWindow = function targetIsThisWindow(event, tagName) {
    var targetElement = $(event.target).closest(tagName);
    if (targetElement.length === 0) {
      return true;
    }
    var targetWindow = targetElement.attr("target");
    if (
      !targetWindow ||
      targetWindow === window.name ||
      targetWindow === "_self"
    ) {
      return true;
    }
    if (targetWindow === "_blank") {
      return false;
    }
    if (targetWindow === "top" && window === window.top) {
      return true;
    }
    return false;
  };
  Sammy.DefaultLocationProxy = function (app, run_interval_every) {
    this.app = app;
    this.is_native = false;
    this.has_history = _has_history;
    this._startPolling(run_interval_every);
  };
  Sammy.DefaultLocationProxy.fullPath = function (location_obj) {
    var matches = location_obj.toString().match(/^[^#]*(#.+)$/);
    var hash = matches ? matches[1] : "";
    return [location_obj.pathname, location_obj.search, hash].join("");
  };
  $.extend(Sammy.DefaultLocationProxy.prototype, {
    bind: function () {
      var proxy = this,
        app = this.app,
        lp = Sammy.DefaultLocationProxy;
      $(window).bind(
        "hashchange." + this.app.eventNamespace(),
        function (e, non_native) {
          if (proxy.is_native === false && !non_native) {
            proxy.is_native = true;
            window.clearInterval(lp._interval);
            lp._interval = null;
          }
          app.trigger("location-changed");
        }
      );
      if (_has_history && !app.disable_push_state) {
        $(window).bind("popstate." + this.app.eventNamespace(), function (e) {
          app.trigger("location-changed");
        });
        $(document).delegate(
          "a",
          "click.history-" + this.app.eventNamespace(),
          function (e) {
            if (e.isDefaultPrevented() || e.metaKey || e.ctrlKey) {
              return;
            }
            var full_path = lp.fullPath(this),
              hostname = this.hostname
                ? this.hostname
                : (function (a) {
                    var l = document.createElement("a");
                    l.href = a.href;
                    return l.hostname;
                  })(this);
            if (
              hostname == window.location.hostname &&
              app.lookupRoute("get", full_path) &&
              Sammy.targetIsThisWindow(e, "a")
            ) {
              e.preventDefault();
              proxy.setLocation(full_path);
              return false;
            }
          }
        );
      }
      if (!lp._bindings) {
        lp._bindings = 0;
      }
      lp._bindings++;
    },
    unbind: function () {
      $(window).unbind("hashchange." + this.app.eventNamespace());
      $(window).unbind("popstate." + this.app.eventNamespace());
      $(document).undelegate("a", "click.history-" + this.app.eventNamespace());
      Sammy.DefaultLocationProxy._bindings--;
      if (Sammy.DefaultLocationProxy._bindings <= 0) {
        window.clearInterval(Sammy.DefaultLocationProxy._interval);
        Sammy.DefaultLocationProxy._interval = null;
      }
    },
    getLocation: function () {
      return Sammy.DefaultLocationProxy.fullPath(window.location);
    },
    setLocation: function (new_location) {
      if (/^([^#\/]|$)/.test(new_location)) {
        if (_has_history && !this.app.disable_push_state) {
          new_location = "/" + new_location;
        } else {
          new_location = "#!/" + new_location;
        }
      }
      if (new_location != this.getLocation()) {
        if (
          _has_history &&
          !this.app.disable_push_state &&
          /^\//.test(new_location)
        ) {
          history.pushState({ path: new_location }, window.title, new_location);
          this.app.trigger("location-changed");
        } else {
          return (window.location = new_location);
        }
      }
    },
    _startPolling: function (every) {
      var proxy = this;
      if (!Sammy.DefaultLocationProxy._interval) {
        if (!every) {
          every = 10;
        }
        var hashCheck = function () {
          var current_location = proxy.getLocation();
          if (
            typeof Sammy.DefaultLocationProxy._last_location == "undefined" ||
            current_location != Sammy.DefaultLocationProxy._last_location
          ) {
            window.setTimeout(function () {
              $(window).trigger("hashchange", [true]);
            }, 0);
          }
          Sammy.DefaultLocationProxy._last_location = current_location;
        };
        hashCheck();
        Sammy.DefaultLocationProxy._interval = window.setInterval(
          hashCheck,
          every
        );
      }
    },
  });
  Sammy.Application = function (app_function) {
    var app = this;
    this.routes = {};
    this.listeners = new Sammy.Object({});
    this.arounds = [];
    this.befores = [];
    this.namespace =
      new Date().getTime() + "-" + parseInt(Math.random() * 1e3, 10);
    this.context_prototype = function () {
      Sammy.EventContext.apply(this, arguments);
    };
    this.context_prototype.prototype = new Sammy.EventContext();
    if (_isFunction(app_function)) {
      app_function.apply(this, [this]);
    }
    if (!this._location_proxy) {
      this.setLocationProxy(
        new Sammy.DefaultLocationProxy(this, this.run_interval_every)
      );
    }
    if (this.debug) {
      this.bindToAllEvents(function (e, data) {
        app.log(app.toString(), e.cleaned_type, data || {});
      });
    }
  };
  Sammy.Application.prototype = $.extend({}, Sammy.Object.prototype, {
    ROUTE_VERBS: ["get", "post", "put", "delete"],
    APP_EVENTS: [
      "run",
      "unload",
      "lookup-route",
      "run-route",
      "route-found",
      "event-context-before",
      "event-context-after",
      "changed",
      "error",
      "check-form-submission",
      "redirect",
      "location-changed",
    ],
    _last_route: null,
    _location_proxy: null,
    _running: false,
    element_selector: "body",
    debug: false,
    raise_errors: false,
    run_interval_every: 50,
    disable_push_state: false,
    template_engine: null,
    toString: function () {
      return "Sammy.Application:" + this.element_selector;
    },
    $element: function (selector) {
      return selector
        ? $(this.element_selector).find(selector)
        : $(this.element_selector);
    },
    use: function () {
      var args = _makeArray(arguments),
        plugin = args.shift(),
        plugin_name = plugin || "";
      try {
        args.unshift(this);
        if (typeof plugin == "string") {
          plugin_name = "Sammy." + plugin;
          plugin = Sammy[plugin];
        }
        plugin.apply(this, args);
      } catch (e) {
        if (typeof plugin === "undefined") {
          this.error(
            "Plugin Error: called use() but plugin (" +
              plugin_name.toString() +
              ") is not defined",
            e
          );
        } else if (!_isFunction(plugin)) {
          this.error(
            "Plugin Error: called use() but '" +
              plugin_name.toString() +
              "' is not a function",
            e
          );
        } else {
          this.error("Plugin Error", e);
        }
      }
      return this;
    },
    setLocationProxy: function (new_proxy) {
      var original_proxy = this._location_proxy;
      this._location_proxy = new_proxy;
      if (this.isRunning()) {
        if (original_proxy) {
          original_proxy.unbind();
        }
        this._location_proxy.bind();
      }
    },
    log: function () {
      Sammy.log.apply(
        Sammy,
        Array.prototype.concat.apply([this.element_selector], arguments)
      );
    },
    route: function (verb, path) {
      var app = this,
        param_names = [],
        add_route,
        path_match,
        callback = Array.prototype.slice.call(arguments, 2);
      if (callback.length === 0 && _isFunction(path)) {
        callback = [path];
        path = verb;
        verb = "any";
      }
      verb = verb.toLowerCase();
      if (path.constructor == String) {
        PATH_NAME_MATCHER.lastIndex = 0;
        while ((path_match = PATH_NAME_MATCHER.exec(path)) !== null) {
          param_names.push(path_match[1]);
        }
        path = new RegExp(path.replace(PATH_NAME_MATCHER, PATH_REPLACER) + "$");
      }
      $.each(callback, function (i, cb) {
        if (typeof cb === "string") {
          callback[i] = app[cb];
        }
      });
      add_route = function (with_verb) {
        var r = {
          verb: with_verb,
          path: path,
          callback: callback,
          param_names: param_names,
        };
        app.routes[with_verb] = app.routes[with_verb] || [];
        app.routes[with_verb].push(r);
      };
      if (verb === "any") {
        $.each(this.ROUTE_VERBS, function (i, v) {
          add_route(v);
        });
      } else {
        add_route(verb);
      }
      return this;
    },
    get: _routeWrapper("get"),
    post: _routeWrapper("post"),
    put: _routeWrapper("put"),
    del: _routeWrapper("delete"),
    any: _routeWrapper("any"),
    mapRoutes: function (route_array) {
      var app = this;
      $.each(route_array, function (i, route_args) {
        app.route.apply(app, route_args);
      });
      return this;
    },
    eventNamespace: function () {
      return ["sammy-app", this.namespace].join("-");
    },
    bind: function (name, data, callback) {
      var app = this;
      if (typeof callback == "undefined") {
        callback = data;
      }
      var listener_callback = function () {
        var e, context, data;
        e = arguments[0];
        data = arguments[1];
        if (data && data.context) {
          context = data.context;
          delete data.context;
        } else {
          context = new app.context_prototype(
            app,
            "bind",
            e.type,
            data,
            e.target
          );
        }
        e.cleaned_type = e.type.replace(app.eventNamespace(), "");
        callback.apply(context, [e, data]);
      };
      if (!this.listeners[name]) {
        this.listeners[name] = [];
      }
      this.listeners[name].push(listener_callback);
      if (this.isRunning()) {
        this._listen(name, listener_callback);
      }
      return this;
    },
    trigger: function (name, data) {
      this.$element().trigger([name, this.eventNamespace()].join("."), [data]);
      return this;
    },
    refresh: function () {
      this.last_location = null;
      this.trigger("location-changed");
      return this;
    },
    before: function (options, callback) {
      if (_isFunction(options)) {
        callback = options;
        options = {};
      }
      this.befores.push([options, callback]);
      return this;
    },
    after: function (callback) {
      return this.bind("event-context-after", callback);
    },
    around: function (callback) {
      this.arounds.push(callback);
      return this;
    },
    onComplete: function (callback) {
      this._onComplete = callback;
      return this;
    },
    isRunning: function () {
      return this._running;
    },
    helpers: function (extensions) {
      $.extend(this.context_prototype.prototype, extensions);
      return this;
    },
    helper: function (name, method) {
      this.context_prototype.prototype[name] = method;
      return this;
    },
    run: function (start_url) {
      if (this.isRunning()) {
        return false;
      }
      var app = this;
      $.each(this.listeners.toHash(), function (name, callbacks) {
        $.each(callbacks, function (i, listener_callback) {
          app._listen(name, listener_callback);
        });
      });
      this.trigger("run", { start_url: start_url });
      this._running = true;
      this.last_location = null;
      if (
        !/\#(.+)/.test(this.getLocation()) &&
        typeof start_url != "undefined"
      ) {
        this.setLocation(start_url);
      }
      this._checkLocation();
      this._location_proxy.bind();
      this.bind("location-changed", function () {
        app._checkLocation();
      });
      this.bind("submit", function (e) {
        if (!Sammy.targetIsThisWindow(e, "form")) {
          return true;
        }
        var returned = app._checkFormSubmission($(e.target).closest("form"));
        return returned === false ? e.preventDefault() : false;
      });
      $(window).bind("unload", function () {
        app.unload();
      });
      return this.trigger("changed");
    },
    unload: function () {
      if (!this.isRunning()) {
        return false;
      }
      var app = this;
      this.trigger("unload");
      this._location_proxy.unbind();
      this.$element().unbind("submit").removeClass(app.eventNamespace());
      $.each(this.listeners.toHash(), function (name, listeners) {
        $.each(listeners, function (i, listener_callback) {
          app._unlisten(name, listener_callback);
        });
      });
      this._running = false;
      return this;
    },
    destroy: function () {
      this.unload();
      delete Sammy.apps[this.element_selector];
      return this;
    },
    bindToAllEvents: function (callback) {
      var app = this;
      $.each(this.APP_EVENTS, function (i, e) {
        app.bind(e, callback);
      });
      $.each(this.listeners.keys(true), function (i, name) {
        if ($.inArray(name, app.APP_EVENTS) == -1) {
          app.bind(name, callback);
        }
      });
      return this;
    },
    routablePath: function (path) {
      return path.replace(QUERY_STRING_MATCHER, "");
    },
    lookupRoute: function (verb, path) {
      var app = this,
        routed = false,
        i = 0,
        l,
        route;
      if (typeof this.routes[verb] != "undefined") {
        l = this.routes[verb].length;
        for (; i < l; i++) {
          route = this.routes[verb][i];
          if (app.routablePath(path).match(route.path)) {
            routed = route;
            break;
          }
        }
      }
      return routed;
    },
    runRoute: function (verb, path, params, target) {
      var app = this,
        route = this.lookupRoute(verb, path),
        context,
        wrapped_route,
        arounds,
        around,
        befores,
        before,
        callback_args,
        path_params,
        final_returned;
      if (this.debug) {
        this.log("runRoute", [verb, path].join(" "));
      }
      this.trigger("run-route", { verb: verb, path: path, params: params });
      if (typeof params == "undefined") {
        params = {};
      }
      $.extend(params, this._parseQueryString(path));
      if (route) {
        this.trigger("route-found", { route: route });
        if ((path_params = route.path.exec(this.routablePath(path))) !== null) {
          path_params.shift();
          $.each(path_params, function (i, param) {
            if (route.param_names[i]) {
              params[route.param_names[i]] = _decode(param);
            } else {
              if (!params.splat) {
                params.splat = [];
              }
              params.splat.push(_decode(param));
            }
          });
        }
        context = new this.context_prototype(this, verb, path, params, target);
        arounds = this.arounds.slice(0);
        befores = this.befores.slice(0);
        callback_args = [context];
        if (params.splat) {
          callback_args = callback_args.concat(params.splat);
        }
        wrapped_route = function () {
          var returned, i, nextRoute;
          while (befores.length > 0) {
            before = befores.shift();
            if (app.contextMatchesOptions(context, before[0])) {
              returned = before[1].apply(context, [context]);
              if (returned === false) {
                return false;
              }
            }
          }
          app.last_route = route;
          context.trigger("event-context-before", { context: context });
          if (typeof route.callback === "function") {
            route.callback = [route.callback];
          }
          if (route.callback && route.callback.length) {
            i = -1;
            nextRoute = function () {
              i++;
              if (route.callback[i]) {
                returned = route.callback[i].apply(context, callback_args);
              } else if (
                app._onComplete &&
                typeof (app._onComplete === "function")
              ) {
                app._onComplete(context);
              }
            };
            callback_args.push(nextRoute);
            nextRoute();
          }
          context.trigger("event-context-after", { context: context });
          return returned;
        };
        $.each(arounds.reverse(), function (i, around) {
          var last_wrapped_route = wrapped_route;
          wrapped_route = function () {
            return around.apply(context, [last_wrapped_route]);
          };
        });
        try {
          final_returned = wrapped_route();
        } catch (e) {
          this.error(["500 Error", verb, path].join(" "), e);
        }
        return final_returned;
      } else {
        return this.notFound(verb, path);
      }
    },
    contextMatchesOptions: function (context, match_options, positive) {
      var options = match_options;
      if (typeof options === "string" || _isRegExp(options)) {
        options = { path: options };
      }
      if (typeof positive === "undefined") {
        positive = true;
      }
      if ($.isEmptyObject(options)) {
        return true;
      }
      if (_isArray(options.path)) {
        var results, numopt, opts, len;
        results = [];
        for (numopt = 0, len = options.path.length; numopt < len; numopt += 1) {
          opts = $.extend({}, options, { path: options.path[numopt] });
          results.push(this.contextMatchesOptions(context, opts));
        }
        var matched = $.inArray(true, results) > -1 ? true : false;
        return positive ? matched : !matched;
      }
      if (options.only) {
        return this.contextMatchesOptions(context, options.only, true);
      } else if (options.except) {
        return this.contextMatchesOptions(context, options.except, false);
      }
      var path_matched = true,
        verb_matched = true;
      if (options.path) {
        if (!_isRegExp(options.path)) {
          options.path = new RegExp(options.path.toString() + "$");
        }
        path_matched = options.path.test(context.path);
      }
      if (options.verb) {
        if (typeof options.verb === "string") {
          verb_matched = options.verb === context.verb;
        } else {
          verb_matched = options.verb.indexOf(context.verb) > -1;
        }
      }
      return positive
        ? verb_matched && path_matched
        : !(verb_matched && path_matched);
    },
    getLocation: function () {
      return this._location_proxy.getLocation();
    },
    setLocation: function (new_location) {
      return this._location_proxy.setLocation(new_location);
    },
    swap: function (content, callback) {
      var $el = this.$element().html(content);
      if (_isFunction(callback)) {
        callback(content);
      }
      return $el;
    },
    templateCache: function (key, value) {
      if (typeof value != "undefined") {
        return (_template_cache[key] = value);
      } else {
        return _template_cache[key];
      }
    },
    clearTemplateCache: function () {
      return (_template_cache = {});
    },
    notFound: function (verb, path) {
      var ret = this.error(["404 Not Found", verb, path].join(" "));
      return verb === "get" ? ret : true;
    },
    error: function (message, original_error) {
      if (!original_error) {
        original_error = new Error();
      }
      original_error.message = [message, original_error.message].join(" ");
      this.trigger("error", {
        message: original_error.message,
        error: original_error,
      });
      if (this.raise_errors) {
        throw original_error;
      } else {
        this.log(original_error.message, original_error);
      }
    },
    _checkLocation: function () {
      var location, returned;
      location = this.getLocation();
      if (
        !this.last_location ||
        this.last_location[0] != "get" ||
        this.last_location[1] != location
      ) {
        this.last_location = ["get", location];
        returned = this.runRoute("get", location);
      }
      return returned;
    },
    _getFormVerb: function (form) {
      var $form = $(form),
        verb,
        $_method;
      $_method = $form.find('input[name="_method"]');
      if ($_method.length > 0) {
        verb = $_method.val();
      }
      if (!verb) {
        verb = $form[0].getAttribute("method");
      }
      if (!verb || verb === "") {
        verb = "get";
      }
      return $.trim(verb.toString().toLowerCase());
    },
    _checkFormSubmission: function (form) {
      var $form, path, verb, params, returned;
      this.trigger("check-form-submission", { form: form });
      $form = $(form);
      path = $form.attr("action") || "";
      verb = this._getFormVerb($form);
      if (this.debug) {
        this.log("_checkFormSubmission", $form, path, verb);
      }
      if (verb === "get") {
        params = this._serializeFormParams($form);
        if (params !== "") {
          path += "?" + params;
        }
        this.setLocation(path);
        returned = false;
      } else {
        params = $.extend({}, this._parseFormParams($form));
        returned = this.runRoute(verb, path, params, form.get(0));
      }
      return typeof returned == "undefined" ? false : returned;
    },
    _serializeFormParams: function ($form) {
      var queryString = "",
        fields = $form.serializeArray(),
        i;
      if (fields.length > 0) {
        queryString = this._encodeFormPair(fields[0].name, fields[0].value);
        for (i = 1; i < fields.length; i++) {
          queryString =
            queryString +
            "&" +
            this._encodeFormPair(fields[i].name, fields[i].value);
        }
      }
      return queryString;
    },
    _encodeFormPair: function (name, value) {
      return _encode(name) + "=" + _encode(value);
    },
    _parseFormParams: function ($form) {
      var params = {},
        form_fields = $form.serializeArray(),
        i;
      for (i = 0; i < form_fields.length; i++) {
        params = this._parseParamPair(
          params,
          form_fields[i].name,
          form_fields[i].value
        );
      }
      return params;
    },
    _parseQueryString: function (path) {
      var params = {},
        parts,
        pairs,
        pair,
        i;
      parts = path.match(QUERY_STRING_MATCHER);
      if (parts && parts[1]) {
        pairs = parts[1].split("&");
        for (i = 0; i < pairs.length; i++) {
          pair = pairs[i].split("=");
          params = this._parseParamPair(
            params,
            _decode(pair[0]),
            _decode(pair[1] || "")
          );
        }
      }
      return params;
    },
    _parseParamPair: function (params, key, value) {
      if (typeof params[key] !== "undefined") {
        if (_isArray(params[key])) {
          params[key].push(value);
        } else {
          params[key] = [params[key], value];
        }
      } else {
        params[key] = value;
      }
      return params;
    },
    _listen: function (name, callback) {
      return this.$element().bind(
        [name, this.eventNamespace()].join("."),
        callback
      );
    },
    _unlisten: function (name, callback) {
      return this.$element().unbind(
        [name, this.eventNamespace()].join("."),
        callback
      );
    },
  });
  Sammy.RenderContext = function (event_context) {
    this.event_context = event_context;
    this.callbacks = [];
    this.previous_content = null;
    this.content = null;
    this.next_engine = false;
    this.waiting = false;
  };
  Sammy.RenderContext.prototype = $.extend({}, Sammy.Object.prototype, {
    then: function (callback) {
      if (!_isFunction(callback)) {
        if (typeof callback === "string" && callback in this.event_context) {
          var helper = this.event_context[callback];
          callback = function (content) {
            return helper.apply(this.event_context, [content]);
          };
        } else {
          return this;
        }
      }
      var context = this;
      if (this.waiting) {
        this.callbacks.push(callback);
      } else {
        this.wait();
        window.setTimeout(function () {
          var returned = callback.apply(context, [
            context.content,
            context.previous_content,
          ]);
          if (returned !== false) {
            context.next(returned);
          }
        }, 0);
      }
      return this;
    },
    wait: function () {
      this.waiting = true;
    },
    next: function (content) {
      this.waiting = false;
      if (typeof content !== "undefined") {
        this.previous_content = this.content;
        this.content = content;
      }
      if (this.callbacks.length > 0) {
        this.then(this.callbacks.shift());
      }
    },
    load: function (location, options, callback) {
      var context = this;
      return this.then(function () {
        var should_cache, cached, is_json, location_array;
        if (_isFunction(options)) {
          callback = options;
          options = {};
        } else {
          options = $.extend({}, options);
        }
        if (callback) {
          this.then(callback);
        }
        if (typeof location === "string") {
          is_json = location.match(/\.json(\?|$)/) || options.json;
          should_cache = is_json
            ? options.cache === true
            : options.cache !== false;
          context.next_engine = context.event_context.engineFor(location);
          delete options.cache;
          delete options.json;
          if (options.engine) {
            context.next_engine = options.engine;
            delete options.engine;
          }
          if (
            should_cache &&
            (cached = this.event_context.app.templateCache(location))
          ) {
            return cached;
          }
          this.wait();
          $.ajax(
            $.extend(
              {
                url: location,
                data: {},
                dataType: is_json ? "json" : "text",
                type: "get",
                success: function (data) {
                  if (should_cache) {
                    context.event_context.app.templateCache(location, data);
                  }
                  context.next(data);
                },
              },
              options
            )
          );
          return false;
        } else {
          if (location.nodeType) {
            return location.innerHTML;
          }
          if (location.selector) {
            context.next_engine = location.attr("data-engine");
            if (options.clone === false) {
              return location.remove()[0].innerHTML.toString();
            } else {
              return location[0].innerHTML.toString();
            }
          }
        }
      });
    },
    loadPartials: function (partials) {
      var name;
      if (partials) {
        this.partials = this.partials || {};
        for (name in partials) {
          (function (context, name) {
            context.load(partials[name]).then(function (template) {
              this.partials[name] = template;
            });
          })(this, name);
        }
      }
      return this;
    },
    render: function (location, data, callback, partials) {
      if (_isFunction(location) && !data) {
        return this.then(location);
      } else {
        if (_isFunction(data)) {
          partials = callback;
          callback = data;
          data = null;
        } else if (callback && !_isFunction(callback)) {
          partials = callback;
          callback = null;
        }
        return this.loadPartials(partials)
          .load(location)
          .interpolate(data, location)
          .then(callback);
      }
    },
    partial: function (location, data, callback, partials) {
      if (_isFunction(callback)) {
        return this.render(location, data, partials).swap(callback);
      } else if (_isFunction(data)) {
        return this.render(location, {}, callback).swap(data);
      } else {
        return this.render(location, data, callback).swap();
      }
    },
    send: function () {
      var context = this,
        args = _makeArray(arguments),
        fun = args.shift();
      if (_isArray(args[0])) {
        args = args[0];
      }
      return this.then(function (content) {
        args.push(function (response) {
          context.next(response);
        });
        context.wait();
        fun.apply(fun, args);
        return false;
      });
    },
    collect: function (array, callback, now) {
      var context = this;
      var coll = function () {
        if (_isFunction(array)) {
          callback = array;
          array = this.content;
        }
        var contents = [],
          doms = false;
        $.each(array, function (i, item) {
          var returned = callback.apply(context, [i, item]);
          if (returned.jquery && returned.length == 1) {
            returned = returned[0];
            doms = true;
          }
          contents.push(returned);
          return returned;
        });
        return doms ? contents : contents.join("");
      };
      return now ? coll() : this.then(coll);
    },
    renderEach: function (location, name, data, callback) {
      if (_isArray(name)) {
        callback = data;
        data = name;
        name = null;
      }
      return this.load(location).then(function (content) {
        var rctx = this;
        if (!data) {
          data = _isArray(this.previous_content) ? this.previous_content : [];
        }
        if (callback) {
          $.each(data, function (i, value) {
            var idata = {},
              engine = this.next_engine || location;
            if (name) {
              idata[name] = value;
            } else {
              idata = value;
            }
            callback(
              value,
              rctx.event_context.interpolate(content, idata, engine)
            );
          });
        } else {
          return this.collect(
            data,
            function (i, value) {
              var idata = {},
                engine = this.next_engine || location;
              if (name) {
                idata[name] = value;
              } else {
                idata = value;
              }
              return this.event_context.interpolate(content, idata, engine);
            },
            true
          );
        }
      });
    },
    interpolate: function (data, engine, retain) {
      var context = this;
      return this.then(function (content, prev) {
        if (!data && prev) {
          data = prev;
        }
        if (this.next_engine) {
          engine = this.next_engine;
          this.next_engine = false;
        }
        var rendered = context.event_context.interpolate(
          content,
          data,
          engine,
          this.partials
        );
        return retain ? prev + rendered : rendered;
      });
    },
    swap: function (callback) {
      return this.then(function (content) {
        this.event_context.swap(content, callback);
        return content;
      }).trigger("changed", {});
    },
    appendTo: function (selector) {
      return this.then(function (content) {
        $(selector).append(content);
      }).trigger("changed", {});
    },
    prependTo: function (selector) {
      return this.then(function (content) {
        $(selector).prepend(content);
      }).trigger("changed", {});
    },
    replace: function (selector) {
      return this.then(function (content) {
        $(selector).html(content);
      }).trigger("changed", {});
    },
    trigger: function (name, data) {
      return this.then(function (content) {
        if (typeof data == "undefined") {
          data = { content: content };
        }
        this.event_context.trigger(name, data);
        return content;
      });
    },
  });
  Sammy.EventContext = function (app, verb, path, params, target) {
    this.app = app;
    this.verb = verb;
    this.path = path;
    this.params = new Sammy.Object(params);
    this.target = target;
  };
  Sammy.EventContext.prototype = $.extend({}, Sammy.Object.prototype, {
    $element: function () {
      return this.app.$element(_makeArray(arguments).shift());
    },
    engineFor: function (engine) {
      var context = this,
        engine_match;
      if (_isFunction(engine)) {
        return engine;
      }
      engine = (engine || context.app.template_engine).toString();
      if ((engine_match = engine.match(/\.([^\.\?\#]+)(\?|$)/))) {
        engine = engine_match[1];
      }
      if (engine && _isFunction(context[engine])) {
        return context[engine];
      }
      if (context.app.template_engine) {
        return this.engineFor(context.app.template_engine);
      }
      return function (content, data) {
        return content;
      };
    },
    interpolate: function (content, data, engine, partials) {
      return this.engineFor(engine).apply(this, [content, data, partials]);
    },
    render: function (location, data, callback, partials) {
      return new Sammy.RenderContext(this).render(
        location,
        data,
        callback,
        partials
      );
    },
    renderEach: function (location, name, data, callback) {
      return new Sammy.RenderContext(this).renderEach(
        location,
        name,
        data,
        callback
      );
    },
    load: function (location, options, callback) {
      return new Sammy.RenderContext(this).load(location, options, callback);
    },
    loadPartials: function (partials) {
      return new Sammy.RenderContext(this).loadPartials(partials);
    },
    partial: function (location, data, callback, partials) {
      return new Sammy.RenderContext(this).partial(
        location,
        data,
        callback,
        partials
      );
    },
    send: function () {
      var rctx = new Sammy.RenderContext(this);
      return rctx.send.apply(rctx, arguments);
    },
    redirect: function () {
      var to,
        args = _makeArray(arguments),
        current_location = this.app.getLocation(),
        l = args.length;
      if (l > 1) {
        var i = 0,
          paths = [],
          pairs = [],
          params = {},
          has_params = false;
        for (; i < l; i++) {
          if (typeof args[i] == "string") {
            paths.push(args[i]);
          } else {
            $.extend(params, args[i]);
            has_params = true;
          }
        }
        to = paths.join("/");
        if (has_params) {
          for (var k in params) {
            pairs.push(this.app._encodeFormPair(k, params[k]));
          }
          to += "?" + pairs.join("&");
        }
      } else {
        to = args[0];
      }
      this.trigger("redirect", { to: to });
      this.app.last_location = [this.verb, this.path];
      this.app.setLocation(to);
      if (new RegExp(to).test(current_location)) {
        this.app.trigger("location-changed");
      }
    },
    trigger: function (name, data) {
      if (typeof data == "undefined") {
        data = {};
      }
      if (!data.context) {
        data.context = this;
      }
      return this.app.trigger(name, data);
    },
    eventNamespace: function () {
      return this.app.eventNamespace();
    },
    swap: function (contents, callback) {
      return this.app.swap(contents, callback);
    },
    notFound: function () {
      return this.app.notFound(this.verb, this.path);
    },
    json: function (string) {
      return $.parseJSON(string);
    },
    toString: function () {
      return (
        "Sammy.EventContext: " + [this.verb, this.path, this.params].join(" ")
      );
    },
  });

  Sammy(function() {
    this.get('#/ahmedabad/December', function(context) {
      // Code to render the December map for ahmedabad
      $('#December').show();
      $('#June').hide();
    });

    this.get('#/ahmedabad/June', function(context) {
      // Code to render the June map for ahmedabad
      $('#June').show();
      $('#December').hide();
    });
  });

  return Sammy;
});
