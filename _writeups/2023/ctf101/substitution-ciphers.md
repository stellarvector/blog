---
layout: writeup
parent: CTF101
grand_parent: 2023
author: r98inver
category: crypto
tags: single-key-xor vigenere
title: "Substitution Ciphers"
subtitle: ""
write_date: 2023-10-20
last_edit_date: 2023-11-06
layout: mathjax # Uncomment this line to enable MathJax
---

The second crypto session of **CTF101** focused on symmetric enctryption, and more specifically substitution ciphers.

## stellar-caesar

The first challenge was a simple Caesar Cipher, as hinted by the name. The ciphertext is `vy{vkliwlqj_olnh_wkh_dqflhqw_urpdqv}` and just putting this in CyberChef with [ROT13 shifted by -3](https://gchq.github.io/CyberChef/#recipe=ROT13(true,true,false,-3)&input=dnl7dmtsaXdscWpfb2xuaF93a2hfZHFmbGhxd191cnBkcXZ9Cg) returns the flag: `sv{shifting_like_the_ancient_romans}`. The shift of -3 could be either computed by knowing that the flag begins with `sv`, or guessed, since it was the one supposedly used by Caesar, or even bruteforced easily.

## trial-and-error

The second challenge was the python version of the Caesar Cipher: a single byte XOR. The idea here is to simply bruteforce all the possible keys, since there are only 256 possibilities to chose one byte, and then find a way to detect when the output is correct (checking by hand 256 possibilities is still duable, but automating it is much more helpful for the next challenge and way less boring). First of all, we need a function to xor a key against our plaintext. We can use the `xor` function from `pwntools` or write a simple helper function like this:

```python
def single_key_xor(data, k):
	out = bytes([x ^ k for x in data])
	return out
```

Here `k` is a number, which will simplify the next step. The simple way to check for correct output is to look for the presence of `b'sv{'` in the output.

```python
with open('out.xor', 'rb') as fh:
	data = fh.read()

for k in range(256):
	guess = single_key_xor(data, k)
	if b'sv{' in guess:
		print(guess)
		print(f'{k = }')
```

In the decrypted text, with `k=105`, we can find the flag: `sv{t1m3s_4r3_ch4ng1ng}`. Other strategies include checking that the most frequent characters in the output are either `e` or a whitespace, the two most common characters in written english, or checking that the whole output consists in ASCII characters. This is an example of the former, while we will see the latter in the next challenge:

```python
for k in range(256):
	guess = single_key_xor(data, k)

	e_count = guess.count(b'e')
	space_count = guess.count(b' ')

	max_count = max([ guess.count(bytes([i])) for i in range(256) ])

	if e_count == max_count or space_count == max_count:
		print(f'{k = }')
		print(f'{guess = }')
```

## pygenere

Once again the name tells us a lot about the challenge: we face a *Vigenere Cipher* in its python version, i.e. a multi-key xor. Unlike the previous exercise, we cannot bruteforce the keys: the number of possible keys of length $$s$$ is $$256^s$$, so we cannot hope to go much further than maybe 3 characters. We need to come up with a smarter method. There are three main things to observe:

- if we knew the key length, we do not have to bruteforce all the possible keys, but we could build the key character by character. Let say the length is three: then the first byte of the plaintext is xored with the first byte of the key, the second with the second, the third with the third, but then the fourth with the first and so on. So if we split the ciphertext in three groups, each one that got xored against a different byte of the key, we have three parallel instances of single key xor that we can target. This drasically reduce the bruteforce cost from $$256^3$$ to $$3 \times 256$$, which is very feasible;
- what we lose with this approach is the adjacence of the characters: we cannot hope to find the flag in any of the groups, since if `s` goes in the first group, `v` goes in the second and `{` in the third one; however, the frequency of the characters will stay more or less unchanged, and hence we can still look for `e` and whitespace as the most frequent characters or rule out keys that produce non ASCII characters;
- finally, notice that we made one big assumption: all that works if we know the key length, which we do not. There exist some smart techniques to guess the key length from the text (e.g. coincidence indexes) but they are usually not actually needed, especially if the key is not too long and the first two steps are implemented properly. What we can do instead is to bruteforce the key length and see how many good keys we get for each possible length; we will see that in this case for the wrong key length we authomatically filter all the possible keys.

Now let's implement it. First we need a function that tells us which single byte keys are good for a group of characters. The simplest option is to filter out all the keys that result in non ASCII plaintext, and return all the others.

```python
from pwn import xor
def good_keys(b):
	good = []
	for k in range(256):
		guess = xor(b, k)
		# Is only chars
		if min(guess.replace(b'\n', b'')) >= 32 and max(guess) <= 126:
			good.append(k)
	return good
```

Now the idea is that given a keylength `l` we split the ciphertext in `n` chunk, and for each of those we compute the good keys. We need two helper functions, the first that produces the chunks, and the second one that given a list of possibilities for each characters combines them all together (probably both can be done in one line or so with `itertools`, but none of this function will be the bottleneck of our approach and having handwritten helpers allows for extra flexibility in this kind of challenges).

```python
def bytes_to_chunks(b, n_chunks):
	chunks = [[] for _ in range(n_chunks)]

	for i in range(len(b)):
		chunks[i % n_chunks].append(b[i])

	return [bytes(c) for c in chunks]

def generate_all_keys(poss):
	all_comb = []

	count = [0 for _ in poss]
	while True:
		# Check if the count is valid
		for i in range(len(count)-1, 0, -1):
			if count[i] >= len(poss[i]):
				count[i] = 0
				count[i-1] += 1

		# If the first one is out of range return
		if count[0] >= len(poss[0]):
			return all_comb

		# Generate a key
		k = bytes([poss[i][count[i]] for i in range(len(poss))])
		all_comb.append(k)

		# Increment
		count[-1] += 1
```

Now, the last part: for each possible key length we can generate all the possible *good keys*. However, these can still be a lot (even with stricter constraint on what a good key is). So we need another good criterion to filter among the good keys to find the correct one. But now we are talking about full keys, so for each key we can recover the generated plaintext. There we can look for the flag, and discard all the keys that does not contain one. Since the flag starts with `sv{` and ends with `}`, we can even focus only on the part of the ciphertext contained among those characters, reducing a lot our manual work.

```python
def test_key(data, k):
	plain = xor(data, k)
	if not b'sv{' in plain:
		return False

	idx = plain.index(b'sv{')

	if not b'}' in plain[idx:]:
		return False

	end_idx = idx + plain[idx:].index(b'}')
	return plain[idx:end_idx+1]

data = open('out.xor', 'rb').read()

for keylen in range(1, 10):
	print(f'{keylen = }')

	chunks = bytes_to_chunks(data, keylen)
	good = [good_keys(c) for c in chunks]

	all_keys = generate_all_keys(good)
	print(f'Found {len(all_keys)} possible keys')

	for k in all_keys:
		is_ok = test_key(data, k)
		if is_ok:
			print('----------------------')
			print(f'{k = } --> guess = {is_ok}')
```

In the end we find 5 possible keys all of length 7, among which only one produce a meaningful result: the key is `stellar` and the resulting flag is `sv{p0ly4lph4b3t1c_cyph3r_m4st3r!}`.   

{: .new-title }
> Source Code
>
> The source code of the solution is available [here](https://gist.github.com/r98inver/48a1897f76515fcf06a531936ea86271)