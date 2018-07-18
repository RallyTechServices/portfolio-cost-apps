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
    defaultDayRate: 200,
    defaultSprintDays: 14,
    currency: "$",
    timebox_limit : 10,

    config: {
        defaultSettings: {
            teamTypeField: 'c_TeamType',
            acceptedStoriesField: true,
            currencySign: '$'
        }
    },    
                        
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
        var currency = this.getSetting('currencySign');
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
                        },{
                            property: 'Workspace',
                            value: this.getContext().getWorkspace()._ref
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
                    showRowActionsColumn: false,
                    emptyText: 'No specific project costs defined.',
                    showPagingToolbar: false
                });
            },
            scope: this
        });
    },

    _initializeApp: function(){
        var me = this;
        this.logger.log('_initializeApp');

        if (this.down('#selector_box')){
            this.down('#selector_box').destroy();
        }
        if (this.down('#selector_box_2')){
            this.down('#selector_box_2').destroy();
        }

        var team_types = Ext.create('Ext.data.Store', {
            fields: ['name'],
            data : [
                {"name":"Scrum"},
                {"name":"Kanban"}
            ]
        });

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
                width: 300,
                labelWidth: 75,
                storeConfig: {
                    model: 'Project',
                    autoLoad: true,
                    remoteFilter: false,
                    limit: 'Infinity',
                    fetch: ['Name','_ref','TeamMembers',me.getSetting('teamTypeField')],
                    sorters: [{
                        property: 'Name',
                        direction: 'ASC'
                    }]
                },
                displayField: 'Name',
                valueField: '_ref',
                listeners: {
                    change: function(cb){
                        console.log('Project CB', cb);
                        me.project = cb.getRecord();
                        me._prePopulateValues(me.project);
                    },
                    scope:me
                }
            },{
                xtype: 'rallynumberfield',
                itemId: 'nb-cost',
                fieldLabel: 'SPOC',
                margin: margin,
                width: 175,
                labelWidth: 100,
                labelAlign: 'right',
                minValue: 1,
                value: this.defaultCost
            },{
                xtype: 'rallynumberfield',
                itemId: 'nb-sprint-days',
                fieldLabel: 'Iteration /<br>Sprint Days',
                margin: margin,
                width: 175,
                labelWidth: 100,
                labelAlign: 'right',
                minValue: 1,
                listeners:{
                    change:me._calculateCost,
                    scope:me
                }
            },{
                xtype: 'rallynumberfield',
                itemId: 'nb-average-velocity',
                fieldLabel: 'Average <br>Velocity',
                margin: margin,
                width: 175,
                labelWidth: 100,
                labelAlign: 'right',
                minValue: 1,
                listeners:{
                    change:me._calculateCost,
                    scope:me
                }
            },{
                xtype: 'rallydatefield',
                itemId: 'dt-asOfDate',
                fieldLabel: 'as Of Date',
                margin: margin,
                labelAlign: 'right',
                width: 250,
                labelWidth: 100,
                value: new Date()
            },{
                xtype: 'rallynumberfield',
                itemId: 'nb-number-of-sprints',
                fieldLabel: 'Number of Sprints',
                margin: margin,
                width: 175,
                labelWidth: 100,
                labelAlign: 'right',
                minValue: 1,
                value: me.timebox_limit,
                listeners:{
                    change: function(){
                        me._prePopulateValues(me.project);
                    },
                    scope:me
                }
            }]
        });

        this.add({
            xtype: 'container',
            itemId: 'selector_box_2',
            layout: 'hbox',

            items: [{
                xtype: 'rallytextfield',
                itemId: 'tx-comment',
                fieldLabel: 'Comments',
                margin: margin,
                width: 300,
                labelWidth: 75,
                labelAlign: 'right',
                minValue: 1,
                emptyText: 'Enter Comments here...'
            },{
                xtype: 'rallynumberfield',
                itemId: 'nb-avg-day-rate',
                fieldLabel: 'Average Day Rate',
                margin: margin,
                width: 175,
                labelWidth: 100,
                labelAlign: 'right',
                minValue: 1,
                value: this.defaultDayRate,
                listeners:{
                    change:me._calculateCost,
                    scope:me
                }
            },{
                xtype: 'rallynumberfield',
                itemId: 'nb-team-members',
                fieldLabel: '# Team Members',
                margin: margin,
                width: 175,
                labelWidth: 100,
                labelAlign: 'right',
                minValue: 1,
                listeners:{
                    change:me._calculateCost,
                    scope:me
                }
            },{
                xtype: 'rallynumberfield',
                itemId: 'nb-average-story-count',
                fieldLabel: 'Average <br>Story Count',
                margin: margin,
                width: 175,
                labelWidth: 100,
                labelAlign: 'right',
                minValue: 1,
                listeners:{
                    change:me._calculateCost,
                    scope:me
                }
            },{
                xtype: 'rallycombobox',
                itemId: 'cb-team-type',
                fieldLabel: 'Team Type',
                store: team_types,
                queryMode: 'local',
                displayField: 'name',
                valueField: 'name',
                labelAlign: 'right',
                width: 250,
                labelWidth: 100,
                allowNoEntry: true,
                listeners:{
                    change:me._calculateCost,
                    scope:me
                }
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
            }
            // ,{
            //      xtype: 'rallyfieldpicker',
            //      autoExpand: false,
            //      modelTypes: ['Project']
            //  }
             ]
        });        
        this._buildGrid();
    },

    _prePopulateValues: function(project){
        var me= this;
        //this.down('#nb-sprint-days').setValue(this._getTotalSprintDays());
        this._fetchIterations().then({
            success: function(records){
                console.log('_fetchIterations', records);

                var timebox_limit = me.down('#nb-number-of-sprints').getValue() || 1;

                var total_points = 0;
                this.down('#nb-average-story-count').setValue(Ext.util.Format.round(records.length / timebox_limit, 2));

                _.each(records,function(story){
                    if(me.getSetting('acceptedStoriesField')){
                        if(story.get('ScheduleState') == "Accepted"){
                            total_points += story.get('PlanEstimate') || 0;
                        }                        
                    }else{
                        total_points += story.get('PlanEstimate') || 0;
                    }

                });
                this.down('#nb-average-velocity').setValue(Ext.util.Format.round(total_points / timebox_limit, 2));

                this.down('#nb-team-members').setValue(project && project.get('TeamMembers').Count || 1);
                this.down('#cb-team-type').setValue(project && project.get(me.getSetting('teamTypeField')) || null);

                this._calculateCost();
            },
            scope:this
        })
    },

    _calculateCost:function(){
        var team_type = this.down('#cb-team-type') && this.down('#cb-team-type').getValue() || null;
        // if(!team_type || team_type == ""){
        //     this._showError('Error: Team Type must be selected');
        //     return;
        // }

        var spoc = 0;
        var team_members = this.down('#nb-team-members').getValue() > 0 ?  this.down('#nb-team-members').getValue() : 1,
            day_day_rate = this.down('#nb-avg-day-rate').getValue(),
            total_sprint_days = this.down('#nb-sprint-days').getValue() > 0 ? this.down('#nb-sprint-days').getValue():1, 

            avg_velocity = this.down('#nb-average-velocity').getValue();
            avg_story_count = this.down('#nb-average-story-count').getValue();

        if('Scrum' == team_type && avg_velocity > 0){
            spoc = ((total_sprint_days * team_members * day_day_rate) / avg_velocity);
        }

        if('Kanban' == team_type && avg_story_count > 0){
            spoc = ((total_sprint_days * team_members * day_day_rate) / avg_story_count);
        }


        this.down('#nb-cost').setValue(Ext.util.Format.round(spoc,2));

    },


    _fetchIterations: function() {

        this.logger.log("_fetchIterations");

        var me = this,
            deferred = Ext.create('Deft.Deferred')
            var timebox_limit = me.down('#nb-number-of-sprints').getValue() || 1;
                
        me.setLoading("Fetching iterations...");
        
        var config = {
            model:  'Iteration',
            limit: timebox_limit,
            pageSize: timebox_limit,
            fetch: ['Name','StartDate','EndDate','WorkProducts','PlanEstimate'],
            filters: [{property:'EndDate', operator: '<=', value: Rally.util.DateTime.toIsoString(new Date)},{property:'Project',value:me.project.get('_ref')}],
            sorters: [{property:'EndDate', direction:'DESC'}],
            context:{
                project: null
            }            
        };

        me.loadWsapiRecords(config).then({
            success: function(records){
                me.setLoading(false);
                console.log('iterations>>',records);
                if(records.length < 1){
                    this._showWarning('Warning: No Iterations found');
                    this.down('#nb-sprint-days').setValue(0);
                }else{

                    var last_sprint = records[0];
                    var sprint_days = Rally.util.DateTime.getDifference(last_sprint.get('EndDate'),last_sprint.get('StartDate'),'day') || 0;
                    this.down('#nb-sprint-days').setValue(sprint_days);
                    // this.down('#nb-sprint-days')
                    var story_filter = [];

                    _.each(records, function(iteration){
                        story_filter.push({property:'Iteration.Name', value:iteration.get('Name') });
                    });

                    //story_filter = Rally.data.wsapi.Filter.or(story_filter).and( {property:'ScheduleState', value:'Accepted' });
                    story_filter = Rally.data.wsapi.Filter.or(story_filter);
                    
                    console.log('story filter', story_filter.toString() );
                    var store_config = {
                        model:  'HierarchicalRequirement',
                        fetch: ['Name','PlanEstimate','Iteration','ScheduleState'],
                        filters: story_filter,
                        context:{
                            projectScopeDown:false,
                            project: me.project.get('_ref')
                        }
                    };

                    Deft.Promise.all([ me.loadWsapiRecords(store_config), me.loadWsapiRecords(Ext.Object.merge(store_config, {model: 'Defect'}))]).then({
                        success: function(records){
                            console.log('Stories',records);

                            deferred.resolve(Ext.Array.flatten(records));
                        },
                        scope:me
                    });

                }
            },
            failure: function(msg) {
                me.setLoading(false);
                deferred.reject(msg);
            },
            scope: me
        });

        return deferred.promise;
    },

    _getAverageStoryCount: function(){
        console.log('_getAverageStoryCount', this.storyCount);
        return this.storyCount || 0;
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
            userName = this.getContext().getUser().UserName,
            avgDayRate = this.down('#nb-avg-day-rate') && this.down('#nb-avg-day-rate').getValue(),
            noOfTeamMembers = this.down('#nb-team-members') && this.down('#nb-team-members').getValue(),
            teamType = this.down('#cb-team-type') && this.down('#cb-team-type').getValue(),
            sprintDays = this.down('#nb-sprint-days') && this.down('#nb-sprint-days').getValue(),
            averageVelocity = this.down('#nb-average-velocity') && this.down('#nb-average-velocity').getValue(),
            averageStoryCount = this.down('#nb-average-story-count') && this.down('#nb-average-story-count').getValue(),

            comments = this.down('#tx-comment') && this.down('#tx-comment').getValue();

        this.logger.log('_addCost', team, cost, asOfDate, userName);
        var grid = this.down('rallygrid');
        if (grid){
           var newPref = Ext.create('ProjectCostModel',{
                Project: team.get('_ref'),
                Workspace: this.getContext().getWorkspace()._ref
            });
            newPref.setCostForProject(cost, asOfDate, userName,comments,avgDayRate,noOfTeamMembers,teamType,sprintDays,averageVelocity,averageStoryCount);
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
            currency = this.getSetting('currencySign');

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
            {dataIndex: '__userDisplayName', text: 'User', flex: 2},
            {dataIndex: '__sprintDays', text: 'Sprint Days', flex: 2},
            {dataIndex: '__avgDayRate', text: 'Average <br>Day Rate', flex: 2},
            {dataIndex: '__noOfTeamMembers', text: '# Team Members', flex: 2},
            {dataIndex: '__teamType', text: 'Team Type', flex: 2},
            {dataIndex: '__averageVelocity', text: 'Average <br>Velocity', flex: 2},
            {dataIndex: '__averageStoryCount', text: 'Average <br>Story Count', flex: 2},
            {dataIndex: '__comments', text: 'Comments', flex: 2}];
    },

    loadWsapiRecords: function(config,returnOperation){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
                
        var default_config = {
            model: 'Defect',
            fetch: ['ObjectID']
        };
        Ext.create('Rally.data.wsapi.Store', Ext.Object.merge(default_config,config)).load({
            callback : function(records, operation, successful) {
                if (successful){
                    if ( returnOperation ) {
                        deferred.resolve(operation);
                    } else {
                        deferred.resolve(records);
                    }
                } else {
                    deferred.reject('Problem loading: ' + operation.error.errors.join('. '));
                }
            }
        });
        return deferred.promise;
    },

    getSettingsFields: function() {
        var check_box_margins = '5 0 5 0';
        var currency_store = Ext.create('Rally.data.custom.Store', {
            data: [
                {name: "US Dollars", value: "$"},
                {name: "Euro", value: "&#128;"},
                {name: "Pound", value: "&#163;"},
                {name: "Japanese Yen", value: "&#165;"},
                {name: "Brazilian Real", value: "R$"},
                {name: "South African Rand", value: "R"}
            ]
        });

        return [{
            name: 'teamTypeField',
            itemId:'teamTypeField',
            xtype: 'rallyfieldcombobox',
            fieldLabel: 'Team Type Field',
            labelWidth: 125,
            labelAlign: 'left',
            minWidth: 200,
            margin: '10 10 10 10',
            model: 'Project',
            allowBlank: false
        },{
            name: 'acceptedStoriesField',
            itemId:'acceptedStoriesField',
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Use only Accepted Stories to calculate Average Velocity',
            labelWidth: 125,
            labelAlign: 'left',
            minWidth: 200,
            margin: '10 10 10 10'
        },{
            xtype: 'rallycombobox',
            name: 'currencySign',
            store: currency_store,
            displayField: 'name',
            valueField: 'value',
            labelWidth: 125,
            labelAlign: 'left',
            minWidth: 200,
            margin: '10 10 10 10'
        }];
    },

    _showError: function(msg){
        this.logger.log('_showError', msg);
        Rally.ui.notify.Notifier.showError({ message: msg });
    },

    _showWarning: function(msg){
        this.logger.log('_showWarning', msg);
        Rally.ui.notify.Notifier.showWarning({ message: msg });
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
