( function(){

	'use strict';

	var IntelToBinaryProcessor = require('../lib/IntelHexFileIn.js');

	var expect = require("expect");
	var assert = require("chai").assert;

	describe('Import a hex file to binary', function(){

		it( 'converts a binary file to hex', function(){
			var intelHexFileData = ":020000040003F7\n:10F400006262643433373035376262663263366243\n:10F41000376435343433613035643631393336301E\n:00000001FF\n";

			var binaryFileData = new Buffer( "bbd437057bbf2c6b7d5443a05d619360");

			var processor = new IntelToBinaryProcessor();
			processor.process( intelHexFileData );
			var binaryResults = processor.getContents();

			expect( binaryResults ).toEqual( binaryFileData );
		});
	});



})();