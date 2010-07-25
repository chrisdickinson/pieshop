var get_global_object, exp=null;
try { 
    exp = exports;
    get_global_object = require('./namespace').get_global_object;
} catch(Error) {}

(function (global) {
    var registry = {},
        exporter = global.getExporter('settings');

    var set_addon = function(name, target) {
        registry[name] = target;
    };

    var get_addon = function(name) {
        var target_string = registry[name],
            target_file_and_object = target_string.split(':'),
            target_file = global.require(target_file_and_object[0]),
            target_object_parts = target_file_and_object[1] !== undefined ? target_file_and_object[1].split(':') : [],
            result = target_file;
        for(var i = 0, len = target_object_parts.length; i < len; ++i) {
            result = result[target_object_parts[i]];
        }
        return result;
    };

    exporter('get_addon', get_addon);
    exporter('set_addon', set_addon); 
})(get_global_object('pieshop', exp));
