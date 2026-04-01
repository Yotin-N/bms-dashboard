/**
Create  a new edittable. You should probably not be calling this directly.
@constructor
@param {String} id - the id of the element that will hold the edit table
@param {Object} data - the data to bind to the edit table
@param {Object[]} [col_defs] - definition for each column to be rendered
@param {Object[]} col_defs.field - Which field in the datasource to bind this column to
@param {Object[]} col_defs.template - instead of supplying a field, you can supply a html template to use. The syntax follows Underscore.js's template syntax
@param {String}
@param {Object} [opts] - options
@param {String} opts.key_field - Which field in the data to use as the primary key field. This is used to check for duplicates.
@param {Boolean} opts.allow_duplicates - Set to false to raise an error if you attempt to add duplicate objects. Duplicate objects are detected by matching the key_field of each object.
@param {Boolean} opts.allow_delete - Set to true to show a delete link on each row and allow the row to be deleted

@property {Object[]} data - the data that is bound to this edittable. 
If you are modifying this directly, remember to call {@link EditTable#saveData}.

@property {Function} deleteFunc - the function call when a row from the table needs to be deleted

*/
var EditTable = function(id,data,col_defs,opts) {
    var self = this;

    self.id = id;
    self.data = data;
    self.columns = col_defs || [];
    self.opts = opts;
    self.templates_compiled = false;
    self.canDeleteFunc = null;
    self.deleteFunc = null;
    self.column_funcs = { };

    $(document).ready(function(){
        self.reload();
    });
};
/**
A custom function to render a column in an edittable.
@name columnRenderFunc
@function
@param {EditTable} edittable - the edittable that this function is being called on
@param {Number} row - an integer specifying the current row being rendered
@param {jquery} cell - a jquery element into which the contents of the cell should be rendered.
*/
/**
Register a function to be used to render a specific column.
This lets you provide custom formatting for a given column.
@param {String} col - the name of the column 
@param {columnRenderFunc} func - the column renderer function to use. You can use one of the predefined {@link EditTable.ColumnTypes}
*/
EditTable.prototype.columnFunc = function(col,func) {
    var self = this;
    self.column_funcs[col] = func;
};
/**
This is an alias for {@link EditTable#columnFunc}
*/
EditTable.prototype.setColumn= function(col,column_type) {
    var self = this;
    return self.columnFunc(col,column_type);
};
EditTable.prototype.compileTemplates = function() {
    var self = this;
    _.each(self.columns,function(col){
        if (col.template.trim() != "")
            col.compiled_template = _.template(col.template);
        else
            col.compiled_template = function(obj) {
                //TODO: Proper escaping here
                if (!col.field) return "";
                return $('<span />').text(obj.row[col.field]).html();
            }
    });
    self.templates_compiled = true;
};

/**
Causes all data that has been manipulated to be saved into the edittable.
Note that this does *not* save the data to the server. You need to do that manually by calling {@link ServiceDesk#executeService} or
by submitting the page

@param {Boolean} [trigger_change=true] - If true, then it triggers any change notification event listeners. 
*/
EditTable.prototype.saveData = function(trigger_change) {
    var self = this;
    var obj = this.data;
    var data_container = $$(this.id+"__data");
    data_container.val(JSON.stringify(obj));
    if (typeof trigger_change == 'undefined' || !!trigger_change)
        self.dataChanged();

};

/**
Delete a row from the table and the underyling data
@param {Number} i - the index of the row to delete
@param {Boolean} [trigger_change=true]  - If true, this will trigger any change notification event listeners
*/
EditTable.prototype.deleteRow = function(i,trigger_change) {
    Array.remove(this.data,i);
    this.saveData(trigger_change);
};

/**
Add a new piece of data to the edit table.

@param {Object} obj - the object to be added.
@param {Object} [opts] - Options
@param {Boolean} opts.highlight - set to true to cause the newly added row to be briefly highlighted.
*/
EditTable.prototype.addObject = function(obj,opts) {
    opts = opts||{'highlight':true};
    if (this.opts.allow_duplicates != 'true' ) {
        var key_field = xstr(this.opts.key_field)

        if (!key_field) {
            console.log('Keyfield not specified for not allowing duplicates');
        }

        var items = Array.filter(this.data,(function(x) { return x[key_field] == obj[key_field];}));

        if (!!items && items.length>0) {
            var msg = this.opts['duplicate.message'] || 'This entry has already been added';
            alert(msg);
            return false;
        }
    }
    this.data.push(obj);
    this.saveData();
    var reload_opts = {};
    if (opts.highlight) reload_opts['highlight'] = obj;
    this.reload(reload_opts);
    return true;
};
EditTable.prototype.getFieldContainer = function() {
    var self = this;
    return $$(self.id + "__table");
};

/**
Reload the contents of the edittable. You should usually not have to call this.
When you add or remove an object, the contents are reloaded automatically.
*/
EditTable.prototype.reload = function(opts) {
    var self = this;
    
    opts = opts || {};
    var edit_table = this;
    if (!this.templates_compiled) this.compileTemplates();
    var table = $$(edit_table.id+"__table");
    table.empty();
    table.addClass('fe_table');
    var body = $('<tbody />');
    table.append(body);
    var header =  $('<tr />').addClass('fe_header');
    var col_widths = [];
    var total_width= 0;
    $.each(edit_table.columns,function(i,col){
        var sw = xstr(col.width);
        var w = 1;
        if (sw=='*' || sw=='') w = 1;
        else w = xint(sw);
        col_widths.push(w);
        total_width += w;
    });
    body.append(header);
    $.each(edit_table.columns,function(i,col){
        var col_val = col.header;
        var pct = (col_widths[i]*100)/total_width;
        var wp = pct.toFixed(2) + '%';
        var td = $('<td />').text(col_val);
        if (i < edit_table.columns.length-1)
            td.attr('width',wp);
        header.append(td);
    });

    //Actions
    header.append( $('<td />').text(''));

    var highlight_row = null;
    var highlight_obj = opts.highlight;
    var rows = edit_table.data;
    for(var i=0;i<rows.length;i++) {
        var row = rows[i];
        var tr = $('<tr />').addClass('fe_row');
        var first_cell = null;
        for(var c=0;c<edit_table.columns.length;c++) {
            var col = edit_table.columns[c];
            var cell = $('<div />');
            if (!!self.column_funcs[col.id]) {
                self.column_funcs[col.id](self,i,cell);
            } else {
                var col_val = col.compiled_template({'row':row,'index':i,'column':col.id});
                cell.html(col_val);
            }
            if (first_cell==null) first_cell= cell;
            tr.append($('<td />').append(cell));
        }


        if (first_cell != null && getBool(self.opts.allow_delete,false)) {
            (function(){
                if (!!self.canDeleteFunc && !self.canDeleteFunc(row)) return;
                var count = i;
                var hover_option = $('<span />').addClass('hover_options');
                var del_link = $('<a />').attr('href','#').addClass('clear_item')
                .click(function(evnt){
                    evnt.preventDefault();
                    edit_table.deleteRow(count,false);
                    edit_table.reload();
                    edit_table.dataChanged();
                }).appendTo(hover_option);
                hover_option.append($('<div />').addClass('dummy'));
                first_cell.append(hover_option).addClass('hover_container');
                first_cell.closest('tr').addClass('hover_container');
            })();
        }

        //tr.append(action_cell);

        body.append(tr);
        if (row==highlight_obj) {
            $(tr).addClass('tohighlight');
        }
    }
    if (!ServiceDesk.isMobile()) {
        $('.tohighlight').effect('highlight',{},5000,function(){
            $('.tohighlight').removeClass('tohighlight');
        });
    }
};

/**
Return the data associated with this edittable.
*/
EditTable.prototype.getValue = function() {
    return this.data;
};
/**
Several pre-canned column types are available for use with {@link EditTable#setColumn}
@namespace EditTable.ColumnTypes
*/
EditTable.ColumnTypes = {};
/**
Creates a new column for showing a text field in which an integer could be edited.
@param {Object} opts - options
@param {String} opts.key_field - which field in the data to bind to
*/
EditTable.ColumnTypes.IntColumn = function(opts) {
    var key_field = opts.key_field;
    var id = opts.id || ServiceDesk.generateID();
    return function(table,row,cell) {
        var obj = table.data[row];
        var tf = TextField.create({
            'id':id + '__' + row
        });
        tf.appendTo(cell);
        tf.setValue(obj[key_field]);
        tf.registerChangeEvent(function(){
            obj[key_field] = tf.getValue();
            table.saveData();
        });
    }
};
/**
Creates a new column for showing a text field in which any arbitrary text  could be edited.
@param {Object} opts - options
@param {String} opts.key_field - which field in the data to bind to
*/
EditTable.ColumnTypes.TextColumn = function(opts) {
    var key_field = opts.key_field;
    var id = opts.id || ServiceDesk.generateID();
    return function(table,row,cell) {
        var obj = table.data[row];
        var tf = TextField.create({
            'id':id + '__' + row
        });
        tf.appendTo(cell);
        tf.setValue(obj[key_field]);
        tf.registerChangeEvent(function(){
            obj[key_field] = tf.getValue();
            table.saveData();
        });
    }
};
/**
Creates a new column for showing a list field with items to select from
@param {Object} opts - options
@param {String} opts.unselected_text - text to show when nothing is selected
@param {Object} opts.source - Data source to bind to
@param {String} opts.id - the base id of the list field. Can be empty.
@param {String} opts.text_field - The field name which contains the text to display for each item
@param {String} opts.key_field - The field name which contains the value to be saved internally for each item
*/
EditTable.ColumnTypes.ListColumn = function(opts) {
    var key_field = opts.key_field;
    var text_field = opts.text_field;
    var source = opts.source;
    var id = opts.id || ServiceDesk.generateID();
    var unselected_text = opts.unselected_text || "--Select--";
    return function(table,row,cell) {
        var obj = table.data[row];       
        var tf = ListField.create({
            'id':id + '__' + row,
            'source':source,
            'object':obj,
            'key_field':key_field,
            'text_field':text_field,
            'unselected_text':unselected_text
        });
        //tf.appendTo(cell);
        tf.ctrl.appendTo(cell);        
        tf.registerChangeEvent(function(){
            obj[key_field] = tf.getValue();
            table.saveData();
        });
    }
};

/**
Creates a new column for showing a combobox
@param {Object} opts - options
@param {String} opts.id - the base id of the list field. Can be empty.
@param {String} opts.key_field - Which field from the table data source to use to check/uncheck
*/
EditTable.ColumnTypes.CheckboxColumn = function(opts) {
    var key_field = opts.key_field;
    var id = opts.id || ServiceDesk.generateID();  
    return function(table,row,cell) {
        var obj = table.data[row];
        var tf = CheckboxField.create({
            'id':id + '__' + row,
            'trueval':opts.trueval,
            'falseval':opts.falseval
        });
        tf.appendTo(cell);
        var checkval = obj[key_field];
        if(checkval > 0){
            tf.ctrl.attr('checked','checked');      
        }
        tf.setValue(obj[key_field]);
        tf.registerChangeEvent(function(){        
            var r = tf.getValue();
            obj[key_field] = tf.getValue();
            table.saveData();
        });      
    }
};

EditTable.ColumnTypes.DateColumn = function(opts) {
    var key_field = opts.key_field;
    var id = opts.id || ServiceDesk.generateID();  
    return function(table,row,cell) {
        _.defer(function(){
            var obj = table.data[row];
            opts.id = id + '__' + row
            var tf = DateTimeField.createDateField(cell,opts);
            var dt = obj[key_field];
            if (!!dt) {
                tf.setDate(ServiceDesk.parseDateTime(dt));
            }
            tf.registerChangeEvent(function(){
                obj[key_field] = tf.getValue();
                table.saveData();
            });
        });        
    };
};

