# composite

Domain model event framework for Appcelerator Titanium Alloy

A common problem with MVC frameworks is they tend not to provide a clear separation of view models and domain models.  This can push developers towards writing messy code, where domain model logic has been placed in amongst view model related code.  

One way of delineating the view and business logic is to add a separate *domain event stream* and *domain model* which are entirely separate from the UI event stream and MVC. Composite is  an attempt to create a framework which does just that. Using Composite you can create domain models completely decoupled from the UI MVC code facilitating a high level of business logic isolation from UI logic.

One of the benefits of such a system is that it allows developers to replace all data storage code with domain event serialization.  This provides, almost for free, a number of beneficial features including: automatic serialization of all models without defining a data storage schema, infinite undo / replay of all user activity, communication failure recovery via offline queueing and retry, etc.

[Note: The domain event serialization in Composite hasn't been checked in yet.  Composite will support queued domain event serialization to Local SQLite / Remote REST / or extensible to whatever]

## Architectural Entities

**View** Represents UI appearance, maps model data to display, maps UI events to controller methods

**Controller** Represents UI behaviour, maps UI events to (UI)Model state changes for UI related data changes, or generates (Domain)Model events for non UI related business logic.  In the other direction the controller may map domain events to UI changes, though typically this would instead be done via the (UI)Model.

**(UI)Model** Represents data presented on UI, maps data changes to domain events, responds to domain events with UI data changes.

**(Domain)Model** Defines domain business logic and data, maps domain events to domain model state changes and generates new domain events as required.

**(Domain)Persistence** [Typically a subset of the domain model] Provides storage, queueing and replay of domain events.


