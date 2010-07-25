var get_global_object, exp=null;
try {
    exp = exports;
    get_global_object = require('./namespace').get_global_object;
} catch(Error) {}

(function (global) {
    var exporter = global.getExporter(),
        settings = global.require('pieshop.settings');

    var dict_copy = function(params) {
        for(var i in params) {
            if(params.hasOwnProperty(i)) {
                this[i] = params[i];
            }
        }
    };

    var resource_factory = function(opts) {
        var ResourceProto = {},
            Resource = function (data) {
                dict_copy.call(this, data);
            };
        dict_copy.call(ResourceProto, opts);
        Resource.prototype = ResourceProto;
        return Resource;
    };

    var Query = function(Resource) {
        this.resource = Resource;
        this.method = 'GET';
        this.transport = arguments.length > 1 ? arguments[1] : settings.get_addon('transport');
        this.backend = arguments.length > 2 ? arguments[2] : settings.get_addon('backend');
    };

    Query.prototype = {
        'copy': function(params) {
            var new_query = new Query(this.resource);
            dict_copy.call(new_query, this);
            dict_copy.call(new_query, params);
            return new_query;
        },
        'limit': function(limit) {
            var copy = this.copy({'_limit': limit});
            return copy;
        },
        'offset': function(offset) {
            var copy = this.copy({'_offset': offset});
            return copy;
        },
        'filter': function(params) {
            var new_params = (this._filters) ? this._filters : {};
            dict_copy.call(new_params, params);
            return this.copy({'_filters':new_params});
        },
        // commenting this out until tests are written
        //'delete': function(callback) {
        //    this.method = 'DELETE'
        //    this.resource.prototype.backend.perform(this, callback);
        //},
        'all': function(callback) {
            var query = this.copy({
                    'method': 'GET'
                }),
                backend = this.resource.backend === undefined ? this.backend : this.resource.backend,
                transport = this.resource.transport === undefined ? this.transport : this.resource.transport,
                compiled_query = backend.compile(query);
            transport.perform(query.method, query.resource, compiled_query, callback);
        },
        'each': function(callback) {
            this.all(function(objects) {
                for (var i = 0, len = objects.length; i < len; ++i) {
                    callback.apply(objects[i], [objects[i]]);
                }
            });
        }
    };

    exporter('Query', Query);
    exporter('resource', resource_factory);
    exporter('query', function (Resource) { return new Query(Resource); });
})(get_global_object('pieshop', exp));
