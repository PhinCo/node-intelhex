( function(){

	var fs = require('fs');
	var Promise = require('bluebird');

	exports.BufferToIntelHexProcessor = require('./lib/IntelHexFileOut');
	exports.IntelToBufferProcessor = require('./lib/IntelHexFileIn');

	/**
	 *
	 * @param buffer: binary file data to encode
	 * @param startAtAddress: address of first binary data (start of hex file)
	 * @returns string: intel-hex file data
	 */
	exports.binaryToIntelHex = function( buffer, startAtAddress ){

		var processor = new exports.BufferToIntelHexProcessor( startAtAddress );
		processor.appendBuffer( buffer );
		processor.close();

		return processor.contents;
	};


	/**
	 *
	 * @param intelHexString: intel-hex file data
	 * @param options: map, keys include
	 * 	 startAtOffsetZero: output binary file begin at address zero, even when min data address in intelFile is > 0
	 * 	 maxBinaryAddress: maximum binary address, defines size of buffer required in RAM
	 * 	 verbose: logs processing to console

	 * @returns binary file data
	 */
	exports.intelHexToBinary = function( intelHexString, options ){
		var processor = new exports.IntelToBufferProcessor( options );
		processor.process( intelHexString );

		return processor.contents;
	};


	/**
	 *
	 * @param binaryFileName
	 * @param intelHexFileName
	 * @param startAtAddress
	 *
	 * @returns Promise, returning true
	 */
	exports.binaryFileToIntelHexFile = function( binaryFileName, intelHexFileName, startAtAddress ){
		return new Promise( function( resolve, reject ){
			var binaryDataBuffer = false;
			try{
				binaryDataBuffer = fs.readFileSync( binaryFileName );
			}catch( error ){
				reject( error );
			}

			var intelHexFileData = exports.binaryToIntelHex( binaryDataBuffer, startAtAddress );

			try{
				fs.writeFileSync( intelHexFileName, intelHexFileData );
			}catch( error ){
				reject( error );
			}

			resolve( true );
		});
	};

	/**
	 *
	 * @param intelHexFileName
	 * @param binaryFileName
	 * @param options: map, keys include
	 * 	 startAtOffsetZero: output binary file begin at address zero, even when min data address in intelFile is > 0
	 * 	 maxBinaryAddress: maximum binary address, defines size of buffer required in RAM
	 * 	 verbose: logs processing to console
	 *
	 * @returns Promise, returning true
	 */
	exports.intelHexFileToBinaryFile = function( intelHexFileName, binaryFileName, options ){
		return new Promise( function( resolve, reject ){
			var intelHexFileData = false;
			try{
				intelHexFileData = fs.readFileSync( intelHexFileName, { encoding: 'utf8' });
			}catch( error ){
				reject( error );
			}

			var binaryDataBuffer = exports.intelHexToBinary( intelHexFileData, options );

			try{
				fs.writeFileSync( binaryFileName, binaryDataBuffer );
			}catch( error ){
				reject( error );
			}

			resolve( true );
		});
	};

})();