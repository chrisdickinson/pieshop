var get_global_object, exp=null;
try {
    exp = exports;
    get_global_object = require('./namespace').get_global_object;
} catch(Error) {}

(function (global) {
    var exporter = global.getExporter('fields');

    var PrepValue = function(value, clean_function) {
        this.value = value;
        this.clean_function = clean_function;
    };
    PrepValue.prototype.modify = function (callback) {
        return new PrepValue(callback(this.value), this.clean_function);
    };

    PrepValue.prototype.clean = function () {
        return this.clean_function(this.value);
    };

    var Field = function (kwargs) {
        if(kwargs) {
            this.nullable = kwargs.nullable;
            this.blank = kwargs.blank;
        } else {
            this.nullable = false;
            this.blank = false;
        }
    };

    Field.prototype.getJSValue = function(value) {
        return value;
    };

    var PositiveIntegerField = function(kwargs) {
        this.getPrepLookup = function(value, type) {
            return new PrepValue(value, function(value) {
                return parseInt(value, 10);
            });  
        };
        this.getJSValue = function(value) {
            return parseInt(value, 10);
        };

        Field.apply(this, [kwargs]);
    };
    PositiveIntegerField.prototype = new Field();
    PositiveIntegerField.prototype.constructor = PositiveIntegerField;

    var CharField = function (kwargs) {
        this.max_length = kwargs.max_length;
        this.getPrepLookup = function(value, type) {
            return new PrepValue(value, function(value) {
                return "'"+value.replace(/\\/g, "\\").replace(/'/g, "\\'")+"'";
            });
        };
        Field.apply(this, [kwargs]);
    };
    CharField.prototype = new Field();
    CharField.prototype.constructor = CharField;

    var TextField = function(kwargs) {
        this.getPrepLookup = function(value, type) {
            return new PrepValue(value, function(value) {
                return "'"+value.replace(/\\/g, '\\').replace(/'/g, "\\'")+"'";
            });
        };
    }; 
    TextField.prototype = new Field();
    TextField.prototype.constructor = TextField;

    var DateTimeField = function(kwargs) {
        this.getJSValue = function(value) {
            return new Date(Date.parse(value.split('.')[0]));
        };

        this.getPrepLookup = function(value, type) {
            return new PrepValue(value, function(value) {
                var pad = function(num) {
                    var ret = String(num).length == 1 ? '0'+String(num) : String(num);
                    return ret;
                };

                var datestr = [value.getFullYear(), pad(value.getMonth()), pad(value.getDate())].join('-');
                var timestr = [pad(value.getHours()), pad(value.getMinutes())].join(':');
                return "timestamp '"+datestr+" "+timestr+"'";
            });
        };
    };
    DateTimeField.prototype = new Field();
    DateTimeField.prototype.constructor = DateTimeField;

    exporter('Field', Field);
    exporter('PositiveIntegerField', PositiveIntegerField);
    exporter('DateTimeField', DateTimeField);
    exporter('CharField', CharField);
    exporter('TextField', TextField);
})(get_global_object('pieshop', exp));