/**
Register a function to be called when data changes.
@param {Function} func - a function to be called on data changes
*/
EditTable.prototype.registerChangeEvent = function(func) {
    var self = this;
    var ctrl = self.getFieldContainer();
    ctrl.rebind('datachanged',func);
};

EditTable.prototype.dataChanged = function() {
    var self = this;
    var ctrl = self.getFieldContainer();
    ctrl.trigger('datachanged');
};
EditTable.prototype.gatherPostFields = function(p) {
    var self = this;
    p[self.id+"__data"] = $$(self.id+"__data").val();
};

var LabelField = function(id) {
    var self = this;
    self.id = id;
    self.ctrl = $$(self.id);
};
LabelField.prototype.setValue = function(txt) {
    var self = this;
    if (!txt) {
        txt = self.ctrl.attr('nodata');
        self.ctrl.addClass('nodata');
    } else {
        self.ctrl.removeClass('nodata');
    }
    self.ctrl.text(txt);
};
/**
Setup a new DurationField - you should never call this constructor directly.
The duration field will allow showing and editing of a time duration.
Internally, durations are stored in minutes. They are formatted in a friendly way when displayed.
@param {String} id - the id of the textbox to be used
@constructor
*/
var DurationField = function(id) {
    var self = this;
    self.id = id;
    self.container = id + "__duration_container";
    self.val_id = id + "__duration";
    self.updateDurationText();
    $$(self.id).blur(function(){
        self.updateDurationValue();
    })
};

/**
Get the current duration value in minutes
*/
DurationField.prototype.getValue = function() {
    return xnum($$(this.val_id).val());
};
DurationField.prototype.getFieldContainer = function() {
    var self = this;
    return $$(self.container);
};
DurationField.prototype.updateDurationText = function() {
    var self = this;
    var v = self.getValue();
    var txt = self.formatDuration(v);
    $$(self.id).val(txt);
};
DurationField.prototype.updateDurationValue = function() {
    var self = this;
    var val = self.parseDuration($$(self.id).val());
    self.setValue(val);
};
/**
Set the current duration in minutes
@param {Integer} v - the duration to be set - in minutes
*/
DurationField.prototype.setValue = function(v) {
    var self = this;
    $$(self.val_id).val(v);
    self.updateDurationText();
    return v;
};
/**
Register a function to be called when data changes.
@param {Function} func - a function to be called on data changes
*/
DurationField.prototype.registerChangeEvent = function(func) {
    var self = this;
    if (ServiceDesk.isMobile()) {
        $$(self.id).rebind('keydown',function(evnt){
            if (evnt.keyCode==13) {
                evnt.preventDefault();
                $$(self.id).blur();
                func();
            }
        });
        $$(self.id).rebind('blur',func);

    } else {
        $$(self.id).rebind('blur',func);
    }
};
DurationField.prototype.registerLeaveEvent = function(func) {
    var self = this;
    $$(self.id).rebind('blur',func);
};
DurationField.prototype.appendTo = function(parent) {
    var self = this;
    
    $$(self.id).appendTo(parent);
    if (self.footer().exists()) self.footer().appendTo(parent);
};

/**
Parse a duration string into a value in minutes.
@param {String} txt - The duration string to parse
@returns {Integer} - duration in minutes
*/
DurationField.prototype.parseDuration = function(txt) {
    var hour_expressions = [
        /\s*([0-9]*(\.[0-9]*)?)\s*[Hh]/
        ];
    var min_expressions = [
        /\s*([0-9]*(\.[0-9]*)?)\s*[Mm]/
        ];
    var day_expressions = [
        /\s*([0-9]*(\.[0-9]*)?)\s*[dD]/
        ];
    var hour = 0;
    var day = 0;
    var min = 0;
    for(var i=0;i<hour_expressions.length;i++) {
        var re = hour_expressions[i];
        var match = txt.match(re);
        if (!match) continue;
        hour = xnum(match[1]);
    }
    for(var i=0;i<min_expressions.length;i++) {
        var re = min_expressions[i];
        var match = txt.match(re);
        if (!match) continue;
        min = xnum(match[1]);
    }
    for(var i=0;i<day_expressions.length;i++) {
        var re = day_expressions[i];
        var match = txt.match(re);
        if (!match) continue;
        day = xnum(match[1]);
    }
    if ((day==0) && (hour==0) && (min==0)) return Math.round(xnum(txt));
    return Math.round(min + hour*60 + day*24*60);
};
DurationField.prototype.formatDuration = function(min) {
        if (min < 60) return min + "min";
        var minutes = min % 60;
        var hours = Math.floor(min/60);
        var hs = hours + "hr";
        if (hours > 1) hs += "s";
        if (minutes > 0) hs += " " + minutes + "min";
        return hs;
        //return hours + "hr " + minutes + "min";
};
DurationField.prototype.gatherPostFields = function(p) {
    var self = this;
    p[self.id + "__duration"] = self.getValue();
};
DurationField.prototype.gatherFields = function(p,n) {
    var self = this;
    p[n] = self.getValue();
};

/**
Creates an arbitrary text field. Don't call this directly
@constructor
*/
var TextField = function(id) {
    this.id = id;
    this.ctrl = $$(this.id);
};
/**
Gets the current text in the text field
*/
TextField.prototype.getValue = function() {
    return $$(this.id).val();
};

/**
Trigger validation on the field.
@param {String} validation_type - Only one validation type is currently supported - 'empty' - 
which validates if the text field is empty or not
*/
TextField.prototype.validateField = function(vt) {
    var self = this;
    if (String.matches(vt,'empty')) {
        if (xstr(self.getValue())=="") return false;
        return true;
    }
    return true;
}
TextField.prototype.getFieldContainer = function() {
    var self = this;
    if (!self.ctrl.exists())
        self.ctrl = $$(self.id);
    return self.ctrl;
};
TextField.prototype.getElement = function() {
    return this.getFieldContainer();
};
/**
Set the current value of the text field
@param {String} v - the value to set
*/
TextField.prototype.setValue = function(v) {
    var self = this;
    return self.ctrl.val(v);
};
/**
Register a function to be called when data changes.
@param {Function} func - a function to be called on data changes
*/
TextField.prototype.registerChangeEvent = function(func) {
    var self = this;
    if (ServiceDesk.isMobile()) {
        self.ctrl.rebind('keydown',function(evnt){
            if (evnt.keyCode==13) {
                evnt.preventDefault();
                self.ctrl.blur();
                func();
            }
        });
        self.ctrl.rebind('blur',func);

    } else {
        self.ctrl.rebind('keyup',func);
    }
};
TextField.prototype.registerLeaveEvent = function(func) {
    var self = this;
    self.ctrl.rebind('blur',func);
};
/**
Gets the footer element associated with this text field
@returns {jquery}
*/
TextField.prototype.footer = function() {
    var self = this;
    if (!self._footer) self._footer = $$(self.id + "__footer");
    return $(self._footer);
};
TextField.prototype.appendTo = function(parent) {
    var self = this;
    
    self.ctrl.appendTo(parent);
    if (self.footer().exists()) self.footer().appendTo(parent);
};

TextField.create = function(opts) {
    var inp = $('<input />').attr('type','text').attr('id',opts.id);
    var footer = $('<span />').attr('id',opts.id+"__footer").addClass('footer');
    var tf = new TextField(opts.id);
    tf.ctrl = inp;
    tf._footer = footer;
    __Fields__[opts.id] = tf;
    return tf;
};

/**
Create a currency field. You should not call this directly
@constructor
*/
var CurrencyField = function(id) {
    var self = this;
    self.id = id;
    self.ctrl = $$(self.id);
    self.hdn_val = $$(self.id+"_val");
    self.hdn_currency = $$(self.id+"_currency");
    var opts = {
        'digitGroups':_.map(self.hdn_val.attr('digitGroups').split(','),xint)
        ,'decimal':self.hdn_val.attr('decimal')
        ,'comma':self.hdn_val.attr('comma')
        ,'currencyDecimals':self.hdn_val.attr('currencyDecimals')
    }
    self.fmt = new NumberFormatter(opts);
    $$(self.id).rebind('blur',function(){
        self.updateValue(self.ctrl.val());
    });
};
CurrencyField.prototype.updateValue = function(flt) {
    var self = this;
    if (typeof flt == 'string') {
        if (flt.trim()=="") {
            self.hdn_val.val('');
            self.ctrl.val('');
            return;
        }
        flt = self.fmt.parseNumber(flt);
    }
    self.ctrl.val(self.fmt.formatCurrency(flt));
    self.hdn_val.val(flt);
};
CurrencyField.prototype.getValue = function() {
    var self = this;
    return self.hdn_val.val();
};
CurrencyField.prototype.setValue = function(txt) {
    var self = this;
    self.updateValue(txt);
};
CurrencyField.prototype.registerChangeEvent = function(func) {
    var self = this;
    $$(this.id).rebind('blur',func);

};
CurrencyField.prototype.getFieldContainer = function() {
    var self = this;
    return self.ctrl.closest('.currency_container');
};
CurrencyField.prototype.getElement = CurrencyField.prototype.getFieldContainer;
CurrencyField.prototype.gatherPostFields = function(p) {
    var self = this;
    p[self.hdn_val.attr('id')] = self.hdn_val.val();
    p[self.hdn_currency.attr('id')] = self.hdn_currency.val();
};
CurrencyField.prototype.gatherFields = function(p,n) {
    var self = this;
    p[n] = self.hdn_val.val();
    p[n+'__tz'] = self.hdn_currency.val();
};

//ListField
var ListField = function(id) {
    this.id = id;
    this.ctrl = $$(this.id);
};
ListField.prototype.getFieldContainer = function() {
    return this.ctrl;
};
ListField.prototype.getElement = ListField.prototype.getFieldContainer;
ListField.prototype.getValue = function() {
    return this.ctrl.val();
};
ListField.prototype.setValue = function(v) {
    this.ctrl.val(v);
};
ListField.prototype.setValueFromText = function(txt) {
    var self = this;
    var ctrl = this.ctrl;
    $(ctrl).find('option').each(function(){
        if (String.matches(this.text,txt)) {
            self.setValue(this.value);
            return;
        }
    });
};
ListField.prototype.registerChangeEvent = function(func) {
    this.ctrl.rebind('change',func);
};
ListField.prototype.loadValues = function(objects,_opts) {
    var self = this;
    var opts = _opts || {};
    var s = $(self.ctrl);

    var unselected_value = s.attr('unselectedvalue');
    var unselected_text = s.attr('unselectedtext');
    var key_field = opts.key_field || s.attr('keyfield');
    
    //Damn typo 
    var text_field = opts.text_Field || opts.text_field || s.attr('textfield');

    s.empty();
    var addObject = function(obj) {
        var opt = $('<option />').val(obj[key_field]).html(obj[text_field]);
        s.append(opt);
    };
    var empty = new Object();
    empty[key_field] = unselected_value;
    empty[text_field] = unselected_text;
    addObject(empty);
    _.forEach(objects,addObject);
};
ListField.create = function(opts) {
    var source = opts.source;
    if (typeof source=='string') {
        source = __ServiceData__[source];
    }
    var obj  = opts.object;
    var key_field = opts.key_field;
    var text_field = opts.text_field;
    var value = null || obj[key_field];
    var unselected_text = opts.unselected_text|| '--Select--';

    id = opts.id || ServiceDesk.generateID();
    var s = $('<select />').attr('id',id);
    s.append($('<option hidden />').val("").html(unselected_text));
    _.forEach(source,function(x){
        var opt = $('<option />').val(x[key_field]).html(x[text_field]);
        s.append(opt);
        if (x[key_field] +"" == value+"") opt.attr('selected','selected');
    });

    var lf= new ListField(id);
    lf.ctrl = s;
    __Fields__[id] = lf;
    return lf;
    
};


