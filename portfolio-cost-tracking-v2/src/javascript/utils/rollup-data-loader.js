(function() {
    var Ext = window.Ext4 || window.Ext;

    ///**
    // * Class to load lots of data and update as status is made.
    // */
    Ext.define('CArABU.technicalservices.RollupDataLoader',{

        storyModelName: 'hierarchicalrequirement',

        mixins: {
            observable: 'Ext.util.Observable'
        },

        model: undefined,
        filters: undefined,
        fetch: undefined,

        maxParallelCalls: 6,
        maxListSize: 50,

        constructor: function (config) {
            this.mixins.observable.constructor.call(this, config);
            this.portfolioItemTypes = config.portfolioItemTypes || [];
        },
        loadTree: function(config){
            this.rootConfig = config;
            this.additionalFetch = config.fetch;
            this.load(config.model);
        },
        loadDescendants: function(rootRecords, additionalFetch){
            this.rootRecords = rootRecords;
            this.additionalFetch = additionalFetch || [];
            if (!rootRecords || rootRecords.length === 0){
                this.fireEvent('loaderror', "No root records to load descendents for.");
                return;
            }
            var model = this.getChildPortfolioItemType(rootRecords[0].get('_type'));
            this.load(model);
        },

        load: function(model){

            if (this.portfolioItemTypes.length === 0){
                this.fireEvent('loaderror', "Portfolio Item Types not initialized.");
                return;
            }

            this.storyFetch = CArABU.technicalservices.PortfolioItemCostTrackingSettings.getStoryFetch(this.additionalFetch);
            this.portfolioItemFetch = CArABU.technicalservices.PortfolioItemCostTrackingSettings.getPortfolioItemFetch(this.additionalFetch);

            var idx = _.indexOf(this.portfolioItemTypes, model.toLowerCase());
            var fns = [];

            for (var i=idx; i>=0; i--){
                fns.push(this.fetchPortfolioItems);
            }
            fns.push(this.fetchUserStories);
            this.recordsHash = {};

            Deft.Chain.pipeline(fns, this).then({
                success: function(stories){
                    this.fireEvent('rollupdataloaded', this.recordsHash, _.flatten(stories));
                },
                failure: function(msg){
                    this.fireEvent('loaderror', msg);
                },
                scope: this
            });
        },
        fetchRoot: function(){
            this.fireEvent('statusupdate', "Loading artifacts");
            var config = this.rootConfig || {};
            config.fetch = config.fetch.concat(this.getRequiredFetchFields(config.model));

            return this.fetchWsapiRecordsWithPaging(config);
        },
        getChildPortfolioItemType: function(type){
            var idx = _.indexOf(this.portfolioItemTypes, type.toLowerCase());
            if (idx > 0){
                return this.portfolioItemTypes[idx-1];
            }
            return this.storyModelName;
        },
        fetchPortfolioItems: function(parentRecords){
            parentRecords = parentRecords || this.rootRecords;
            if (!parentRecords || parentRecords.length === 0){
                return this.fetchRoot();
            }
            parentRecords = _.flatten(parentRecords);

            var parentType = parentRecords[0].get('_type');
            this.recordsHash[parentType] = parentRecords;

            var type = this.getChildPortfolioItemType(parentType),
                fetch = this.portfolioItemFetch.concat(this.getRequiredFetchFields(type)),
                chunks = this._getChunks(parentRecords, 'Children', 'Count');

            return this.fetchChunks(type, fetch, chunks, "Parent.ObjectID", Ext.String.format("Please Wait... Loading Children for {0} Portfolio Items", parentRecords.length));
        },
        _getChunks: function(parentRecords, countField, countFieldAttribute){
            var chunks = [],
                childCount = 0,
                maxListSize = this.maxListSize,
            //childCountTarget = 200,
                idx = 0;

            chunks[idx] = [];
            _.each(parentRecords, function(r){
                var count = r.get(countField);
                if (countFieldAttribute && count){
                    count = count[countFieldAttribute];
                }
                if (count > 0){
                    if (chunks[idx].length >= maxListSize){ //childCount + count > childCountTarget ||
                        idx++;
                        chunks[idx] = [];
                        childCount = 0;
                    }
                    childCount += count;
                    chunks[idx].push(r.get('ObjectID'));
                }
            });
            return chunks;
        },
        fetchUserStories: function(parentRecords){
            parentRecords = parentRecords || this.rootRecords;
            if (!parentRecords || parentRecords.length === 0){
                return this.fetchRoot();
            }
            parentRecords = _.flatten(parentRecords);

            var parentType = parentRecords[0].get('_type');
            this.recordsHash[parentType] = parentRecords;

            var type = this.storyModelName,
                fetch = this.storyFetch.concat(this.getRequiredFetchFields(type)),
                chunks = this._getChunks(parentRecords, 'UserStories','Count'),
                featureParentName = this.featureName + ".ObjectID";

            return this.fetchChunks(type, fetch, chunks, featureParentName, Ext.String.format("Please Wait... Loading User Stories for {0} Portfolio Items", parentRecords.length));
        },
        fetchChunks: function(type, fetch, chunks, chunkProperty, statusString){

            if (chunks && chunks.length > 0 && chunks[0].length===0){
                return Promise.resolve([]);
            }

            this.fireEvent('statusupdate', statusString);

            var promises = [];
            _.each(chunks, function(c){
                var filters = _.map(c, function(ids){ return {property: chunkProperty, value: ids }; }),
                    config = {
                        model: type,
                        fetch: fetch,
                        filters: Rally.data.wsapi.Filter.or(filters)
                    };
                promises.push(function(){ return this.fetchWsapiRecords(config); });
            });

            return this.throttle(promises, this.maxParallelCalls, this);
        },
        fetchWsapiRecords: function(config){
            var deferred = Ext.create('Deft.Deferred');

            Ext.create('Rally.data.wsapi.Store',{
                model: config.model,
                fetch: config.fetch,
                filters: config.filters,
                limit: 'Infinity'
            }).load({
                callback: function(records, operation){
                    if (operation.wasSuccessful()){
                        deferred.resolve(records);
                    } else {
                        deferred.reject('fetchWsapiRecords error: ' + operation.error.errors.join(','));
                    }
                },
                scope: this
            });
            return deferred;
        },
        getRequiredFetchFields: function(type){

            if (type.toLowerCase() === this.storyModelName){
                return ['Parent','PortfolioItem','ObjectID'];
            }
            return  ['Children', 'UserStories','Parent','ObjectID'];
        },
        throttle: function (fns, maxParallelCalls, scope) {

            if (maxParallelCalls <= 0 || fns.length < maxParallelCalls){
                return Deft.promise.Chain.parallel(fns, scope);
            }


            var parallelFns = [],
                fnChunks = [],
                idx = -1;

            for (var i = 0; i < fns.length; i++) {
                if (i % maxParallelCalls === 0) {
                    idx++;
                    fnChunks[idx] = [];
                }
                fnChunks[idx].push(fns[i]);
            }

            _.each(fnChunks, function (chunk) {
                parallelFns.push(function () {
                    return Deft.promise.Chain.parallel(chunk, scope);
                });
            });

            return Deft.Promise.reduce(parallelFns, function(groupResults, fnGroup) {
                return Deft.Promise.when(fnGroup.call(scope)).then(function(results) {
                    groupResults = groupResults.concat(results || []);
                    return groupResults;
                });
            }, []);
        },
        fetchWsapiCount: function(model, query_filters){
            var deferred = Ext.create('Deft.Deferred');

            Ext.create('Rally.data.wsapi.Store',{
                model: model,
                fetch: ['ObjectID'],
                filters: query_filters,
                limit: 1,
                pageSize: 1
            }).load({
                callback: function(records, operation, success){
                    if (success){
                        deferred.resolve(operation.resultSet.totalRecords);
                    } else {
                        deferred.reject(Ext.String.format("Error getting {0} count for {1}: {2}", model, query_filters.toString(), operation.error.errors.join(',')));
                    }
                }
            });
            return deferred;
        },
        fetchWsapiRecordsWithPaging: function(config){
            var deferred = Ext.create('Deft.Deferred'),
                promises = [],
                me = this;

            this.fetchWsapiCount(config.model, config.filters).then({
                success: function(totalCount){
                    var store = Ext.create('Rally.data.wsapi.Store',{
                            model: config.model,
                            fetch: config.fetch,
                            filters: config.filters,
                            pageSize: 200
                        }),
                        totalPages = Math.ceil(totalCount/200);

                    var pages = _.range(1,totalPages+1,1);

                    this.fireEvent('statusupdate',Ext.String.format(config.statusDisplayString || "Loading {0} artifacts", totalCount));

                    _.each(pages, function(page){
                        promises.push(function () {return me.loadStorePage(page, store);});
                    });

                    this.throttle(promises, 12, me).then({
                        success: function(results){
                            deferred.resolve(_.flatten(results));
                        },
                        failure: function(msg){
                            deferred.reject(msg);
                        },
                        scope: me
                    });
                },
                failure: function(msg){
                    deferred.reject(msg);
                },
                scope: me
            });
            return deferred;
        },
        loadStorePage: function(pageNum, store){
            var deferred = Ext.create('Deft.Deferred');

            store.loadPage(pageNum, {
                callback: function(records, operation){
                    if (operation.wasSuccessful()){
                        deferred.resolve(records);
                    } else {
                        deferred.reject('loadStorePage error: ' + operation.error.errors.join(','));
                    }
                },
                scope: this
            });

            return deferred;
        }

    });
})();