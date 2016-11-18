( function(){

	const _ = require('lodash');
	const BinaryBlock = require('./BinaryBlock');

	/*

	From: https://bluegiga.zendesk.com/entries/42713448--REFERENCE-Updating-BLE-module-firmware-using-UART-DFU

	Intel HEX files are formatted such that the first hex byte on each line denotes 
	the number of payload data bytes on that line of the file. This is followed by a 16-bit address, 
	then a record type byte, <datalen> data bytes, and finally a checksum byte. So line 258:
	:10 1000 00 0210f70231f2ffffffffff023ba9ffff d3

	...is actually the line of data which starts at the 0x1000 address (the beginning of the BLE stack/application code). 
	Of course, a 16-bit address container means that only 64 kBytes of data can be directly addressed. Therefore, 
	note also that the very first line in the .hex file:
	:02 0000 04 0000 fa
	---------------------
	012 3456 78 9012 34

	...is a different type of record which indicates the address high-word offset 
	(0x0000 in this case, the two bytes right before the checksum). 
	Line 4098 contains another one of these lines:
	:02 0000 04 0001 f9

	This indicates a high-word offset of 0x0001, i.e. all following data corresponds to 0x0001nnnn. 
	For this reason, the 2nd occurrence of the 1000 16-bit address on line 4335 should not be treated separately. 
	Starting from 258, all data with record type = 00 (not the offset address line on 4098) should be 
	treated as contiguous and written that way.

	*/

	var RECORD_TYPE_ADDRESS = 4;
	var RECORD_TYPE_DATA = 0;


	function parseIntelHexLine( hexLine ){
		if( hexLine.length === 0 ) return {};

		if( hexLine.charAt(0) !== ':' ) throw( 'Bad Line in hex file:' + hexLine );

		var output = {};

		output.numPayloadBytes = parseInt( hexLine.substring( 1, 3 ), 16 );
		output.address = parseInt( hexLine.substring( 3, 7 ), 16 );
		output.recordType = parseInt( hexLine.substring( 7, 9 ), 16 );

		if( output.recordType === RECORD_TYPE_ADDRESS ){

			output.baseAddress = parseInt( hexLine.substring( 9, 13), 16 );

		} else if ( output.recordType === RECORD_TYPE_DATA ){

			var buf = new Buffer( output.numPayloadBytes );

			for( var i=0; i < output.numPayloadBytes; i++){
				var string = hexLine.substring( 9 + (i*2), 9 + (i*2) + 2 );
				var value = parseInt( string, 16);
				buf[i] = value;
			}

			output.payload = buf;
		}

		return output;
	}

	/**
	 *
	 * @param options
	 * @constructor
	 */
	function Processor( options ){
		this.options = _.extend({
		}, options );

		this.blocks = [];
	}

	Processor.prototype._cullEmptyBlocks = function(){
		const blocks = [];
		_.each( this.blocks, function( block ){
			if( block.data.length !== 0 ){
				blocks.push( block );
			}
		});
		this.blocks = blocks;
	};

	Processor.prototype._processSetAddress = function( address ){
		const lastBlock = _.last( this.blocks );
		if( !lastBlock || lastBlock.endAddress() !== address ){
			const nextBlock = new BinaryBlock( address );
			this.blocks.push( nextBlock );
		}
	};

	Processor.prototype._processLineBuffer = function( buffer, address ){
		const lastBlock = _.last( this.blocks );
		if( lastBlock && address === lastBlock.endAddress() ){
			lastBlock.appendBuffer( buffer );
		}else {
			const nextBlock = new BinaryBlock( address );
			nextBlock.appendBuffer( buffer );
			this.blocks.push( nextBlock );
		}
	};

	Processor.prototype.process = function( hexFileData ){
		if( !hexFileData ) return new Buffer( 0 );

		var hexLines = hexFileData.split( '\n' );
		var baseAddress = 0;

		for( var i = 0; i < hexLines.length; i++ ){

			var hexLine = hexLines[i];
			var parsedLine = parseIntelHexLine( hexLine );

			if( parsedLine.recordType === RECORD_TYPE_ADDRESS ){

				baseAddress = parsedLine.baseAddress << 16;
				this._processSetAddress( baseAddress );

			}else if( parsedLine.recordType === RECORD_TYPE_DATA ){

				var lineAddress = parsedLine.address + baseAddress;
				var linePayload = parsedLine.payload;

				this._processLineBuffer( linePayload, lineAddress );
			}

			this._cullEmptyBlocks();
		}
	};

	Processor.prototype.getBlocks = function(){
		return this.blocks;
	};

	Processor.prototype.assembleBlocks = function( blocks ){
		if( !blocks || blocks.length === 0 ) return new Buffer(0);

		var maximumAddress = 0;
		var minimumAddress = 0xFFFFFFFF;

		_.each( blocks, function( block ){
			if( block.startAddress < minimumAddress ) minimumAddress = block.startAddress;
			if( block.endAddress() > maximumAddress ) maximumAddress = block.endAddress();
		});

		const startAddress = ( this.options.startAtAddressZero ) ? 0 : minimumAddress;
		const buffer = new Buffer( maximumAddress - startAddress );
		buffer.fill(0);

		_.each( blocks, function( block ){
			block.data.copy( buffer, block.startAddress - startAddress);
		});

		return buffer;
	};

	Processor.prototype.getContents = function(){
		return this.assembleBlocks( this.blocks );
	};

	module.exports = Processor;

})();