//ACListField - autocompleting list
var ACListField = function(id,app,service,key_field,text_field,max_rows) {
    var self = this;

    self.id = id;
    self.$hidden = $$(self.id+"__data");
    $$(self.id).data('selectedKey',self.$hidden.val());
    $$(self.id).data('selectedText',$$(self.id).val());
    $$(self.id).autocomplete(
        ServiceDesk.serviceUrl(app,service)
        ,{
            mustMatch:false
            ,extraParams:{
                'max':max_rows
                ,'__format__':'json'
                ,'__ajax__':'1'
            }
            ,max:max_rows
            ,dataType:'json'
            ,minLength:0
            ,parse: function(d) {
                var results = [];
                for(var i=0;i<d.length;i++) {
                    var row = d[i];
                    results[results.length] = {
                        data: row
                        ,value:row[key_field]
                        ,result:row[text_field]
                    }
                }
                return results;
            }
            ,formatItem: function(x) { return x[text_field];}
        }
    )
    
    .blur(function(){

        if (!!self.allow_empty && $(this).val()=="") {
            $(this).data('selectedKey','').data('selectedText','');
            self.$hidden.val('');
            $$(self.id).trigger('onitemselected');
            return;
        }
        
        var k = $(this).data('selectedKey');
        if (!k) {
            $(this).val('');
        } else {
            $(this).val($(this).data('selectedText'));
        }

    })
    
    .result(function(dv,data){
        var old_v = self.$hidden.val();
        $(this).data('selectedKey',data[key_field]).data('selectedText',data[text_field]);
        self.$hidden.val(data[key_field]);

        if (old_v != data[key_field]) {
            $$(self.id).trigger('onitemselected');
        }
    })
    
    .focus(function(){
    });
};
ACListField.prototype.getObject = function() {
    var self= this;
    var ctrl = $$(self.id);

    var ot = $(ctrl).attr('ot');
    if (ot=='') return null;

    var ok = $(ctrl).data('selectedKey');
    var oid = $(ctrl).data('selectedText');
    if (ok!="" && oid!="") {
        return {ObjectKey:ok,ObjectID:oid,ObjectType:ot};
    }
};
ACListField.prototype.setObject = function(obj) {
    var self = this;

    if(obj==null) return;

    var ctrl = $$(self.id);

    var old_v = self.$hidden.val();

    $(ctrl).data('selectedKey',obj.ObjectKey)
    $(ctrl).data('selectedText',obj.ObjectID);
    self.$hidden.val(obj.ObjectKey);

    if (old_v != obj.ObjectKey) {
        $$(self.id).trigger('onitemselected');
    }

    $(ctrl).val($(ctrl).data('selectedText'));
};
ACListField.prototype.getValue = function() {
    return this.$hidden.val();
};
ACListField.prototype.registerChangeEvent = function(func){
    $$(this.id).rebind('onitemselected',func);
};

//Hidden field
var HiddenField = function(id) {
    this.id = id;
};
HiddenField.prototype.getValue = function() {
    return $$(this.id).val();
};
HiddenField.prototype.setValue = function(v) {
    return $$(this.id).val(v);
};
HiddenField.prototype.getFieldContainer = function() {
    return $$(this.id);
};
HiddenField.prototype.getElement = HiddenField.prototype.getFieldContainer;


//DynamicList - light-weight search list
var DynamicListField = function(id,app,service,key_field,text_field,type_field,max_rows) {
    var self = this;

    self.id = id;
    self.$hidden = $$(self.id+"__data");
    self.hdn_ot = $$(id + "__objecttype");
    self.label = $$(self.id+"__label");
    self.editor = $$(self.id);
    self.app = app;
    self.service = service;
    self.key_field = key_field;
    self.text_field = text_field;
    self.type_field = type_field;
    self.max_rows = max_rows;
    self.result_items = [];


    $(self).data('selectedKey',self.$hidden.val());
    $(self).data('selectedText',$$(self.id).val());

    var KEY = {
        UP: 38,
        DOWN: 40,
        DEL: 46,
        TAB: 9,
        RETURN: 13,
        ESC: 27,
        COMMA: 188,
        PAGEUP: 33,
        PAGEDOWN: 34,
        BACKSPACE: 8
    };
    self.editor.rebind('keydown',function(evnt){
        switch(evnt.keyCode) {
            default: return;
            case KEY.UP:
                self.selectItemByOffset(-1);
                break;
            case KEY.DOWN:
                self.selectItemByOffset(1);
                break;
            case KEY.ESC:
                self.hideResults();
                break;
            case KEY.TAB:

            case KEY.RETURN:
                self.selectItemByOffset(0);
                self.selectCurrentItem();
                break;
        }
        evnt.stopPropagation();
        evnt.preventDefault();
        
    });
    var updater = _.debounce(function(){self.updateResults();},300);
    self.editor.rebind('keyup',function(evnt){
        switch(evnt.keyCode) {
            default:
                updater();
                break;
            case KEY.UP:
            case KEY.DOWN:
                break;
        }
    });
    self.editor
    .blur(function(){
        self.hideResults();

    })
    .focus(function(){
        self.showResults();
    });
};
DynamicListField.prototype.firstObjectType = function() {
    var self = this;
    var otlist = self.allowedObjectTypes.splitProper(',');
    if (otlist.length==0) return null;
    return otlist[0];
};
DynamicListField.prototype.objectType = function(ot) {
    var self = this;
    if (!!ot) 
        self.hdn_ot.val(ot);
    
    return self.hdn_ot.val();
};
DynamicListField.prototype.isValidObjectType = function(ot) {
    var self = this;
    if (self.allowedObjectTypes=="") return true;
    var otlist = self.allowedObjectTypes.toUpperCase().splitProper(',');
    return _.indexOf(otlist,ot.toUpperCase()) >= 0;
};
DynamicListField.prototype.gatherPostFields = function(p) {
    var self = this;
    var obj = self.getObject();
    console.log('gather fields',obj);
    if (!obj) return;
    var n = self.id;
    p[n + "__data"] = obj.ObjectKey;
    p[n + "__text"] = obj.ObjectID;
    p[n] = obj.ObjectID;
    p[n + "__objecttype"] = obj.ObjectType;
};
DynamicListField.prototype.gatherFields = function(p,n) {
    var self = this;
    var obj = self.getObject();
    console.log('gather fields',obj);
    if (!obj) return;
    p[n] = obj.ObjectKey;
    p[n + "__text"] = obj.ObjectID;
    p[n + "__objecttype"] = obj.ObjectType;
};
DynamicListField.prototype.keepResults = function() {
    if (!!this.timeout) clearTimeout(this.timeout);
};
DynamicListField.prototype.results = function() {
    var self = this;

    function target(event) {
        var element = $(event.target);
        if (element.hasClass('item')) return element;
        return $(element).parents('.item');
        while(element && element.tagName != "DIV")
            element = element.parentNode;
        // more fun with IE, sometimes event.target is empty, just ignore it then
        if(!element)
            return [];
        return element;
    }

    if (!self._results) {
        self._results = $('<div />').attr('id',self.id+"__results").addClass('dynlist_results');
        self._results.css('visibility','hidden');
         // var op = self.editor.offsetParent();
        var op = $$(self.id + "__container");
        op.append(self._results);
        self._results.scroll(function() {
            self.keepResults();
        });
        self._results.mouseover(function(evnt){
            var t = target(evnt);
            if (!t.exists()) return;
            self.selectItem(t);
        });
        self._results.mousedown(function(evnt) {
            var t = target(evnt);
            if (!t.exists()) return;
            self.selectItem(t);
            self.selectCurrentItem();
        });
    }
    return self._results;
};
DynamicListField.prototype.showResults = function (){
    var self = this;
    var t = self.timeout;
    if (!!t) clearTimeout(t);
    self.results().css('visibility','visible');
};
DynamicListField.prototype.hideResults = function() {
    var self = this;
    var t= self.timeout;
    if (!!t) clearTimeout(t);
    self.timeout = setTimeout(function(){self.hideResultsNow();},200);
};
DynamicListField.prototype.hideResultsNow = function() {
    var self = this;
    self.results().css('visibility','hidden');
    self.editor.makeInvisible();
    self.label.makeVisible();
};
DynamicListField.prototype.edit = function() {
    var self = this;
    self.label.makeInvisible();
    self.editor.makeVisible();
    self.editor.focus().select();
    self.updateResults();
    return;
};
DynamicListField.prototype.setLabel = function(txt) {
    var self = this;
    var nodata = !txt;
    if (nodata) {
        self.label.text(self.nodata);
        self.label.addClass('nodata');
        self.label.attr('title','');
    } else {
        self.label.text(txt);
        self.label.removeClass('nodata');
        self.label.attr('title',txt);
    }

};
DynamicListField.prototype.parametersRequired = function(func) {
    var self = this;
    ServiceDesk.setFieldSlot(self.id,'paramsrequired',func);
};
DynamicListField.prototype.updateResults = function(last) {
    var self = this;
    if (!!self.loading) return;
    last = xnum(last);
    var params = {
        'max':self.max_rows
        ,'q':self.editor.val()
        ,'last':last
    };
    var _params_required_func = ServiceDesk.getFieldSlot(self.id,'paramsrequired');
    if (!!_params_required_func) {
        _params_required_func(params);
    }
    var r  = self.results();
    if (last==0) {
        r.html('<div class="nodata">Loading</div>');
        self.result_items = [];
        self._selectedItem = null;
        r.scrollTop();
    }
    self.loading = true;
    ServiceDesk.executeService(self.app,self.service,params,function(data) {
         $('.more',r).remove();
         $('.nodata',r).remove();
        var rowid;
        for(var i=0;i<data.length;i++) {
            var xr = $('<span />').addClass('mainitem').text(data[i][self.text_field]);
            // var x = $('<div />').text(data[i][self.text_field]).addClass('item');
            var x = $('<div />').addClass('item').append(xr);
            if (!!data[i]['SubObjectID']) {
                var sp = $('<span />').addClass('subitem');
                sp.text(data[i]['SubObjectID']);
                x.append(sp);
            }
            var key = data[i][self.key_field];
            rowid = data[i].__rowid__;
            x.data('data',data[i]);
            x.appendTo(r);
        }
        if (data.length >= self.max_rows) {
            var more = $('<div />').text('More').addClass('item').addClass('more');
            more.attr('last',rowid);
            more.appendTo(r);
        }
        self.result_items = $('.item',r);
        self.loading = false;
        if (data.length==0 && self.result_items.length==0) {
            r.html('<div class="nodata">No results</div>');
        }
    },function(err) {
        alert(err);
        self.loading = false;
    });
};
DynamicListField.prototype.selectItemByOffset = function(i) {
    var self = this;
    if (!self.result_items || self.result_items.length==0) return;

    var current_index = _.indexOf(self.result_items,self._selectedItem);

    if (current_index+i >= self.result_items.length) {
        return;
    }
    
    if (current_index+i < 0) {
        if (!self._selectedItem)
            self.selectItem(0);
        return;
    }

    current_index += i;
    self.selectItem(current_index);
};
DynamicListField.prototype.selectItem = function(r) {
    var self = this;
    if (typeof r=='number')
        r = self.result_items[r];
    r = $(r);
    if (r.hasClass('more')) {
        var last = r.attr('last');
        self.updateResults(last);
        r.startLoadingAnimation();
        return;
    }
    if (!!self._selectedItem)
        $(self._selectedItem).removeClass('active');
    r.addClass('active');
    self._selectedItem = r[0];

    var offset = 0;
    var active = _.indexOf(self.result_items,self._selectedItem);
    self.result_items.slice(0, active).each(function() {
        offset += this.offsetHeight;
    });
    var list = self.results();
    var activeItem = $(self._selectedItem);
    if((offset + activeItem[0].offsetHeight - list.scrollTop()) > list[0].clientHeight) {
        list.scrollTop(offset + activeItem[0].offsetHeight - list.innerHeight());
    } else if(offset < list.scrollTop()) {
        list.scrollTop(offset);
    }
};
DynamicListField.prototype.selectCurrentItem = function() {
    var self = this;
    var r = self.results();
    var active = $('.active',r);
    if (!active.exists()) return;
    var data = active.data('data');
    if (!data) return;
    self.setItem(data)
};
DynamicListField.prototype.setItem = function(data) {
    var self = this;
    var old_v = self.$hidden.val();
    var old_t = xstr(self.objectType());
    $(self).data('selectedKey',data[self.key_field]).data('selectedText',data[self.text_field]);
    var ot = data[self.type_field];
    if (!ot) ot = self.firstObjectType();
    self.objectType(ot);
    self.$hidden.val(data[self.key_field]);
    self.setLabel(data[self.text_field]);
    if ( (old_v != data[self.key_field]) || (xstr(ot).toUpperCase() != old_t.toUpperCase()) ) {
        $$(self.id).trigger('onitemselected');
    }
    self.editor.val(data[self.text_field]);
    self.hideResults();
};
DynamicListField.prototype.clearItem = function() {
    var self= this;
    if (!self.allow_empty) return;
    if (self.editor.val()!="") {
        self.editor.val('');
        $(self).data('selectedKey','').data('selectedText','');
        self.hdn_ot.val('');
        self.$hidden.val('');
        $$(self.id).trigger('onitemselected');
        self.setLabel('');
    }
};
DynamicListField.prototype.getObject = function() {
    var self= this;
    var ctrl = $$(self.id);

    var ot = self.objectType();
    if (ot=='' && self.allowedObjectTypes != '') return null;
    // if (ot=='') return null;

    var ok = xstr($(self).data('selectedKey'));
    var oid = xstr($(self).data('selectedText'));
    if (ok!="" && oid!="") {
        return {ObjectKey:ok,ObjectID:oid,ObjectType:ot};
    }
};
DynamicListField.prototype.setObject = function(obj) {
    var self = this;

    if(obj==null) return;

    var ctrl = $$(self.id);

    var old_v = self.$hidden.val();
    var old_t = xstr(self.objectType())

    $(self).data('selectedKey',obj.ObjectKey)
    $(self).data('selectedText',obj.ObjectID);
    self.objectType(obj.ObjectType);
    self.$hidden.val(obj.ObjectKey);

    if ((old_v != obj.ObjectKey) || (old_t.toUpperCase() != xstr(obj.ObjectType).toUpperCase())) {
        $$(self.id).trigger('onitemselected');
    }

    self.hideResults();
    $(ctrl).val($(self).data('selectedText'));
    self.setLabel($(self).data('selectedText'));
};
DynamicListField.prototype.getValue = function() {
    return this.$hidden.val();
};
DynamicListField.prototype.registerChangeEvent = function(func){
    //$$(this.id).bind('onblur',func);
    $$(this.id).rebind('onitemselected',func);
};
DynamicListField.clearItem = function(id) {
    //TODO: Type-check?
    __Fields__[id].clearItem();
};
DynamicListField.edit = function(id) {
    //TODO: Type-check?
    __Fields__[id].edit();
};

