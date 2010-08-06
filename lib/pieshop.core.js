var get_global_object, exp=null;
try {
    exp = exports;
    get_global_object = require('./namespace').get_global_object;
} catch(Error) {}

(function (global) {
    var exporter = global.getExporter(),
        settings = global.require('pieshop.settings'),
        Query;

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
    };
    Manager.prototype.all = function(callback) {
        this.getQuery().all(callback);
    };

    Manager.prototype.filter = function(kwargs) {
        return this.getQuery().filter(kwargs);
    };

    Manager.prototype.each = function(callback) {
        this.getQuery().each(callback);
    };

    Manager.prototype.create = function(kwargs, callback) {
        return this.getQuery().create(kwargs, callback);
    };

    Manager.prototype.getQuery = function() {
        var query = new Query(this.model),
            opts = this.model.prototype._meta;
        if(opts.order_by) {
            query = query.copy({'_order_by':opts.ordering});
        }
        return query;
    };

    var ResourceMeta = function(primary_key, fields, opts) {
        this.primary_key = primary_key;
        this.fields = fields;
        this.ordering = opts.ordering;
        this.opts = opts;
    };

    ResourceMeta.prototype.get_field_by_name = function(name) {
        if(name === 'pk') {
            return this.primary_key;
        }
        return this.fields[name];
    };

    var resource_factory = function(opts) {
        var fields = global.require('pieshop.fields'),
            Resource = function (data) {
                for(var i in this) {
                    if(this[i] instanceof fields.ManyToOneRelFactory) {
                        this[i] = this[i].instantiate(this);
                    }
                }
                for(var field_name in data) if (data.hasOwnProperty(field_name)) {
                    this[field_name] = data[field_name];
                }
            },
            ResourceProto = {
                'save':function(callback) {
                    return new Query(Resource).save(this);
                },
                'erase':function(callback) {
                    return new Query(Resource).filter({'pk':this.pk}).erase(cb);
                }
            },
            model_fields = {},
            metaclass_opts = {},
            primary_key = null;

        var build_model_fields = function(attribute) {
            if(opts[attribute].isField) {
                model_fields[attribute] = opts[attribute](Resource, attribute);
                if(model_fields[attribute].primary_key) {
                    primary_key = model_fields[attribute];
                }
                return false; 
            } else if (attribute === 'Meta') {
                metaclass_opts = opts[attribute];
                return false;
            }
            return true;
        };

        dict_copy.call(ResourceProto, opts, build_model_fields);

        if(!primary_key) {
            primary_key = model_fields['id'] = new (fields.AutoField({'primary_key':true}))(Resource, 'id');
        }

        ResourceProto._meta = new ResourceMeta(primary_key, model_fields, metaclass_opts);

        Resource._default_manager = new Manager(Resource);
        if(!Resource.objects) {
            Resource.objects = Resource._default_manager;
        }

        Resource.prototype = ResourceProto;
        Resource.prototype.constructor = Resource;
        return Resource;
    };

    Query = function(Resource) {    // this was forward declared at the top, hence the lack of 'var'
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
        'order_by': function(ordering) {
            var copy = this.copy({'_order_by':ordering});
            return copy;
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
        'slice': function() {
            if(arguments.length > 0) {
                if(arguments.length === 1) {
                    return this.limit(parseInt(arguments[0], 10));
                }
                return this.offset(parseInt(arguments[0], 10)).limit(parseInt(arguments[1], 10));
            }
            return this.copy();
        },
        // commenting this out until tests are written
        'erase': function(callback) {
            var query = this.copy({'method': 'DELETE'}),
                backend = this.resource.backend === undefined ? this.backend : this.resource.backend,
                transport = this.resource.transport === undefined ? this.transport : this.resource.transport,
                compiled_query = backend.compile(query);
            transport.perform(query.method, query.resource, compiled_query, callback);
        },
        'create': function(kwargs, callback) {
            var query = this.copy({'method': 'PUT', '_values':kwargs}),
                backend = this.resource.backend === undefined ? this.backend : this.resource.backend,
                transport = this.resource.transport === undefined ? this.transport : this.resource.transport,
                compiled_query = backend.compile(query);
            transport.perform(query.method, query.resource, compiled_query, callback);
        },
        'save':function(instance, callback) {
            var data = {},
                backend = this.resource.backend === undefined ? this.backend : this.resource.backend,
                transport = this.resource.transport === undefined ? this.transport : this.resource.transport;
            for(var name in instance._meta.fields) {
                var field = instance._meta.fields[name],
                    value = field.jsToBackendValue(backend, instance[name]);
                if((value === null || value === undefined) && !field.nullable) {
                    throw new Error("Field "+name+" cannot be null!");
                }
                data[name] = value;
            }
            var query = this.copy({'method':'PUT', '_values':data, 'instance':instance}),
                compiled_query = backend.compile(query);
            transport.perform(query.method, query.resource, compiled_query, callback); 
        },
        'update': function(kwargs, callback) {
            var query = this.copy({'method': 'POST', '_values':kwargs}),
                backend = this.resource.backend === undefined ? this.backend : this.resource.backend,
                transport = this.resource.transport === undefined ? this.transport : this.resource.transport,
                compiled_query = backend.compile(query);
            transport.perform(query.method, query.resource, compiled_query, callback);
        },
        'all': function(callback) {
            if(callback !== undefined) {
                var query = this.copy({'method': 'GET'}),
                    backend = this.resource.backend === undefined ? this.backend : this.resource.backend,
                    transport = this.resource.transport === undefined ? this.transport : this.resource.transport,
                    compiled_query = backend.compile(query);
                transport.perform(query.method, query.resource, compiled_query, callback);
            } else {
                var self = this;
                return function(callback) {
                    self.all(callback);
                };
            }
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
