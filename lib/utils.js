( function(){

	'use strict';

	exports.numberToHexString = function(d, padding ){
		var hex = Number(d).toString(16).toUpperCase();
		padding = typeof (padding) === "undefined" || padding === null ? padding = 8 : padding;

		while (hex.length < padding) {
			hex = "0" + hex;
		}

		return hex;
	};

	exports.numberToHexStringLittleEndian = function( d, padding ){
		if( padding % 2 != 0 ) throw new Error("numberToHexStringLittleEndian requires an even padding [" + padding + "]");

		var bigEndianHex = exports.numberToHexString( d, padding );

		var littleEndianHex = "";
		while( bigEndianHex.length ){
			var nibble = bigEndianHex[0] + bigEndianHex[1];
			bigEndianHex = bigEndianHex.slice(2);
			littleEndianHex = nibble + littleEndianHex;
		}

		return littleEndianHex;
	};

	exports.hexStringByWords = function( hex, littleEndian ){
		if( !hex || hex.length % 8 !== 0 ) throw new Error("hexStringByWords requires a word-aligned hex string");
		littleEndian = !!littleEndian;

		hex = hex.toUpperCase();
		const wordStrings = [];

		for( var i=0; i < hex.length; i += 8 ){
			var ws = hex.substring( i, i+8 );
			if( littleEndian ){
				ws = ws.substring( 6, 8 ) + ws.substring( 4, 6 ) + ws.substring( 2, 4 ) + ws.substring( 0, 2 );
			}
			wordStrings.push( ws );
		}

		return wordStrings.join(' ');
	};

	exports.hexToDecimal = function( hexString ){
		try{
			return parseInt( hexString, 16 );
		}catch( e ){
			console.error( "Error parsing hexString: ", e );
			return 0;
		}
	};

	exports.toUInt32 = function( val ){
		return val >>> 0;
	}

})();