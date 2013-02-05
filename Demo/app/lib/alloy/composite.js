/**
 * @class Composite
 * Core module for Composite components
 * Copyright 2012-2013 by Simon Giles. All rights reserved.
 * Released under the MIT license.  
 * For details see: https://github.com/knotsocial/composite/blob/master/LICENSE.txt
 * 
 * Composite is a Titanium Appcelerator CommonJS module for adding a domain model and domain eventing to 
 * fill in the missing part of Alloy's Model View Controller.  For more info see
 * https://github.com/knotsocial/composite
 */

module.exports = (function(){ 
	
	// private variables ------------------------------------------------------
	
	var Composite = {};
	
	// alloy injections -------------------------------------------------------
	
	var oldM = Alloy.M;	
	Alloy.M = function(name, modelDesc, migrations){
		var config = modelDesc.config;
	    var type = (config.adapter ? config.adapter.type : null) || 'localDefault';
	    if (type!=='composite'){
	    	return oldM(name,modelDesc,migrations);
	    }
	    var extendObj = {
			defaults: config.defaults,
	        sync: _sync
		};
		var extendClass = {};
		// note: beforeModelCreate went here
	    // Create the Model object
		var Model = Backbone.Model.extend(extendObj, extendClass);
		Model.prototype.config = config;
		// Extend the Model with extendModel(), if defined
		if (_.isFunction(modelDesc.extendModel)) {
			Model = modelDesc.extendModel(Model) || Model;
		}
		// note: afterModelCreate went here
		return Model;
	}
	
	var oldC = Alloy.C;
	Alloy.C = function(name, modelDesc, model) {
		var config = model.prototype.config; // modelDesc.config;
	    var type = (config.adapter ? config.adapter.type : null) || 'localDefault';
	    if (type!=='composite'){
	    	return oldC(name,modelDesc,model);
	    }
	    var extendObj = {
			model: model,
	        sync: _sync
		};
		var Collection = Backbone.Collection.extend(extendObj);
		Collection.prototype.config = config; // model.prototype.config;
		// note: afterCollectionCreate went here
		if (_.isFunction(modelDesc.extendCollection)) {
			Collection = modelDesc.extendCollection(Collection) || Collection;
		}
		return Collection;
	}

	// event stream -----------------------------------------------------------
	
	var _EVENT_STREAM = "CES",
		_ALL_HANDLER = "all",
		STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg,
		GET_PARAMS = /([^\s,]+)/g,
		_eventSources = { };  
		
	function _wrapEventFn( eventSignatures, name, fn ){
		// createa  new function, wrapping the event signature
		return _.wrap(fn,function(func){
			// strip off comments from the function definition (not that there should be any)
			var fnText = func.toString().replace(STRIP_COMMENTS, '');
			// extract the function parameter names
			var fnParams = fnText.slice(fnText.indexOf('(')+1, fnText.indexOf(')')).match(GET_PARAMS);
			// extract func parameter values from the arguments
			var fnParamValues = _.toArray(arguments).slice(1);
			// invoke the event signature key function, defaulting to null if there is no result
			var k=func.apply(eventSignatures,fnParamValues) || null;
			//Ti.API.trace("> > FIRING DOMAIN EVENT:"+name+" key:"+k+" parameters:"+JSON.stringify(fnParamValues));
			// if we have parameters
			if (fnParams!==null){
				// wrap the parameters up in object
				var data = _.object(fnParams,fnParamValues);
				// and invoke the _publish method passing it as the 3rd parameter
				_publish(name,k,data);
			} else {
				// otherwise just invoke the publish method
				_publish(name,k);
			}			
		});	
	}
	  
	Composite.register = function( eventSignatures ){
		// iterate throught the event siguatures
		for( var name in eventSignatures){
			// get the function for the event
			var fn = eventSignatures[name];
			// make sure it's a function
			if (_.isFunction(fn)){
				// add the wrapped function to the event sources
				_eventSources[name]=_wrapEventFn(eventSignatures,name,fn);				
			}
		}
	}
	
	// pushes an event out to subscribed event handlers
	// events take the form name:string, prop:{}
	function _publish( eventName, eventKey, eventParams ){
		// sadly we can't use the caller function name because it's "KrollCallback:x" sometimes
		// create an event object and set it's eventName 
		var e = { eventName:eventName, eventKey:eventKey };
		// if we have event parameters, add them to the event object
		if (!_.isUndefined(eventParams)){
			e.eventParams = eventParams;
		}
		// fire the event object as an app event (recieved by all contexts)
		Ti.App.fireEvent( _EVENT_STREAM, e );
	}
	
	// export the event sources
	Composite.publish = _eventSources;
	
	// list of subscribed object handlers
	var _eventHandlers = [];
	
	// calls the handler for the events
	// an object with an eventName(eventParams) function, in which case the function of the object is called
	// or an all(eventName,eventParams) function which is called for all objects
	Composite.subscribe = function( handler ){
		if (_.isObject(handler)){ // typeof handler === "object"){
			_eventHandlers.push(handler);
		} else {
			Ti.API.warn( "Unsupported Composite handler type "+typeof handler);
		}
	}
	
	Composite.unsubscribe = function(handler){
		if (_.isObject(handler)){ //typeof handler==="object"){
			var i = _eventHandlers.indexOf(handler);
			if (i!==-1){
				_eventHandlers.splice(i,1);
			}
		}
	}
	
	function _onCompositeEvent(e){
		// iterate the object event handlers
		_eventHandlers.forEach( function(obj){
			// check for matching function
			if (e.eventName in obj){
				var fn = obj[e.eventName];
				var params = _.values(e.eventParams);
				fn.apply(obj,params);
				// obj[e.eventName](_.values(e.eventParams));
			};
			if (_ALL_HANDLER in obj){
				var fn = obj[_ALL_HANDLER];
				var params = _.values(e.eventParams);
				fn.apply(obj,params);
				// obj[_ALL_HANDLER](e.eventName,e.eventParams);
			}
		});
	}
	
	// event stream sync ------------------------------------------------------

	// the model event cache contains all of the backbone model related events from the event stream
	// this event cache takes the form of an object with named properties which are the data in the form
	// { event_key: { data },... }
	// where event_key take the form collection_name+"_"+model.id
	// start with an empty cache
	var _modelEventCache = {};
	
	// stores the next ID for each model
	// this is updated as we load models from the event stream, 
	var _modelNextID = {};
	
	function _getNewModelID(cn){ 
		var result = _modelNextID[cn] || 1;
		_modelNextID[cn]=result+1;
		return result;
	}
	
	function _getCNPrefix(cn) { return cn+"_"; }
	
	function _getModelEventCacheKey(cn,data){ 
	    if (!data || !data.id){
	    	Ti.API.warn("Data collection "+cn+" data without id. "+JSON.stringify(data));
	    }
		return _getCNPrefix(cn) + data.id; 
	}
	
	// cn = collection name
	// data = model "row" data
	// note: data must have an id property
	function _getEventKey( cn, data ){ 
		return "DATA_"+_getModelEventCacheKey(cn,data) ;
	}
		
	// comppsote domain event signatures --------------------------------------
	
	// the event siguatures must return a globally unique event key for the object the event inolves
	// in this case all three events reference the same obect, and so return the same event key
	// this allows us to keep only the latest event for the object when serializing	
	var _compositeEventSignatures = {
		DATA_Create: function( cn, data, silent ){ 
			// ensure that we have a new id on all created models
			if (_.isUndefined(data.id)){ data.id = _getNewModelID(cn) };
			return _getEventKey(cn,data) 
		},
		DATA_Update: function( cn, data, silent ){ 
			if(_.isUndefined(data.id)){ 
				Ti.API.warn("Data update without id for collection "+cn+" data:"+JSON.stringify(data))
			}
			return _getEventKey(cn,data) 
		},
		DATA_Delete: function( cn, data, silent ){ 
			if(_.isUndefined(data.id)){ 
				Ti.API.warn("Data deletion without id for collection "+cn+" data:"+JSON.stringify(data))
			}
			return _getEventKey(cn,data) 
		}
	}
			
	// composite domain event handlers ----------------------------------------
		
	// these even handlers update the model event cache to reflect DATA_ events
	var _compositeEventHandlers = {
		// called when a new record is created
		DATA_Create: function( cn, data, silent ){ 
			// create model event cache entry
			// ensure that we have a new id on all created models
			if (_.isUndefined(data.id)){ data.id = _getNewModelID(cn) };
			// get the model event cache key
			var key = _getModelEventCacheKey(cn,data);
			// cache the data with the key
			_modelEventCache[key] = data;
			// if this model isn't coming via the _sync method 
			if (!silent){
				// then it needs to be added to the appropriate alloy collection
            	// get the collection
            	var collection = Alloy.Collections[cn] || Alloy.createCollection(cn);
            	// add the object
            	// note: this triggers backbone events which will update the Alloy ui
            	collection.add([data]);
            }
		},
		// called when a row is updated
		DATA_Update: function( cn, data, silent ){	
			if (!_.isUndefined(data.id)){
				// update model event cache entry
				// get the model event cache key
				var key = _getModelEventCacheKey(cn,data);
				// update the cached data with the key
				_modelEventCache[key] = data;
				// if this model isn't coming via the _sync method 
				if (!silent){
					// then it needs to be added to the appropriate alloy collection
	            	// get the collection
	            	var collection = Alloy.Collections[cn] || Alloy.createCollection(cn);
	            	// get the model
	            	var model = collection.get(data.id);
	            	// update the object
	            	// note: this triggers backbone events which will update the Alloy ui
	            	model.set(data);
	            }
	            
			} else {
				Ti.API.warn("Data update without id for collection "+cn+" data:"+JSON.stringify(data));
			}
		},
		DATA_Delete: function( cn, data, silent ){ 
			if (!_.isUndefined(data.id)){
				// delete model event cache entry
				// get the model event cache key
				var key = _getModelEventCacheKey(cn,data);
				// delete the cached data with the key
				delete _modelEventCache[key];
				// if this model isn't coming via the _sync method 
				if (!silent){
					// then it needs to be added to the appropriate alloy collection
	            	// get the collection
	            	var collection = Alloy.Collections[cn] || Alloy.createCollection(cn);
	            	// delete the object
	            	// note: this triggers backbone events which will update the Alloy ui
	            	collection.remove([data]);
	            }
			} else {
				// TODO: delete all cn data in response to Collection.reset   ???
				Ti.API.warn("Data deletion without id for collection "+cn+" data:"+JSON.stringify(data));
			}
		}
	}
		
	// backbone methods -----------------------------------------------------------
	
	function _sync(method, model, options) {
		// Ti.API.trace("Composite._sync( "+method+","+JSON.stringify(model)+","+JSON.stringify(options)+")");
		var cn =  model.config.adapter.collection_name;
	    var resp; // sync results
	
	    switch (method) {
	        case "read":
	            if (model.id) {
	                // Find and return a specific model as a JSON object
	                // resp = {"foo":"1","id":"1",...};
	                resp = _modelEventCache[_getModelEventCacheKey(cn,model)];
	            }
	            else {
	                // Return the entire collection as an array of JSON objects
	                // resp = [{"foo":"1","id":"1",...}...];
					resp = [];
					var cnPrefix = _getCNPrefix(cn);
					_.each(_modelEventCache, function(data,cn){ 
						if (cn.substring(0,cnPrefix.length)===cnPrefix){
						// if (cn.startsWith(cnPrefix)){ 
							resp.push(data) 
						} 
					});
	            }
	            break;
	        case "create":
	            // Add the model to persistent storage and return the model upon success
	            // Assign a unique value (integer or UUID) to model.id and model.attribute.id if needed
	            model.id || (model.id = _getNewModelID(cn));
	            // note: instead of
	            // model.set(model.idAttribute, model.id);
	            // make it silent so it doesn't fire an unnecessary
				// Backbone change event
	            var attrObj = {};
	            attrObj[model.idAttribute] = model.id;
				model.set(attrObj, {silent:true});
				// get the response object
	            resp = model.toJSON();
	            // trigger a DATA_Create event for this new model
	            Composite.publish.DATA_Create(cn,resp,true);
	            break;
	        case "update":
	            // Update the model in persistent storage and return the updated model upon success
				// get the response object
	            resp = model.toJSON();
	            // trigger a DATA_Update event for this model
	            Composite.publish.DATA_Update(cn,resp,true);
	            break;
	        case "delete":
	            // Remove a model from persistent storage and return the removed model upon success
				// get the response object
	            resp = model.toJSON();
	            // trigger a DATA_Delete event for this model
	            Composite.publish.DATA_Delete(cn,resp,true);
	            break;
	    }
	
	    if (resp) {
	        // Return sync results
	        options.success(resp);
	    } else {
	        options.error("Record not found");
	    }
	};

/*	
	module.exports.beforeModelCreate = function(config) {
	    config = config || {};
	    // Perform some pre-checks (as an example)
	    return config;
	};
	
	
	module.exports.afterModelCreate = function(Model) {
	    Model = Model || {};
		// Model.prototype.config.Model = Model; // needed for fetch operations to initialize the collection from persistent store	    
	    // Set up the persistent storage device, apply migrations or preload data (as examples)
	};
*/
	
	// initialize the event listener ------------------------------------------
	
	Composite.initialize = function( enableSyncAdapter ){
		Ti.App.addEventListener(_EVENT_STREAM,_onCompositeEvent);
		// if composite event stream sync adapters should be enabled
		if (enableSyncAdapter){
			// register the composite domain event signatures
			Composite.register(_compositeEventSignatures);
			// subscribe composite domain event handlers
			Composite.subscribe( _compositeEventHandlers );
		}
	}
	
	Composite.finalize = function(){
		Ti.App.removeEventListener(_EVENT_STREAM,_onCompositeEvent);
		// clean up variables
		delete _eventSources; _eventSources = {};
		delete _modelEventCache; _modelEventCache = {};
		delete _modelNextID; _modelNextID = {};
		_eventHandlers = [];
	}
	
	// public interface -------------------------------------------------------
	
	return Composite;
	
}())