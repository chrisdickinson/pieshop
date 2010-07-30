var get_global_object, exp=null;
try {
    exp = exports;
    get_global_object = require('./namespace').get_global_object;
} catch(Error) {}

(function (global) {
    var exporter = global.getExporter(),
        settings = global.require('pieshop.settings');

    var dict_copy = function(params, filter) {
        var accept = filter ? filter : function(){return true;};

        for(var i in params) {
            if(params.hasOwnProperty(i) && accept(i)) {
                this[i] = params[i];
            }
        }
    };

    var Manager = function(model) {
        this.model = model;
        this.all = function(callback) {
            (new Query(model)).all(function (data) {
                callback(data);
            });
        };
        this.filter = function(kwargs) {
            return (new Query(model)).filter(kwargs);
        };
    };
    Manager.prototype = {
    };

    var resource_factory = function(opts) {
        var fields = global.require('pieshop.fields');
        var ResourceProto = {},
            Resource = function (data) {
                for(var field_name in data) if (data.hasOwnProperty(field_name)) {
                    var field = this._meta.get_field_by_name(field_name);
                    if(field) {
                        this[field_name] = field.getJSValue(data[field_name]);
                    } else {
                        this[field_name] = data[field_name];
                    }
                }
            };
        var model_fields = {};
        var build_model_fields = function(attribute) {
            if(opts[attribute] instanceof fields.Field) {
                model_fields[attribute] = opts[attribute];
                return false; 
            }
            return true;
        };

        dict_copy.call(ResourceProto, opts, build_model_fields);

        var Metaclass = function(f) {
            this.fields = f;
        };
        Metaclass.prototype.get_field_by_name = function(name) {
            return this.fields[name];
        };
        ResourceProto._meta = new Metaclass(model_fields);
        Resource._default_manager = new Manager(Resource);
        if(Resource.objects === undefined) {
            Resource.objects = Resource._default_manager;
        }
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
