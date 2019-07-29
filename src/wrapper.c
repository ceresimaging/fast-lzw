#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#include "lzw.h"
unsigned char * lzwDecompress(const unsigned char *buffer, unsigned int length, unsigned int *write_length) {
  int result;

  LZWState *state = 0;
  ff_lzw_decode_open(&state);
  result = ff_lzw_decode_init(state, 8, buffer, length, FF_LZW_TIFF);
  if (result) {
    return 0;
  }
  int strip_size = length * 4;
  unsigned char *out = malloc(sizeof(char) * strip_size);
  *write_length = 0;
  *write_length = ff_lzw_decode(state, out, strip_size);
  return out;

}