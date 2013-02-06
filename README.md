# CompositeJS

Domain model event framework for Appcelerator Titanium Alloy

A common problem with MVC frameworks is they tend not to provide a clear separation of view models and domain models.  This can push developers towards writing messy code, where domain model logic is placed amongst view model related code.  

One way of delineating the view and business logic is to add a separate *domain event stream* and *domain model* which are entirely separate from the UI events and MVC. Composite is an attempt to create a framework which does just that. Using Composite you can create domain models completely decoupled from the UI MVC code facilitating a high level of business logic isolation from UI logic.

One of the benefits of such a system is that it allows developers to replace all data storage code with domain event serialization.  This provides, almost for free, a number of beneficial features including: automatic serialization of all models without defining a data storage schema, infinite undo / replay of all user activity, communication failure recovery via offline queueing and retry, etc.

[Note: The domain event serialization in Composite hasn't been checked in yet.  Composite will support queued domain event serialization to Local SQLite / Remote REST / or extensible to whatever]

## Conceptual Overview
* **View** Represents UI appearance, maps model data to display, maps UI events to controller methods.  *In Composite the Ally View is completely separated from the domain model, and instead interacts with the domain model indirectly via the Model and Controller.*

* **Controller** Represents UI behaviour, maps UI events to (UI)Model state changes for UI related data changes, or generates (Domain)Model events for non UI related business logic.  In the other direction the controller may map domain events to UI changes, though typically this would instead be done via the (UI)Model.  *In Composite the Alloy Controller publishes domain events by calling Composite.publish.eventX methods, and subscribes to domain events via methods of a simple event handler property object.*

* **(UI)Model** Represents data presented on UI, maps data changes to domain events, responds to domain events with UI data changes. *In Composite Alloy Models specify "composite" as their adapter.type and then automatically publish and subscribe to domain events for data changes.  No additional coding required.*

* **(Domain)Model** Defines domain business logic and data, maps domain events to domain model state changes and generates new domain events as required. *In Composite the domain model is one or more simple CommonJS modules which interacts with Alloy via domain events. Domain events are defined by adding method signatures to an object, published by invoking matching methods of the Composite.publish object, and subscribed to by implementing matching methods on a event handler object.*

* **(Domain)Persistence** [Typically a subset of the domain model] Provides storage, queueing and replay of domain events.  Application state can be restored to any point in the stream by doing _.reduce( domainEventStream, eventHandlers );  *In Composite domain event stream parsing is implemented via simple CommonJS modules which interact with the domain stream in the same way as the domain model.  No special code needs to be added to the domain model itself to gain the benefits of stream parsing functionality like persistence, retry, and so forth, it's entirely transparent to the domain model.*

## Domain Model
* Simple to implement, no framework subclassing required.
* Break up as desired across multiple CommonJS modules, and thread contexts.
* Domain event subscriptions are methods invoked on the domain model object(s)
* UI MVC is controlled by publishing domain events

## Domain Events
* Simple to implement, no framework subclassing required.
* Implement across as many CommonJS modules, and thread contexts as required.
* Define domain events by declaring methods on an object.
* Publish domain events by invoking methods of an object.

## Examples

#### Enabling composite:
`
    	Composite = Alloy.Global.Composite = require('/composite.js');
    	Composite.initialize(true);
`

#### Hooking up a Model to the domain event stream:
Add an Alloy model, and set it's config.adapter.type to "composite".  Here is a sample of the minimal code required:
`
    	exports.definition = {
    		config: {
    			"adapter": {
    				"type": "composite",
    				"collection_name": "yourCollectionName"
    			}
    		}		
    	}
`  
*Note: You may wish to add column definitions to the config, and extend the Model and Collection in the normal way for a model*	

#### Defining a domain event signature:
`
    	var sampleEventSignatures = {
    		sampleEvent: function(sampleParam1,sampleParam2){
    			// sample returns an event key made up of a prefix and id
    			// demo assumes the first parameter is unique
    			return "sampleEventKey_"+sampleParam1;
    		}
    	}
    	Composite.register(sampleEventSignature);
`  
*Note: For brevity this sample only registers one event signature.  Multiple methods can be added to the event signature object to define multiple events.*

#### Publishing a domain event:
`
    	Composite.publish.sampleEvent( "sampleParamValue1", "sampleParamValue2" );
`

#### Subscribing to a domain event:
`
    	var sampleEventHandlers = {
    		sampleEvent: function(sampleParam1,sampleParam2){
    			alert( "sampleEvent handler triggered" );
    		}
    	}
    	Composite.subscribe(sampleEventSignature);
`  
*Note: For brevity this sample only subscribes to one event.  Multiple events can be subscribed to by adding additional methods to the event handlers object.*

### Licensing

Composite is Copyright 2012-2013 by Simon Giles and released under the MIT license.  See the license.txt file for details.
