/**
 * @class Composite
 * Core module for Composite domain model eventing components
 * Copyright 2012-2013 by Simon Giles. All rights reserved.
 * Released under the MIT license.
 * For details see: https://github.com/knotsocial/composite/blob/master/LICENSE.txt
 *
 * Composite is a Titanium Appcelerator CommonJS module for adding a domain model and domain eventing to
 * fill in the missing part of Alloy's Model View Controller.  For more info see
 * https://github.com/knotsocial/composite
 */

// Composite requires the UnderscoreJS library
var _ = require('/alloy/underscore')._;

module.exports = ( function() {

	// private variables ------------------------------------------------------

	var Composite = {};

	// alloy injections -------------------------------------------------------

	function _alloyInjection() {
		var oldM = Alloy.M;
		Alloy.M = function(name, modelDesc, migrations) {
			var config = modelDesc.config;
			var type = (config.adapter ? config.adapter.type : null) || 'localDefault';
			if (type !== 'composite') {
				return oldM(name, modelDesc, migrations);
			}
			var extendObj = {
				defaults : config.defaults,
				sync : _sync
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
			var config = model.prototype.config;
			// modelDesc.config;
			var type = (config.adapter ? config.adapter.type : null) || 'localDefault';
			if (type !== 'composite') {
				return oldC(name, modelDesc, model);
			}
			var extendObj = {
				model : model,
				sync : _sync
			};
			var Collection = Backbone.Collection.extend(extendObj);
			Collection.prototype.config = config;
			// model.prototype.config;
			// note: afterCollectionCreate went here
			if (_.isFunction(modelDesc.extendCollection)) {
				Collection = modelDesc.extendCollection(Collection) || Collection;
			}
			return Collection;
		}
	}
	
	if (Alloy!==null){
		_alloyInjection();
	}
	// event stream -----------------------------------------------------------

	var _EVENT_STREAM = "CES", 
		_ALL_HANDLER = "all", 
		_STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, 
		_GET_PARAMS = /([^\s,]+)/g, 
		_eventSources = { };

	// wraps the event signature function fn (which returns the event key) in another function
	// which maps parameters to an object and then invokes the _publish function
	// returns the outer function
	function _wrapEventFn(eventSignatures, name, fn) {
		// createa  new function, wrapping the event signature
		return _.wrap(fn, function(func) {
			// strip off comments from the function definition (not that there should be any)
			var fnText = func.toString().replace(_STRIP_COMMENTS, '');
			// extract the function parameter names
			var fnParams = fnText.slice(fnText.indexOf('(') + 1, fnText.indexOf(')')).match(_GET_PARAMS);
			// extract func parameter values from the arguments
			var fnParamValues = _.toArray(arguments).slice(1);
			// invoke the event signature key function, defaulting to null if there is no result
			var k = func.apply(eventSignatures, fnParamValues) || null;
			//Ti.API.trace("> > FIRING DOMAIN EVENT:"+name+" key:"+k+" parameters:"+JSON.stringify(fnParamValues));
			// if we have parameters
			if (fnParams !== null) {
				// wrap the parameters up in object
				var data = _.object(fnParams, fnParamValues);
				// and invoke the _publish method passing it as the 3rd parameter
				_publish(name, k, data);
			} else {
				// otherwise just invoke the publish method
				_publish(name, k);
			}
		});
	}

	/**
	 * @method register
	 * Domain event publication method signatures registration.
	 * Call with method signatures object to add domain events.
	 * @param {Object} eventSignatures object containing method signatures of events
	 * each signature method should be have the parameters expected when calling the event
	 * each signature method should return the domain event key for the event.
	 * A method will be added for each event method signature to the Composite.publish object
	 *
	 */
	Composite.register = function(eventSignatures) {
		// iterate throught the event siguatures
		for (var name in eventSignatures) {
			// get the function for the event
			var fn = eventSignatures[name];
			// make sure it's a function
			if (_.isFunction(fn) && name!==_ALL_HANDLER ) {
				// add the wrapped function to the event sources
				_eventSources[name] = _wrapEventFn(eventSignatures, name, fn);
			}
		}
	}
	
	// pushes an event out to subscribed event handlers
	// events take the form name:string, prop:{}
	function _publish(eventName, eventKey, eventParams) {
		// sadly we can't use the caller function name because it's "KrollCallback:x" sometimes
		// create an event object and set it's eventName
		var e = {
			eventName : eventName,
			eventKey : eventKey
		};
		// if we have event parameters, add them to the event object
		if (!_.isUndefined(eventParams)) {
			e.eventParams = eventParams;
		}
		// fire the event object as an app event (recieved by all contexts)
		Ti.App.fireEvent(_EVENT_STREAM, e);
	}

	/**
	 * @property {Object} publish
	 * An object which stores all event publishing functions.
	 * A function is added to this object for each domain event signature registered
	 * with the Composite.register function.
	 * Invoke these functions to fire the corresponding domain event.
	 */
	Composite.publish = _eventSources;

	// list of subscribed object handlers
	var _eventHandlers = [];

	/**
	 * @method subscribe
	 * Registers a domain event listener object.
	 * Methods of this object which match the names of the registered domain event
	 * signature methods will be inoked when an event is published by inboking the
	 * Composite.publish.x method.
	 * To remove a subscribed event handler call Composite.unsubscribe passing the same handler.
	 * @param {Object} handler Object which will have methods invoked when events are published.
	 * The methods must have matching parameter signatures as the registerd signature methods.
	 */
	Composite.subscribe = function(handler) {
		if (_.isObject(handler)) {// typeof handler === "object"){
			_eventHandlers.push(handler);
		} else {
			Ti.API.warn("Unsupported Composite handler type " + typeof handler);
		}
	}
	/**
	 * @method unsubscribe
	 * Unregisters a domain event listener object, reverting the behavior of the Composite.subscribe method
	 * @param {Object} handler The object to unregister.
	 */
	Composite.unsubscribe = function(handler) {
		if (_.isObject(handler)) {//typeof handler==="object"){
			var i = _eventHandlers.indexOf(handler);
			if (i !== -1) {
				_eventHandlers.splice(i, 1);
			}
		}
	}
	// internal application event sync, mapps application events to composite events and invokes
	// registered event handler methods
	function _onCompositeEvent(e) {
		// iterate the object event handlers
		_eventHandlers.forEach(function(obj) {
			// check for matching function
			if (e.eventName in obj) {
				var fn = obj[e.eventName];
				var params = _.values(e.eventParams);
				fn.apply(obj, params);
				// obj[e.eventName](_.values(e.eventParams));
			};
			if ( _ALL_HANDLER in obj) {
				var fn = obj[_ALL_HANDLER];
				// var params = _.values(e.eventParams);
				fn.apply(obj, [e.eventName, e.eventKey, e.eventParams]);
				// obj[_ALL_HANDLER](e.eventName,e.eventParams);
			}
		});
	}

	// domain event stream sync private variables -----------------------------

	// the model event cache contains all of the backbone model related events from the event stream
	// this event cache takes the form of an object with named properties which are the data in the form
	// { event_key: { data },... }
	// where event_key take the form collection_name+"_"+model.id
	// start with an empty cache
	var _modelEventCache = {};

	// stores the next ID for each model
	// this is updated as we load models from the event stream,
	// used by _getNewModelID
	var _modelNextID = {};

	// calculates a new model id
	function _getNewModelID(cn) {
		var result = _modelNextID[cn] || 1;
		_modelNextID[cn] = result + 1;
		return result;
	}
	
	function _checkNextModelID(cn,id){
		// if this id is a number
		if (_.isNumber(id)){
			// get the current next model id
			var nextID = _modelNextID[cn] || 1;
			// if the id passed is greater than the next model id
			if (nextID<=id){
				// then update the next model id to be just after the id
				_modelNextID[cn] = id + 1;
			}
		}
	}

	// calculates the collection name prefix part of the model event cache key and event key
	function _getCNPrefix(cn) {
		return cn + "_";
	}

	// calculates a unique key for a model in a collection based on the collection name and model id
	// cn = collection name
	// data = model "row" data
	function _getModelEventCacheKey(cn, data) {
		if (!data || !data.id) {
			Ti.API.warn("Data collection " + cn + " data without id. " + JSON.stringify(data));
		}
		return _getCNPrefix(cn) + data.id;
	}

	// calculates the domain event key for a model based on the collection name and model id
	// this is the model event cache key prefixed by the word "DATA_"
	// cn = collection name
	// data = model "row" data
	// note: data must have an id property
	function _getEventKey(cn, data) {
		return "DATA_" + _getModelEventCacheKey(cn, data);
	}

	// comppsote domain event signatures for the sync adapter -----------------

	// the event siguatures must return a globally unique event key for the object the event inolves
	// in this case all three events reference the same obect, and so return the same event key
	// this allows us to keep only the latest event for the object when serializing
	var _syncEventSignatures = {
		DATA_Create : function(cn, data, silent) {
			// ensure that we have a new id on all created models
			if (_.isUndefined(data.id)) {
				data.id = _getNewModelID(cn)
			} else {
				_checkNextModelID(cn,data.id);
			}
			return _getEventKey(cn, data)
		},
		DATA_Update : function(cn, data, silent) {
			if (_.isUndefined(data.id)) {
				Ti.API.warn("Data update without id for collection " + cn + " data:" + JSON.stringify(data))
			} else {
				_checkNextModelID(cn,data.id);
			}
			return _getEventKey(cn, data)
		},
		DATA_Delete : function(cn, data, silent) {
			if (_.isUndefined(data.id)) {
				Ti.API.warn("Data deletion without id for collection " + cn + " data:" + JSON.stringify(data))
			} else {
				_checkNextModelID(cn,data.id);
			}
			return _getEventKey(cn, data)
		}
	}

	// composite domain event handlers for the sync adapter -------------------

	// these even handlers update the model event cache to reflect DATA_ events
	// matches the
	var _syncEventHandlers = {
		// called when a new record is created
		DATA_Create : function(cn, data, silent) {
			// create model event cache entry
			// ensure that we have a new id on all created models
			if (_.isUndefined(data.id)) {
				data.id = _getNewModelID(cn)
			} else {
				_checkNextModelID(cn,data.id);
			};
			// get the model event cache key
			var key = _getModelEventCacheKey(cn, data);
			// cache the data with the key
			_modelEventCache[key] = data;
			// if this model isn't coming via the _sync method
			if (!silent) {
				// then it needs to be added to the appropriate alloy collection
				// get the collection
				var collection = Alloy.Collections[cn] || Alloy.createCollection(cn);
				// add the object
				// note: this triggers backbone events which will update the Alloy ui
				collection.add([data]);
			}
		},
		// called when a row is updated
		DATA_Update : function(cn, data, silent) {
			if (!_.isUndefined(data.id)) {
				_checkNextModelID(cn,data.id);
				// update model event cache entry
				// get the model event cache key
				var key = _getModelEventCacheKey(cn, data);
				// update the cached data with the key
				_modelEventCache[key] = data;
				// if this model isn't coming via the _sync method
				if (!silent) {
					// then it needs to be added to the appropriate alloy collection
					// get the collection
					var collection = Alloy.Collections[cn] || Alloy.createCollection(cn);
					// get the model
					var model = collection.get(data.id);
					if (_.isUndefined(model)){
						// the model doesn't exist in the database, so instead of updating it
						// we add a new one to the collection (which causes it to be created)
						collection.add([data]);
					} else {
						// update the object
						// note: this triggers backbone events which will update the Alloy ui
						model.set(data);
					}
				}

			} else {
				Ti.API.warn("Data update without id for collection " + cn + " data:" + JSON.stringify(data));
			}
		},
		DATA_Delete : function(cn, data, silent) {
			if (!_.isUndefined(data.id)) {
				_checkNextModelID(cn,data.id);
				// delete model event cache entry
				// get the model event cache key
				var key = _getModelEventCacheKey(cn, data);
				// delete the cached data with the key
				delete _modelEventCache[key];
				// if this model isn't coming via the _sync method
				if (!silent) {
					// then it needs to be added to the appropriate alloy collection
					// get the collection
					var collection = Alloy.Collections[cn] || Alloy.createCollection(cn);
					// delete the object
					// note: this triggers backbone events which will update the Alloy ui
					collection.remove([data]);
				}
			} else {
				// TODO: delete all cn data in response to Collection.reset   ???
				Ti.API.warn("Data deletion without id for collection " + cn + " data:" + JSON.stringify(data));
			}
		}
	}
	
	// backbone methods -----------------------------------------------------------

	function _sync(method, model, options) {
		// Ti.API.trace("Composite._sync( "+method+","+JSON.stringify(model)+","+JSON.stringify(options)+")");
		var cn = model.config.adapter.collection_name;
		var resp;
		// sync results

		switch (method) {
			case "read":
				if (model.id) {
					// Find and return a specific model as a JSON object
					// resp = {"foo":"1","id":"1",...};
					resp = _modelEventCache[_getModelEventCacheKey(cn, model)];
				} else {
					// Return the entire collection as an array of JSON objects
					// resp = [{"foo":"1","id":"1",...}...];
					resp = [];
					var cnPrefix = _getCNPrefix(cn);
					_.each(_modelEventCache, function(data, cn) {
						if (cn.substring(0, cnPrefix.length) === cnPrefix) {
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
				model.set(attrObj, {
					silent : true
				});
				// get the response object
				resp = model.toJSON();
				// trigger a DATA_Create event for this new model
				Composite.publish.DATA_Create(cn, resp, true);
				break;
			case "update":
				// Update the model in persistent storage and return the updated model upon success
				// get the response object
				resp = model.toJSON();
				// trigger a DATA_Update event for this model
				Composite.publish.DATA_Update(cn, resp, true);
				break;
			case "delete":
				// Remove a model from persistent storage and return the removed model upon success
				// get the response object
				resp = model.toJSON();
				// trigger a DATA_Delete event for this model
				Composite.publish.DATA_Delete(cn, resp, true);
				break;
		}

		if (resp) {
			// Return sync results
			options.success(resp);
		} else {
			options.error("Record not found");
		}
	};
	
	// SQLite serialization ---------------------------------------------------
	
	/**
	 * @property serialization
	 * contains named functions which produce serialization objects suitable for passing to Composite.serialize and Composite.deserialize
	 * the serialization functions should all return objects which support the following signature: 
	 *	{ init:function(), write:function(eventName,eventKey,eventParam), read:function(publishFn)}
	 */
	Composite.serialization = { };

	// set to true during deserialization	
	var _isSerializationEnabled = false;
	// SQLite database creation SQL schema update fragments.
	// current schema index is stored in PRAGMA user_version
	var _serializationDBSchemaSQL = [
// database schema 0
"CREATE TABLE IF NOT EXISTS tbl_CES ( \
	K	TEXT NOT NULL PRIMARY KEY,	\
	T	DATETIME NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%f','now')), \
	N	TEXT NOT NULL, \
	P	TEXT \
); \
CREATE INDEX IF NOT EXISTS idx_CES_T on tbl_CES ( \
	T ASC \
);"
];
	var _TBL_CES_SELECT = "SELECT K,N,P FROM tbl_CES ORDER BY T";
	var _TBL_CES_INSERT = "REPLACE INTO tbl_CES (K,N,P) VALUES (?,?,?)";
	
	/**
	 * @method sql
	 * Factory for SQLite serialization extension objects
	 * @param {String} dbName the name of the SQLite database file to serialize to
	 * @param {Function} matchFn the match function used to determine which events to serialize
	 * @param {Boolean} remoteBackup indicates if the SQLite database should be backed up to the cloud
	 */
	Composite.serialization.sql = function(dbName,matchFn,remoteBackup){
		// validate dbName is a string and matchFn is a function
		if (!_.isString(dbName)){
			throw("Invalid SQL serializaton database name");
		}
		if (!_.isFunction(matchFn)){
			thrown("Invalid SQL serialization match function");
		}
		
		// create or update the SQL schema of the named database to support CES serialization
		function _init(){
			// create the database
			var db = Ti.Database.open(dbName);
			try {
				// make sure it's backed up to the cloud
				db.file.setRemoteBackup(remoteBackup);
				// default database version to 0
				var dbVersion = 0;
				// get the database version		
				var rows = db.execute('PRAGMA user_version');
				if (rows!==null){
					try{
						if (rows.isValidRow()){
							dbVersion = rows.fieldByName('user_version',Ti.Database.FIELD_TYPE_INT)
						}
					}
					finally{
						rows.close();
						rows = null;			
					}
				}
				// look for update db scripts
				while(dbVersion<_serializationDBSchemaSQL.length) {
					// read the database schema SQL script			
					var schemaSQL = _serializationDBSchemaSQL[dbVersion];
					// split the file into multiple ; delimited queries
					var queries = schemaSQL.split(';');
					db.execute('BEGIN TRANSACTION');
					try
					{
						// iterate through the queries
						for (var i in queries){
							var query = queries[i];
							// execute each one
							rows = db.execute(query);	
							// if for some reason it returned a result set			
							if (rows!==null){
								// make sure to close it
								rows.close();
								rows = null;
							}	
						}
						// update the db version
						dbVersion++;
						// write it to the database
						var rows = db.execute('PRAGMA user_version='+dbVersion);
						// if for some reason it returned a result set			
						if (rows!==null){
							// make sure to close it
							rows.close();
							rows = null;
						}	
						// commit the transaction
						db.execute('COMMIT TRANSACTION');			
					}
					catch (e){
						// if there was an error roll back the transaction
						db.execute('ROLLBACK TRANSACTION');	
						// rethrow the error		
						throw(e);			
					}
				}
			}
			finally{
				// close the database
				db.close();
				db = null;
			}
			// turn on serialization
			_isSerializationEnabled = true;
			// return success
			return true;
		}
	
		// writes an event to the serialization database
		function _write(eventName,eventKey,eventParams){
			// invoke the function
			if (matchFn(eventName,eventKey,eventParams)){
				// write the data to the db
				// open the database
				var db = Ti.Database.open(dbName);
				try {
					// convert the eventParams object into a JSON string for serialization
					var j = JSON.stringify(eventParams);
					// insert or replace the updated row
					var rows = db.execute(_TBL_CES_INSERT, [eventKey,eventName,j]);
					// if for some reason it returned a result set			
					if (rows!==null){
						rows.close();
						rows = null;
					}
				}
				finally{
					// close the database
					db.close();
					db = null;
				}
			}
		}
		
		// reads events from the SQLite database invoking publishFn for each one
		function _read( publishFn ){
			// select all the events in event order
			// open the database
			var db = Ti.Database.open(dbName);
			try {
				// get all of the serialized events
				var rows = db.execute(_TBL_CES_SELECT);
				try {
					// iterate through the rows
					while (rows.isValidRow()) {
						// get the event key string
						var eventKey = rows.fieldByName('K');
						// get the event name string
						var eventName = rows.fieldByName('N');
						// get the event param json string
						var eventParams = rows.fieldByName('P');
						// convert it into an object
						eventParams = JSON.parse( eventParams );
						// for data events we remove the silent parameter
						if (_.isString(eventName) && eventName.substring(0,5)==="DATA_"){
							// this causes deserialized data events to update their Alloy controllers
							// and avoids the silent parameter being accidentally set for controller initiated calls
							delete eventParams.silent;
						}
						// publish the event
						publishFn(eventName,eventKey,eventParams);
					    // handle the next row
					    rows.next();
					}
				}
				finally{
					// if for some reason it returned a result set			
					if (rows!==null){
						rows.close();
						rows = null;
					}
				}
			}
			finally{
				// close the database
				db.close();
				db = null;
			}
		}
		
		return { 
			init: _init,
			write: _write,
			read: _read 
		}		
	}	
	
	/**
	 * @method serialize
	 * @param {String} dbName the name of the database file to serialize to.
	 * @param {Function} matchFn the functionn to invoke to determine whether to write an event 
	 * @param {Boolean} remoteBackup true if the db file should be flagged for remote backup 
	 * to the database.  Expects the form function(eventName,eventKey,eventParams)
	 */
	Composite.serialize = function( serializationExtension ){
		if (_.isObject(serializationExtension) && "init" in serializationExtension && "write" in serializationExtension && "read" in serializationExtension){
			// initialize the serialization extension
			if (serializationExtension.init()){
				// creates a closure which persists dbName, matchFn, and remoteBackup
				Composite.subscribe( { all:serializationExtension.write } );
			}
		} else {				
			throw("Invalid serialization extension");	
		}
	}
	
	Composite.deserialize= function( serializationExtension ){
		if (_.isObject(serializationExtension) && "init" in serializationExtension && "write" in serializationExtension && "read" in serializationExtension){
			// initialize the serialization extension
			if (serializationExtension.init()){
				// persist the old state
				var wasSerializationEnabled = _isSerializationEnabled;
				// turn off event serialization of the dbName briefly
				_isSerializationEnabled = false;
				try
				{
					serializationExtension.read(_publish);			
				}
				finally
				{
					// turn back on event serialzation for the db
					_isSerializationEnabled = wasSerializationEnabled;
				}
			}
		}	
	}

	// initialize the event listener ------------------------------------------

	/**
	 * @method initialize
	 * Initializes the Composite domain event model.  Must be called once on each thread
	 * which wants to exchange dmoain events.
	 * Call Composite.finalize once for each call to Composite.initialize to avoid memory leaks.
	 * @param {Boolean} enableSyncAdapter Turns on Composite Alloy sync adapter allowing models with the
	 * type "composite" to integrate with the domain event model.
	 */
	Composite.initialize = function(enableSyncAdapter) {
		Ti.App.addEventListener(_EVENT_STREAM, _onCompositeEvent);
		// if composite event stream sync adapters should be enabled
		if (enableSyncAdapter) {
			// register the composite domain event signatures
			Composite.register(_syncEventSignatures);
			if (Alloy!==null) {
				// subscribe composite domain event handlers
				Composite.subscribe(_syncEventHandlers);
			}
		}
	}
	/**
	 * @method initialize
	 * Finalizes the Composite domain event model.  Must be called once on each thread which
	 * called the Composite.initialize method to avoid memory leaks.
	 */
	Composite.finalize = function() {
		Ti.App.removeEventListener(_EVENT_STREAM, _onCompositeEvent);
		// clean up variables
		delete _eventSources;
		_eventSources = {};
		delete _modelEventCache;
		_modelEventCache = {};
		delete _modelNextID;
		_modelNextID = {};
		_eventHandlers = [];
	}
	// public interface -------------------------------------------------------

	return Composite;

}())