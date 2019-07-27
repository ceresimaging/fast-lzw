#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#include "lzw-lib.h"

static const unsigned char *read_buffer = 0;
static unsigned char *write_buffer = 0;
static unsigned int read_head, write_head, read_buffer_length = 0;

static int read_buff (void)
{
    int value;

    if (read_head < read_buffer_length) {
        value = read_buffer[read_head++];
    }
    else
        value = EOF;

    return value;
}

static void write_buff (int value)
{
    if (value == EOF) {
        return;
    }


    write_buffer[write_head++] = value;
}

unsigned char * lzwDecompress(const unsigned char *buffer, unsigned int length, unsigned int *write_length) {
  read_buffer = buffer;
  read_buffer_length = length;
  write_buffer = malloc(sizeof(unsigned char) * length * 4);
  read_head = 0;
  write_head = 0;
  int result = lzw_decompress(&write_buff, &read_buff);
  if (result) {
    *write_length = 0;
    return write_buffer;
  } else {
    *write_length = write_head;
    return write_buffer;
  }
}
/*(
  void ff_lzw_decode_open(LZWState **p);
void ff_lzw_decode_close(LZWState **p);
int ff_lzw_decode_init(LZWState *s, int csize, const uint8_t *buf, int buf_size, int mode);
int ff_lzw_decode(LZWState *s, uint8_t *buf, int len);
int ff_lzw_decode_tail
) */

#include "lzw.h"
unsigned char * lzwDecompressFFMPEG(const unsigned char *buffer, unsigned int length, unsigned int *write_length) {
  int result;

  LZWState *state = 0;
  ff_lzw_decode_open(&state);
  result = ff_lzw_decode_init(state, 8, buffer, length, FF_LZW_TIFF);
  if (result) {
    printf("BLAH\n");
    return 0;
  }
  // TODO: pass this in
  int strip_size = length * 4;
  unsigned char *out = malloc(sizeof(char) * strip_size);
  *write_length = 0;
  *write_length = ff_lzw_decode(state, out, strip_size);
  //printf("Strip size: %d, %d\n", strip_size, *write_length);
  return out;

}