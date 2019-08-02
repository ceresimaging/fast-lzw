
EMCC ?= emcc
EXPORTED_FUNCTIONS = "[\
	'_lzwDecompress'\
]"

lzw-wasm.js: wrapper.c Makefile
	${EMCC} *c \
		 ffmpeg/*c ffmpeg/libavutil/log.c ffmpeg/libavutil/mem.c ffmpeg/libavutil/bprint.c \
		-w \
		-I . -I ffmpeg \
		-o lzw-wasm.js \
		-s EXPORTED_FUNCTIONS=$(EXPORTED_FUNCTIONS) \
		-s STRICT=1 \
		-O3 \
		--closure 1 \
		-s TOTAL_MEMORY=200MB \
		-s FILESYSTEM=0 \
		 -s ALLOW_MEMORY_GROWTH=1 \
		-s WASM=1 \
		-s SINGLE_FILE=1 \
		-s MODULARIZE=1 \
		-s EXPORT_ES6=1 \
		-s 'EXTRA_EXPORTED_RUNTIME_METHODS=["ccall", "cwrap"]' \
		-s NO_EXIT_RUNTIME=1 \
	
clean:
	rm lzw-wasm.js