Ext.define('CArABU.technicalservices.CostPerProjectSettings',{
    extend: 'Ext.form.field.Base',
    alias: 'widget.costperprojectsettings',
    fieldSubTpl: '<div id="{id}" class="settings-grid"></div>',
    width: '100%',
    cls: 'column-settings',

    store: undefined,

    onDestroy: function() {
        if (this._grid) {
            this._grid.destroy();
            delete this._grid;
        }
        this.callParent(arguments);
    },
    initComponent: function(){

        this.callParent();
        this.addEvents('ready');

        var store = Ext.create('Rally.data.wsapi.Store', {
            model: Ext.identityFn('Project'),
            fetch: ['Name'],
            context: {
                project: null
            },
            limit: 'Infinity'
        });
        store.load({
            scope: this,
            callback: this._buildProjectGrid
        });
    },

    _buildProjectGrid: function(records, operation, success){

        console.log('initialConfig', this.initialConfig.value);
        var decodedValue = {};
        if (this.initialConfig && this.initialConfig.value && !_.isEmpty(this.initialConfig.value)){
            if (!Ext.isObject(this.initialConfig.value)){
                decodedValue = Ext.JSON.decode(this.initialConfig.value);
            } else {
                decodedValue = this.initialConfig.value;
            }
        }

        var data = [],
            empty_text = "No exceptions";

        if (success) {
            _.each(records, function(project){
                var cost = decodedValue[project.get('_ref')] || null;
                if (cost){
                    data.push({projectRef: project.get('_ref'), projectName: project.get('Name'), cost: cost});
                }
            });
        } else {
            empty_text = "Error(s) fetching Project data: <br/>" + operation.error.errors.join('<br/>');
        }

        var custom_store = Ext.create('Ext.data.Store', {
            fields: ['projectRef', 'projectName', 'cost'],
            data: data
        });

        this._grid = Ext.create('Rally.ui.grid.Grid', {
            autoWidth: true,
            renderTo: this.inputEl,
            columnCfgs: this._getColumnCfgs(),
            // showRowActionsColumn: false,
            showPagingToolbar: false,
            store: custom_store,
            maxHeight: 300,
            margin: '20 0 0 0',
            emptyText: empty_text,
            editingConfig: {
                publishMessages: false
            }
        });

        var width = Math.max(this.inputEl.getWidth(true),300);

        Ext.create('Rally.ui.Button',{
            text: 'Select Projects',
            renderTo: this.inputEl,
            margin: '10 0 0 0',
            listeners: {
                scope: this,
                click: function(){

                    Ext.create('CArABU.technicalservices.ProjectPickerDialog',{
                        autoShow: true,
                        maxHeight: 400,
                        maxWidth: 400,
                        width: Math.min(width, 400),
                        title: 'Choose Project',
                        selectedRefs: _.pluck(data, 'projectRef'),
                        listeners: {
                            scope: this,
                            itemschosen: function(items){
                                var new_data = [],
                                    store = this._grid.getStore();

                                _.each(items, function(item){
                                    if (!store.findRecord('projectRef',item.get('_ref'))){
                                        new_data.push({
                                            projectRef: item.get('_ref'),
                                            projectName: item.get('Name'),
                                            cost: null
                                        });
                                    }
                                });
                                this._grid.getStore().add(new_data);
                            }
                        }
                    });
                }
            }
        });

        this.fireEvent('ready', true);
    },
    _removeProject: function(){
        this.grid.getStore().remove(this.record);
    },
    _getColumnCfgs: function() {
        var me = this;

        var columns = [{
            xtype: 'rallyrowactioncolumn',
            scope: this,
            rowActionsFn: function(record){
                return  [
                    {text: 'Remove', record: record, handler: me._removeProject, grid: me._grid }
                ];
            },
            //Need to override this since we are using a custom store
            _renderGearIcon: function(value, metaData, record) {
                return '<div class="row-action-icon icon-gear"/>';
            }
        },{
            text: 'Project',
            dataIndex: 'projectRef',
            flex: 1,
            editor: false,
            renderer: function(v, m, r){
                return r.get('projectName');
            },
            getSortParam: function(v,m,r){
                return 'projectName';
            }
        },{
            text: 'Cost Per Unit',
            dataIndex: 'cost',
            editor: {
                xtype: 'rallynumberfield'
            },
            renderer: function(v){
                if (v && v > 0){
                    return v;
                }
                return "Use Default";
            }
        }];
        return columns;
    },
    /**
     * When a form asks for the data this field represents,
     * give it the name of this field and the ref of the selected project (or an empty string).
     * Used when persisting the value of this field.
     * @return {Object}
     */
    getSubmitData: function() {
        var data = {};
        data[this.name] = Ext.JSON.encode(this._buildSettingValue());
        return data;
    },
    _buildSettingValue: function() {
        var mappings = {};
        var store = this._grid.getStore();

        store.each(function(record) {
            if (record.get('cost') && record.get('projectRef')) {
                mappings[record.get('projectRef')] = record.get('cost');
            }
        }, this);
        return mappings;
    },

    getErrors: function() {
        var errors = [];
        //Add validation here
        return errors;
    },
    setValue: function(value) {
        this.callParent(arguments);
        this._value = value;
    }
});
