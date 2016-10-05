( function() {

    'use strict';

    // From https://en.wikipedia.org/wiki/Intel_HEX
    //
    //		Intel Hex Line Format (I32HEX, 32 bit addresses) is
    //          :llaaaatt[dd...]cc
    //		Where
    //          ll=data length
    //		    aaaa=lower 16 bit address
    //		    tt=record type
    //			    00 - data record
    //              01 - end-of-file record
    //              02 - extended segment address record (Not used in I32Hex)
    //              04 - extended linear address record
    //              05 - start linear address record (MDK-ARM only)
    //		    cc=checksum = 2's comp of negative of sum of all record bytes

    var utils = require("./utils");

    var DEFAULT_LINE_TERMINATOR = "\n";
    var SEGMENT_LENGTH_BYTES = 0x10000;
    var MAX_BASE_ADDRESS = 0xffff;

    function IntelHexFileOut( startAddress ){
        if( startAddress === void 0 ) startAddress = 0;

        this.contents = "";
        this.extendedAddress = 0;
        this.relativeAddress = 0;
        this.lastAppendEndedAtBoundary = false;
        this.lineTerminator = DEFAULT_LINE_TERMINATOR;

        this.setAddress( startAddress );
    }

	IntelHexFileOut.prototype.setAddress = function( address ){
        var extendedAddress = this._extendedAddressFromAddress( address );
        this.relativeAddress = this._addressRelativeToExtendedAddress( address, extendedAddress );

        if( this.extendedAddress === extendedAddress ) return;
        this.extendedAddress = extendedAddress;

        this._writeExtendedAddress();

        this.lastAppendEndedAtBoundary = false;
    };

	IntelHexFileOut.prototype.writeHexStringAtAddress = function( address, hexString ){
        if( !hexString || hexString.length === 0 || hexString.length > SEGMENT_LENGTH_BYTES || hexString.length % 2 !== 0 ){
            throw new Error("invalid length of hexString [" + hexString.length + "]");
        }

        this.setAddress( address );
        this.appendHexString( hexString );
    };

	IntelHexFileOut.prototype.appendBuffer = function( buffer, littleEndian ){
    	if( !buffer ) throw new Error( "Buffer required" );
		if( buffer.length % 4 !== 0 ) throw new Error( "Buffer length not 32 bit word aligned" );

		var encodeUInt32 = ( littleEndian ) ? buffer.readUInt32LE : buffer.readUInt32BE;

        var words = [];
		for( var offset = 0; offset < buffer.length; offset+=4 ){
			words.push( encodeUInt32( offset ));
		}

		this.appendWords( words, false );
    };

	IntelHexFileOut.prototype.appendWords = function( words, littleEndian ){
        if( !words || words.length === 0 || words.length * 4 > SEGMENT_LENGTH_BYTES ){
            throw new Error("invalid number of words [" + words.length + "]");
        }

        var encodeAsString = ( littleEndian ) ? utils.numberToHexStringLittleEndian : utils.numberToHexString;

        var lineHexString = "";
        while( words.length ){
            lineHexString += encodeAsString( words.shift(), 8 );
            if( lineHexString.length === 32 ){
                this.appendHexString( lineHexString );
                lineHexString = "";
            }
        }

        if( lineHexString.length ){
            this.appendHexString( lineHexString );
        }
    };

	IntelHexFileOut.prototype.appendHexString = function( hexString ){
        if( !hexString || hexString.length === 0 || hexString.length > SEGMENT_LENGTH_BYTES || hexString.length % 2 !== 0 ){
            throw new Error("invalid length of hexString [" + hexString.length + "]");
        }

        while( hexString.length ){
            var lineHexCharLength = ( hexString.length < 32 ) ? hexString.length : 32;
            var lineHexString = hexString.slice(0, lineHexCharLength );

            hexString = hexString.slice( lineHexCharLength );

            this._handleBlockContinuation();

            var byteCount = lineHexString.length / 2;

            if( this.relativeAddress + byteCount > 0x10000 ){
                throw new Error("appendHexString cannot write across 63336 byte boundary");
            }

            this._writeHexString( lineHexString );

            this.relativeAddress += byteCount;
            if( this.relativeAddress == SEGMENT_LENGTH_BYTES ){
                this.extendedAddress += 0x0001;
                this.relativeAddress = 0x0000;
                this.lastAppendEndedAtBoundary = true;
            }
        }
    };

	IntelHexFileOut.prototype.close = function(){
        this.contents += ":00000001FF" + this.lineTerminator;     // write eof
    };

	IntelHexFileOut.prototype._writeExtendedAddress = function(){
        var data = this.extendedAddress;
        var intelHex = "02" + "0000" + "04" + utils.numberToHexString( data, 4);
        intelHex += this._crc( intelHex );
        this.contents += ":" + intelHex + this.lineTerminator;
    };

	IntelHexFileOut.prototype._writeHexString = function( hexString ){
        var byteCount = hexString.length / 2;
        var intelHex = utils.numberToHexString( byteCount, 2) + utils.numberToHexString( this.relativeAddress, 4) + "00" + hexString;
        intelHex += this._crc( intelHex );
        this.contents += ":" + intelHex + this.lineTerminator;
    };

	IntelHexFileOut.prototype._handleBlockContinuation = function(){
        if( this.lastAppendEndedAtBoundary ){
            this._writeExtendedAddress();
            this.lastAppendEndedAtBoundary = false;
        }
    };


	IntelHexFileOut.prototype._crc = function( intelHexString ){
        var sum = 0;
        for( var i=0; i < intelHexString.length; i += 2){
            var byteHexString = intelHexString.charAt(i)+intelHexString.charAt(i+1);
            sum += utils.hexToDecimal( byteHexString ) & 0xff;
        }
        var crc = (( sum ^ 0xff) + 1) & 0xff;
        return utils.numberToHexString( crc, 2 );
    };

	IntelHexFileOut.prototype._extendedAddressFromAddress = function( address ){
        return (address >>> 16 );
    };

	IntelHexFileOut.prototype._addressRelativeToExtendedAddress = function( address, extendedAddress ){
        var baseAddress = utils.toUInt32( extendedAddress << 16 );
        if( address < baseAddress || address - baseAddress > MAX_BASE_ADDRESS){
            throw new Error( "address must be 0 to 65535 bytes above baseAddress [" + baseAddress + "]");
        }

        return address - baseAddress;
    };

    module.exports = IntelHexFileOut;
})();