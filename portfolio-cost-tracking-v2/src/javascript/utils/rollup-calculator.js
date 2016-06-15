(function() {
    var Ext = window.Ext4 || window.Ext;

    Ext.define('CArABU.technicalservices.RollupCalculator', {
        extend: 'Ext.Base',

        mixins: {
            observable: 'Ext.util.Observable'
        },

        rollupItems: undefined,

        constructor: function (config) {
            this.mixins.observable.constructor.call(this, config);
            this.rollupItems = {};
            this.portfolioItemType = config.portfolioItemType;
            this.projectCostDate = config.projectCostDate || new Date();
        },
        addRollupRecords: function(portfolioItemRecordHash, stories){
            var portfolioItemTypes = CArABU.technicalservices.PortfolioItemCostTrackingSettings.getPortfolioItemTypes();

            this.rootObjectIDs = [];
            for (var i=portfolioItemTypes.length -1; i >= 0; i--){
                var portfolioRecords = portfolioItemRecordHash[portfolioItemTypes[i]] || [];
                this._addPortfolioRecords(portfolioRecords);
            }

            this._addStories(stories);
            this._calculatePortfolioItemRollups();
        },
        getRollupData: function(record){
            if (!record){
                return null;
            }
            var objectID = record.ObjectID || record.get('ObjectID');
            return this.rollupItems[objectID] || null;
        },
        /**
         * Adds records needed to calculate the rollup data
         * @param records
         */
        _addPortfolioRecords: function(records){
            if (!records || records.length === 0){
                return;
            }

            var type = records[0].get('_type').toLowerCase(),
                rollupItemType = CArABU.technicalservices.PortfolioItemCostTrackingSettings.getRollupItemType(type),
                rootPortfolioItem = this.portfolioItemType.toLowerCase();

            if (rollupItemType){ //this is a portfolio item type
                for (var i=0; i<records.length; i++){
                    var r = records[i],
                        oid = r.get('ObjectID'),
                        parentObjectID = r.get('Parent') && r.get('Parent').ObjectID,
                        item = Ext.create(rollupItemType, r);

                    this.rollupItems[oid] = item;

                    if (parentObjectID && this.rollupItems[parentObjectID]){
                        this.rollupItems[parentObjectID].addChild(item);
                    }

                    if (type === rootPortfolioItem){
                        this.rootObjectIDs.push(oid);
                    }
                }
            }
        },

        _addStories: function(stories){
            var parents = [],
            //rollupItems = this.rollupItems,
                totalFn = CArABU.technicalservices.PortfolioItemCostTrackingSettings.getCalculationTypeSettings().totalUnitsForStoryFn,
                actualFn = CArABU.technicalservices.PortfolioItemCostTrackingSettings.getCalculationTypeSettings().actualUnitsForStoryFn;

            for(var i =0; i < stories.length; i++){
                var item = Ext.create('CArABU.technicalservices.UserStoryRollupItem', stories[i], totalFn, actualFn);

                this.rollupItems[item.ObjectID] = item;

                if (item.parent && this.rollupItems[item.parent]){
                    parents.push(item.parent);
                    this.rollupItems[item.parent].addChild(item);
                }
            }

        },

        _calculatePortfolioItemRollups: function(){
            for (var i=0; i<this.rootObjectIDs.length; i++){
                var item = this.rollupItems[this.rootObjectIDs[i]];
                if (item && item._type.toLowerCase() === this.portfolioItemType.toLowerCase()){
                    item.processChildren();
                }

            }
        },
        updateModels: function(records){
            records = records || [];
            var unloadedModels = [],
                rollupItems = this.rollupItems;

            for (var i=0; i<records.length; i++){
                var r = records[i],
                    rollupItem = rollupItems[r.get('ObjectID')] || null;
                if (rollupItem){
                    r.set('_rollupData', rollupItem);
                } else {
                    unloadedModels.push(r);
                }
            }
            return unloadedModels;
        },
        destroy: function(){
            this.rollupItems = {};
        }
    });
}) ();