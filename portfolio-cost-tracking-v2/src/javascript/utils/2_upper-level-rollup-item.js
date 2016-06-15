Ext.define('CArABU.technicalservices.UpperLevelPortfolioRollupItem',{
    extend: 'CArABU.technicalservices.RollupItem',


    processChildren: function(){

        if (this.children && this.children.length > 0){
            var rollupDataTotal = 0,
                rollupDataActual = 0,
                rollupDataRemaining = 0,
                totalUnitsSum = 0,
                actualUnitsSum = 0,
                rollupItems = this.children || [],
                notEstimated = true,
                preliminaryBudget = 0;


            for (var i=0; i<rollupItems.length; i++){
                var item = rollupItems[i];
                item.processChildren();
                preliminaryBudget += item._rollupDataPreliminaryBudget;
                rollupDataTotal += item.getTotalCostRollup() ;
                rollupDataActual +=  item.getActualCostRollup();
                rollupDataRemaining += item.getRemainingCostRollup();
                totalUnitsSum += item.__totalUnits || 0;
                actualUnitsSum += item.__actualUnits || 0;
                notEstimated = notEstimated && item._notEstimated;
            }

            this._rollupDataPreliminaryBudget = preliminaryBudget;
            this._notEstimated = notEstimated;
            this._rollupDataTotalCost = rollupDataTotal;
            this._rollupDataActualCost = rollupDataActual;
            this._rollupDataRemainingCost = rollupDataRemaining;
            this.__totalUnits = totalUnitsSum;
            this.__actualUnits = actualUnitsSum;
            this._rollupDataToolTip = this.getTooltip();
        }
    }
});
