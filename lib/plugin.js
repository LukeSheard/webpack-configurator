var DeepClone = require("lodash.clonedeep");
var Merge = require("lodash.mergewith");
var Utils = require("./utils");

function validate(input) {
    if (!Utils.isObject(input))
        throw new Error("You must provide a plugin config object.");

    if (Utils.isDefined(input.plugin) && !Utils.isFunction(input.plugin))
        throw new Error("You must provide a function for 'plugin'.");

    if (Utils.isDefined(input.parameters) && !Utils.isArray(input.parameters))
        throw new Error("You must provide an array for 'parameters'.");

    return input;
}

function sparseArray(object) {
    var keys = Object.keys(object);

    return keys.reduce(function(array, key) {
        if (!Utils.isInteger(key))
            throw new Error("You must provide numerical keys when defining 'changes' as an object.");

        array[key] = object[key];

        return array;
    }, []);
}

function merge(plugin, config, changes, index) {
    var source = changes;

    // Handle 'changes' as a function.
    if (Utils.isFunction(changes))
        source = changes(config.parameters, plugin);

    if (Utils.isDefined(index)) {
        if (!Utils.isInteger(index, true))
            throw new Error("You must provide an integer for 'index'.");

        // Wrap 'changes' within the property: e.g. {[index]: changes}.
        var wrapper = {};
        wrapper[index] = source;
        source = wrapper;
    }

    // Handle changes as an object map where keys are parameter indexes.
    // Note: this also includes the case when an index is passed.
    if (Utils.isObject(source))
        source = sparseArray(source);

    if (!Utils.isArray(source))
        throw new Error("You must provide either an object or array for 'changes'.");

    Merge(config.parameters, source);
}

function set(plugin, config, changes, index) {
    var source = changes;

    // Handle 'changes' as a function.
    if (Utils.isFunction(changes))
        source = changes(config.parameters, plugin);

    if (Utils.isDefined(index)) {
        if (!Utils.isInteger(index, true))
            throw new Error("You must provide an integer for 'index'.");

        // Wrap 'changes' within the property: e.g. {[index]: changes}.
        var wrapper = {};
        wrapper[index] = source;
        source = wrapper;
    }

    // Handle changes as an object map where keys are parameter indexes.
    // Note: this also includes the case when an index is passed.
    if (Utils.isObject(source))
        source = sparseArray(source);

    if (!Utils.isArray(source))
        throw new Error("You must provide either an object or array for 'changes'.");

    // Assign top-level properties in 'config' with properties in 'source'.
    Object.keys(source).forEach(function(key) {
        config.parameters[key] = source[key];
    });
}

module.exports = function plugin(input) {
    // Validate and clone the input.
    var config = DeepClone(validate(input));
    var publicAPI = {
        merge: function(index, changes) {
            var argsLength = arguments.length;

            (function() {
                // Handle if no arguments are passed.
                if (!argsLength)
                    throw new Error("You must provide either an object or function value for 'changes'.");

                // Handle when just changes are passed.
                // Note: This will either be an object or a function.
                if (argsLength == 1)
                    return merge(publicAPI, config, index);

                // Handle when all arguments are passed.
                // Note: we ignore any other parameters.
                merge(publicAPI, config, changes, index);
            })();

            // Return 'this' to enable function chaining.
            return this;
        },
        set: function(index, changes) {
            var argsLength = arguments.length;

            (function() {
                // Handle if no arguments are passed.
                if (!argsLength)
                    throw new Error("You must provide either an object or function value for 'changes'.");

                // Handle when just changes are passed.
                // Note: This will either be an object or a function.
                if (argsLength == 1)
                    return set(publicAPI, config, index);

                // Handle when all arguments are passed.
                // Note: we ignore any other parameters.
                set(publicAPI, config, changes, index);
            })();

            // Return 'this' to enable function chaining.
            return this;
        },
        get: function() {
            return DeepClone(config);
        },
        resolve: function() {
            var _bind = Function.prototype.bind;
            var Plugin = config.plugin;
            var parameters = config.parameters;

            // Create the new instance, passing the array of parameters.
            // Note: This is essentially the equivalent of new Plugin(...parameters).
            return new (_bind.apply(Plugin, [null].concat(parameters)))();
        }
    };

    return publicAPI;
};
