( function(){

	function BinaryBlock( address ){
		this.startAddress = address;
		this.data = new Buffer(0);
	}

	BinaryBlock.prototype.appendBuffer = function( buffer ){
		this.data = Buffer.concat( [this.data, buffer] );
	};

	BinaryBlock.prototype.endAddress = function(){
		return this.startAddress + this.data.length;
	};

	module.exports = BinaryBlock;

})();