//Hidden field
var HiddenField = function(id) {
    this.id = id;
};
HiddenField.prototype.getValue = function() {
    return $$(this.id).val();
};
HiddenField.prototype.setValue = function(v) {
    return $$(this.id).val(v);
};

var DateTimeField = function(id,has_date,has_time,ro) {
    var self = this;
    self.id = id;
    self.readOnly = !!ro;
    self.has_date = has_date;
    self.has_time = has_time;
    self.inp = $$(self.id).find('.label');
    self.time_inp = $$(self.id).find('.timelabel');
    self.time_chooser = $$(self.id).find('.choices');
    self.hdn = $$(self.id+"__data");
    self.tzhdn = $$(self.id+"__tz");
    self.value = null;
    let todayText = $L('sys.datepicker-today');
    let closeText = $L('sys.datepicker-close');
    let monthNames = $L('sys.datepicker-months').split(',');
    let monthNamesShort = $L('sys.datepicker-months-short').split(',');
    let dayNamesMin = $L('sys.datepicker-days-short').split(',');
    if (self.has_date && !this.readOnly) {
        $(self.inp).datepicker({
            dateFormat:__date_format__
            ,showButtonPanel:true
            ,changeYear:true
            ,changeMonth:true
            ,currentText:todayText
            ,closeText:closeText
            ,monthNames:monthNames
            ,monthNamesShort:monthNamesShort
            ,dayNamesMin:dayNamesMin
            ,onSelect:function(dt,inst) {
                var date = DateTimeField.parseDate(dt);
                self.setDate(date);
            }
        });
        $(self.inp).blur(function(){
            var txt = self.inp.val();
            var dt = self.getDate();
            var date = DateTimeField.parseDate(txt);
            if (date==null) date = dt;
            self.setDate(date);
        });
        $(self.inp).keypress(function(evnt){
            var code = evnt.keyCode || evnt.which;
            if (code == 13) {
                console.log('PREVENTED');
                evnt.preventDefault();
                return;
            }
        });
    }
    if (self.has_time) {
        self.time_inp.blur(function(){
            var t = self.time_inp.val();
            var time_data = self.parseTime(t);
            self.setTime(time_data);
        });
        self.time_inp.keypress(function(evnt){
            var code = evnt.keyCode || evnt.which;
            if (code != 13) return;
            var t = self.time_inp.val();
            var time_data = self.parseTime(t);
            self.setTime(time_data);
            evnt.preventDefault();

        });
        self.time_chooser.touchClick(function(evnt){
            evnt.preventDefault();
            evnt.stopPropagation();
        });
        self.time_chooser.change(function(evnt) {
            var m = this.value;
            var hours = Math.floor(m/60);
            var minutes = m % 60;
            self.setTime({'Hour':hours,'Minute':minutes});
            $(self.time_chooser).css('visibility', 'hidden');
        });
    }
    this.setupValidations();
};
DateTimeField.prototype.setupValidations = function() {
    var self = this;
    var el = $$(self.id);
    var validationFieldId = el.data('iviva-past-date-validation-field-id');
    if (!validationFieldId) {
        var xid = el.data('iviva-past-date-validation-field-xid');
        if (!!xid) {
            validationFieldId = $XID(xid);
        }
    }

    if (!validationFieldId) return;

    var message = el.data('iviva-past-date-validation-message');
    if (!message) return;

    var target = $SD(validationFieldId);
    var checkDates = function() {
        var val = target.getDate();
        var isStartEmpty = target.getValue() === '';
        var myVal = self.getDate();
        if ((!isStartEmpty) && (myVal < val)) {
            ServiceDesk.signalError(self.id,message);
        } else {
            ServiceDesk.clearError(self.id,message);
        }

    }
    target.registerChangeEvent(checkDates);
    self.registerChangeEvent(checkDates);
}
DateTimeField.prototype.changeTimeZone = function(tzcode) {
    var self = this;
    var old_tz_code = self.tzhdn.val();
    ServiceDesk.loadTimeZoneInfo(tzcode,function(tz){
        ServiceDesk.loadTimeZoneInfo(old_tz_code,function(old_tz){
            self.tzhdn.val(tz.Code);
            var ctrl = $$(self.id);
            ctrl.find('.timezone').text(tz.Abbreviation);
            var dt = self.getDate();
            dt.addSeconds(-xnum(old_tz.OffsetSeconds));
            dt.addSeconds(xnum(tz.OffsetSeconds));
            self.setDate(dt);
            self.setTime(dt);
        });
    });
}
DateTimeField.prototype.clearItem = function() {
    var self = this;
    if (self.readOnly) return;
    self.inp.val('');
    self.time_inp.val('');
    self.hdn.val('');
    // self.tzhdn.val('');
    self.value = null;
    self.onChange();
};
DateTimeField.prototype.clearTime = function() {
    var self = this;
    if (self.readOnly) return;
    self.setTime({'Hour':0,'Minute':0});
    self.time_inp.val('');
};
DateTimeField.prototype.getFieldContainer = function() {
    var self = this;
    return $$(self.id);
};
DateTimeField.prototype.getElement = DateTimeField.prototype.getFieldContainer;
DateTimeField.clearItem = function(id) {
    __Fields__[id].clearItem();
};
DateTimeField.clearTime = function(id) {
    __Fields__[id].clearTime();
};
DateTimeField.prototype.gatherPostFields = function(p) {
    var self = this;
    p[self.hdn.attr('id')] = self.hdn.val();
    p[self.tzhdn.attr('id')] = self.tzhdn.val();
};
DateTimeField.prototype.gatherFields = function(p,n) {
    var self = this;
    p[n] = self.hdn.val();
    p[n+'__tz'] = self.tzhdn.val();
};
DateTimeField.parseDate = function(dt_str) {
    try {
        var dt = $.datepicker.parseDate(__date_format__,dt_str);
        return dt;
    } catch(e) {
        return null;
    }

};
DateTimeField.prototype.registerChangeEvent = function(func) {
    var self = this;
    $(self.hdn).rebind('datechanged',func);
};
DateTimeField.prototype.getDate = function() {
    var self = this;

    var v = self.hdn.val();
    return ServiceDesk.parseDateTime(v);
};
DateTimeField.prototype.getValue = function() {
    var self = this;

    var v = self.hdn.val();
    return v;
};
DateTimeField.prototype.onChange = function() {
    var self = this;

    $(self.hdn).trigger('datechanged');
};
DateTimeField.prototype.setDate = function(new_date) {
    var self = this;
    
    var old_date = self.getDate();
    var old_val = self.hdn.val();
    

    new_date = new_date.clone();
    if ($$(self.id).hasClass('js-hide-time') || (!self.has_time)) {
        new_date.setHours(0);
        new_date.setMinutes(0);
        new_date.setSeconds(0);
    } else {
        var defaultHours = old_date.getHours();
        var defaultMinutes = old_date.getMinutes();

        var defaultTime = self.getFieldContainer().data('iviva-default-time');

        if (!!defaultTime) {

            var parts = defaultTime.split(':');

            if (parts.length != 2) {
                console.log('Error reading default time of ',self.id,defaultTime);
            } else {
                defaultHours = xint(parts[0]);
                defaultMinutes = xint(parts[1]);
            }

        }
        new_date.setHours(defaultHours);
        new_date.setMinutes(defaultMinutes);
        new_date.setSeconds(0);

        if ($(self.time_inp).val()=='') {
            self.setTime({Hour:defaultHours,Minute:defaultMinutes},true);
        }
    }

    var new_val = ServiceDesk.dateTimeToString(new_date);
    var new_lbl = self.formatDate(new_date);

    self.hdn.val(new_val);
    self.inp.val(new_lbl);
    self.inp.removeClass('nodata');

    if (old_val != new_val)
        self.onChange();
};
DateTimeField.prototype.setTime = function(time_data,skipChangeEvent) {
    var self = this;

    if (!!time_data.getHours && time_data.getMinutes) {
        time_data = {'Hour':time_data.getHours(),'Minute':time_data.getMinutes()};
    }

    var self = this;

    var old_date = self.getDate();

    new_date = old_date.clone();
    new_date.setHours(time_data.Hour);
    new_date.setMinutes(time_data.Minute);
    new_date.setSeconds(0);

    var old_val = self.hdn.val();
    var new_val = ServiceDesk.dateTimeToString(new_date);
    var new_lbl = DateTimeField.formatTime(new_date);

    self.hdn.val(new_val);
    self.time_inp.val(new_lbl);
    self.time_inp.removeClass('nodata');
    if (!skipChangeEvent) {
        if (old_val != new_val){
            self.onChange();
        }
    }

};
DateTimeField.prototype.formatDate = function(dt) {
    return  $.datepicker.formatDate(__date_format__,dt);
};
DateTimeField.formatTime = function(dt) {
    var hr = dt.getHours();
    var mn = dt.getMinutes();
    var pad_t = function(x) {
        if (x<10) return "0" + x;
        return x;
    }
    if (__time_format24__)
        return pad_t(hr)+ ":" + pad_t(mn);
    var tt = 'AM';

    if (hr >= 12 ) tt = 'PM';
    if (hr == 0) hr = 12;
    if (hr>12) hr = hr-12;
    return pad_t(hr)+ ":" + pad_t(mn)+ " " + tt;
};
DateTimeField.prototype.parseTime = function(txt) {
    var self = this;
    var xint = function(i,def) {
        if (!i) {
            if (!def) return 0;
            return def;
        }
        return parseInt(""+i,10);
    }
    var d = self.getDate();
    re = /^\s*(\d\d?)\s*[:.]?\s*(\d\d?)?(.*?)\s*([Aa][.]?[Mm][.]?|[Pp][.]?[Mm][.]?)?\s*$/;
    var result = {'Hour':d.getHours(),'Minute':d.getMinutes()};
    match = txt.match(re);
    if (!match) return result;
    if (match.length != 5) return result;
    hour = xint(xstr(match[1]).trim());
    minute = xint(xstr(match[2]).trim());
    if (hour>24 || hour < 0) return result;
    if (minute>59 || minute < 0) return result;
    tq = xstr(match[4]);
    tq = tq.trim().replace('.','').toUpperCase();
    if (tq=='') {
        if (__time_format24__ && hour!=12) tq = 'AM';
        else tq = 'PM';
    }
    if (tq=='PM' && hour <12 && hour>0) hour += 12;
    if (tq=='AM' && hour==12) hour=0;

    return {'Hour':hour,'Minute':minute};
};
DateTimeField.prototype.chooseTime = function() {
    var self = this;
    var p = self.time_inp.position();
    // p.top += self.time_inp.height() + 5;
    p.top += self.time_inp[0].offsetHeight + 5;
    self.time_chooser.css({
        'left':p.left+'px'
        ,'top':p.top+'px'
    });
    setTimeout(function(){$(self.time_chooser).css('visibility','visible');},0);
};
DateTimeField.prototype.chooseDate = function() {
    var self = this;
    self.inp.datepicker('show');
};
DateTimeField.chooseTime = function(id) {
    __Fields__[id].chooseTime();
};
DateTimeField.chooseDate = function(id) {
    __Fields__[id].chooseDate();
};

