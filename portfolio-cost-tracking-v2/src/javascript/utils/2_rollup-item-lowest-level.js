Ext.define('CArABU.technicalservices.LowestLevelPortfolioRollupItem',{
    extend: 'CArABU.technicalservices.RollupItem',

    processChildren: function(){

        this._rollupDataTotalCost = 0; //Need to clear this out becuase this is preliminary budget if there are no children
        this._rollupDataActualCost = 0;
        this._rollupDataRemainingCost = 0;
        this._rollupDataActualOpExCost = 0;
        this._rollupDataRemainingOpExCost = 0;
        this.__totalUnits = 0;
        this.__actualUnits = 0;
        var notEstimated = (!this.children || this.children.length === 0) ;

        Ext.Array.each(this.children, function(child){
            this.__totalUnits += child.__totalUnits || 0;
            this.__actualUnits += child.__actualUnits || 0;
            this._rollupDataActualCost += child._rollupDataActualCost;
            this._rollupDataRemainingCost += child._rollupDataRemainingCost;
            this._rollupDataActualOpExCost += child._rollupDataActualOpExCost;
            this._rollupDataRemainingOpExCost += child._rollupDataRemainingOpExCost;
            notEstimated = notEstimated && child._notEstimated;
        }, this);
        this._notEstimated = notEstimated;

        this._rollupDataToolTip = this.getTooltip();

        if (this._notEstimated && this.getPreliminaryBudget() > this.getActualCostRollup()){
            this._rollupDataRemainingCost = this.getPreliminaryBudget() - this.getActualCostRollup();
        }
        //This should always be actual + remaining...
        this._rollupDataTotalCost = this._rollupDataActualCost + this._rollupDataActualOpExCost +  this._rollupDataRemainingCost + this._rollupDataRemainingOpExCost;
    },
    addChild: function(child){
        if (!this.children){
            this.children = [];
            this._rollupDataTotalCost = 0; //Need to clear this out becuase this is preliminary budget if there are no children
            this._rollupDataActualCost = 0;
            this._rollupDataRemainingCost = 0;
            this._rollupDataActualOpExCost = 0;
            this._rollupDataRemainingOpExCost = 0;
            this.__totalUnits = 0;
            this.__actualUnits = 0;

        }
        this.children.push(child);

    }
});