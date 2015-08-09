var _ = require("lodash");

var resolveLoader = require("./lib/resolve/loader");
var resolvePlugin = require("./lib/resolve/plugin");
var defaultMerge = require("./lib/default/merge");
var mergeLoader = require("./lib/mergeLoader");

function Config() {
    this._config = {};

    this._preLoaders = {};
    this._loaders = {};
    this._postLoaders = {};

    this._plugins = {};
}

// This method provides function customisation of how the configuration is built and used as a base when resolving.
Config.prototype.merge = function(config) {
    if (typeof config == "function")
        this._config = config(_.clone(this._config, true) || {});
    else
        _.merge(this._config, config, defaultMerge);
    
    return this;
};

// Almost an alias of loader only we assign to this._preLoaders.
Config.prototype.preLoader = function(name, config, resolver) {
    var args = Array.prototype.slice.call(arguments);

    // Add the current value of the loader. On creation of a loader, this will be undefined.
    args.unshift(this._preLoaders[name]);

    // Assign the newly merged loader to the internal data store.
    this._preLoaders[name] = mergeLoader.apply(this, args);

    // Return 'this' to allow chaining.
    return this;
};

// This method is a helper for creating loaders. It requires a name to make merging easier when identifying loaders.
// There may be some cases where a resolver is needed. A good example is the ExtractTextPlugin. Using the resolver
// parameter, it is possible to call ExtractTextPlugin.extract when resolving to ensure we have all the loader config.
Config.prototype.loader = function(name, config, resolver) {
    var args = Array.prototype.slice.call(arguments);

    // Append the loader object.
    args.unshift(this._loaders[name]);
    
    // Assign the newly merged loader to the internal data store.
    this._loaders[name] = mergeLoader.apply(this, args);

    // Return 'this' to allow chaining.
    return this;
};

// Almost an alias of loader only we assign to this._postLoaders.
Config.prototype.postLoader = function(name, config, resolver) {
    var args = Array.prototype.slice.call(arguments);

    // Add the current value of the loader. On creation of a loader, this will be undefined.
    args.unshift(this._postLoaders[name]);

    // Assign the newly merged loader to the internal data store.
    this._postLoaders[name] = mergeLoader.apply(this, args);

    // Return 'this' to allow chaining.
    return this;
};

// ExtractText has multiple parameters
// Every plugin I've seen is a class so we can assume we will be passed a constructor.
Config.prototype.plugin = function(name, constructor, parameters) {
    var plugin = (_.clone(this._plugins[name], true) || {});
    var resolvedParameters;
    
    if (typeof parameters === "function") {
        resolvedParameters = parameters(_.clone(plugin.parameters, true) || []);

        if (!_.isArray(resolvedParameters))
            throw new Error("The 'parameters' argument must return array.");
        
        plugin.parameters = resolvedParameters;
    } else {
        if (!_.isArray(parameters))
            throw new Error("The 'parameters' argument must an array or function.");
        
        _.merge(plugin, {parameters: parameters}, defaultMerge);
    }
    
    if (constructor)
        plugin.constructor = constructor;

    this._plugins[name] = plugin;

    return this;
};

// This method returns a valid Webpack object. This method should no side-effects and can therefore be called as many
// times as you want.
Config.prototype.resolve = function() {
    var config = _.clone(this._config, true);
    var plugins = [];

    // Resolve each type of loader.
    ["preLoaders", "loaders", "postLoaders"].forEach(function(property) {
        var map = this["_" + property];
        var loaders = [];
        var module = {};
        var loader;

        if (!Object.keys(map).length)
            return;
        
        for (var name in map) {
            loader = map[name];

            loaders.push(resolveLoader(name, loader));
        }

        config.module = (config.module || {});
            
        module[property] = loaders;
            
        _.merge(config.module, module, defaultMerge);
    }, this);

    // Resolve each plugin. This will basically do: new MyPlugin.apply(MyPlugin, parameters).
    for (var name in this._plugins) {
        var plugin = this._plugins[name];

        plugins.push(resolvePlugin(name, plugin));
    }

    if (plugins.length)
        config.plugins = (config.plugins || []).concat(plugins);
    
    return config;
};

module.exports = Config;