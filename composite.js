/**
 * @class Composite
 * Core module for Composite components
 * Copyright 2012-2013 by Simon Giles. All rights reserved.
 * Released under the MIT license.  For details see: https://github.com/knotsocial/composite/license.txt
 * 
 * Composite is a Titanium Appcelerator CommonJS module for adding a domain model and domain eventing to 
 * fill in the missing part of Alloy's Model View Controller.  For more info see
 * https://github.com/knotsocial/composite
 */

Ti.API.trace("START:knot/composite.js");

module.exports = (function(){ 
	
	// private variables ------------------------------------------------------
	
	var Composite = {};
	
	// alloy injections -------------------------------------------------------
	
	Ti.API.trace("Injecting Composite...");
	
	var oldM = Alloy.M;	
	Alloy.M = function(name, modelDesc, migrations){
//		Ti.API.trace("wrapped Alloy.M function called");
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
//		Ti.API.trace("wrapped Alloy.C function called");
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

	Ti.API.trace("Composite injected");
	
	// event stream -----------------------------------------------------------
	
	var _EVENT_STREAM = "CES",
		_ALL_HANDLER = "all",
		STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg,
		GET_PARAMS = /([^\s,]+)/g,
		_eventSources = { };  
	  
	Composite.register = function( eventSignatures ){
		// iterate throught the event siguatures
		for( var name in eventSignatures){
			// get the function for the event
			var fn = eventSignatures[name];
			// make sure it's a function
			if (typeof fn == 'function') {
				Ti.API.trace( 'Building event function '+name)
				// strip off comments from the function definition (not that there should be any)
				var fnText = fn.toString().replace(STRIP_COMMENTS, '');
				// extract the function parameters
				var fnParams = fnText.slice(fnText.indexOf('(')+1, fnText.indexOf(')')).match(GET_PARAMS);
				// write the function code 
				var newCode = ['(function('];
				// if there are function arguments
				if (fnParams!==null){
					// function arguments
					newCode.push( fnParams.join(',') );
				}
				// close arguments, 
				newCode.push('){');
				// add code to calculate the event key
				// which we get by invoking eventSignatures fn with the arguments
				newCode.push('var k=eventSignatures.'+name+'(');
				// if there are function arguments
				if (fnParams!==null){
					// function arguments
					newCode.push( fnParams.join(',') );
				}
				// close the arguments
				newCode.push(');');
				// if we didn't get a key then set it to null
				newCode.push('if (typeof k==="undefined"){k=null}');
				// add trace logging for firing the event
				newCode.push('Ti.API.trace("> > FIRING DOMAIN EVENT:'+name+' key:"+k);')
				// add function body to publish the named event
				newCode.push('_publish(');
				// with the eventName parameter
				newCode.push('"'+name+'"');
				// and the eventKey parameter, 
				newCode.push(',k');
				// if there are function arguments
				if (fnParams!==null){
					// we encode them as the eventParams object
					newCode.push(',{');
					// code to serialize the function parameters into the event object
					var first = true;
					fnParams.forEach(function(param){
						if (!first){ newCode.push(',') } else { first=false }
						newCode.push(param+':'+param)
					});
					// close the object
					newCode.push('}');
				}
				// close the code
				newCode.push(')})');
				var codeStr = newCode.join('');
				Ti.API.trace('event function code: '+codeStr)
				// update the _eventSources
				_eventSources[name]=eval( codeStr );
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
		if (typeof eventParams!=="undefined"){
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
			throw "Unsupported Composite handler type "+typeof handler;
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
	
	Composite.initialize = function(){
		Ti.App.addEventListener(_EVENT_STREAM,_onCompositeEvent)
	}
	
	Composite.finalize = function(){
		Ti.App.removeEventListener(_EVENT_STREAM,_onCompositeEvent);
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
		var prefix = _getCNPrefix(cn);
		var id = data.id;
		return prefix+id; 
	}
	
	// cn = collection name
	// data = model "row" data
	// note: data must have an id property
	function _getEventKey( cn, data ){ 
		var key = _getModelEventCacheKey(cn,data) 
		return "DATA_"+key;
	}
	
	
	// comppsote domain event signatures --------------------------------------
	
	// the event siguatures must return a globally unique event key for the object the event inolves
	// in this case all three events reference the same obect, and so return the same event key
	// this allows us to keep only the latest event for the object when serializing	
	var _compositeEventSignatures = {
		DATA_Create: function( cn, data, silent ){ return _getEventKey(cn,data) },
		DATA_Update: function( cn, data, silent ){ return _getEventKey(cn,data) },
		DATA_Delete: function( cn, data, silent ){ return _getEventKey(cn,data) }
	}
		
	// register the composite domain event signatures -------------------------
	
	Composite.register(_compositeEventSignatures);
	
	// event handlers ---------------------------------------------------------
		
	// these even handlers update the model event cache to reflect DATA_ events
	var _compositeEventHandlers = {
		// called when a new record is created
		DATA_Create: function( cn, data, silent ){ 
			// create model event cache entry
			// if the data doesn't have an id 
			if (!data.id){
				// allocate a new id
            	data.id = _getNewModelID(cn);
			}
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
		},
		DATA_Delete: function( cn, data, silent ){ 
			debugger;
			if (data.id){
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
				// todo: delete all cn data
			}
		}
	}
	
	// -- subscribe knot domain event handlers ------------------------------------
		
	Composite.subscribe( _compositeEventHandlers );
	
	// backbone methods -----------------------------------------------------------
	
	function _sync(method, model, options) {
		Ti.API.trace("Composite._sync( "+method+","+JSON.stringify(model)+","+JSON.stringify(options)+")");
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
	            var attrObj = {};
	            attrObj[model.idAttribute] = model.id;
	            // model.set(model.idAttribute, model.id);
	            // make it silent so it doesn't fire an unnecessary
				// Backbone change event
				model.set(attrObj, {silent:true});
	            resp = model.toJSON();
	            // trigger a DATA_Create event for this new model row
	            Composite.publish.DATA_Create(cn,resp,true);
	            break;
	        case "update":
	            // Update the model in persistent storage and return the updated model upon success
	            resp = model.toJSON();
	            // trigger a DATA_Update event for this new model row
	            Composite.publish.DATA_Update(cn,resp,true);
	            break;
	        case "delete":
	            // Remove a model from persistent storage and return the removed model upon success
	            debugger;
	            resp = model.toJSON();
	            // trigger a DATA_Delete event for this new model row
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
	
	Composite.initialize();
	
	// public interface -------------------------------------------------------
	
	return Composite;
	
}())