DateTimeField.createDateField = function(parent,opts) {
    opts = opts || {};
    var id = opts.id;
    var val = opts.date;
    var dval = ServiceDesk.formatDate(val);
    var value_format = __date_format__;
    var s = $('<span />').attr('id',id);
    s.addClass('datecontrol');
    var inp = $('<input />');
    inp.attr('id',id+'__data').attr('name',id+'__data');
    inp.attr('type','hidden').attr('value',value_format);
    s.append(inp);

    var tzinp = $('<input />');
    tzinp.attr('id',id+'__tz').attr('name',id+'__tz')
    .attr('type','hidden').attr('value',opts.timeZone || 'UTC');
    s.append(tzinp);

    var ds = $('<span />');
    ds.addClass('datefield-container');
    var idisp = $('<input />');
    idisp.attr('id',id+'__display');
    idisp.addClass('label');
    idisp.attr('type','text');
    idisp.attr('value',dval);
    idisp.attr('title','click to choose a date');
    ds.append(idisp);

    if (!!opts.clearable) {
        var a = $('<a />');
        a.attr('href','#');
        a.touchClick(function(evnt){
            evnt.preventDefault();
            DateTimeField.clearItem(id);
        });
        a.addClass('clearer v3icon-error-close');
        ds.append(a);

    }
    var icon = $('<span />');
    icon.addClass('dateicon');
    icon.touchClick(function(evnt){
        evnt.preventDefault();
        DateTimeField.chooseDate(id);
    });
    ds.append(icon);


    s.append(ds);

    // _.defer(function(){
    //     __Fields__[id]= new DateTimeField(id,true,false,false);
    // });
    parent.append(s);
    __Fields__[id]= new DateTimeField(id,true,false,false);
    return __Fields__[id];

};
__SearchLists__ = {};
var SearchList = function(id,app,view,params) {
    var self = this;
    self.canContractObjectID = true;
    self.ctrl = $$(id);
    self.hdn = $$(id+"__data");
    self.hdn_txt = $$(id+"__text");
    self.hdn_ot = $$(id + "__objecttype");
    self.id = id;
    self.app = app;
    self.view = view;
    self.params = params||{ };
    self.nodata = self.ctrl.attr('nodata');

    self.label = self.ctrl.find('.item_container');
    self.label.rebind('click',function(evnt){
        evnt.preventDefault();
        evnt.stopPropagation();
        var ot = self.objectType();
        if (!ot) return;
        var key = self.val();
        if (!key) return;
        ServiceDesk.showQuickInfo($(self.label),ot,key);
    });
    self.hr = self.ctrl.find('.sl_link');

    $(document).rebind('itemSelectedFromTable',function(evnt,id,data,ctrl){
        if (id != self.id) return;
        if (!!self.type_field && !data[self.type_field]) {
            var ot = $(ctrl).parents('.sl_modal_container').attr('sl_ot');
            data[self.type_field] = ot;

        }
        // console.log('my control',ctrl,$(ctrl).parents('.sl_modal_container').attr('sl_ot'));
        self.itemSelected(data,ctrl);
    });
};
SearchList.prototype.objectType = function(ot) {
    var self = this;
    if (!!ot) 
        self.hdn_ot.val(ot);
    
    return self.hdn_ot.val();
};
SearchList.prototype.isValidObjectType = function(ot) {
    var self = this;
    if (self.allowedObjectTypes=="") return true;
    var otlist = self.allowedObjectTypes.toUpperCase().splitProper(',');
    return _.indexOf(otlist,ot.toUpperCase()) >= 0;
};
SearchList.prototype.gatherPostFields = function(p) {
    var self = this;
    p[self.hdn.attr('id')] = self.hdn.val();
    p[self.hdn_txt.attr('id')] = self.hdn_txt.val();
    p[self.hdn_ot.attr('id')] = self.hdn_ot.val();
};
SearchList.prototype.text = function(txt) {
    var self = this;
    if (typeof txt == 'undefined') return self.label.text();
    if (txt=="") {
        self.label.text(self.nodata);
        self.label.addClass('nodata');
    } else {
        var _txt = txt;
        if (self.canContractObjectID)
            _txt = ServiceDesk.contractObjectIDToText(txt);
        self.label.text(_txt);
        self.label.removeClass('nodata');
    }
    return self.label.text();
};
SearchList.prototype.val = function(key,txt) {
    var self = this;

    var current = self.hdn.val();
    if (!!key) {
        self.hdn.val(key);
    }
    if (!!txt) {
        self.hdn_txt.val(txt);
    }
    return current;
};
SearchList.prototype.getValue = function() {
    var self = this;
    return self.val();
};
SearchList.prototype.registerChangeEvent = function(func) {
    var self = this;
    $(self.hdn).bind('selectionchanged',func);
};
SearchList.prototype.loadPopupForObjectType = function(ot) {
    var self = this;
    var ot_item = _.find(self.objectTypeMap,function(x){
        return String.matches(ot,x.object_type);
    });
    if (!!ot_item) {
        self.loadPopup(ot_item.view,ot_item.object_type);
        return;
    } else {
        if (String.matches(ot,self.objectType())) {
            self.loadPopup(self.app + '.' + self.view,'');
        }
    }
};
SearchList.forContainer = function(hr) {
    var parent = $(hr).parents('.slcontainer');
    if (!parent.exists()) return;
    var sl = parent.attr('slid');
    var field = __SearchLists__[sl];
    return field;
};
SearchList.searchObjectType = function(hr,ot) {
    var field = SearchList.forContainer(hr);
    if (!field) return;
    field.loadPopupForObjectType(ot);
};
SearchList.assignObject = function(hr,obj) {
    var field = SearchList.forContainer(hr);
    if (!field) return;
    field.setObject(obj);
};
SearchList.prototype.loadPopup = function(_view,ot){
    var self = this;
    var params = self.params;

    var param_gen = function(_p) {
        var _params_required_func = ServiceDesk.getFieldSlot(self.id,'paramsrequired');
        if (!!_params_required_func)
            _params_required_func(_p);
        return $.extend({'slid':self.id},_p);
    };

    var b = parseAppUri(_view);
    var app_r = function() {
        return self.hr.attr('xapp');
    };
    var view_r = function() {
        return self.hr.attr('xview');
    };
    self.hr.attr('xapp', b.app);
    self.hr.attr('xview', b.view);
    self.hr.attr('xot',ot);
    ServiceDesk.loadViewInPopup(self.hr,app_r,view_r,function(){return param_gen(params);},self.id+b.app+b.view+Number(Date.now()),function(c){
        $(c).addClass('sl_modal_container').attr('slid',self.id).attr('sl_ot',self.hr.attr('xot'));
    });

};
SearchList.prototype.selectItem = function(object_type) {
    var self = this;
    var params = self.params;
    var param_gen = function(_p) {
        var _params_required_func = ServiceDesk.getFieldSlot(self.id,'paramsrequired');
        if (!!_params_required_func)
            _params_required_func(_p);
        return $.extend({'slid':self.id},_p);
    };
    if (!!self.selectionView) {
        var key = xint(self.selectionViewKey);
        var qi_params = {'key':key};
        qi_params['otlist'] = self.allowedObjectTypes;
        param_gen(qi_params);
        
        var x = parseAppUri(self.selectionView);
        
        _.defer(function(){
            ServiceDesk.loadViewInQuickInfo(self.hr,x.app,x.view,qi_params,function(qb){
                qb.addClass('slcontainer');
                qb.attr('slid',self.id);
            });
        });
       
        return;
    }
    var load_popup = function(_view,ot) {
        var b = parseAppUri(_view);
        var app_r = function() {
            return self.hr.attr('xapp');
        };
        var view_r = function() {
            return self.hr.attr('xview');
        };
        self.hr.attr('xapp', b.app);
        self.hr.attr('xview', b.view);
        self.hr.attr('xot',ot);
        ServiceDesk.loadViewInPopup(self.hr,app_r,view_r,function(){return param_gen(params);},self.id+b.app+b.view+Number(Date.now()),function(c){
            $(c).addClass('sl_modal_container').attr('slid',self.id).attr('sl_ot',self.hr.attr('xot'));
        });
    };
    if (self.objectTypeMap.length==0) {
        self.loadPopup(self.app + '.' + self.view,'');
        return;
    }
    if (self.objectTypeMap.length==1) {
        self.loadPopup(self.objectTypeMap[0].view,self.objectTypeMap[0].object_type);
        return;
    }
    if (!!object_type) {
        var ot_item = _.find(self.objectTypeMap,function(x){
            return String.matches(object_type,x.object_type);
        });
        if (!!ot_item) {
            self.loadPopup(ot_item.view,ot_item.object_type);
            return;
        }
    }
    _.defer(function(){
        var qi = ServiceDesk.showBubble(self.ctrl,'listbubble');
        var lis = [];
        for(var i=0;i<self.objectTypeMap.length;i++) (function(){
            var obj = self.objectTypeMap[i];
            var a = $('<a />').attr('href','#').text(obj.object_label);
            a.click(function(_e){
                _e.stopPropagation();
                _e.preventDefault();
                ServiceDesk.hideBubbles();
                self.loadPopup(obj.view,obj.object_type);
            });
            qi.content.append(a);
            qi.content.append('<br />');
        })();
    });
    /*
    ServiceDesk.loadViewInPopup(self.hr,self.app,self.view,$.extend({'slid':self.id},params),self.id,function(c){
        $(c).addClass('sl_modal_container').attr('slid',self.id);
    });
*/
};
SearchList.prototype.triggerChange = function(data) {
    var self = this;

    $(self.hdn).trigger('selectionchanged',[data]);
};
SearchList.prototype.parametersRequired = function(func) {
    var self = this;
    var id = self.id;
    ServiceDesk.setFieldSlot(id,'paramsrequired',func);
};
SearchList.prototype.itemSelected = function(data,ctrl) {
    var self = this;

    var txt = xstr(data[self.text_field]);
    var key = xstr(data[self.key_field]);

    //self.label.text(txt);
    self.text(txt);
    self.val(key,txt);
    if (!!self.type_field) {
        var type = xstr(data[self.type_field]);

        self.objectType(type);
    }

    if (__device__=='iphone') {
        history.go(-1);//TODO: Something bettter?

    } else {
        ServiceDesk.closePopup(self.hr);
        self.label.addClass('tohighlight');
        ServiceDesk.runPendingHighlights();
    }
    self.triggerChange(data);

};
SearchList.prototype.clearItem = function() {
    var self = this;
    self.text('');
    self.hdn.val('');
    self.hdn_txt.val('');
    
    if (!!self.type_field)
        self.hdn_ot.val('');

    self.triggerChange();
};
SearchList.prototype.setObject = function(obj) {
    var self = this;
    if (obj==null) return;
    var ctrl = self.ctrl;
    if (!self.isValidObjectType(obj.ObjectType)) return;
    //if (obj.ObjectType.toUpperCase() !=  ctrl.attr('ot').toUpperCase()) return;
    self.text(obj.ObjectID);
    self.val(obj.ObjectKey,obj.ObjectID);
    if (!!self.type_field) {
        self.objectType(obj.ObjectType);
    }
    self.label.addClass('tohighlight');
    ServiceDesk.runPendingHighlights();
    self.triggerChange();
};
SearchList.prototype.getObject = function() {
    var self = this;

    var ctrl = self.ctrl;
    var ot = self.objectType();
    var ok = self.val();
    var oid = self.label.text().trim();
    return {'ObjectType':ot,'ObjectKey':ok,'ObjectID':oid};
};
SearchList.prototype.__setItemFromLink = function(hr) {
    var self = this;

    var sp = $(hr).parent().find('.item_data');
    var lk = sp.attr('item_key');
    var ln = sp.text();

    //self.label.text(ln);
    self.text(ln);
    self.val(lk,ln);
    ServiceDesk.closePopup(self.hr);
    self.label.addClass('tohighlight');
    ServiceDesk.runPendingHighlights();
    self.triggerChange();
};
SearchList.clearItem = function(id) {
    __SearchLists__[id].clearItem();
};
SearchList.create = function(ctrl,app,view,key_field,text_field,params) {
    if (!!params.length && params.length>0) params = params[0];
    var le = new SearchList(ctrl,app,view,params);
    le.key_field = key_field||'__key__';
    le.text_field = text_field||'__text__';
    __SearchLists__[le.id] = le;
    __Fields__[le.id] = le;
    return le;
};

