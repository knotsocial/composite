Ti.API.trace("START:controllers/index.js");

// get sql serialization enxtension for test.db
var sql = Composite.serialization.sql( 'test.db', function(n,k,p){return true}, false );

// get a reference to the book collection singleton
var books = Alloy.Collections.book;

// used when we need to create new book data
var _bookData = [
	{author:"William Gibson",	title:"Neuromancer",			isbn:"0-441-56956-0"},
	{author:"William Gibson",	title:"Count Zero",				isbn:"0-575-03696-6"},
	{author:"William Gibson",	title:"Burning Chrome",			isbn:"978-0-06-053982-5"},
	{author:"William Gibson",	title:"Mona Lisa Overdrive",	isbn:"0-553-05250-0"},
	{author:"William Gibson",	title:"Virtual Light",			isbn:"978-0-14-015772-7"},
	{author:"William Gibson",	title:"Idoru",					isbn:"978-0-14-024107-5"},
	{author:"William Gibson",	title:"All Tomorrow's Parties",	isbn:"0-670-87557-0"},
	{author:"William Gibson",	title:"Pattern Recognition",	isbn:"0-399-14986-4"},
	{author:"William Gibson",	title:"Spook Country",			isbn:"0-670-91494-0"},
	{author:"William Gibson",	title:"Zero History",			isbn:"0670919527"}
];
var bookOffset = 0;

// returns a new book
function GetBook(){
	var result = _.clone( _bookData[bookOffset % 10] );
	bookOffset++;
	result.title += "."+bookOffset;
	return result;
}

// button bar event handler
function onBtnDataClick(e){
	switch(e.index)
	{
		case 0:
		    // add model
		    neuromancer = books.create( GetBook() )
		    Ti.API.trace( '+M(Neuromancer)'+ JSON.stringify( neuromancer.toJSON()) )
			break;
		case 1:
			// add event
			var countZero = GetBook();
		    Ti.API.trace( '+E(Count Zero)'+ JSON.stringify( countZero ) )
			Composite.publish.DATA_Create( "book", countZero)
			break;
		case 2:
			// fetch
			books.fetch();
			break;
		case 3:
			// reset
			books.reset();
			break;
		case 4:
		    // serialize
		    Ti.API.trace( 'Serialize' );
		    Composite.serialize(sql);
			break;
		case 5:
			// deserialize
		    Ti.API.trace( 'Deserialize' )
		    Composite.deserialize(sql);
			break;
		case 6:
			// delete serialized data
		    Ti.API.trace( 'Clearing database' );
			var db = Ti.Database.open('test.db');
			try {
				db.execute('DELETE FROM tbl_CES');
			}
			finally{
				// close the database
				db.close();
				db = null;
			}		    
			break;			
	} 
}

$.index.open();