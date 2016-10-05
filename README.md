# node-intelhex

Conversion between binary and intel-hex files, and programmatic construction of intel-hex files.

## Usage

```
var intelhex = require('node-intelhex');

intelhex.binaryFileToIntelHexFile( "binaryFile.bin", "intelHex.hex" );
intelhex.intelHexFileToBinaryFile( "intelHex.hex", "binaryFile.bin" );

```

## Binary Data to Intel-Hex

*Convert a file* using `binaryFileToIntelHexFile( binaryFileName, intelHexFileName, startAtAddress )`

*Convert a buffer* in memory using `binaryToIntelHex( buffer, startAtAddress )`

Use `startAtAddress` to specify the starting memory location of the first byte in the binary file. For example, the binary data
may need to be loaded at 0x18000, so use `binaryToInelHex( buffer, 0x18000 )`

## Intel-Hex to Binary Data

*Convert a file* using `intelHexFileToBinaryFile( intelHexFileName, binaryFileName, options )`

*Convert a text string to a buffer* in memory using `intelHexToBinary( intelHexString, options )`

Use `options` to specify any of the following:

```
{
	 startAtOffsetZero: boolean,    // default=false, binary file begins at address zero, even when first data address in intelFile is > 0
	 maxBinaryAddress: integer,     // default=0x20000000, maximum binary address, determines size of buffer required in RAM
	 verbose: boolean,              // default=false, logs processing to console
}

```

## Programmatically Creating an Intel-Hex File

Build an intel-hex programmatically using  `var processor = new intelhex.BufferToIntelHexProcessor( startAddress )` and the following functions:

```

processor.setAddress( address );                        // location for the next block data
processor.appendBuffer( buffer, littleEndian);          // append data from buffer, default is littleEndian=false
processor.appendWords( words, littleEndian );           // append data from array of words, default is littleEndian=false
processor.appendHexString( hexString );                 // append bytes from hex string
processor.writeHexStringAtAddress(address, hexString);  // set the current address and append bytes from the hex string 
processor.close();                                      // finish and append file terminator

var intelHexFileData = processor.contents;              // retrieve finished data string
```


## Brief Summary of Intel-Hex Formatting

From https://en.wikipedia.org/wiki/Intel_HEX

Only I16HEX formatting is supported, which supports 32 bit addressing through the Extended Segment Address.

The Intel Hex Line Format is `:llaaaatt[dd...]cc`

Where
* ll = data length
* aaaa = lower 16 bit address
* tt = record type
* dd = data (hex)
* cc=checksum = 2's comp of negative of sum of all record bytes
  
Record Types are
* 00 - data record
* 01 - end-of-file record
* 02 - extended segment address record
* 04 - extended linear address record
* 05 - start linear address record (MDK-ARM only)

_This module only uses extended segment addresses (02)_

The default hex line terminator is `\n`, which can be changed by setting `processor.lineTerminator`.