SearchList.selectItem = function(id) {
    
    if (!__SearchLists__[id]) return;
    __SearchLists__[id].selectItem();
};
var FieldEditor = function(id) {
    var self = this;
    self.id = id;
    self.reload();
    self.editFunc = null;
};
FieldEditor.prototype.editContent = function() {
    var self = this;
    return self.ctrl.children('.edit');
};
FieldEditor.prototype.actions = function() {
    var self = this;
    var ec = self.editContent();
    if (self.fieldEditorType == 'groupeditor') {
        return ec.find('.fieldgroup-body > .groupeditor-actions > .actions');
    }
    return ec.children('.actions');
};
FieldEditor.prototype.staticContent = function() {
    var self = this;
    return self.ctrl.children('.static');
};
FieldEditor.prototype.reload = function() {
    var self = this;
    self.ctrl = $$(self.id);
    self.saver = self.ctrl.children('.edit').find('button.save');

    self.editContent().find('input[type="text"]').keypress(function(evnt){
        var code = evnt.keyCode || evnt.which;
        if (code != 13) return;
        this.blur();
        evnt.stopPropagation();
        evnt.preventDefault();
        self.saveEdit();

    });
};
FieldEditor.prototype.edit = function() {
    var self = this;
    var edit = self.editContent();
    var stat = self.staticContent();

    stat.showLoader();
    stat.children('.edit_action').makeInvisible();

    var revertFunc = function() {
        self.ctrl.hideLoader();
        stat.makeInvisible();
        edit.makeVisible();
        edit.children('.actions').makeVisible();
    }
    var event = self.id + ':field.edit.expanded';
    $(ServiceDesk).trigger(event,[self]);

    var view = edit.attr('view');
    
    if (view.length >0) {

        $.ajax({
            type: "post"
            ,url: view
            ,data: {}
            ,success: function (data) {
                self.ctrl.replaceWith(data);
            }
            ,error: function(request,status,_e) {
                self.ctrl.hideLoader();
                alert(request.responseText);
            }
        });
    } else {
        revertFunc();
    }
};
FieldEditor.prototype.onEdit = function(func) {
    var self = this;
    self.editFunc = func;
};
FieldEditor.prototype.getFieldContainer = function() {
    var self = this;
    return self.ctrl;
};
FieldEditor.prototype.getElement = FieldEditor.prototype.getFieldContainer;
FieldEditor.prototype.cancelEdit = function() {
    var self = this;

    self.ctrl.hideLoader();
    var edit = self.editContent();
    var stat = self.staticContent();
    edit.makeInvisible();
    stat.makeVisible();
    stat.children('.edit_action').makeVisible();

};
FieldEditor.prototype.saveEdit = function(func) {
    var self = this;
    if (self.fieldEditorType == 'groupeditorex') {
        if (!!self.fullSubmit) {
            self.ctrl.find('.groupeditor-save').click();
            return;
        }
    }
    var edit = self.editContent();
    edit.showLoader();
    var actions = self.actions();
    actions.makeInvisible();
    $(self.ctrl).trigger('onsave');
    var view= self.ctrl.attr('view');
    var  view_params = {};
    $.extend(view_params,QS(),self.extraParams || {});
    
    var params = QS();
    $.extend(params,ServiceDesk.gatherFields(self.ctrl.attr("fields").split(',')));
    var appuri= parseAppUri(view);
    
    if (self.editFunc != null) {
        self.editFunc(self,params,function(){
            edit.hideLoader();
        },function(){
            edit.hideLoader();
            self.actions().makeVisible();
            // edit.children('.actions').makeVisible();
        });
        return;
    }

    if (!!view) {
    //try {
        ServiceDesk.executeFieldUpdate({
            app:appuri.app
            ,view:appuri.view+"?" + $.param(view_params)
            ,field:self.id
            ,params:params
            ,onSuccess:function(data) {
                self.ctrl.replaceWith(data);
                self.fieldSaved();
                if (!!func) func();
            }
            ,onError:function(txt,ct) {
                if (ct.match(/text\/html/) != null) {
                    self.ctrl.replaceWith(txt);
                    return;
                }
                alert(txt);
                edit.hideLoader();
                self.actions().makeVisible();
                // edit.children('.actions').makeVisible();
            }

        });
    };
};
FieldEditor.prototype.fieldUpdated = function(opts) {
    var self = this;

    opts = opts || {};

    if (!opts.nohighlight){
        if (self.fieldEditorType == 'groupeditor') {
            self.staticContent().children('.fieldgroup').addClass('tohighlight');
        } else {
            self.ctrl.addClass('tohighlight');
        }

    }
    
    var event = self.id + ':field.updated';
    ServiceDesk.runPendingHighlights();
    $(ServiceDesk).trigger(event,[self]);
};
FieldEditor.prototype.onEditExpanded = function(func) {
    var self = this;
    var event = self.id + ':field.edit.expanded';
    $(ServiceDesk).bind(event,func);
};
FieldEditor.prototype.fieldSaved = function() {
    var self = this;
    var event = self.id + ':field.saved';
    $(ServiceDesk).trigger(event,[self]);
    var fields_to_update = self.fieldsToUpdate;
    var app = self.containerApp;
    var view = self.containerView;
    if (!!fields_to_update && !!app && !!view) {
        ServiceDesk.updateFieldsInView(fields_to_update.split(','),app,view,QS());
    }
};
FieldEditor.prototype.onFieldUpdate = function(func) {
    var self = this;
    var event = self.id + ':field.updated';
    $(ServiceDesk).bind(event,func);
};
FieldEditor.prototype.onFieldSaved = function(func) {
    var self = this;
    var event = self.id + ':field.saved';
    $(ServiceDesk).bind(event,func);
};
FieldEditor.edit = function(id) {
    __Fields__[id].edit();
};
FieldEditor.cancelEdit = function(id) {
    __Fields__[id].cancelEdit();
};
FieldEditor.saveEdit = function(id,func) {
    __Fields__[id].saveEdit(func);
};

var CheckboxField = function(id,trueval,falseval) {
    var self = this;
    self.id = id;
    self.ctrl = $$(self.id);
    if (self.ctrl.length!=0){
        self.trueval = self.ctrl.attr('trueval');
        self.falseval = self.ctrl.attr('falseval');    
    }else{
        self.trueval = (!!trueval)?trueval:1;
        self.falseval = (!!falseval)?falseval:0;
    }
};
CheckboxField.prototype.getValue = function() {
    var self = this;
    
    if (self.ctrl.is(':checked')) {
        return self.trueval;
    }
    return self.falseval;
};
CheckboxField.prototype.appendTo = function(parent) {
    var self = this;    
    self.ctrl.appendTo(parent);    
};
CheckboxField.prototype.setValue = function(v) {
    var self = this;

    if (typeof v != 'boolean') {
        v = (v==self.trueval);
    }
    if (v) self.ctrl.attr('checked','checked');
    else self.ctrl.removeAttr('checked');

};
CheckboxField.prototype.registerChangeEvent = function(func){
    var self = this;
    self.ctrl.rebind('change',func);
    //self.ctrl.change(func);
};
CheckboxField.prototype.gatherPostFields = function(p) {
    var self = this;
    var id = self.ctrl.attr('id');
    if (self.ctrl.is(':checked'))
        p[id] = self.trueval;
    else
        p[id] = self.falseval;
};

