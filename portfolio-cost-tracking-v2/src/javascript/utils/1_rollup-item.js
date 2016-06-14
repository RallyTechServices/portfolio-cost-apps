(function() {
    var Ext = window.Ext4 || window.Ext;

    Ext.define('CArABU.technicalservices.RollupItem',{

    _rollupDataPreliminaryBudget: undefined,
    _rollupDataTotalCost: undefined,
    _rollupDataActualCost: undefined,
    _rollupDataRemainingCost: undefined,
    _rollupDataToolTip: null,
    _notEstimated: true,
    children: undefined,

    projectCosts: undefined,
    useBudgetCalc: false,

    constructor: function(record) {
        this._rollupDataTotalCost = 0;
        this._rollupDataActualCost = 0;

        this.parent = record.get('Parent') && record.get('Parent').ObjectID || null;
        this.objectID = record.get('ObjectID');

        this._rollupDataPreliminaryBudget = this._calculatePreliminaryBudget(record.getData());
        this._rollupDataTotalCost = this.getPreliminaryBudget() || 0;
        this._rollupDataToolTip = this.getTooltip();
        this._rollupDataRemainingCost = this.getRemainingCostRollup();


        Ext.apply(this, record.getData());
    },
    addChild: function(objectID){
        if (!this.children){
            this.children = [];
        }
        this.children.push(objectID);
    },
    getExportRow: function(columns, ancestors){
        var rec = Ext.clone(ancestors);

        rec[this._type] = this.FormattedID;

        rec.type = CArABU.technicalservices.PortfolioItemCostTrackingSettings.getTypePathDisplayName(this._type);
        _.each(columns, function(c){
            var field = c.costField || c.dataIndex || null;
            if (field){
                var data = this[field];
                if (Ext.isObject(data)){
                    rec[field] = data._refObjectName;
                } else if (Ext.isDate(data)){
                    rec[field] = Rally.util.DateTime.formatWithDefaultDateTime(data);
                } else {
                    rec[field] = data;
                }
            }
        }, this);
        return rec;
    },
    _calculatePreliminaryBudget: function(data){
        var preliminaryBudgetField = CArABU.technicalservices.PortfolioItemCostTrackingSettings.preliminaryBudgetField;
        if (data && data[preliminaryBudgetField]){
            //We need to do this in case we are using hte PreliminaryEstimate field, which is an object
            var val = data[preliminaryBudgetField].Value || data[preliminaryBudgetField];
            var cpu = CArABU.technicalservices.PortfolioItemCostTrackingSettings.getCostPerUnit(data.Project._ref);
            return cpu * val;
        }
        return null;
    },
    getTooltip: function(){

        var completed  = CArABU.technicalservices.PortfolioItemCostTrackingSettings.notAvailableText;
        if ((this.__actualUnits >= 0) && (this.__totalUnits >=0 )){
            completed = Ext.String.format("{0}/{1}", this.__actualUnits, this.__totalUnits);
        }

        var calc_type_name = CArABU.technicalservices.PortfolioItemCostTrackingSettings.getCalculationTypeDisplayName();

        var html = Ext.String.format('{0} completed {1}<br/>', calc_type_name, completed);
        if (this.projectCosts){
            html += '<br/>Cost per unit:<br/>';
            _.each(this.projectCosts, function(project_cost, project_name){
                html += Ext.String.format('{0} {1}<br/>', CArABU.technicalservices.PortfolioItemCostTrackingSettings.formatCost(project_cost), project_name);
            });
        }


        if (this._notEstimated){
            html += '<br/><p>Portfolio Item has missing ' + calc_type_name + '.  Preliminary Budget is being used to calculate Projected and Remaining costs.</p>';
        }
        return html;
    },
    getTotalCostRollup: function(){
        if (this._notEstimated){
            return this.getActualCostRollup() + this.getRemainingCostRollup();
        }
        return this._rollupDataTotalCost;
    },
    getActualCostRollup: function(){
        return this._rollupDataActualCost;
    },
    getRemainingCostRollup: function(){
        if (this._notEstimated){
            return Math.max(this.getPreliminaryBudget() || 0 - this.getActualCostRollup(), 0);
        }
        return this._rollupDataRemainingCost;
    },
    getPreliminaryBudget: function(){
        return this._rollupDataPreliminaryBudget;
    }
});
})();