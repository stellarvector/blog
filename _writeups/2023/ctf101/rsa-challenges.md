---
layout: writeup
parent: CTF101
grand_parent: 2023
author: r98inver
category: crypto
tags: rsa
title: "RSA Challenges"
subtitle: ""
write_date: 2023-10-20
last_edit_date: 2023-11-06
layout: mathjax # Uncomment this line to enable MathJax
---

The third and last crypto session of **CTF101** was about RSA. We had three challenges of increasing difficulty.

## Read-inStructions-cArefully

The first challenge, as suggested by the name, was only about understanding how RSA encryption and decryption works. We are given all the information we need, especially $$p$$ and $$q$$:

```python
p = 277624116242636689 
q = 508436745298659223

n = p*q

m = b'sv{FAKE_FLAG}'
m = int.from_bytes(m)
print(f'{m = }')

e = 65537
c = pow(m, e, n)

print(f'{c = }')
# c = 111484536670786630159891018687021939
```

All we have to do is to compute 

$$\varphi = (p-1)(q-1),$$

then recover $$d = e^{-1}\bmod \varphi$$ and use it to decrypt:

```python
n = p*q

phi = (p-1)*(q-1)
d = pow(e, -1, phi)
m = pow(c, d, n)

m = m.to_bytes((m.bit_length()+7)//8, 'big')
print(f'{m = }')
# m = b'sv{RSA_1s_fun}'
```

## SPQR

The second challenge was the same, except that this time we are given `n = 101264313152893175913493633998971546542632990679253512564207556023
` instead of $$p$$ and $$q$$. To recover them we have to factorize. The number is too big for too simple methods like trial division, but can be easily handled by software like `sagemath`, `MAGMA` or the online [Alpertron Factorization Tool](https://www.alpertron.com.ar/ECM.HTM). Once we recover $$p$$ and $$q$$, we can apply the same decryption procedure as above and get the flag: `sv{f4ct0r1ng_1s_funn13r}`.

## leak

The final challenge was meant to be an actual RSA challenge. First of all, `n` is a (kind of) RSA size modulus:

```python
m = bytes_to_long(flag)
e = 65537
p = getPrime(512)
q = getPrime(512)
n = p*q
```

Factoring a `1024`-bit number directly is hopeless, so together with `c` we are given some *leaks*:

```python
phi = (p-1)*(q-1)
assert GCD(e, phi) == 1
c = pow(m, e, n)
print(f'{c = }')

d = pow(e, -1, phi)
leak = d*e - 1
for i in range(2):
	k = randint(21, 42)
	leak_i = leak * getPrime(512) + k
	print(f'leak_{i+1} = {leak_i}')
```

We are given two leaks: the value `leak = d*e - 1` is multiplied by two random primes of `512` bits each, then a little error `k` (a random number between `21` and `42`) is added to each one, and then they are returned to us. The firts step here is to recover the value of `leak`. Then we have to figure out how to factor exploiting this extra information (the challenge had a hint suggesting that this is possible).

So let's recover the `leak`. The first observation here is that if we knew `k1` and `k2` (the two values of `k` respectively), then we could recover `leak` by taking the `GCD(leak_1, leak2)`. This is true since each of them is multiplied by a big prime, which is a factor they are not likely to share. The same observation allows us to bruteforce `k1` and `k2`: we have in total ~400 possible pairs `(k1, k2)` to check, and for each of those we can just check if we get a reasonable `GCD`. If `k1` or `k2` are wrong, the resulting `leak_i - ki` will not share the common factor `leak`, and hence the `GCD` we get would probably be small.

```python
phi = (p-1)*(q-1)

assert GCD(e, phi) == 1

c = pow(m, e, n)
print(f'{c = }')

d = pow(e, -1, phi)
leak = d*e - 1

for i in range(2):
	k = randint(21, 42)

	leak_i = leak * getPrime(512) + k
	print(f'leak_{i+1} = {leak_i}')
```

Running this we get `k1 = 25` and `k2 = 27`, but most importantly the value of `leak`. Now the second part: how do we factor knowing `leak = d*e - 1`? As we can se from the challenge script (or from a generic knowledge of how RSA works), we know that it holds

$$ d \equiv e^{-1} \bmod \varphi$$

or equivalently

$$ de \equiv 1 \bmod \varphi.$$

But this tells us that `ed - 1` is a multiple of $$\varphi$$, and a bit of googling tells us that there exists a clever way to factor a number knowing a multiple of its totient. See for instance [this post](https://math.stackexchange.com/questions/12328/rsa-fast-factorization-of-n-if-d-and-e-are-known). This relies on the fact that $$\varphi(n)$$ is also the order of the multiplicative group of the numbers $$\bmod n$$. However, even without getting to much into the math explained there, we can implement their algorithm to find a factor for `n`:

```python
def find_factor(ed, n):
	h = ed # ed is e*d - 1 (or any multiple of phi)
	while h % 2 == 0:
		h = h // 2
	h = int(h)

	for cnt in range(100):
		print(f'{cnt = }')
		a = random.randint(2, n-2)
		g = GCD(a, n)
		if g != 1:
			print(f'{g = }')
			return g

		b = pow(a, h, n)
		while True:
			g = GCD(b-1, n)
			if g == 1:
				b = pow(b, 2, n)
				continue
			if g == n:
				break
			print(f'{g = }')
			return g
```

This gives us almost instantly a factor for `n`, from which we can get the flag: `sv{l34ks_m4k3s_3v3ryth1ng_34sy3r}`.

{: .new-title }
> Source Code
>
> The source code of the solution is available [here](https://gist.github.com/r98inver/c041c72140b5512c35ae348d53a4e4d4)

p.s. this challenge was inspired by a (harder) challenge that recently appeared in TeamItalyCTF. If you enjoyed it, go check out the [original one](https://training.olicyber.it/challenges#challenge-467)!

