Ext.define('CArABU.technicalservices.LowestLevelPortfolioRollupItem',{
    extend: 'CArABU.technicalservices.RollupItem',

    processChildren: function(){

        this._rollupDataToolTip = this.getTooltip();

        if (this._notEstimated && this.getPreliminaryBudget() > this.getActualCostRollup()){
            this._rollupDataRemainingCost = this.getPreliminaryBudget() - this.getActualCostRollup();
            this._rollupDataTotalCost = this._rollupDataActualCost + this._rollupDataRemainingCost;
        } else {
            this._rollupDataRemainingCost = this._rollupDataTotalCost  - this._rollupDataActualCost;
        }
    },
    addChild: function(child){
        if (!this.children){
            this.children = [];
            this._rollupDataTotalCost = 0; //Need to clear this out becuase this is preliminary budget if there are no children
            this._rollupDataActualCost = 0;
            this._rollupDataRemainingCost = 0;
            this.__totalUnits = 0;
            this.__actualUnits = 0;

        }
        this.children.push(child);

        this.__totalUnits += child.__totalUnits || 0;
        this.__actualUnits += child.__actualUnits || 0;

        this._notEstimated = (this.__totalUnits === 0);

        this._rollupDataActualCost += child._rollupDataActualCost;
        this._rollupDataTotalCost += child._rollupDataTotalCost;
        this._rollupDataRemainingCost = this._rollupDataTotalCost  - this._rollupDataActualCost;

        if (!this.projectCosts || !this.projectCosts[child.Project._ref]){
            this.projectCosts = this._updateProjectNameAndCostHash(this.projectCosts, child.Project);
        }
    },
    _updateProjectNameAndCostHash: function(projectCosts, project){

        projectCosts = projectCosts || {};

        var name = project._refObjectName,
            cost = CArABU.technicalservices.PortfolioItemCostTrackingSettings.getCostPerUnit(project._ref);

        if (CArABU.technicalservices.PortfolioItemCostTrackingSettings.isProjectUsingNormalizedCost(project._ref)){
            name =  "normalized (default)";
        }
        projectCosts[name] = cost;
        return projectCosts;
    }
});