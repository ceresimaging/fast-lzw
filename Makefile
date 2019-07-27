
EMCC ?= emcc
EXPORTED_FUNCTIONS = "[\
  '_lzwDecompress',\
	'_lzwDecompressFFMPEG'\
]"

lzw.js: wrapper.c lzw-lib.c lzw-lib.h lzwfilter.c
	${EMCC} *c \
		 ffmpeg/*c ffmpeg/libavutil/log.c ffmpeg/libavutil/mem.c ffmpeg/libavutil/bprint.c \
		-I . -I ffmpeg \
		-o lzw.js \
		-s EXPORTED_FUNCTIONS=$(EXPORTED_FUNCTIONS) \
		-s TOTAL_MEMORY=1024MB \
		-s WASM=1 \
		-s SINGLE_FILE=1 \
		-s MODULARIZE=1 \
		-s EXPORT_ALL \
		-s 'EXTRA_EXPORTED_RUNTIME_METHODS=["ccall", "cwrap"]' \
		-s NO_EXIT_RUNTIME=1
	
clean:
	rm lzw.js