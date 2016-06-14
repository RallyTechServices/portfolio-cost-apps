Ext.define('CArABU.technicalservices.PortfolioItemCostTrackingSettings', {
    singleton: true,

    /**
     * App Settings
     */
    selectedCalculationType: undefined,
    /**
     * Currency display settings to pass into the Ext.util.Format currency function
     */
    currencySign: '$',
    currencyPrecision: 0,
    currencyEnd: false,

    normalizedCostPerUnit: 1,
    projectCostPerUnit: {},

    preliminaryBudgetField: 'PreliminaryEstimate',
    /**
     * App configurations
     */

    tooltipActualCost: 'actualcost ',
    tooltipTotalCost: 'totalcost',
    tooltipRemainingCost: 'remaining cost',
    tooltipPreliminaryBudget: 'preliminary budget',

    calculationTypes: {
        points: {
            key: 'points',
            label: 'Based on Story Points',
            displayName: 'Story Points',
            defaultColumns: ['Name', 'Project', 'PlanEstimate', 'LeafStoryPlanEstimateTotal','AcceptedLeafStoryPlanEstimateTotal'],
            requiredStoryFetch: ['ScheduleState','PortfolioItem','PlanEstimate'],
            requiredTaskFetch: [],
            tooltips: {
                _rollupDataActualCost: 'Actual Cost is the sum of the Accepted Story Plan Estimates <i>for all stories in scope</i> * Cost Per Unit for the project that the top level story resides in.',
                _rollupDataRemainingCost: 'Remaining Cost is the Total Projected Cost - Actual Cost',
                _rollupDataTotalCost: 'Total Projected Cost is the sum of the Plan Estimate <i>for each story in scope</i>* Cost Per Unit for the project that the top level story resides in.  <br/><br/> If a Portfolio Item does not have any estimated stories and the Preliminary Budget is greater than the Portfolio Item\'s Actual Cost, then the Preliminary Budget will be used for the Total Projected Cost.',
                _rollupDataPreliminaryBudget: 'The prelimary budget will be calculated by multiplying the value of the selected field by the Cost per Unit for the project of the portfolio item. <br/><br/> Note that for portfolio item types beyond the lowest level, this is calculated from the preliminary estimate of the portfolio item, not from the sum of the portfolio item children.  If the selected field value is null, then -- will be displayed.'
            },
            actualUnitsForStoryFn: function(data){
                if (data && data.PlanEstimate && Ext.Array.contains(CArABU.technicalservices.PortfolioItemCostTrackingSettings.completedScheduleStates, data.ScheduleState)) {
                    return data && data.PlanEstimate || 0;
                }
                return 0;
            },
            totalUnitsForStoryFn: function(data){
                return data && data.PlanEstimate || 0;
            }
        },
        taskHours: {
            key: 'taskHours',
            displayName: 'Task Actuals',
            label: 'Based on Task Actuals',
            defaultColumns: ['Name','Project'],
            requiredStoryFetch: ['ScheduleState','PortfolioItem','TaskEstimateTotal','TaskActualTotal','TaskRemainingTotal'],
            requiredTaskFetch: ['ToDo','Actuals'],
            tooltips: {
                _rollupDataActualCost: 'Actual Cost is the sum of the Task Actuals <i>for all stories in scope</i> * Cost Per Unit for the project that the top level story resides in.',
                _rollupDataRemainingCost: 'Remaining Cost is the sum of the ToDo <i>for all stories in scope</i> * Cost Per Unit for the project that the top level story resides in.',
                _rollupDataTotalCost: 'Total Projected Cost is the sum of the Task Estimate Total <i>for each story in scope</i> * Cost Per Unit for the project that the top level story resides in.  <br/><br/> If a Portfolio Item does not have any estimated stories and the Preliminary Budget is greater than the Portfolio Item\'s Actual Cost, then the Preliminary Budget will be used for the Total Projected Cost.',
                _rollupDataPreliminaryBudget: 'The prelimary budget will be calculated by multiplying the value of the selected field by the Cost per Unit for the project of the portfolio item. <br/><br/> Note that for portfolio item types beyond the lowest level, this is calculated from the preliminary estimate of the portfolio item, not from the sum of the portfolio item children.  If the selected field value is null, then -- will be displayed.'
            },
            actualUnitsForStoryFn: function(data){ return data.TaskActualTotal || 0; },
            totalUnitsForStoryFn: function(data){
                return (data && data.TaskActualTotal || 0) + (data && data.TaskRemainingTotal || 0);
            },
            actualUnitsForTaskFn: function(data){
                return data && data.Actuals || 0;
            },
            totalUnitsForTaskFn: function(data){
                return (data && data.ToDo || 0) + (data && data.Actuals || 0);
            }
        },
        timesheets: {
            key: 'timesheets',
            displayName: 'Time Spent',
            label: 'Based on Timesheets',
            defaultColumns: ['Name','Project'],
            requiredStoryFetch: [],
            requiredTaskFetch: [],
            disabled: true,
            actualUnitsForStoryFn: function(data){ return 0; },
            actualUnitsForTaskFn: function(data){ return 0; },
            totalUnitsForStoryFn: function(data){  return 0; },
            totalUnitsForTaskFn: function(data){  return 0; }
        }
    },

    /**
     * Required fetch fields in addition to what the Tree might fetch.  We need these for the rollup data fetch lists and for group by Release
     */
    requiredPortfolioItemFetch: ['UserStories'],
    requiredFetch: ['ObjectID','FormattedID','Project','Parent','Children','Release','Name'],

    notAvailableText: '--',

    completedScheduleStates: [],

    portfolioItemTypes: [],

    currencyData: [
        {name: "US Dollars", value: "$"},
        {name: "Euro", value: "&#128;"},
        {name: "Japanese Yen", value: "&#165;"},
        {name: "Brazilian Real", value: "R$"},
        {name: "South African Rand", value: "R"}
    ],
    getFeatureName: function(){
        return this.portfolioItemTypes[0].name.replace(/\s/g, '');
    },
    getHeaderTooltip: function(field){
        var settings = CArABU.technicalservices.PortfolioItemCostTrackingSettings.getCalculationTypeSettings();
        return settings.tooltips[field] || null;

    },
    setCalculationType: function(type){
        //Check that actuals is on, and warn user if it is not.
        if (type === 'taskHours'){
            Rally.data.ModelFactory.getModel({
                type: 'task',
                success: function(model){
                    var field = model.getField('Actuals');
                    if (field && field.hidden){
                        Rally.ui.notify.Notifier.showWarning({message: 'The Task Actuals field is not visible in the current project.  As a result, Task Actuals values may be 0.'});
                    }
                }
            });
        }


        if (CArABU.technicalservices.PortfolioItemCostTrackingSettings.calculationTypes[type]){
            CArABU.technicalservices.PortfolioItemCostTrackingSettings.selectedCalculationType = type;
        } else {
            CArABU.technicalservices.PortfolioItemCostTrackingSettings.selectedCalculationType = 'points';
        }
    },
    /**
     * getPortfolioItemTypeLevel
     * @param modelName
     * Given a model name, this function returns the level of portfolio item the model name is:
     *  0 = Lowest Level (Feature)
     *  1 = Second Level (e.g. Initiative)
     *  ...
     *  return -1 if the modelName is not a portfolio item type
     */
    getPortfolioItemTypeLevel: function(modelName){
        var idx = _.indexOf(CArABU.technicalservices.PortfolioItemCostTrackingSettings.getPortfolioItemTypes(), modelName.toLowerCase());
        return idx;
    },
    getRollupItemType: function(type){
        var idx = _.indexOf(CArABU.technicalservices.PortfolioItemCostTrackingSettings.getPortfolioItemTypes(), type.toLowerCase());
        if (idx > 0){
            return 'CArABU.technicalservices.UpperLevelPortfolioRollupItem';
        }
        if (idx === 0){
            return 'CArABU.technicalservices.LowestLevelPortfolioRollupItem';
        }
        return null;
    },
    getPortfolioItemTypes: function(){
        return _.map( this.portfolioItemTypes, function(p){ return p.typePath.toLowerCase(); });
    },
    getPortfolioItemTypeObjects: function(){
        return this.portfolioItemTypes;
    },
    getTypePathDisplayName: function(piTypePath){
        if (piTypePath.toLowerCase() === 'hierarchicalrequirement'){
            return 'User Story';
        }

        var piDisplayName = '';

        Ext.Array.each(this.portfolioItemTypes, function(p){
            if (p.typePath.toLowerCase() === piTypePath.toLowerCase()){
                piDisplayName = p.name;
                return false;
            }
        });
        return piDisplayName;
    },
    getCalculationTypeSettings: function(){
        return CArABU.technicalservices.PortfolioItemCostTrackingSettings.calculationTypes[CArABU.technicalservices.PortfolioItemCostTrackingSettings.selectedCalculationType] || CArABU.technicalservices.PortfolioItemCostTrackingSettings.calculationTypes.points;
    },
    getCalculationTypeDisplayName: function(){
        return CArABU.technicalservices.PortfolioItemCostTrackingSettings.getCalculationTypeSettings().displayName || 'Unknown';
    },
    formatCost: function(cost){
        return Ext.util.Format.currency(cost,
            CArABU.technicalservices.PortfolioItemCostTrackingSettings.currencySign,
            CArABU.technicalservices.PortfolioItemCostTrackingSettings.currencyPrecision,
            CArABU.technicalservices.PortfolioItemCostTrackingSettings.currencyEnd);
    },
    getCostPerUnit: function(project_ref, asOfDate){

        if (!asOfDate){
            asOfDate = Date.now();
        }
        //ToDo, get the cost per unit during the asOf date...

        return CArABU.technicalservices.PortfolioItemCostTrackingSettings.projectCostPerUnit[project_ref] || CArABU.technicalservices.PortfolioItemCostTrackingSettings.normalizedCostPerUnit;
    },

    isProjectUsingNormalizedCost: function(project_ref){
        if (CArABU.technicalservices.PortfolioItemCostTrackingSettings.projectCostPerUnit[project_ref]){
            return false;
        }
        return true;
    },
    /**
     * This function returns all the fields that we want to return for the tree. It is built depending on the settings for cost calculations so
     * that we know to include all necessary fields.
     * @param fetch
     * @returns {*}
     */
    getTreeFetch: function(fetch){
        if (!fetch){
            fetch = [];
        }


        return Ext.Array.merge(fetch, CArABU.technicalservices.PortfolioItemCostTrackingSettings.getStoryFetch(),
            CArABU.technicalservices.PortfolioItemCostTrackingSettings.getPortfolioItemFetch(),
            (CArABU.technicalservices.PortfolioItemCostTrackingSettings.getCalculationTypeSettings().requiredTaskFetch || []));

    },
    getStoryFetch: function(fetch){
        if (!fetch){
            fetch = [];
        }

        return Ext.Array.merge(fetch, CArABU.technicalservices.PortfolioItemCostTrackingSettings.requiredFetch,
            CArABU.technicalservices.PortfolioItemCostTrackingSettings.getCalculationTypeSettings().requiredStoryFetch);

    },
    getPortfolioItemFetch: function(fetch){
        if (!fetch){
            fetch = [];
        }

        return Ext.Array.merge(CArABU.technicalservices.PortfolioItemCostTrackingSettings.requiredFetch,
            CArABU.technicalservices.PortfolioItemCostTrackingSettings._getPreliminaryBudgetFields(),
            CArABU.technicalservices.PortfolioItemCostTrackingSettings.requiredPortfolioItemFetch);

    },
    _getPreliminaryBudgetFields: function(){
        var preliminaryBudgetFields = [CArABU.technicalservices.PortfolioItemCostTrackingSettings.preliminaryBudgetField];
        if (CArABU.technicalservices.PortfolioItemCostTrackingSettings.preliminaryBudgetField === "PreliminaryEstimate"){
            preliminaryBudgetFields.push('Value');
        }
        return preliminaryBudgetFields;
    },
    getFields: function(config) {

        var current_calculation_type = (config && config.selectedCalculationType) || 'points',
            current_project_costs = (config && config.projectCostPerUnit) || {};

        var currency_store = Ext.create('Rally.data.custom.Store', {
            data: CArABU.technicalservices.PortfolioItemCostTrackingSettings.currencyData
        });
        var labelWidth = 100;

        var cost_items = [];
        _.each(CArABU.technicalservices.PortfolioItemCostTrackingSettings.calculationTypes, function(obj, key){
            cost_items.push({
                boxLabel: obj.label || key,
                name: 'selectedCalculationType',
                inputValue: key,
                disabled: obj.disabled || false,
                checked: key === current_calculation_type
            });
        });

        return [{
            xtype: 'rallycombobox',
            name: 'currencySign',
            store: currency_store,
            displayField: 'name',
            valueField: 'value',
            fieldLabel:  'Currency',
            labelWidth: labelWidth,
            margin: '10 0 10 0'
        },{
            xtype: 'numberfieldcombobox',
            name: 'preliminaryBudgetField',
            fieldLabel: 'Calculate Preliminary Budget using',
            model: 'PortfolioItem',
            labelWidth: labelWidth,
            margin: '10 0 10 0'
        },{
            xtype: 'radiogroup',
            fieldLabel: 'Calculate Cost',
            columns: 1,
            vertical: true,
            labelWidth: labelWidth,
            margin: '10 0 10 0',
            items: cost_items
        },{
            xtype: 'rallytextfield',
            name: 'normalizedCostPerUnit',
            fieldLabel: 'Normalized Cost Per Unit',
            labelWidth: labelWidth,
            width: 200,
            value: config.normalizedCostPerUnit,
            margin: '25 0 0 0'
        },{
            xtype: 'costperprojectsettings',
            name: 'projectCostPerUnit',
            fieldLabel: 'Optionally define costs per unit for individual teams (exceptions to the normalized cost)',
            labelAlign: 'top',
            margin: '25 0 0 0',
            value: current_project_costs,
            readyEvent: 'ready'
        }];
    }
});