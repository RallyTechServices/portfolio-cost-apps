Ext.define('CArABU.technicalservices.DefectRollupItem', {
    extend: 'CArABU.technicalservices.RollupItem',
    constructor: function(record, totalFn, actualFn) {

        var data = record.data;
        if (record.getData && record.getData()){
            data = record.getData();
        }

        if (data){
            this.__totalUnits = totalFn(data);
            this.__actualUnits = actualFn(data);
            this._notEstimated = false;
            var costPerUnit =CArABU.technicalservices.PortfolioItemCostTrackingSettings.getCostPerUnit(data.Project._ref),
                acceptedCostPerUnit = costPerUnit;

            if (data.AcceptedDate){
                acceptedCostPerUnit = CArABU.technicalservices.PortfolioItemCostTrackingSettings.getCostPerUnit(data.Project._ref, data.AcceptedDate);
            }
            var featureName = CArABU.technicalservices.PortfolioItemCostTrackingSettings.getFeatureName();

            if(data.Requirement[featureName][CArABU.technicalservices.PortfolioItemCostTrackingSettings.expenseTypeField] == CArABU.technicalservices.PortfolioItemCostTrackingSettings.opExTypeValue ){
                this._rollupDataActualOpExCost = (this.__actualUnits * acceptedCostPerUnit) || 0;
                this._rollupDataRemainingOpExCost = Math.max((this.__totalUnits - this.__actualUnits),0) * costPerUnit;
                this._rollupDataTotalCost = this._rollupDataActualOpExCost + this._rollupDataRemainingOpExCost;  
            }else{
                this._rollupDataActualCost = (this.__actualUnits * acceptedCostPerUnit) || 0;
                this._rollupDataRemainingCost = Math.max((this.__totalUnits - this.__actualUnits),0) * costPerUnit;
                this._rollupDataTotalCost = this._rollupDataActualCost + this._rollupDataRemainingCost;
            }
            //this._rollupDataRemainingCost = this._rollupDataTotalCost - this._rollupDataActualCost;
            //this._rollupDataTotalCost = (this.__totalUnits * costPerUnit) || 0;

            this.parent = record.get('Requirement') && record.get('Requirement').ObjectID || null;

            this.objectID = data.ObjectID;

            this._rollupDataPreliminaryBudget = null;
            this._rollupDataToolTip = null;

            Ext.apply(this, data);
            this._buildToolTip();
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
        this._rollupDataRemainingCost += child._rollupDataRemainingCost;
        this._buildToolTip();
    },
    _buildToolTip: function(){
        if (this.__totalUnits > 0){
            var acceptedDate = "Accepted Date";
            if (this.AcceptedDate){
                acceptedDate = Rally.util.DateTime.format(this.AcceptedDate,'Y-m-d');
            }
            this._rollupDataToolTip = Ext.String.format('<b>Actual (Accepted) Units:</b> {0}<br/>' +
                                                        '<b>Total Units: </b> {2}<br/><br/>' +
                                                        '<b>Actual Cost</b><br/>{0} Accepted * Team Cost on {1}<br/><br/>' +
                                                        '<b>Remaining Cost</b><br/>({2} Total - {0} Accepted) * Current Team Cost<br/><br/>' +
                                                        '<b>Total Projected</b><br/>Actual Cost + Remaining Cost', this.__actualUnits, acceptedDate, this.__totalUnits);
        }
    }
});