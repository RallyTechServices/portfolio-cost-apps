Ext.define('CArABU.technicalservices.CostStore',{

    logger: new Rally.technicalservices.Logger(),

    PREF_NAME: 'portfolio-team-cost',

    mixins: {
        observable: 'Ext.util.Observable'
    },

    constructor: function(config){
        this.preferenceName = config.preferenceName || this.PREF_NAME;
        this.context = config.context;

        this.mixins.observable.constructor.call(this, config);

        this._loadPreferences();
    },
    _loadPreferences: function(){
        var workspaceRef = this.context.getWorkspace()._ref;
        this.records = null;

        Ext.create('Rally.data.wsapi.Store',{
            model: 'Preference',
            fetch: ['Name','Project','Type','Value','CreationDate','ObjectID','User'],
            filters: [{
                property: 'Type',
                value: this.preferenceName
            },{
                property: 'Workspace',
                value: workspaceRef
            }],
            context: {
                workspace: workspaceRef,
                project: null
            },
            limit: 'Infinity'
        }).load({
            callback: function(records,operation,success){
                if (success){
                    this._processCostRecords(records);
                    this.fireEvent('ready', this);
                } else {
                    var msg = "Error fetching preferences: " + operation && operation.error && operation.error.errors.join(',');
                    this.fireEvent('onerror', msg);
                }
            },
            scope: this
        });
    },
    _processCostRecords: function(records){
        var costByProjectHash = {};
        Ext.Array.each(records, function(r){
            var projectRef = r.get('Project') && r.get('Project')._ref;
            if (!costByProjectHash[projectRef]){
                costByProjectHash[projectRef] = this._processCostPreferenceRecord(r);
            }
        }, this);
        this.costByProjectHash = costByProjectHash;
    },
    _processCostPreferenceRecord: function(r){
        //{
        //    asOfDate: "2016-01-02",
        //    cost: 100,
        //    editUser: "/user/12345",
        //    projectName: "MyProjectName",
        //    userName: "My Name"
        //}
        var json = Ext.JSON.decode(r.get('Value'));
        var sortedData = _.sortBy(json, function(obj){
            return Rally.util.DateTime.fromIsoString(obj.asOfDate);
        });
        return sortedData;

    },
    getData: function(){
        var data = [];
        Ext.Object.each(this.costByProjectHash, function(entries, project){
             Ext.Array.each(entries, function(e){
                 var model = Ext.create('CArABU.technicalservices.ProjectCostModel');
                 model.initializeFromPreferenceObj(project,e);
                 data.push(model);
             });
        });
        return data;
    },
    getCostPerProject: function(projectRef, asOfDate, defaultCost){
        var projectCosts = this.costByProjectHash[projectRef] || [],
            cost = defaultCost;

        Ext.Array.each(projectCosts, function(pc){
            var modelDate = pc.get('asOfDate');
            if (Rally.util.DateTime.getDifference(asOfDate, modelDate, 'hour') >= 0 ){
                cost =  pc.get('cost');
                return false;
            }
        },this,true);

        return cost;
    }

});