CheckboxField.create = function(opts) {   
    var id = opts.id || ServiceDesk.generateID();
    var chk = $("<input type='checkbox' />").attr('id',id).attr('trueval',opts.trueval).attr('falseval',opts.falseval); 
    var _trueval=(!!opts.trueval)? opts.trueval:1;
    var _falseval=(!!opts.falseval)? opts.falseval:0;
    var tf = new CheckboxField(opts.id,_trueval,_falseval);
    tf.ctrl=chk;
    __Fields__[id] = tf;
    return tf;    
};



var Repeater = {};
var RepeaterField = function(id) {
    var self = this;
    self.id = id;
};
RepeaterField.prototype.removeSection = function(key,done) {
    var self = this;
    Repeater.removeSection(self.id,key,done);
};
RepeaterField.prototype.itemCount = function() {
    var self = this;
    return Repeater.itemCount(self.id);
};
RepeaterField.prototype.makeSortable = function() {
    var self = this;
    return Repeater.makeSortable(self.id);
};
RepeaterField.prototype.addSection = function(key,params,ok,err) {
    var self = this;
    Repeater.addSection(self.id,key,params,ok,err);
};
RepeaterField.prototype.addSectionToTop = function(key,params,ok,err) {
    var self = this;
    Repeater.addSectionToTop(self.id,key,params,ok,err);
};
RepeaterField.prototype.getFieldContainer = function() {
    var self = this;
    return $$(self.id);
};
RepeaterField.prototype.getElement = RepeaterField.prototype.getFieldContainer;
RepeaterField.prototype.fieldUpdated = function(opts) {
    opts = opts || {};
    if (!!opts.nohighlight) return;

    var self = this;
    var ctrl = self.getFieldContainer();
    ctrl.addClass('tohighlight');
    ServiceDesk.runPendingHighlights();
};
Repeater.removeSection = function(id,key,done) {
    var e = $$(id).find('[key="' + key + '"]');
    if (!e.exists()) {
        if (!!done) done();
        return;
    }
    e.fadeOut('slow',function(){
        e.remove();
        Repeater.updateNoDataStatus(id);
        if (!!done) done();
    });
};
Repeater.updateNoDataStatus = function(id) {
    var ctrl = $$(id);
    var sections = $(ctrl).children('.section');
    if (sections.length==0) {
        $(ctrl).children('.repeaternodata').makeVisible();
    } else {
        $(ctrl).children('.repeaternodata').makeInvisible();
    }
};
Repeater.itemCount = function(id) {
    return $$(id).children('.section').length;
};
Repeater.makeSortable = function(id) {
    $$(id).sortable({
        update:function(evnt,ui) {
            var item = $(ui.item);
            var items = $$(id).find('li[key]');
            var keys = _.map(items,function(item){
                return $(item).attr('key');
            });
            if (!!keys && keys.length>0)
                $$(id).trigger('onsort',[keys]);
            
        }
    });
};
Repeater.onSort = function(id,func) {
    $$(id).bind('onsort',func);
};
Repeater.addSectionToTop = function(id,key,params,ok,err) {
    Repeater._addSection(id,key,params,ok,err,true);
}
Repeater.addSection = function(id,key,params,ok,err) {
    Repeater._addSection(id,key,params,ok,err,false);
}
Repeater._addSection = function(id,key,params,ok,err,top) {
    var ctrl = $$(id);
    var view = ctrl.attr('view') + "!@" + id;
    var app = ctrl.attr('app');
    if (!view || !app) {
        alert('No proper repeater found');
        return;
    }
    if (params==null)
        params = QS();
    var field = __Fields__[id];
    if (!!field && !!field.extraParams)
        $.extend(params,field.extraParams || {});
    var url = ServiceDesk.viewUrl(app,view);
    params['__ajax__'] = '1';
    params['__format__'] = 'json';
    params['__sc__'] = __token__||'';
    params['__rpid__'] = id;
    params['__rpmode__'] = 'single';
    params['__rpkey__'] = key;
    $.ajax({
        type: 'post'
        ,url: url
        ,data: params
        ,success: function(data) {
            var n = $(data);
            if (top) {
                $(ctrl).prepend(n);
                n.show('slow');
            } else {
                n.appendTo(ctrl).show('slow');
            }
            // n.first().addClass('tohighlight');
            Repeater.updateNoDataStatus(id);
            // ServiceDesk.runPendingHighlights();
            if (!!ok) ok(data);
        }
        ,error: function(request,status,_e) {
            if (!!err) err(request.responseText);
        }
    });
};
$('.repeater_remove_item').live('click',function(evnt){
    evnt.stopPropagation();
    evnt.preventDefault();
    var r = $(evnt.target);
    var relm = r.parents('.repeater');
    if (!relm.exists()) return false;
    var repeater = relm.attr('id');
    var key = r.attr('key');
    var params = { 'key':key };
    var app = parseAppUri(r.attr('service'));
    $(r).executeService(app.app,app.service,params,function(data){
        var msg = r.attr('message');
        if (!!msg) ServiceDesk.flashNotification(msg);
        Repeater.removeSection(repeater,key);
        return true;
    }
    ,function(err) {
        alert(err);
    });
});
var ObjectReference = function(id) {
    var self = this;
    self.id = id;
};
ObjectReference.prototype.validateObjectType = function(ot) {
    var self = this;
    var accepted = $$(self.id).attr('accepted');
    if (accepted=='*') return true;
    var accepted_types = accepted.toUpperCase().split(',');
    return (_.indexOf(accepted_types,ot.toUpperCase()) >= 0);

};
ObjectReference.prototype.setObject= function(obj) {
    var self = this;
    
    var ok = obj.ObjectKey;
    var ot = obj.ObjectType;
    var oid = obj.ObjectID;
    if (!self.validateObjectType(ot)) {
        alert('Invalid object type');
        return;
    }
    $$(self.id+"__ot").val(ot);
    $$(self.id+"__ok").val(ok);
    $$(self.id+"__oid").val(oid);
    $$(self.id+"__text").text(oid).addClass('tohighlight');
    if ($$(self.id).attr('include_icon')=='1') {
        var icon = $$(self.id).find('.object_icon');
        icon.attr('src',ServiceDesk.getObjectIconUrl(obj));
        icon.makeVisible();
    }
    $$(self.id+"__ok").trigger('referencechanged');
    ServiceDesk.runPendingHighlights();
};
ObjectReference.prototype.gatherPostFields = function(p) {
    var self = this;
    
    var parts = 'ot,ok,oid'.split(',');
    for(var i=0;i<parts.length;i++) {
        var id = self.id + "__" + parts[i];
        p[id] = $$(id).val();
    }
};
ObjectReference.prototype.getObject = function() {
    var self = this;
    return {
        ObjectKey: $$(self.id + "__ok").val()
        ,ObjectType: $$(self.id + "__ot").val()
        ,ObjectID: $$(self.id + "__oid").val()
    };
};
ObjectReference.prototype.registerChangeEvent = function(func) {
    var self = this;
    $$(self.id+"__ok").rebind('referencechanged',func);
};
ObjectReference.prototype.gatherFields = function(p,n) {
    var self = this;
    p[n] = $$(self.id+"__ok").val();
    p[n+"_type"] = $$(self.id+"__ot").val();
};
var HtmlBlockField = function(id) {
    var self = this;
    self.id = id;
};
HtmlBlockField.prototype.getFieldContainer = function() {
    var self = this;
    return $$(self.id);
};
HtmlBlockField.prototype.getElement = HtmlBlockField.prototype.getFieldContainer;
HtmlBlockField.prototype.fieldUpdated = function(opts) {
    opts = opts || {};
    if (!!opts.nohighlight) return;

    var self = this;
    var ctrl = self.getFieldContainer();
    ctrl.addClass('tohighlight');
    ServiceDesk.runPendingHighlights();
};
HtmlBlockField.prototype.setValue = function(html) {
    var self = this;
    $$(self.id).html(html);
};

var GenericBlockField = function(id) {
    var self = this;
    self.id = id;
};
GenericBlockField.prototype.getFieldContainer = function() {
    var self = this;
    return $$(self.id);
};
GenericBlockField.prototype.getElement = GenericBlockField.prototype.getFieldContainer;
GenericBlockField.prototype.fieldUpdated = function(opts) {
    opts = opts || {};
    if (!!opts.nohighlight) return;

    var self = this;
    var ctrl = self.getFieldContainer();
    ctrl.addClass('tohighlight');
    ServiceDesk.runPendingHighlights();
};

