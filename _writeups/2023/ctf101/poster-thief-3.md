---
layout: writeup
parent: CTF101
grand_parent: 2023
author: vikvanderlinden
category: web
tags: curl
title: "poster-thief-3"
subtitle: ""
write_date: 2023-10-11
last_edit_date:
# layout: mathjax # Uncomment this line to enable MathJax
---

> HEAD over to the site once more and discover the last flag!
> 
> Use [`curl`](https://linux.die.net/man/1/curl) for this one.

The description of this challenge clearly hints to a HTTP HEAD request.
A HEAD request is the same as a GET request, but only the headers are returned, not the body.
Using curl, a head request can easily be sent using `curl $SITE --head`.

The response is: 

```
HTTP/1.1 200 OK
Server: nginx/1.25.2
Date: Sun, 22 Oct 2023 13:24:31 GMT
Content-Type: text/html; charset=UTF-8
Connection: keep-alive
Host: poster-thief
X-Powered-By: PHP/8.2.11
Error: Please visit though the stellar-browser
```

The response-headers give away quite some information, and this information could be useful when you are trying to find vulnerabilities.
For example, you could use the version in the `Server` or `X-Powered-By` headers to find vulnerabilities in those specific applications.
In this case though, there is a non-standard header `Error` that contains a message for us: `Please visit though the stellar-browser`.

When a browser sends a request to a server, it usually sends the `User-Agent` header along.
In this header, the browser version etc. is communicated to the server, so that server can adapt their response to the value of the header.
We want to change this header to have the value of `stellar-browser`.
A header value can be set in curl using the `-H` flag: `curl $SITE --head -H "User-Agent: stellar-browser"`.

The error now reads: `You can only get a flag if you were referred by play.stellarvector.be`.
This points to the `Referer` (no, it's not the correct spelling, but that's the way it is, these days `Referrer` is often accepted as well) header.
This header is sent by the browser when a navigation occurs.
If you click a link on site `A` in a browser, you were referred to the next page by that site `A`, and site `A` will be the value in the `Referer` header.
Let's change it: `curl $SITE --head -H "User-Agent: stellar-browser" -H "Referer: play.stellarvector.be"`.

Next: `You can only get a flag in 2024`.
We can set the `Date` header to indicate what date and time it is at the moment.
But it's not necessary to structure this header correctly.
HTTP does require a certain structure for a number of headers (like the Date header), but this is just so servers and browsers (or other clients) know how to interpret the values.
There is no strict check on how a header is formatted, you can theoretically send whatever you want in a header, your request/response just might not be interpreted correctly.
So lets just send the year instead of the full structured date: `curl $SITE --head -H "User-Agent: stellar-browser" -H "Referer: play.stellarvector.be" -H "Date: 2024"`.

Now: `You can only get a flag if you request to not be tracked`.
In modern browsers, you can ask the browser to request to opt out of tracking by the server.
The browser will send the `DNT` (*Do Not Track*) header with a value of 1, which we will mimic: `curl $SITE --head -H "User-Agent: stellar-browser" -H "Referer: play.stellarvector.be" -H "Date: 2024" -H "DNT: 1"`

Finally, the server asks: `You can only get a flag in french`.
This hints towards the `Accept-Language` header.
We can request the page with `fr` as value of that header: `curl $SITE --head -H "User-Agent: stellar-browser" -H "Referer: play.stellarvector.be" -H "Date: 2024" -H "DNT: 1" -H "Accept-Language: fr"`

Upon making that request, the flag is printed in the `sv-flag` header.
Or, in a one-liner:

```bash
curl -s $SITE -H "User-Agent: stellar-browser" -H "Referer: play.stellarvector.be" -H "Date: 2024" -H "DNT: 1" -H "Accept-Language: fr" --head | grep -o sv{.*}
```

Which prints `sv{h34d3rs_c4n_easily_b_f0rged}`.
