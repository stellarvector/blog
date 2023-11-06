---
parent: LakeCTF
grand_parent: 2023
author: r98inver
category: crypto
tags: ecc invalid-curve-attack
title: "keysharer"
subtitle: ""
write_date: 2023-11-06
last_edit_date:
layout: mathjax # Uncomment this line to enable MathJax
---

A custom implementation of EC keysharing does not check if the provided public key lies on the curve. Due to the limited number of queries we have to find points of high enough order, and we can recover the flag.

## Challenge Description

The challenge implements an elliptic curve key exchange protocol. First of all, the `Curve` and `Point` classes are defined. Everything is quite standard, except from the fact that the function used to compute multiples of a point has no checks on whether the point actually lies on the curve or not. This will be the key ingredient to solve the challenge.    
After that, the server initializes its parameters: the curve, which is NIST P-192, a point `G`, whose `x` coordinate is the flag, a secret integer `PK` between 1 and `p` and the public key `pub = G * PK`.

```python
p = 0xfffffffffffffffffffffffffffffffeffffffffffffffff
a = 0xfffffffffffffffffffffffffffffffefffffffffffffffc
b = 0x64210519e59c80e70fa7e9ab72243049feb8deecc146b9b1
curve = Curve(a,b,p)
flag = os.getenv("flag","EPFL{fake_flag}")
flag = bytes_to_long(flag.encode())
G = Point(flag,curve.find_y(flag),curve)
PK = randrange(1,p)
pub = PK * G
```

We are given the point `pub`, and then for 4 times we are asked to send a public key consisting in the `x` and `y` of a point. For each public key the server returns a shared secret, given by `pub_key * PK`. 

```python
for i in range(4):
	your_pub_key_x = int(input(f"Gimme your pub key's x : \n"))
	your_pub_key_y = int(input(f"Gimme your pub key's y : \n"))
	your_pub_key = Point(your_pub_key_x,your_pub_key_y,curve)
	shared_key = your_pub_key * PK
	print(f"The shared key is\n {shared_key}")
```  

## The invalid curve attack

Every time we send a point `P` as a public key, the server returns `P * PK`. The point multiplication is computed using the usual addition laws for elliptic curves. However, the custom implementation of the `Curve` class does not check whether `P` is on the curve or not before performing the multiplication. This allows us to mount the *invalid curve attack*. This is a rather famous attack, for which detailed explainations can be found online (see for instance [this](https://crypto.stackexchange.com/questions/71065/invalid-curve-attack-finding-low-order-points) post or [this](https://www.hackthebox.com/blog/business-ctf-2022-400-curves-write-up) wirteup). The high level idea is the following: an elliptic curve is (usually) defined by two parameters, `a` and `b`. Both parameters appears in the curve equation, which tells us if a point is on the curve or not, but then the usual addition law only depends on `a`. So we have a whole family of elliptic curves (one for each `b`) with different points but the same addition law. Cryptographical curves (like NIST P-192) are chosen such that their points form a cyclic group of big prime order; this makes the DLP on these curves very hard. However, this is no longer true for the invalid curves (the ones with a different `b`): they will generally have points of lower order that make the DLP much easier. If we send a point `P` of order `q << p`, the server will try to compute `P * PK` but will actually compute `P * (PK % q)`. Computing the discrete logarithm between `P` and the point we get from the server will fastly give us `PK % q`. If we can do this for different values of `q` we can finally recover `PK` using CRT.

## Point choice

Here comes the (little) twist of this challenge: we are only allowed to run 4 queries. The flag is the `x` coordinate of the point `G`, and we are given `G * PK` where `PK` is computed at random each time. This means that we need to recover `PK` within a single interaction with the server. Since `p` (and consequently `PK`) is `192` bits, for each query we need `q ~ 2^50` for the CRT to work. On the other hand, `sage` is able to compute the discrete logarithm for primes up to `~2^40`. However this is not a problem: we can easily do that using composite orders. The CRT obviously still works, as long as the orders are coprime. Fot the discrete logarithm, thanks to the [Polhig-Hellman](https://en.wikipedia.org/wiki/Pohlig%E2%80%93Hellman_algorithm) algorithm, the runtime mostly depends on the highest prime factor of the order. This means that computing the `dlog` for orders that are `2^40`-smooth (i.e. all their prime factors are below `2^40`) is roughly the same as computing it for `q ~ 2^40`. We only need to be a little bit more careful in the choice of our points. All this can be done easily in `sage`, and returns us good points quite quickly.

```python
def get_invalid_point(p, a, known_factors = [], check_point = False):
	"""
	Input: the prime p, the fixed curve parameter a, and the already know factors
		that we do not want to repeat. Optionally we can check how much does it take
		to solve the dlp for a point before returning it with check_point=True.
	Output: an invalid point Q, the parameter b defining its curve, and the factors
		of its order.
	"""
	while True:
		b = randint(1, p)
		E = EllipticCurve(GF(p), [a, b])
		order = E.order()
		factors = prime_factors(order)
		
		# Compute the best order we can get from a point
		good_factors = []
		for f in factors:
			if f.nbits() <= 40 and not f in known_factors:
				good_factors.append(f)

		cof = prod(good_factors)
		if cof.nbits() >= 50:
			print(f'Found curve')
			break
	
	# Now that we have a good curve, we need to find the point
	G = E.gen(0) * (order // cof)
	assert G.order() == cof

	if check_point:
		# Sanity check that we can actually solve the invalid dlp
		r = randint(1, cof)
		Q = G*r

		print(f'Solving dlog for {cof.nbits()} bits order')
		tic = time()
		dlog = G.discrete_log(Q)
		assert dlog == r, (r, dlog)
		print(f'Done in {round(time() - tic, 2)} s')

	return G, b, good_factors
```

## Final solution

Once we have four good points of order at least `2^50` we can query the server. Solving the four dlogs is easy by construction, and then we can recover `PK` using CRT. We are given `G * PK`, so to recover `G` (and hence the flag) we only need to compute `PK^-1` modulo the order of the NIST P-192 curve. 

{: .new-title }
> Source Code
>
> The full solution script can be found [here](https://gist.github.com/r98inver/15607feb69f09e511eca38aee6389c75)
