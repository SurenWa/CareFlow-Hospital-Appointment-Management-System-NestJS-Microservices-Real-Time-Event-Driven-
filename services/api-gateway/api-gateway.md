Think of interceptors as rules applied to every visitor entering a building.

In NestJS microservices, these are usually:

Global (apply to every request)

Especially in API Gateway

Why global?

Because you want:

Every request logged

Every request tracked

Every request timed out safely

Every response shaped the same way

So yes — Correlation, Logging, Timeout, Transform
👉 Global interceptors = best practice

Now explain EACH interceptor like a real-life story
1️⃣ Correlation Interceptor
“Give every visitor a tracking number”

Real-world example: 📦 Courier service

You send a parcel

Courier gives you a tracking number

Every warehouse, truck, office uses that same number

What it does:

Checks if request already has a tracking number

If not, creates one

Writes it everywhere

Sends it back to the client

Why important:

Debugging

Support

Logs across services

👉 “Which request caused the problem?” → tracking number answers that.

2️⃣ Logging Interceptor
“Write everything in the security register”

Real-world example: 🏢 Building security desk

Security writes:

Who entered

When

From where

What they did

How long they stayed

Your interceptor logs:

Request came in

Who made it

What endpoint

How long it took

What response status

If something fails:

Logs error details

Why important:

Monitoring

Debugging

Auditing

Production visibility

👉 Without this → you’re blind in production

3️⃣ Timeout Interceptor
“Don’t let visitors block the counter forever”

Real-world example: 🏦 Bank counter

If a customer takes too long:

“Sorry, time’s up. Please step aside.”

What it does:

Starts a timer

If backend service is slow

Stops the request

Returns timeout error

Why important:

Protects Gateway

Prevents hanging requests

Keeps system responsive

👉 Especially critical in API Gateway

4️⃣ Transform Interceptor
“Wrap everything in the same envelope”

Real-world example: 📄 Official letters

No matter the content:

Letter always has same format

Header

Body

Footer

Your interceptor:

Takes any response

Wraps it in a standard structure

Adds metadata (time, request id)

So client always gets:

{
  "success": true,
  "data": {...},
  "meta": {...}
}


Why important:

Frontend simplicity

Consistency

Easier API usage

👉 Clients LOVE predictable responses

How they work together (simple flow)
Client Request
   ↓
Correlation → give tracking number
   ↓
Logging → write entry log
   ↓
Timeout → start stopwatch
   ↓
Controller / Service
   ↓
Transform → wrap response
   ↓
Logging → write exit log
   ↓
Client Response

One-line explanation for interviews

Correlation → tracks a request across services

Logging → records what happened

Timeout → stops slow requests

Transform → keeps responses consistent

Final simple analogy (one sentence)

These interceptors together act like a reception desk + security + timekeeper + packaging system for every request entering the API Gateway.


#####Interceptor Flow################

On request:   Client → CorrelationInterceptor → LoggingInterceptor → TimeoutInterceptor → TransformInterceptor → Controller → Service
On Response: Controller → TransformInterceptor → TimeoutInterceptor → LoggingInterceptor → CorrelationInterceptor → Client




---

# 🔧 Configuration & Setup

## 1️⃣ What does each interceptor do & execution order?

**Common interceptors in a Gateway:**

* **LoggingInterceptor**

  * Logs request/response metadata (method, path, latency)
* **TransformInterceptor**

  * Wraps responses into a consistent format
* **TimeoutInterceptor**

  * Aborts long-running downstream calls
* **CacheInterceptor**

  * Caches responses (usually GET requests)

### Execution order

➡ **Request flow**

```
Client → Middleware → Guard → Interceptor → Pipe → Controller
```

⬅ **Response flow**

```
Controller → Interceptor → Exception Filter → Client
```

**Important:**

* Interceptors run **in the order they are bound**
* Response runs in **reverse order**

---

## 2️⃣ Why validate environment variables at startup?

Because **misconfigured services should fail fast**.

### Benefits:

* Prevents runtime crashes
* Avoids silent failures (wrong DB, wrong queue, wrong secret)
* Guarantees required configs exist

Example:

```ts
ConfigModule.forRoot({
  validate: (env) => schema.parse(env),
});
```

If `.env` is wrong → **app does not start** ❌
This is **production best practice**.

---

## 3️⃣ What happens if Redis is unavailable at startup?

Depends on **how Redis is used**:

### If Redis is critical (sessions, WS scaling, cache):

* Gateway may:

  * Fail startup
  * Or start in **degraded mode**

