Ext.define("team-cost-admin", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'message_box',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'display_box'}
    ],

    integrationHeaders : {
        name : "team-cost-admin"
    },
    minHeight: 500,
    defaultCost: 1000,
    currency: "$",
                        
    launch: function() {
        this._initializeApp();
    },
    _fetchPreferenceModel: function(){
        var deferred = Ext.create('Deft.Deferred');
        this.logger.log('_fetchPreferenceModel');
        CArABU.technicalservices.ProjectCostModelBuilder.build('Preference', 'ProjectCostModel').then({
            success: function(model){
                deferred.resolve(model);
            }
        });
        return deferred;
    },
    _buildGrid: function(){

        this.logger.log('_buildGrid');

        if (this.down('rallygrid')){
            this.down('rallygrid').destroy();
        }
        var currency = this.currency;
        var groupHeaderTpl = Ext.create('Ext.XTemplate',
            '<div><b>{name}</b>   (' + currency + '{children:this.getCurrentCost})</div>',
            {
                getCurrentCost: function(children) {
                    var children = _.sortBy(children, function(c){ return c.get('__asOfDate'); }),
                        currentDate = new Date(),
                        cost = children.slice(-1)[0].get('__cost');

                    Ext.Array.each(children, function(c){
                        var asOfDate = c.get('__asOfDate');
                        if (Rally.util.DateTime.getDifference(currentDate, asOfDate,'hour') >= 0){
                            cost = c.get('__cost');
                            return false;
                        }
                    },this,true);

                    return cost;
                }
            }
        );



        this._fetchPreferenceModel().then({
            success: function(model){
                this.add({
                    xtype: 'rallygrid',
                    storeConfig: {
                        model: model,
                        fetch: ['Name','Project','Type','Value','CreationDate'],
                        filters: [{
                            property: 'Name',
                            operator: "contains",
                            value: CArABU.technicalservices.ProjectCostModelBuilder.prefPrefix
                        }],
                        context: {
                            workspace: this.getContext().getWorkspace()._ref,
                            project: null
                        },
                        sorters: [{
                            property: 'Name',
                            direction: 'DESC'
                        }],
                        limit: 'Infinity',
                        groupField: 'Project',
                        groupDir: 'ASC',
                        getGroupString: function(record) {
                            var project = record.get('Project');

                            return (project && project._refObjectName) || 'No Project';
                        }
                    },
                    features: [{
                        ftype: 'groupingsummary',
                        groupHeaderTpl: groupHeaderTpl,
                        startCollapsed: true
                    }],
                    columnCfgs: this._getColumnCfgs(),
                    //pageSize: pageSize,
                    showRowActionsColumn: false,
                    emptyText: 'No specific project costs defined.',
                    showPagingToolbar: false
                });
            },
            scope: this
        });
    },
    _initializeApp: function(){
        this.logger.log('_initializeApp');

        if (this.down('#selector_box')){
            this.down('#selector_box').destroy();
        }


        var margin = 5;
        this.add({
            xtype: 'container',
            itemId: 'selector_box',
            layout: 'hbox',

            items: [{
                xtype: 'rallycombobox',
                fieldLabel: 'Team',
                itemId: 'cb-team',
                labelAlign: 'right',
                margin: margin,
                width: 250,
                labelWidth: 75,
                storeConfig: {
                    model: 'Project',
                    autoLoad: true,
                    remoteFilter: false,
                    fetch: ['Name','_ref'],
                    sorters: [{
                        property: 'Name',
                        direction: 'ASC'
                    }]
                },
                displayField: 'Name',
                valueField: '_ref'
            },{
                xtype: 'rallynumberfield',
                itemId: 'nb-cost',
                fieldLabel: 'Cost',
                margin: margin,
                width: 125,
                labelWidth: 75,
                labelAlign: 'right',
                minValue: 1,
                value: this.defaultCost
            },{
                xtype: 'rallydatefield',
                itemId: 'dt-asOfDate',
                fieldLabel: 'as Of Date',
                margin: margin,
                labelAlign: 'right',
                labelWidth: 75,
                value: new Date()
            },{
                xtype: 'rallybutton',
                text: '+Add',
                margin: margin,
                listeners: {
                    scope: this,
                    click: this._addCost
                }
            },{
                xtype: 'rallybutton',
                iconCls: 'icon-export secondary',
                margin: '5 25 5 5',
                listeners: {
                    scope: this,
                    click: this._export
                }
            }]
        });
        this._buildGrid();
    },
    _export: function(){
        this.logger.log('_export');
        var exporter = Ext.create('CArABU.technicalservices.Exporter');
        var grid = this.down('rallygrid'),
            fileName = "project-cost-export-" + Rally.util.DateTime.format(new Date(), 'Y-m-d') + '.csv';
        if (grid){
            var csv = exporter.getCSVFromGrid(grid);
            exporter.saveCSVToFile(csv, fileName);
        }
    },
    _addCost: function(){
        var team = this.down('#cb-team') && this.down('#cb-team').getRecord(),
            cost = this.down('#nb-cost') && this.down('#nb-cost').getValue(),
            asOfDate = this.down('#dt-asOfDate') && this.down('#dt-asOfDate').getValue() || new Date(),
            userName = this.getContext().getUser().UserName;

        this.logger.log('_addCost', team, cost, asOfDate, userName);
        var grid = this.down('rallygrid');
        if (grid){
           var newPref = Ext.create('ProjectCostModel',{
                Project: team.get('_ref')
            });
            newPref.setCostForProject(cost, asOfDate, userName);
            if (this._validate(grid.getStore(), newPref)){
                newPref.save();
                grid.getStore().add(newPref);
            }
        }
    },
    _validate: function(store, newPref){
        //verify that we aren't adding dups...
        var dup = false;
        Ext.Array.each(store.getRange(), function(r){
            if (r.get('Name') === newPref.get('Name') && r.get('Project') && r.get('Project')._ref === newPref.get('Project')){
                this.logger.log('_validate duplicate found: ',r.get('Name'), newPref.get('Name'),r.get('Project')._ref, newPref.get('Project'))
                dup = true;
                return false;
            }
        }, this);

        if (dup){
            this._showError("There is already a cost defined for the selected Project and Day.  To update the cost, please remove the existing one first.");
            return false;
        }
        return true;
    },

    _getColumnCfgs: function(){
        var me = this,
            currency = this.currency;

        return [{
            xtype: 'rallyrowactioncolumn',
            //Need to override this since we don't want a menu...
            _renderGearIcon: function(value, metaData, record) {
                return '<div class="row-action-icon icon-delete"/>';
            },
            _showMenu: function(view, el) {
                me.logger.log('_removeEntry');
                var selectedRecord = view.getRecord(Ext.fly(el).parent("tr"));
                selectedRecord.destroy();
            }
        },
            {dataIndex: 'Project', text: 'Project', flex: 2},
            {dataIndex: '__cost', text: 'Cost', flex: 1, renderer: function(v){
                return Ext.String.format('{0} {1}', currency, v);
            }},
            {dataIndex: '__asOfDate', text: 'As of Date', flex: 1, renderer: function(v){
                return Rally.util.DateTime.format(v, 'Y-m-d');
            }},
            {dataIndex: '__userDisplayName', text: 'User', flex: 2}];
    },

    _showError: function(msg){
        this.logger.log('_showError', msg);
        Rally.ui.notify.Notifier.showError({ message: msg });
    },
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    
    //onSettingsUpdate:  Override
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        // Ext.apply(this, settings);
        this.launch();
    }
});
