var get_global_object, exp=null;
try {
    exp = exports;
    get_global_object = require('./namespace').get_global_object;
} catch(Error) {}

(function (global) {
    var exporter = global.getExporter('fields');

    var Field = function (model, name, kwargs) {
        this.model = model;
        this.name = name;
        if(kwargs) {
            this.nullable = kwargs.nullable ? true : false;
            this.blank = kwargs.blank ? true : false;
            this.default_value = kwargs.default_value;
            this.validators = kwargs.validators ? kwargs.validators : [];
            this.db_index = kwargs.db_index;
            this.primary_key = kwargs.primary_key;
        } else {
            this.nullable = false;
            this.blank = false;
            this.validators = [];
        }
        this.original_kwargs = kwargs;
    };

    Field.prototype.validate = function(value) {
        for(var i = 0, len = this.validators.length; i < len; ++i) {
            this.validators[i].apply(this, [value]);
        }
        return true;
    };

    Field.prototype.getPrepLookup = function(value, type) {
        return value;
    };

    Field.prototype.getLookupValue = function(value, type, backend) {
        var backendField = this.getBackendField(backend);
        return backendField.getLookupValue(
            this.getPrepLookup(value, type), type
        );
    };

    Field.prototype.jsToBackendValue = function(backend, value) {
        if(value === undefined) {
            value = this.default_value;
            if(value instanceof Function) {
                value = value();
            }
        }
        if(this.validate(value)) {
            return this.getBackendField(backend).jsToLocal(value);
        }
    };

    Field.prototype.backendToJSValue = function(backend, value) {
        return this.getBackendField(backend).localToJS(value);
    };

    Field.prototype.getBackendField = function(backend) {
        try {
            return new backend.fields[this.backendFieldName](backend, this.original_kwargs);
        } catch(err) {
            throw new Error(this.backendFieldName + " is not supported by this backend.");
        }
    };

    var IntegerField = function(model, name, kwargs) {
        Field.apply(this, [model, name, kwargs]);

        this.backendFieldName = 'IntegerField';
    };
    IntegerField.prototype = new Field();
    IntegerField.prototype.constructor = PositiveIntegerField;

    var PositiveIntegerField = function(model, name, kwargs) {
        var validators = kwargs.validators ? kwargs.validators : [];
        validators.push(function(value) {
            if(parseInt(value, 10) < 0) {
                throw new Error("Value must be greater than zero");
            }
        });
        kwargs.validators = validators;
        IntegerField.apply(this, [model, name, kwargs]);
    };
    PositiveIntegerField.prototype = new Field();
    PositiveIntegerField.prototype.constructor = PositiveIntegerField;

    var CharField = function (model, name, kwargs) {
        this.max_length = kwargs.max_length;
        var validators = kwargs.validators ? kwargs.validators : [];
        validators.push(function(value) {
            if(value.length > this.max_length) {
                throw new Error("Value is longer than field's max_length");
            }
        });
        kwargs.validators = validators;
        this.backendFieldName = 'CharField';
        Field.apply(this, [model, name, kwargs]);
    };
    CharField.prototype = new Field();
    CharField.prototype.constructor = CharField;

    var TextField = function(model, name, kwargs) {
        Field.apply(this, [model, name, kwargs]);
        this.backendFieldName = 'TextField';
    }; 
    TextField.prototype = new Field();
    TextField.prototype.constructor = TextField;

    var BooleanField = function(kwargs) {
        Field.apply(this, [kwargs]);
        this.backendFieldName = 'BooleanField';
    };
    BooleanField.prototype = new Field();
    BooleanField.prototype.constructor = BooleanField();
    

    var DateTimeField = function(model, name, kwargs) {
        var validators = kwargs.validators ? kwargs.validators : [];
        validators.push(function(value) {
            if(!value instanceof Date) {
                throw new Error("Value must be an instance of Date");
            }
        });
        kwargs.validators = validators;
        
        this.backendFieldName = 'DateTimeField';

        Field.apply(this, [model, name, kwargs]);
    };
    DateTimeField.prototype = new Field();
    DateTimeField.prototype.constructor = DateTimeField;
    DateTimeField.prototype.getPrepLookup = function(value, type) {
        switch(type) {
            case 'year': return value.getFullYear();
            case 'month': return value.getMonth();
            case 'day': return value.getDate();
            case 'hour': return value.getHours();
            case 'minute': return value.getMinutes();
            case 'second': return value.getSeconds();
            case 'range': return [this.jsToLocal(value[0]), this.jsToLocal(value[1])];
        }
        return value;
    };

    var AutoField = function(model, name, kwargs) {
        kwargs.nullable = false;
        Field.apply(this, [model, name, kwargs]);
        this.backendFieldName = 'AutoField';
    };
    AutoField.prototype = new Field();
    AutoField.prototype.constructor = AutoField;

    var ManyToOneRelFactory = function(one_to_many) {
        this.one_to_many = one_to_many;
    };

    ManyToOneRelFactory.prototype.instantiate = function(instance) {
        return new ManyToOneRel(instance, this.one_to_many);
    };

    var ManyToOneRel = function(instance, forward_relation) {
        this.instance = instance;
        this.forward_relation = forward_relation;
    };

    ManyToOneRel.prototype.getQuerySet = function() {
        var filter = {};
        filter[this.forward_relation.from_field.name] = this.instance;
        return this.forward_relation.from_field.model.objects.filter(filter);
    };

    ManyToOneRel.prototype.all = function(callback) {
        this.getQuerySet().all(callback);
    };

    ManyToOneRel.prototype.each = function(callback) {
        this.getQuerySet().each(callback);
    };

    ManyToOneRel.prototype.filter = function(kwargs) {
        return this.getQuerySet().filter(kwargs);
    };

    var OneToManyRel = function(from_field, to_model, related_name, related_field_name) {
        this.from_field = from_field;
        this.to_model = to_model;
        this.related_name = related_name;
        related_field_name = related_field_name ? related_field_name : 'pk';
        this.to_field = this.to_model.prototype._meta.get_field_by_name(related_field_name);
    };

    OneToManyRel.prototype.contribToClass = function() {
        this.to_model.prototype[this.related_name] = new ManyToOneRelFactory(this);
    };

    var ForeignKey = function(model, name, to, kwargs) {
        Field.apply(this, [model, name, kwargs]);
        var rel_class = kwargs.rel_class ? kwargs.rel_class : OneToManyRel; 
        this.rel = new rel_class(this, to, kwargs.related_name);
        this.rel.contribToClass();
        this.backendFieldName = 'ForeignKey';
    };
    ForeignKey.prototype = new Field();
    ForeignKey.prototype.constructor = ForeignKey;
    ForeignKey.prototype.getBackendField = function(backend) {
        return new backend.fields.ForeignKey(backend, this.rel, this.original_kwargs);
    };


    var ManyToMany = function(model, to, kwargs) {

    };

    var define = function(field_class) {
        return function(kwargs) {
            var retval = function(model, name) {
                kwargs = kwargs || {};
                return new field_class(model, name, kwargs);
            };
            retval.isField = true;
            return retval;
        };
    };

    exporter('Field', Field);
    exporter('IntegerFieldInstance', IntegerField);
    exporter('PositiveIntegerFieldInstance', PositiveIntegerField);
    exporter('DateTimeFieldInstance', DateTimeField);
    exporter('CharFieldInstance', CharField);
    exporter('TextFieldInstance', TextField);
    exporter('BooleanFieldInstance', BooleanField);
    exporter('AutoFieldInstance', AutoField);
    exporter('ForeignKeyInstance', ForeignKey);

    exporter('ManyToOneRelFactory', ManyToOneRelFactory);
    exporter('IntegerField', define(IntegerField));
    exporter('PositiveIntegerField', define(PositiveIntegerField));
    exporter('DateTimeField', define(DateTimeField));
    exporter('CharField', define(CharField));
    exporter('TextField', define(TextField));
    exporter('BooleanField', define(BooleanField));
    exporter('AutoField', define(AutoField));
    exporter('ForeignKey', (function() {
        return function(to, kwargs) {
            var retval = function(model, name) {
                return new ForeignKey(model, name, to, kwargs);
            };
            retval.isField = true;
            return retval;
        };
    })());

})(get_global_object('pieshop', exp));
