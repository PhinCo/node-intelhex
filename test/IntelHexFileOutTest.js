( function(){

	'use strict';

	var expect = require("expect");
	var IntelFile = require('../lib/IntelHexFileOut.js');
	var assert = require("chai").assert;
	var utils = require('../lib/utils.js');

	describe('Constructor', function(){

		it('should have a non zero start address', function(){
			var file = new IntelFile(0xFFFF0000);

			expect( file.extendedAddress).toBe( 0xFFFF );
			expect( file.relativeAddress).toBe( 0x0000 );
			expect( file.contents).toBe( ":02000004FFFFFC\n")
		});

		it('should have zero start address', function(){
			var file = new IntelFile(0x00000000);

			expect( file.extendedAddress).toBe( 0x0000 );
			expect( file.relativeAddress).toBe( 0x0000 );
			expect( file.contents).toBe( "")
		});

	});

	describe('Close', function(){

		it('close empty file', function(){
			var file = new IntelFile(0x00000000);
			file.close();
			expect( file.extendedAddress).toBe( 0x0000 );
			expect( file.relativeAddress).toBe( 0x0000 );
			expect( file.contents).toBe( ":00000001FF\n")
		});
	});

	describe('Checksum', function() {

		it('should checkdum 0 -> 00', function () {
			var file = new IntelFile();
			expect( file._crc( "00000000" ) ).toBe( "00" );
		});

		it('should checksum the following examples', function() {
			// Examples from https://en.wikipedia.org/wiki/Intel_HEX
			//     :10010000214601360121470136007EFE09D2190140
			//     :100110002146017E17C20001FF5F16002148011928
			//     :10012000194E79234623965778239EDA3F01B2CAA7
			//     :100130003F0156702B5E712B722B732146013421C7
			//     :00000001FF
			var file = new IntelFile();
			expect( file._crc( "10010000214601360121470136007EFE09D21901" ) ).toBe( "40" );
			expect( file._crc( "100110002146017E17C20001FF5F160021480119" ) ).toBe( "28" );
			expect( file._crc( "10012000194E79234623965778239EDA3F01B2CA" ) ).toBe( "A7" );
			expect( file._crc( "100130003F0156702B5E712B722B732146013421" ) ).toBe( "C7" );
		});
	});

	describe('Write Bytes', function(){

		it('should append bytes', function(){
			var file = new IntelFile(0x00000000);
			file.appendHexString("00000000000000000000000000000000");

			expect( file.extendedAddress).toBe( 0x0000 );
			expect( file.relativeAddress).toBe( 0x0010 );
			expect( file.contents).toBe( ":1000000000000000000000000000000000000000F0\n")
		});
	});

	describe('Byte length checks', function(){
		var file = new IntelFile(0x00000000);

		it('accepts good byte counts', function(){
			file.appendHexString('00');
			file.appendHexString('00000000000000000000000000000000');
		});

		it('rejects bad byte counts', function(){
			assert.throws(function () { file.appendHexString('111'); });        // odd
			assert.throws(function () { file.appendHexString(''); });           // no content
			assert.throws(function () { file.appendHexString(); });             // empty
		});

	});

	describe('Address wrapping', function(){

		it('allows user to write up to a boundary', function(){
			var file = new IntelFile(0x00000000);
			file.setAddress( 0x0000FFFF );
			file.appendHexString( "00" );
			expect( file.extendedAddress).toBe( 0x0001 );
			expect( file.relativeAddress).toBe( 0x0000 );

			file.appendHexString( "00" );
			expect( file.extendedAddress).toBe( 0x0001 );
			expect( file.relativeAddress).toBe( 0x0001 );
		});
	});

	describe('Write bytes at address', function(){

		it('writes 16 bytes in one line', function(){
			var file = new IntelFile(0x00000000);
			file.writeHexStringAtAddress( 0x10001000, "00000000000000000000000000000000");
			expect( file.extendedAddress).toBe( 0x1000 );
			expect( file.relativeAddress).toBe( 0x1010 );
			expect( file.contents).toBe( ":020000041000EA\n:1010000000000000000000000000000000000000E0\n");
		});

		it('writes 32 bytes in 2 lines', function(){
			var file = new IntelFile(0x00000000);
			file.writeHexStringAtAddress( 0x10001000, "0000000000000000000000000000000000000000000000000000000000000000");
			expect( file.extendedAddress).toBe( 0x1000 );
			expect( file.relativeAddress).toBe( 0x1020 );
			expect( file.contents).toBe( ":020000041000EA\n:1010000000000000000000000000000000000000E0\n:1010100000000000000000000000000000000000D0\n");
		});

	});

	describe('writes little endian words', function() {

		it('writes a key file from data', function () {
			var file = new IntelFile(0x0003FC00);
			file.appendWords( [0x00000001,0x20000000], true );
			file.close();

			expect( file.contents).toBe( ":020000040003F7\n:08FC00000100000000000020DB\n:00000001FF\n" );
		});
	});


	describe('Build some hex files', function(){

		var keyFileHex = ":020000040003F7\n:10F400006262643433373035376262663263366243\n:10F41000376435343433613035643631393336301E\n:00000001FF\n";

		it('writes a key file from data', function(){
			var file = new IntelFile(0x0003F400);
			file.appendHexString("6262643433373035376262663263366237643534343361303564363139333630");
			file.close();

			expect( file.contents).toBe( keyFileHex );
		});

		it('writes a key file from data', function(){
			var address = 0x0003F400;
			var keyFileData = [0x62626434,0x33373035,0x37626266,0x32633662,0x37643534,0x34336130,0x35643631,0x39333630];

			var file = new IntelFile(address);
			file.appendWords( keyFileData );
			file.close();

			expect( file.contents).toBe( keyFileHex );
		});

	});		'use strict';

	var expect = require("expect");
	var IntelFile = require('../lib/IntelHexFileOut.js');
	var assert = require("chai").assert;
	var utils = require('../lib/utils.js');

	describe('Constructor', function(){

		it('should have a non zero start address', function(){
			var file = new IntelFile(0xFFFF0000);

			expect( file.extendedAddress).toBe( 0xFFFF );
			expect( file.relativeAddress).toBe( 0x0000 );
			expect( file.contents).toBe( ":02000004FFFFFC\n")
		});

		it('should have zero start address', function(){
			var file = new IntelFile(0x00000000);

			expect( file.extendedAddress).toBe( 0x0000 );
			expect( file.relativeAddress).toBe( 0x0000 );
			expect( file.contents).toBe( "")
		});

	});

	describe('Close', function(){

		it('close empty file', function(){
			var file = new IntelFile(0x00000000);
			file.close();
			expect( file.extendedAddress).toBe( 0x0000 );
			expect( file.relativeAddress).toBe( 0x0000 );
			expect( file.contents).toBe( ":00000001FF\n")
		});
	});

	describe('Checksum', function() {

		it('should checkdum 0 -> 00', function () {
			var file = new IntelFile();
			expect( file._crc( "00000000" ) ).toBe( "00" );
		});

		it('should checksum the following examples', function() {
			// Examples from https://en.wikipedia.org/wiki/Intel_HEX
			//     :10010000214601360121470136007EFE09D2190140
			//     :100110002146017E17C20001FF5F16002148011928
			//     :10012000194E79234623965778239EDA3F01B2CAA7
			//     :100130003F0156702B5E712B722B732146013421C7
			//     :00000001FF
			var file = new IntelFile();
			expect( file._crc( "10010000214601360121470136007EFE09D21901" ) ).toBe( "40" );
			expect( file._crc( "100110002146017E17C20001FF5F160021480119" ) ).toBe( "28" );
			expect( file._crc( "10012000194E79234623965778239EDA3F01B2CA" ) ).toBe( "A7" );
			expect( file._crc( "100130003F0156702B5E712B722B732146013421" ) ).toBe( "C7" );
		});
	});

	describe('Write Bytes', function(){

		it('should append bytes', function(){
			var file = new IntelFile(0x00000000);
			file.appendHexString("00000000000000000000000000000000");

			expect( file.extendedAddress).toBe( 0x0000 );
			expect( file.relativeAddress).toBe( 0x0010 );
			expect( file.contents).toBe( ":1000000000000000000000000000000000000000F0\n")
		});
	});

	describe('Byte length checks', function(){
		var file = new IntelFile(0x00000000);

		it('accepts good byte counts', function(){
			file.appendHexString('00');
			file.appendHexString('00000000000000000000000000000000');
		});

		it('rejects bad byte counts', function(){
			assert.throws(function () { file.appendHexString('111'); });        // odd
			assert.throws(function () { file.appendHexString(''); });           // no content
			assert.throws(function () { file.appendHexString(); });             // empty
		});

	});

	describe('Address wrapping', function(){

		it('allows user to write up to a boundary', function(){
			var file = new IntelFile(0x00000000);
			file.setAddress( 0x0000FFFF );
			file.appendHexString( "00" );
			expect( file.extendedAddress).toBe( 0x0001 );
			expect( file.relativeAddress).toBe( 0x0000 );

			file.appendHexString( "00" );
			expect( file.extendedAddress).toBe( 0x0001 );
			expect( file.relativeAddress).toBe( 0x0001 );
		});
	});

	describe('Write bytes at address', function(){

		it('writes 16 bytes in one line', function(){
			var file = new IntelFile(0x00000000);
			file.writeHexStringAtAddress( 0x10001000, "00000000000000000000000000000000");
			expect( file.extendedAddress).toBe( 0x1000 );
			expect( file.relativeAddress).toBe( 0x1010 );
			expect( file.contents).toBe( ":020000041000EA\n:1010000000000000000000000000000000000000E0\n");
		});

		it('writes 32 bytes in 2 lines', function(){
			var file = new IntelFile(0x00000000);
			file.writeHexStringAtAddress( 0x10001000, "0000000000000000000000000000000000000000000000000000000000000000");
			expect( file.extendedAddress).toBe( 0x1000 );
			expect( file.relativeAddress).toBe( 0x1020 );
			expect( file.contents).toBe( ":020000041000EA\n:1010000000000000000000000000000000000000E0\n:1010100000000000000000000000000000000000D0\n");
		});

	});

	describe('writes little endian words', function() {

		it('writes a key file from data', function () {
			var file = new IntelFile(0x0003FC00);
			file.appendWords( [0x00000001,0x20000000], true );
			file.close();

			expect( file.contents).toBe( ":020000040003F7\n:08FC00000100000000000020DB\n:00000001FF\n" );
		});
	});


	describe('Build some hex files', function(){

		var keyFileHex = ":020000040003F7\n:10F400006262643433373035376262663263366243\n:10F41000376435343433613035643631393336301E\n:00000001FF\n";

		it('writes a key file from data', function(){
			var file = new IntelFile(0x0003F400);
			file.appendHexString("6262643433373035376262663263366237643534343361303564363139333630");
			file.close();

			expect( file.contents).toBe( keyFileHex );
		});

		it('writes a key file from data', function(){
			var address = 0x0003F400;
			var keyFileData = [0x62626434,0x33373035,0x37626266,0x32633662,0x37643534,0x34336130,0x35643631,0x39333630];

			var file = new IntelFile(address);
			file.appendWords( keyFileData );
			file.close();

			expect( file.contents).toBe( keyFileHex );
		});

	});

})();

// intelbin.binaryFileToIntelHexFile( 'data/test_in.bin', 'data/test_out.hex', 0x10001000 );
// intelbin.intelHexFileToBinaryFile( 'data/test_in.hex', 'data/test_out.bin', { startAtAddressZero: false } );


