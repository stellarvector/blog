---
# layout: writeup
parent: "HackTheBox University CTF: Brains & Bytes"
grand_parent: 2023
author: r98inver
category: crypto
tags: rsa coppersmith
title: "mayday-mayday"
subtitle: ""
write_date: 2023-12-11
last_edit_date:
layout: mathjax # Uncomment this line to enable MathJax
---

An RSA challenge with leakage of MSB from the CRT exponents of the private key. The parameters allow an attack described in a paper by May (hinted by the title), Nowakowski and Sarkar leveraging the Coppersmith method to recover the key.

## Challenge Description

The challenge setting is quite simple. We have a `Crypto` class defining some parameters:

```python
self.bits = bits
self.alpha = 1/9
self.delta = 1/4
self.known = int(self.bits*self.delta)
```

The class then generates an RSA instance using CRT exponents:

```python
while True:
    p, q = [getPrime(self.bits//2) for _ in '__']
    self.e = getPrime(int(self.bits*self.alpha))
    print(f'{self.e.bit_length() = }')
    φ = (p-1)*(q-1)
    try:
        dp = pow(self.e, -1, p-1)
        dq = pow(self.e, -1, q-1)
        self.n = p*q
        break
    except:
        pass
```

The challenge is run with `bits = 2048` (which means `p` and `q` are both `1024` bits). We are given the public key together with a leak of the MSB of the CRT exponents:

```python
dp = f'0x{(dp >> (rsa.bits//2 - rsa.known)):x}'
dq = f'0x{(dq >> (rsa.bits//2 - rsa.known)):x}'
```

## Solution

The solution is explained in great detail [here](https://eprint.iacr.org/2022/271.pdf). This attack works in general, but is even more efficient for $$e \sim N^{1/12}$$ (in our case is `self.bits*self.alpha` so roughly $$N^{1/9}$$; this unusual choice is already extremely suspicious). First, we write

$$
d_p = d_p^M 2^i + d_p^L
$$

and the same for $$d_q$$. We knwo $$d_p^M$$ from the leak, and in our case $$i = 512$$. Section 3.1 gives us a way to compute $$k$$ and $$l$$, where $$ed_p = k(p - 1) + 1$$. First, we need to compute $$A$$:

```python
i = 512
dpM = dp
dqM = dq
A = (pow(2, 2*i) * pow(e, 2) * dpM * dqM)//N + 1
```

Then, notice that in our case (with the paper notation) 

$$
\delta = \frac{1}{4} < \frac{1}{2} - \frac{2}{9} \sim 0.27
$$

so we are just inside the boud. Then we can recover $$k$$ and $$l$$ as roots of the appropriate polynomial:

```python
x = PolynomialRing(RationalField(), 'x').gen()
C = (1 - A*(N-1)) % e
f = x**2 - C*x + A
roots = f.roots()
if roots == []:
    f = x**2 - (C + e)*x + A
    roots = f.roots()
k = roots[0][0]
l = roots[1][0]
assert k*l == A
```

Finally, given $$k$$, we can go to Section 3.3. Here a bit of trial and error is required, since we do not know if $$k$$ is actually associated to $$d_p$$ or $$d_q$$, but this is not a big effort. Notice that we do our computation modulo $$kN$$ (the paper mention $$kp$$, which may be somewhat confusing). Here applying Coppersmith method for small roots we can find a factor for $$N$$.

```python
x = PolynomialRing(Zmod(k*N), 'x', implementation='NTL').gen()
# Assume k is the coefficient of dp
a_small = (e * dpM * (2**i) + k - 1) * inverse_mod(e, k*N)
a_small = int(a_small)
f = x + a_small
my_dpL = f.small_roots(X=2**i-1, beta=0.5)

# Is actually with dq
if my_dpL == []:
    a_small = (e * dqM * (2**i) + k - 1) * inverse_mod(e, k*N)
    a_small = int(a_small)
    f = x + a_small
    my_dqL = f.small_roots(X=2**i-1, beta=0.5)[0]
    p = gcd(f.subs(x=my_dqL), N)
    print(f'{p = }')

else:
    my_dpL = my_dpL[0]
    print(my_dpL == dpL)
    print(f'{p = }')
```

Finally, with the factorization we can decrypt the flag: `HTB{f4ct0r1ng_w1th_just_4_f3w_b1ts_0f_th3_CRT_3xp0n3nts!https://eprint.iacr.org/2022/271.pdf}`. With no surprise, it points again at the [paper](https://eprint.iacr.org/2022/271.pdf) we've been using through all the challenge!

{: .new-title }
> Solve Script
>
> The full solution script can be found [here](https://gist.github.com/r98inver/6d9a13b163e3ade44b92f36fc8ce6993)
