---
layout: writeup
parent: DownUnderCTF
grand_parent: 2023
author: r98inver
category: crypto
tags: rsa
title: "apbq-rsa-1"
subtitle: ""
write_date: 2023-09-07
last_edit_date:
---

## Challenge description

In this challenge, we face a standard [RSA](https://en.wikipedia.org/wiki/RSA_(cryptosystem)) implementation:

```python
p = getPrime(1024)
q = getPrime(1024)
n = p * q
e = 0x10001
```
`p` and `q` are two big primes, and `e = 0x10001` is the standard choice for public exponent. These parameters are used to encrypt the flag:

```python
FLAG = open('flag.txt', 'rb').read().strip()
c = pow(bytes_to_long(FLAG), e, n)
print(f'{n = }')
print(f'{c = }')
```

Together with the ciphertext `c` and the base `n` we are also given some *hints*:

```python
hints = []
for _ in range(2):
    a, b = randint(0, 2**12), randint(0, 2**312)
    hints.append(a * p + b * q)

print(f'{hints = }')
```

## Solution

We know that to decrypt RSA it is enough to factor `n`. However `n = p*q` where `p` and `q` are `1024-bits` primes, and hence direct factorization is not an option. We must find a way to use the hints instead. 

The first observation is the following. Let us call our hints `h1 = a1*p + b1*q` and `h2 = a2*p + b2*q`. Then if only we knew `a1` and `a2` we could compute `H = a1*h2 - a2*h1`, to obtain `(a1*b2 - a2*b1)*q`. Now this number shares a factor (`q`) with our public modulus `n`; we can efficently compute `gcd(n, H) = q`, and then recover `p = n // q`. Of course the same reasoning applies to `b1*h2 - b2*h1` which gives us `p`. 

This would allow us to recover the flag. However we do not know either `a1` and `a2` or `b1` and `b2`. Looking at the code `b1` and `b2` are two random integers between `0` and `2**312`, but `a1` and `a2` are both lower than `2**12 = 8192`, which means we can brute-force it. The total number of possible combinations of `(a1, a2)` is `2**26 = 67108864`, which is expensive but still doable. However, we can easily reduce it further by looking at coprime `a1` and `a2` (meaning that `gcd(a1, a2) = 1`). This is because if `a1` and `a2` have one factor in common we can divide the whole expression by this common factor and get another (duplicate) solution. For every possible pair of coprime `a1` and `a2` we just compute `H` and check `gcd(n, H)`. If this is `1` it means we picked the wrong pair. Otherwise we got a factor of `n`, and we can use it to solve the challenge.

```python
from sage.all import gcd
import time

def bf_hints(hints, n):
	h1, h2 = hints
	tic = time.time()

	for a1 in range(2**12):
		if a1 % 100 == 0:
			print(f'{a1 = }/{2**12} [t = {round(time.time()-tic, 2)} s]') # Print elapsed time
			tic = time.time()

		for a2 in range(2**12):
			if gcd(a1, a2) != 1:
				# Skip if a1 and a2 are not coprime
				continue

			guess = a1 * h1 - a2 * h2
			q = gcd(n, guess)
			if q != 1:
				# Win
				print(f'Hit: {a1 = } {a2 = }')
				return int(q)
```

Notice that this may still take a couple of minutes: for this reason I added a line of code to check our progress once in a while and print the elapsed time. The function `gcd` is taken from [SageMath](https://www.sagemath.org/) since it's faster, but `math.gcd` would work as well. Now we can load `n` and `hints` from the output we are given, and run this function.

```python
q = bf_hints(hints, n)

assert n % q == 0
p = n // q
```

Once we have `p` and `q` we can compute `phi = (p-1)*(q-1)`, and then `d = pow(e, -1, phi)`, the private exponent we need to invert the ciphertext. In this way we finally recover the flag:

```python
phi = (p-1)*(q-1)

d = pow(e, -1, phi)
m = pow(c, d, n)

print(m.to_bytes((m.bit_length() + 7) // 8, "big")) # b'DUCTF{gcd_1s_a_g00d_alg0r1thm_f0r_th3_t00lbox}'
```
