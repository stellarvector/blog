---
layout: writeup
parent: CTF101
grand_parent: 2023
author: vikvanderlinden
category: web
tags: lfi insufficient-defense
title: "poster-thief-2"
subtitle: ""
write_date: 2023-10-11
last_edit_date:
# layout: mathjax # Uncomment this line to enable MathJax
---

> There's multiple pages! Luckily, the developer has cleaned the user's input, great! Or is it?
>
> The flag is at `/flag.txt`

When browsing through the site and going to the next page, you can see that a `page` query parameter is used to indicate which page has to be shown.
The fact that you are redirected to something like `/?page=start.html` should immediately catch your attention.
This may indicate that the backend of the website is taking the name of the file that is supplied and is blindly including it into the page.

This is a potential security vulnerability known as a (Local) File Inclusion (LFI): The backend is allowing us to include a file on the local filesystem in the displayed page.
The fact that a file is included is not a vulnerability on itself.
This can be a valid approach in building a website in certain cases.
But if the developer is not careful, we may be able to make the backend include *any* file on the server's filesystem.

In linux (which is the OS this challenge is running on, as are most websites) the filesystem can be traversed by using the `./` (current directory) and `../` (parent directory) paths.
So let's try to include a random file (no guarantee that it exists) at the parent directory: `?page=../test.html`.
The output is the following:

```
Heyy... Trying to LFI? No no no, I'm cleaning your input!

Warning: include(pages/test.html): Failed to open stream: No such file or directory in /home/web/src/index.php on line 64

Warning: include(): Failed opening 'pages/test.html' for inclusion (include_path='.:/usr/local/lib/php') in /home/web/src/index.php on line 64
```

## Gathering information from error messages

First of all: we see an error, this is a good sign for us (not for the developer).
We can learn a lot from looking at error messages.
For instance in this case:

1. The backend is indeed including a page using `include()`, a PHP function.
   (We can also know the site is running PHP by the structure of the error message which is very typical for PHP, or in a real-life scenario you would most likely run a fuzzer which would find that the `/index.php` is a valid endpoint, thereby confirming the use of PHP).
2. The backend is trying to include `pages/test.html`.
   Where did our `../` go?
3. The location of the file is leaked: `in /home/web/src/index.php on line 64` shows us the the running script (`index.php`) threw this error at line 64.
   We already know that the script is trying to include `pages/<our input, but filtered>` so that means we need to go up one level in the file structure (`../`) 4 times to reach the root path (`/`) where the flag is located, keep this in mind for later.
   
That's a lot of information from just two simple error messages.

## Constructing a payload

So the question that remains is: Where did `../` go?
The first part of the site's output is `Heyy... Trying to LFI? No no no, I'm cleaning your input!`.
This points to some sort of filtering that is being performed.
Great, because the developer knew about the possibility of a LFI and implemented a defense.
Now, completely defending against most vulnerabilities is quite difficult, and sometimes very simple defenses are used that have been shown to be easily circumventable.

So lets think about what is happening in the backend?
The defense applied is very simple, trivial even (of course you don't know this and will have to test and try different circumventions to get an idea of the defense(s) used).
It is referred to by HackTricks as *traversal sequences stripped non-recursively*.
This means that the developer was aware of the potential vulnerability (good) and tried to defend against the vulnerability by removing the `../` sequence (and potentially other 'traversal sequences'; good).
But they don't remove these sequences recursively, a.k.a. they remove them only once.
This gives us the opportunity to construct a payload that, after stripping the occurrences of `../`, still ends up with `../` sequences in it.
An example of this is `....//`: remove the `../` and you end up with `../`.

When you don't know this is the implemented defense, you could go to [HackTricks](https://book.hacktricks.xyz/) to find some possibly useable payloads and test variations of them.
HackTricks has [a page on (L)FI/Path Traversal](https://book.hacktricks.xyz/pentesting-web/file-inclusion) and one of the first sections in this page on HackTricks is the *Basic LFI and bypasses* section.
When you're looking at some of the first payloads you will come across this one: `....//....//....//etc/passwd`.
As shown previously, removing `../` from this sequence still leaves some `../` in the payload after filtering so this should work right?
Of course, we want to find `/flag.txt` so we will try to use: `....//....//....//flag.txt`.

```
Warning: include(pages/../../../flag.txt): Failed to open stream: No such file or directory in /home/web/src/index.php on line 64
```

Hey, it's not working, the error is still visible.
But in the error message, we do now see the `../` appear, so that's good at least (**use the error messages to deduce info**).

## Tying everything together

This means our circumvention worked as expected, but something is still missing.
Remember point 3 in the list of info we gathered from the original error messages: we have to traverse up 4 levels in the file-structure to reach the `/` (root) level.
The payload from HackTricks only traverses 3 levels up, which is insufficient in our case.
So the point being: **don't just copy and paste payloads to test them, understand and adapt them** to the specific vulnerability/use-case you are seeing.

So now we finally arrive at the following, working payload: `?page=....//....//....//....//flag.txt`.
You can add `....//` even more times because it's impossible to go to the parent directory of `/` as there is none.
That means often a long list of `../` (or in this case `....//`) can be used to automatically test for these types of vulnerabilities.

When you use this payload, you'll find the flag: `sv{f1lt3r1ng_is_h4rd_s0_us3_4ll0wl1sts}`.
