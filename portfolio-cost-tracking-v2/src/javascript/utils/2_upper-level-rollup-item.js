Ext.define('CArABU.technicalservices.UpperLevelPortfolioRollupItem',{
    extend: 'CArABU.technicalservices.RollupItem',


    processChildren: function(){

        if (this.children && this.children.length > 0){
            var rollupDataTotal = 0,
                rollupDataActual = 0,
                rollupDataRemaining = 0,
                totalUnitsSum = 0,
                actualUnitsSum = 0,
                projectCosts = {},
                rollupItems = this.children || [],
                notEstimated = true;


            for (var i=0; i<rollupItems.length; i++){
                var item = rollupItems[i];
                item.processChildren();

                rollupDataTotal += item.getTotalCostRollup() ;
                rollupDataActual +=  item.getActualCostRollup();
                rollupDataRemaining += item.getRemainingCostRollup();
                totalUnitsSum += item.__totalUnits || 0;
                actualUnitsSum += item.__actualUnits || 0;
                projectCosts = Ext.merge(projectCosts, item.projectCosts || {});
                notEstimated = notEstimated && item._notEstimated;
            }

            this._notEstimated = notEstimated;
            this._rollupDataTotalCost = rollupDataTotal;
            this._rollupDataActualCost = rollupDataActual;
            this._rollupDataRemainingCost = rollupDataRemaining;
            this.projectCosts = projectCosts;
            this.__totalUnits = totalUnitsSum;
            this.__actualUnits = actualUnitsSum;
            this._rollupDataToolTip = this.getTooltip();
        }
    }
});
