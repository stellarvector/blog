---
layout: writeup
parent: "CTF101 Ghent"
grand_parent: 2024
author: victor
categories: osint misc
tags: 
title: "sightseeing-in-ghent"
subtitle: ""
write_date: 2024-03-01
last_edit_date:
---

> I was walking around the city recently (29 February 2024, to be precise), when I came across this cool statue. 
> At first they were not that happy with him, but now everyone gives him rave reviews.
>
> Can you find the flag for me?
> 
> <img src="https://play.stellarvector.be/files/93dfbeff12e6f9ea40af928864de01a9/big_guy.jpeg" width="360" alt="Picture of a statue">

## Image recognition

Step 1 is recognizing the statue in the image. 
Anyone who's been around Ghent should have seen this statue of [Jacob van Artevelde](https://en.wikipedia.org/wiki/Jacob_van_Artevelde) on the Vrijdagmarkt.

Step 2 is finding out more about Jacob. 
What would be a website where people can give *reviews* and that you would use while *walking around the city*?

Right, Google Maps! 
Let's look for [Jacob's pin on Google Maps](https://maps.app.goo.gl/fwfxm5mCb7DUm8YQ6), and browse through the recent reviews (sorting on 'Newest' will be useful). 
Alternatively, you can also look at the recent photos. 

> Note: the challenge was originally uploaded the day before the CTF101 Ghent lecture, and the description read that "I was walking around the city yesterday", as a hint to look for reviews from the day before. Nowadays, you will probably have to scroll a bit to find the review posted on 29 February 2024.

![Google Maps review for Jacob van Artevelde](/assets/images/2024/ctf101-ghent/sightseeing-in-ghent-screenshot1.png)

Apparently, Jonas Snekers (fake Google accounts always come in handy 👀) went for a walk recently, and gave a five-star review to Jacob (or at least his statue). 
He also left an interesting photo...

<img src="/assets/images/2024/ctf101-ghent/sightseeing-in-ghent-photo2.png" width="360" alt="Photo of the Jacob van Artevelde statue with a QR code">

That looks like the same photo as in the challenge description, but now there is... a QR code! 
Let's scan it and see where it leads us: [https://www.youtube.com/watch?v=Kq5RV14D6qE](https://www.youtube.com/watch?v=Kq5RV14D6qE)

## Video transcription
The video is hosted by "Vector Stellar" (so we know we're on the right track), and while it is super interesting and has a very nice soundtrack, the flag is nowhere to be seen yet.
But, like any good YouTuber would, Vector Stellar asks us in the description to "check out my other videos". 
So let's visit [Vector's channel](https://www.youtube.com/@VectorStellar), where we find a "numbers in ghent" video: [https://www.youtube.com/watch?v=K7GsJHu-ppY](https://www.youtube.com/watch?v=K7GsJHu-ppY)

This video shows a grid (/chart) of 0-F rows and 0-F columns, with the Stellar Vector logo moving around, suspiciously always on the intersection of two lines. 
Two hex characters, what could that be...

After a lot of fun reading the characters off this grid -- remember, the x-axis is at the bottom, the y-axis to the left, so we read the bottom character first! --, we get this sequence:

`73 76 7b 74 68 33 5f 57 31 73 33 5f 4f 53 49 4e 54 5f 4d 34 6e 7d`

Those in the know will recognize that these are hex representations of [ASCII codes](https://en.wikipedia.org/wiki/ASCII), which you can decode into letters.
[CyberChef](https://gchq.github.io/CyberChef/) is always a great tool for dealing with such encodings, and even if you did not know yet about ASCII and hex, you can still use its "magic wand" button (next to "Output") to automatically detect the most likely encoding. 
One way or another, you should end up with a simple recipe: "[From Hex (Delimiter: Space)](https://gchq.github.io/CyberChef/#recipe=From_Hex('Auto')&input=NzMgNzYgN2IgNzQgNjggMzMgNWYgNTcgMzEgNzMgMzMgNWYgNGYgNTMgNDkgNGUgNTQgNWYgNGQgMzQgNmUgN2Q)", which when given the sequence above, produces this string:

`sv{th3_W1s3_OSINT_M4n}`

which looks like it is the flag! Jacob van Artevelde was known as "the Wise Man" indeed, and I would say you have now earned that title too 😉 Challenge completed 👊
