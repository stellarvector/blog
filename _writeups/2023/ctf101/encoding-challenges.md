---
parent: CTF101
grand_parent: 2023
author: r98inver
category: crypto
tags: base16 base64
title: "Encoding Challenges"
subtitle: ""
write_date: 2023-10-20
last_edit_date:
layout: mathjax # Uncomment this line to enable MathJax
---

The first two crypto challenges of **CTF101** were about *encoding*. 

## sv-encoder

We are given a Python script encoding the flag: 

```python
import base64 as b64

flag = b'sv{FAKE_FLAG}'
flag = b64.b16encode(flag)
for i in range(20):
	flag = b64.b64encode(flag)
for j in range(5):
	flag = b64.b16encode(flag)
flag = flag.decode()
with open('out.txt', 'w') as fh:
	fh.write(flag)
```

As we can see, the flag is encoding with `base16`, then `base64` 20 times, then again 5 times `base16`. We are also given the output in `out.txt`. The solution consists of reversing the process, step by step:

```python
import base64 as b64

with open('out.txt') as fh:
	flag = fh.read().strip()
flag = flag.encode()
for j in range(5):
	flag = b64.b16decode(flag)
for i in range(20):
	flag = b64.b64decode(flag)
flag = b64.b16decode(flag)
print(f'{flag = }')
# flag = b'sv{enc0d1ng_1s_n0t_3ncrypt10n}'
```

## sv-vs-encoder

The second challenge was a bit more involved. This time we have a custom encoding function, `magic_shuffle`:

```python
def magic_shuffle(poor_string):
	assert type(poor_string) == bytes, 'Magicians only use bytestrings'

	magic_string = b''

	for c in poor_string:
		
		mask = 0b11
		b0 = c & mask
		b1 = (c >> 2) & mask
		b2 = (c >> 4) & mask
		b3 = (c >> 6) & mask

		magic_char = bytes([bi + 32 for bi in [b1, b3, b0, b2] ])
		# print(f'{magic_char = }')

		magic_string += magic_char

	return magic_string
```

The flag is shuffled using this function and then `base16` encoded.

```python
flag = b'sv{FAKE_FLAG}'

flag = magic_shuffle(flag)
flag = b64.b16encode(flag)
```

Let's look closer at `magic_shuffle`: for each character `c` in our string we do three things:

- first we derive values `b0` to `b3` by using a `mask = 0b11` and a binary shift: this means that `b0` are the last two significant bits of `c`, `b1` the next two and so on; for instance, `a` in binary is `0b1100001`, and hence we would get `b0 = 0b01`, `b1 = 0b00`, `b2=0b10` and `b3 = 0b01`;
- then we add `32` to each one of the `bi`;
- finally, they are shuffled, and a bytestring made by `[b1, b3, b0, b2]` is returned; for instance, if we try to encode `b'a'` we get `b' !!"'`.

The key observation here is that for each single byte we encode, we get four bytes, and that these four bytes entirely define the starting byte. All we have to do is once again go backwards: for each tuple of four bytes we take them, we unshuffle them, we subtract 32 from each one of them and then put them one next to each other to rebuild the original byte.

```python
def magic_unshuffle(shuffled_string):
	assert type(shuffled_string) == bytes

	assert len(shuffled_string) % 4 == 0 # Each char is encoded in 4 chars

	out = []

	while shuffled_string != b'':
		# Take the first 4 chars
		next_chars, shuffled_string = shuffled_string[:4], shuffled_string[4:]

		# Unshuffle
		b1 = next_chars[0] - 32
		b3 = next_chars[1] - 32
		b0 = next_chars[2] - 32
		b2 = next_chars[3] - 32

		# Reconstruct
		c = b0 + (b1 << 2) + (b2 << 4) + (b3 << 6)
		
		out.append(c)

	return bytes(out)
```

Before applying this, we have to `base16` decode our input, and we are done:
```python
flag = b'20212323212122232221232320212323202020232321232122212123202020232121212323212321212020232021222320202323232123212120202323212321232121222120202321212322202021232021232220202123212020232321222223212321212120232020202320202023202021222020212223212123'
flag = b64.b16decode(flag)
flag = magic_unshuffle(flag)
# flag = b'sv{s0_y0u_4r3_4_m4g1c14n_t00!!}'
```