var FileUploader = function(opts) {
    var self = this;
    self.opts = opts;
    self.errorcount = 0;
    self.compatmode = false;
    self.pending_uploads = [];
    ServiceDesk.onLoad(function(){
        var xhr = new XMLHttpRequest();
        var browser_doesnt_suck = !! (xhr && ('upload' in xhr) && ('onprogress' in xhr.upload));

        /* Apparently IE10 and above support the above condition but don't do uploads for whatever reason.
        So we still fallback to flash there until we figure out why */
        if (window.navigator.appVersion.indexOf('Trident') >=0) {// sorry
            browser_doesnt_suck = false;
            if (!(window.ActiveXObject) && "ActiveXObject" in window) {
                console.log('Enabling for IE11');
                browser_doesnt_suck = true;
            }
        }
        browser_doesnt_suck = true;
        

        if (browser_doesnt_suck) {
            self.initUploader();
        } else {
            self.compatmode = true;
            self.initUploaderCompat();
        }
    });
};
FileUploader.prototype.validateField = function(vt) {
    var self = this;
    if (String.matches(vt,'empty')) {
        if (self.pending_uploads.length==0) return false;
        return true;
    }
    return true;
};
FileUploader.prototype.autoUpload = function() {
    var self = this;
    if (!self.opts.auto) return true;
    if ((self.opts.auto == 'false') || (self.opts.auto == '0')) return false;
    return true;
};
FileUploader.prototype.param = function(key,value) {
    var self = this;
    if (typeof value != 'undefined')
        self.opts.parameters[key] = value;
    return self.opts.parameters[key];
};
FileUploader.prototype.pendingUploads = function() {
    var self = this;
    return self.pending_uploads.length;
};
FileUploader.prototype.uploadFile = function() {
    var self = this;
    if (self.uploadTarget == 'resumable') {
        console.log('Uploading large files');
        var query = {};

        $.each(self.resumable.parameters, function (key, value) {
            if ($.isFunction(value)) {
                query[key] = value();
            } else {
                query[key] = value;
            }
        });

        // Get the unique upload token from the service and then initiate upload
        ServiceDesk.executeService("System", "GetUniqueIDForUpload", {
            size: self.resumable.files[0].size,
            path: self.resumable.opts.target
        }, function (result) {
            if (result && result.length > 0) {
                $.each(result, function (idx, data) {
                    if (data && data.UniqueID) {
                        query["uploadToken"] = data.UniqueID;
                        self.resumable.updateQuery(query);
                        self.resumable.upload();
                        return false;
                    }
                    return true;
                })
            }
        }, function (err) {
            alert(err);
        });

        return;
    }


    var self = this;
    for(var i=0;i<self.pending_uploads.length;i++) {
        self.pending_uploads[i]();
    }
};
FileUploader.prototype.initUploaderCompat = function() {
    var self = this;
    var id = self.opts.id;
    var opts = self.opts;
    $$(id).find('.dropcontent').makeInvisible();
    $$(id).find('.dropfilename').makeInvisible();
    var _p = $($$(id+'__files').parents().get(0));
    if (!_p.find('.fn').exists()) {
        var _txt= $('<span />').addClass('fn');
        _p.append(_txt);
    }
    var txt = _p.find('.fn');

    $$(id + '__files').uploadify({
        uploader: __base_url__ + "uploader/uploadify.swf",  
        script: self.opts.url,
        fileSizeLimit:  (xint(opts.maxsize) ||2) + 'MB',    // max file size in MBs
        displayData: '',
        hideButton: false,
        scriptData: self.opts.parameters,
        cancelImg: __base_url__ + "uploader/cancel.png",  
        auto: false,  
        folder: "/uploads",  
        onComplete: function(a,b,c,d) {
            if (xint(d) > 0) {
                self.pending_uploads = [];
                self.on_after_send(d);
                self.setProgress(0);
            } else {
                self.pending_uploads = [];
                alert(d);
                self.setProgress(0);
                return;
            }
            console.log(arguments);
        },
        onProgress: function(file,e) {
            var percent = 0;
            if (e.lengthComputable) {
                percent = Math.round((e.loaded / e.total) * 100);
            }            
            self.on_progress(percent);
            self.setProgress(percent);
        },
        onSelect: function(evnt,id,fobj) {
            if (!self.before_send(fobj)) return;

            if (!opts.url) {
                alert('No target url has been set');
                return;
            }
            var ctrl = $$(self.opts.id+"__files");
            var fn = 'File';
            if (!!fobj && !!fobj.name) fn = fobj.name;
            txt.text(fn);
            ctrl.uploadifySettings('scriptData',self.opts.parameters);

            if (self.autoUpload()){
                self.setProgress(0);
                ctrl.uploadifyUpload();
            }
            else {
                self.pending_uploads = [];
                self.pending_uploads.push(function(){
                    ctrl.uploadifySettings('scriptData',self.opts.parameters);
                    self.setProgress(0);
                    ctrl.uploadifyUpload();
                });
            }
        },
        onError: function (a, b, c, d) {  
           console.log('error',arguments);
           if (d.status == 404)  
             alert("Could not find upload script.");  
         else if (d.type === "HTTP")  
             alert("error "+d.type+": "+d.status);  
         else if (d.type ==="File Size")  
             alert(c.name+" "+d.type+" Limit: "+Math.round(d.sizeLimit/1024)+"KB");  
         else  
             alert("error "+d.type+": "+d.text);  
         }  
         ,onClearQueue: function() {
        }
    });
};
FileUploader.prototype.initUploader = function() {
    var self = this;
    var opts = self.opts;
    var id = opts.id;
    var dvid = $$(id);
    var uploadid = id + "__files";
    var url = opts.url;
    var allowed_filetypes = opts.allowed_filetypes;
    var parameters = {};
    parameters['filename'] = function() {
        return self.opts.filename || 'userfile';
    };
    parameters['__sc__'] = function() {
        return __token__;
    };
    
    _.each(opts.parameters,function(value,key){
        parameters[key] = function(){return self.opts.parameters[key];}
    });
    if (!allowed_filetypes) allowed_filetypes = [];
  
    $(dvid).filedrop({
        fallback_id: uploadid
        ,url: url
        ,paramname: 'userfile'
        ,data: parameters
        ,error: function(err, file,fileIndex,xhrStatus,xhr) {
            console.log('ERROR',arguments);
            self.errorcount++;
            switch(err) {
                case 'BrowserNotSupported':
                    alert('Your browser currently does not support uploads.')
                    break;
                case 'TooManyFiles':
                    // user uploaded more than 'maxfiles'
                    alert('Too many files specified');
                    break;
                case 'FileTooLarge':
                    // program encountered a file whose size is greater than 'maxfilesize'
                    // FileTooLarge also has access to the file which was too large
                    // use file.name to reference the filename of the culprit file
                    alert($L('An error occurred while uploading. The file you specified is probably too large. It should be less than ' + xint(opts.maxsize || 2) + 'MB.'));
                    break;
                case 'FileTypeNotAllowed':
                    alert('The selected file type cannot be uploaded');
                    break;
                    // The file type is not in the specified list 'allowedfiletypes'
                default:
                    msg = xhr.responseText;
                    if (!!msg) {
                        alert(msg);
                    } else {
                        alert('Sorry, an error ocurred:' + err);
                    }
                    break;
            }
        }
        ,allowedfiletypes: allowed_filetypes    // filetypes allowed by Content-Type.  Empty array means no restrictions
        ,maxfiles: 1
        ,maxfilesize: (xint(opts.maxsize) ||2)    // max file size in MBs
        ,dragOver: function() {$(dvid).addClass('dragover'); }
        ,dragLeave: function() {$(dvid).removeClass('dragover'); }
        ,progressUpdated: function(i, file, progress) {
            self.on_progress(file,progress);
            self.setProgress(progress);
            // console.log('Progress marches on',progress);
        }
        ,speedUpdated: function(i, file, speed) {
            self.on_speed(file,speed);
            // console.log('speed',speed,'kb/s');
        }
        ,beforeSend: function(file, i, done) {
            self.errorcount = 0;
            if (!self.before_send(file)) return;

            if (!opts.url) {
                alert('No target url has been set');
                return;
            }
            if (self.autoUpload()) {
                if (self.uploadTarget == "resumable")
                    self.uploadFile();
                else
                    done();
                self.setProgress(0);
            }
            else {
                $(dvid).find('.dropfilename').text(file.name);
                self.pending_uploads = [];
                self.pending_uploads.push(function(){done();self.setProgress(0);});
            }
        }
        ,afterAll: function() {
                // self.on_after_send();
        }
        ,uploadFinished:function(i,file,response,c,xhr) {
            self.on_after_finished(i,file,response);
            if (!!xhr && xhr.status < 299) {
                self.on_after_send(response);
                self.pending_uploads  = [];
            }
        }
        ,drop:function(e){
            console.log('File dropped',arguments);
            var files = [];
            if (!!e.dataTransfer)
                files = e.dataTransfer.files;
            if (!files || !files.length) {
                var uploadCtrl = document.getElementById(uploadid);
                if (!!uploadCtrl) {
                    files = uploadCtrl.files || [];
                }
            }
            if (!files || !files.length) return;
            self.on_drop(files, e);
            // When a new file is added decide the uploader - either jquery-filedrop or ResumableJS
            self.chooseUploader(files);
        },
        eagerReadAsDataUrl: (function (self) {
          return function () {
            return self.eagerReadAsDataUrl;
          };
        })(self)
    });

    // Initialize ResumableJS
    self.initResumable({
        fileParameterName: 'userfile',
        maxFiles: 1,
        simultaneousUploads: 1,
        chunkSize: +self.opts.maxUploadChunkSizeMB * 1024 * 1024,
        fileSuccess: function (file,response) {
            console.log('File success', arguments);
            self.on_after_finished( file.progress() * 100,file,response);

            self.on_after_send(response);
            self.pending_uploads = [];
        },
        fileError: function (file, msg) {
            console.log('File error', arguments);
            self.errorcount++;
            if (!!msg) {
                alert(msg);
            } else {
            alert('Sorry, an error ocurred:');
            }
        },
        fileProgress: function (file) {
            self.on_progress(file, file.progress() * 100);
            self.setProgress(file.progress() * 100);
        }
    }, parameters);
};

// Based on the file size choose the uploader
FileUploader.prototype.chooseUploader = function (files) {
    var self = this;
    self.uploadTarget = "jquery-filedrop";
    self.eagerReadAsDataUrl = true;

    for (var i = 0; i < files.length; i++) {
        var file = files[i];

        var KB = 1024;
        var MB = 1024*KB;
        var largeSizeLimit = xint(self.opts.largeUploadFileSizeMB);
        if (largeSizeLimit > 0 && (file.size > largeSizeLimit*MB)) {
            self.uploadTarget = "resumable";
            // Since we aren't setting ui targets for the library
            // It doesn't know where to pick files from
            // So we add it when jquery-filedrop's filedrop events are fired
            self.resumable.addFile(file);
            // Set the file name uploaded by client
            self.resumable.parameters['filename'] = file.name;
            self.eagerReadAsDataUrl = false;
        }

        console.log("Chosen uploader: " + self.uploadTarget);
    }
};

// Initializes ResumableJS and adds event callbacks
FileUploader.prototype.initResumable = function (opts, parameters) {
    var self = this;
    var separator = "/";
    var targetUrl = xstr(self.opts.url);
    if (targetUrl.toLowerCase().indexOf('/uploadcontent')>=0) {
        var resumableUrl = targetUrl.substr("/uploadcontent".length);

        if (!_.startsWith(resumableUrl,"/")) {
            resumableUrl = "/UploadLargeFile" + separator + resumableUrl;
        } else {
            resumableUrl = "/UploadLargeFile" + resumableUrl;
        }

        opts.target = resumableUrl;
    }
    if (targetUrl.toLowerCase().indexOf('/attachments/upload')>=0) {
        var resumableUrl = targetUrl.substr("/attachments/upload".length);

        if (!_.startsWith(targetUrl,"/")) {
            resumableUrl = "/UploadLargeFile" + separator + targetUrl;
        } else {
            resumableUrl = "/UploadLargeFile" + targetUrl;
        }

        opts.target = resumableUrl;
    }


    self.resumable = new Resumable(opts);
    self.resumable.parameters = parameters;

    self.resumable.on('fileSuccess', opts.fileSuccess);
    self.resumable.on('fileError', opts.fileError);
    self.resumable.on('fileProgress', opts.fileProgress);
};

FileUploader.prototype.showFinish = function() {
    var self = this;
    var ctrl = $$(self.opts.id).parent();
    ctrl.find('.dropbox').makeInvisible();
    ctrl.find('.donemessage').makeVisible();
    ctrl.find('.donemessage').addClass('tohighlight');
    ServiceDesk.runPendingHighlights();
};
FileUploader.prototype.on_drop = function(files,event) {
    var self = this;
    if (!!self._on_drop) {
        self._on_drop(files,event);
    }
}
FileUploader.prototype.onDrop = function(f) {
    this._on_drop = f;
}
FileUploader.prototype.on_after_send = function(result) {
    var self = this;
    if (!self._after_send) {
        self.showFinish();
        return;
    }
    self._after_send(result);
};
FileUploader.prototype.on_after_finished = function(i,file,response) {
    var self = this;
    if (!!self._after_finished)
        self._after_finished(i,file,response);
};
FileUploader.prototype.before_send = function(file) {
    var self = this;
    if (!self._before_send) return true;
    return self._before_send(file);

};
FileUploader.prototype.on_speed = function(file,sp) {
    var self = this;
    $(self).trigger('speed',[file,sp]);

};
FileUploader.prototype.setProgress = function(progress) {
    var self = this;
    if (self.opts.showprogress=='0') return;
    console.log('Upload Progress',progress);
    var id = self.opts.id;
    var ctrl = $$(id);
    if (!ctrl.find('.progressbar').exists()) {
        var dv = $('<div />').addClass('progressbar');
        ctrl.append(dv);
        var meter = $('<div />');
        meter.addClass('meter');
        dv.append(meter);
    }
    var dv = ctrl.find('.progressbar > .meter');
    dv.css('width',progress + '%');
};
FileUploader.prototype.on_progress = function(file,_progress) {
    var self = this;
    $(self).trigger('progress',[file,_progress]);

};
FileUploader.prototype.afterSend = function(func) {
    var self = this;
    self._after_send = func;
};
FileUploader.prototype.beforeSend = function(func) {
    var self = this;
    self._before_send = func;
};
FileUploader.prototype.afterFinished = function(func) {
    var self = this;
    self._after_finished = func;
};
FileUploader.prototype.onSpeed = function(func) {
    $(this).bind('speed',func);
};
FileUploader.prototype.onProgress = function(func) {
    $(this).bind('progress',func);
};
FileUploader.prototype.getFieldContainer = function() {
    var self = this;
    return $$(self.opts.id);
};
FileUploader.prototype.getElement = FileUploader.prototype.getFieldContainer;
