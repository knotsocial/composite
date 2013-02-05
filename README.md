composite
=========

Domain model event framework for Appcelerator Titanium Alloy

The problem with MVC frameworks in general is that they tend not to provide a clear separation of view models and domain models.  This can lead to messy code, where domain model logic has been placed in amongst view model related code.  

One way of delineating the view and domain logic is to add a separate "domain event stream" and "domain model" specifically to handle the domain logic. Composite is  an attempt to create a framework which does just that. Using Composite you can create domain models completely decoupled from the UI MVC code facilitating a high level of business logic isolation fro UI logic.

One of the benefits of such a system is that it allows developers to replace all data storage code with domain event serialization.  Composite supports domain event serialization allowing all domain events to be serialized to SQLite and/or REST and/or queued for later storage.  (Note: this feature hasn't been checked in yet)  Typically developers will want to serialize to a NoSQL type of database on the back end.

Architectural Entities:

View: Represents UI appearance, maps model data to display, maps UI events to controller methods

Controller: Represents UI behaviour, maps UI events to (UI)Model state changes for UI related data changes, or generates (Domain)Model events for non UI related business logic.  In the other direction the controller maps domain events to UI changes.

(UI)Model: Represents data presented on UI, maps data changes to domain events, responds to domain events with UI data changes.

(Domain)Model: Defines domain business logic and data, maps domain events to domain model state changes and generates new domain events as required.

(Domain)Persistence[Typically a subset of the domain model]: Provides storage, queueing and replay of domain events.