### If Redis is optional:

* App starts
* Logs warning
* Features disabled:

  * WebSocket scaling
  * Cache
  * Rate limiting

**Good design:**

> Gateway starts but reports **degraded health**

---

# 🔐 Authentication & Authorization

## 4️⃣ Where is JWT validated? Where is it issued?

### JWT Issued

✔ **Auth Service**

* After login / refresh
* Signed with secret or private key

### JWT Validated

✔ **API Gateway**

* Using `JwtAuthGuard`
* Validates:

  * Signature
  * Expiry
  * Claims

**Why at Gateway?**

* Centralized security
* Downstream services trust the Gateway

---

## 5️⃣ Difference between `@Roles()` and `@Permissions()`

| Roles                | Permissions          |
| -------------------- | -------------------- |
| High-level           | Fine-grained         |
| Example: ADMIN       | Example: USER_CREATE |
| Group of permissions | Action-specific      |
| Coarse control       | Precise control      |

**Typical flow:**

```ts
@Roles('ADMIN')
@Permissions('USER_CREATE')
```

➡ Role grants **permission sets**
➡ Permissions enforce **exact actions**

---

## 6️⃣ How does `@Public()` decorator work?

It sets **metadata** on a route:

```ts
@SetMetadata('isPublic', true)
```

Then in `AuthGuard`:

```ts
if (this.reflector.get('isPublic', context)) {
  return true;
}
```

✅ Skips JWT validation
Used for:

* Login
* Register
* Health checks

---

# 🔁 Proxy Service

## 7️⃣ What headers does the Gateway inject?

Common injected headers:

* `x-user-id`
* `x-user-roles`
* `x-user-permissions`
* `x-request-id`
* `x-correlation-id`
* `x-forwarded-for`

Purpose:

* User context
* Traceability
* Observability

---

## 8️⃣ How does the Gateway handle downstream errors?

Gateway:

* Catches Axios / RPC errors
* Maps them to **HTTP-safe responses**

Example:

```ts
throw new HttpException(
  error.response?.data || 'Service unavailable',
  error.response?.status || 503
);
```

✔ Prevents leaking internal details
✔ Keeps response format consistent

---

## 9️⃣ Why not return raw Axios errors?

Because raw errors:

* Leak internal URLs
* Leak stack traces
* Break API contract
* Are inconsistent

**Gateway responsibility:**

> Normalize + sanitize all responses

---

# 🔌 WebSocket

## 🔟 How does a client authenticate WebSocket connection?

### Common pattern:

* JWT passed via:

  * `Authorization` header
  * Query param
  * Socket auth payload

```ts
client.handshake.auth.token
```

Gateway:

* Validates JWT
* Attaches user info to socket

---

## 1️⃣1️⃣ Why Redis pub/sub for WebSocket scaling?

Because WebSockets are **stateful**.

In multi-instance setup:

* Client A on Pod 1
* Client B on Pod 2

Redis pub/sub:

* Broadcast events across all pods
* Enables:

  * Chat
  * Notifications
  * Presence

---

## 1️⃣2️⃣ What "rooms" can a user join?

Typical rooms:

* `user:{userId}`
* `role:{role}`
* `org:{orgId}`
* `conversation:{id}`
* `global`

Used for:

* Targeted messaging
* Authorization-based broadcasts

---

# ❤️ Health Checks

## 1️⃣3️⃣ Difference between liveness & readiness probes?

| Probe     | Purpose                  |
| --------- | ------------------------ |
| Liveness  | Is app alive?            |
| Readiness | Can app receive traffic? |

Liveness fails → container restarted
Readiness fails → removed from load balancer

---

## 1️⃣4️⃣ When would Gateway report "degraded"?

When:

* Redis down
* One microservice unreachable
* Cache disabled
* Message broker unreachable

Gateway still runs but:

```json
status: "degraded"
```

---

# 🏗 Infrastructure

## 1️⃣5️⃣ What databases are created by init scripts?

Typically:

* `auth_db`
* `user_db`
* `order_db`
* `inventory_db`
* `notification_db`

Each mapped to **one service**.

---

## 1️⃣6️⃣ Why separate databases per service?

Because of **true microservice isolation**:

* Independent scaling
* Independent schema evolution
* Fault isolation
* No shared ownership

Golden rule:

> **Service owns its data**

---

## 🎯 Final Interview Tip

If asked *why Gateway exists*:

> “The Gateway centralizes authentication, authorization, routing, observability, and protects internal services from direct exposure.”



