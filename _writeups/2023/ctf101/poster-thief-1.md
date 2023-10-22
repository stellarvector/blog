---
layout: writeup
parent: CTF101
grand_parent: 2023
author: vikvanderlinden
category: web
tags: security.txt
title: "poster-thief-1"
subtitle: ""
write_date: 2023-10-11
last_edit_date:
# layout: mathjax # Uncomment this line to enable MathJax
---

> Look at this new site, it's very secure and has good security policies!

This challenge hints to the security policies on the website.

On the site, the following message is displayed in the upper right corner of the site: "Please contact me if you find any security problems in this amazing story!"

These two messages hint to a very specific file: [`security.txt`](https://securitytxt.org/).
This file is defined as a standard: [RFC9116](https://www.rfc-editor.org/rfc/rfc9116).
Basically: This is a file that allows you to communicate contact information that users should reach out to if they have found some sort of security vulnerability or problem.

Solving this challenge is a matter of visiting that file and reading the flag.
The challenge boils down to understanding that the descriptions point to the `security.txt` file and finding the location of that file.
When found (it is located in the `.well-known` directory), upon a simple visit you can see that the flag is simply written in the `security.txt`-file.

At the path `/.well-known/security.txt`, you'll find:

```
Contact: mailto:security@stellarvector.be
# So secure!!
# sv{s3cur1ty.txt_ftw!}
```

For more information regarding the `security.txt` usage, read: [https://almanac.httparchive.org/en/2022/security#securitytxt](https://almanac.httparchive.org/en/2022/security#securitytxt)

Go ahead and visit some other websites' `security.txt` policies:

* [Google](https://www.google.com/.well-known/security.txt)
* [Facebook](https://www.facebook.com/.well-known/security.txt)
* [Apple](https://www.apple.com/.well-known/security.txt)
* There's many more, of course
