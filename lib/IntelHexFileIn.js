( function(){

	const utils = require('./utils');
	const _ = require('lodash');

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


	function Parser(){		
	}

	Parser.prototype.parse = function( hexLine ){
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
	};

	/**
	 *
	 * @param options
	 * @constructor
	 */
	function Processor( options ){
		this.options = _.extend({
			maxBinaryAddress : 512 * 1024 * 1024,
			littleEndian: false,
			verbose: false
		}, options );

		this.parser = new Parser();
		this.contents = false;

		this.verboseStats = {
			blockStartAddress: 0,
			blockStartBytes: null,
			blockNumBytes: 0,
			totalBytes: 0
		}
	}

	Processor.prototype._setExplainBlockStartAddress = function( address ){
		if( this.verboseStats.blockNumBytes > 0 ){
			this._endExplainBlock();
		}

		this.verboseStats.blockNumBytes = 0;
		this.verboseStats.blockStartAddress = address;
	};

	Processor.prototype._startExplainBlock = function( buffer, address ){
		this.verboseStats.blockStartAddress = address;
		this.verboseStats.blockStartBytes = new Buffer( buffer );
		this.verboseStats.blockNumBytes = buffer.length;
		console.log(_.padEnd( "Block start at:", 20) + "0x" + utils.numberToHexString( address, 8 ));
		console.log(_.padEnd( "Block bytes begin:", 20) + _hexDumpWords( this.verboseStats.blockStartBytes, this.options.littleEndian ));
	};

	Processor.prototype._continueExplainBlock = function( buffer, address  ){
		this.verboseStats.totalBytes += buffer.length;
		if( address === this.verboseStats.blockStartAddress + this.verboseStats.blockNumBytes ){
			this.verboseStats.blockNumBytes += buffer.length;
			return true;
		}

		return false;
	};

	Processor.prototype._endExplainBlock = function(){
		if( this.verboseStats.blockNumBytes > 0 ){
			console.log( _.padEnd( "Block length:", 20) + "0x" + utils.numberToHexString( this.verboseStats.blockNumBytes, 8 ) + " (" + this.verboseStats.blockNumBytes + ")\n" );
		}
	};

	Processor.prototype.explainAddBytesAtAddress = function( buffer, address ){
		if( this.options.verbose ){
			if( !buffer ){
				this._setExplainBlockStartAddress( address );
			}else{
				var continueCurrentBlock = this. _continueExplainBlock( buffer, address );
				if( !continueCurrentBlock ){
					this._endExplainBlock();
					this._startExplainBlock( buffer, address );
				}
			}
		}
	};

	Processor.prototype.explainEOF = function(){
		if( this.options.verbose ){
			if( this.verboseStats.blockNumBytes !== 0 ){
				this._endExplainBlock();
			}
			console.log( _.padEnd( "EOF. Total Bytes:", 20) + "0x" + utils.numberToHexString( this.verboseStats.totalBytes, 8 ) + " (" + this.verboseStats.totalBytes + ")\n" );
		}
	};

	Processor.prototype.process = function( hexFileData ){
		if( !hexFileData ) return new Buffer(0);

		var maximumAddress = 0;
		var minimumAddress = 0xFFFFFFFF;

		var hexLines = hexFileData.split('\n');
		var buf = new Buffer( this.options.maxBinaryAddress );
		var baseAddress = 0;

		for( var i=0; i < hexLines.length; i++){

			var hexLine = hexLines[i];
			var parsedLine = this.parser.parse( hexLine );

			if( parsedLine.recordType === RECORD_TYPE_ADDRESS ){

				baseAddress = parsedLine.baseAddress << 16;
				this.explainAddBytesAtAddress( null, baseAddress );

			} else if ( parsedLine.recordType === RECORD_TYPE_DATA ){
			
				var lineAddress = parsedLine.address + baseAddress;
				var linePayload = parsedLine.payload;

				this.explainAddBytesAtAddress( parsedLine.payload, lineAddress );

				maximumAddress = Math.max( (lineAddress + linePayload.length), maximumAddress );
				minimumAddress = Math.min( lineAddress, minimumAddress );

				if( maximumAddress > buf.length ){
					console.log( "Buffer Overflow at address 0x" + utils.numberToHexString( lineAddress ));
				} else {
					linePayload.copy( buf, lineAddress );
				}
			}

		}

		var startAddress = ( this.options.startAtAddressZero ) ? 0 : minimumAddress;
		this.contents = buf.slice( startAddress, maximumAddress );

		this.explainEOF();
	};

	function _hexDumpWords( buffer, littleEndian ){
		return utils.hexStringByWords( buffer.toString('hex'), littleEndian );
	}

	module.exports = Processor;

})();