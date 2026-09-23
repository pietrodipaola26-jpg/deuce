# Deuce

**Tennis and padel for Bocconi students in Milan.**

A complete account of what Deuce is, how it works, how it is built, and where it
goes next.

- **Status:** pre-launch. No public users, no revenue, no legal entity.
- **Audience:** programme reviewers, prospective partners, and anyone who needs
  to judge whether this is serious before it has traction to point at.
- **This document contains no financial projections and no market sizing.** That
  is deliberate. Everything asserted here is either verifiable in the codebase or
  labelled as what it is: observation, judgment, or an open question.

---

## 1. Summary

A university is four hundred people who would happily play tennis with each
other, and no mechanism by which any two of them find out. The blocker is not
courts, and it is not desire. It is that the only available coordination tool is
a message in a group chat, and a message has no state.

Someone posts *anyone for padel Thursday?* into a WhatsApp group. It sits there.
Nobody can see who else is in, so nobody wants to be the first to commit. Nobody
knows the level, so the good players assume it is below them and the beginners
assume it is above them, and both stay quiet. Nobody knows the court, the time,
or what it costs, so answering means asking three follow-up questions in front of
everyone. The message gets left on read. The court never gets booked. This
happens every week, in every group, at every university, and the people involved
conclude that nobody wants to play.

Deuce replaces the message with a row. A game on Deuce already answers every
question the message left open — sport, level range in plain words, surface,
which club, what time, how long, what the court costs and what each person pays,
who has already joined, and what the host is bringing. There is nothing left to
ask, so joining is a button rather than a conversation. Once a game fills, a
thread opens for the practical details and closes a day after everyone plays.

Around that sits the thing that makes strangers workable: a closed community and
a public record. Only Bocconi email addresses can create an account, enforced at
the database rather than the interface. Every profile carries games played,
sportsmanship rating, reliability, missed games and upheld reports, all visible
before you join anything. Somebody with no history shows as new, plainly, rather
than as perfect.

Bocconi is a wedge, not the market. The closed-community mechanic is what makes
Deuce work, and it is also what makes it replicable: the second campus is the
same product with a second email domain. The long arc is an Italian university
sports network, built one campus at a time.

---

## 2. The problem

### What is actually broken

The instinct is to assume the problem is supply — not enough courts, or courts
too expensive, or players too scattered. In Milan none of that holds. There are
padel and tennis clubs across the city, several within a tram ride of campus, and
a court split four ways costs less than a night out.

The problem is coordination, and specifically that **the coordination tool in use
has no memory of who has said yes.**

A group-chat message is stateless. It cannot show a partial list. It cannot hold
a level. It cannot be joined. Every person reading it has to independently decide
to be the first mover in public, and the cost of being the first mover — visible
enthusiasm, in front of four hundred peers, that may go unanswered — is far
higher than the cost of saying nothing. So the rational move for every individual
reader is silence, and the collective outcome is that a group full of willing
players produces no games.

Layered on top of that:

- **Nobody can calibrate level.** "Intermediate" means nothing. A beginner will
  not join a game that might contain club players, and a strong player will not
  join one that might be four people who have never served. Both abstain, and
  the abstention looks like disinterest.
- **The detail burden falls on the asker.** Court, entrance, time, cost, who
  brings balls. Answering each question publicly is work, and the person who
  posted did not sign up to run an event.
- **Newcomers have no entry point at all.** Exchange students and first-years
  arrive into a city where the existing groups formed before they got there.
  The one population with the most free time and the most desire to meet people
  is the population with the least access.

### The evidence behind this

This is founder observation plus informal conversations with students, and it
is stated as exactly that. It is not survey data and there is no waitlist.

What comes up consistently, unprompted, is the same complaint in slightly
different words: *I sent it into the group and nobody replied.* And its partner
complaint: *even when someone does reply, then you spend two days working out
where, when, and how much.* People describe the frustration as being about other
people's unresponsiveness. It is more accurately about a tool that gives them
nothing to respond to.

That is a real insight and a limited evidence base, and the honest position is
to hold both at once. Validating it properly — structured conversations, and
then a live cohort at Bocconi — is the next thing that happens, not something
already done.

---

## 3. The product today

Everything in this section exists and runs. It is not a roadmap.

### 3.1 A closed community

Sign-in is a link emailed to an `@studbocconi.it` or `@unibocconi.it` address.
There are no passwords: controlling the mailbox *is* the verification. Any other
address is refused by the database, not merely by the form — so the restriction
survives a bug in the interface.

This does three things at once. It verifies that a member is a student, without
asking anyone to upload a document. It gives every member a real-world context
they share with everyone else, which is what makes meeting a stranger at a court
reasonable. And it makes the record meaningful, because a banned account cannot
be replaced by a new throwaway one.

### 3.2 A game is a row that answers everything

A posted game carries:

| | |
|---|---|
| Sport and surface | Tennis on clay, hard or grass; padel on padel turf |
| Indoor or out | Including clubs whose roof is seasonal |
| Club | One of eighteen real Milan clubs, with address, coordinates and travel time |
| Time and length | 30 to 240 minutes |
| Level range | In numbers *and* in words |
| Spots and who is in | Padel is always four; tennis is two or four |
| Cost | The whole court fee, with the split shown |
| The host's note | 280 characters, the only free text on a card |
| What the host provides | Balls, spare racquets, and so on |

Several of these are enforced as database constraints rather than left to the
form: padel with a spot count other than four, or on clay, is a data-entry error
and is rejected outright.

### 3.3 A level scale a beginner can place themselves on

Every matchmaking product has to ask *how good are you?*, and most get it wrong
the same way, by asking for a number the player cannot calibrate. Deuce writes
each level as something you can recognise about your own game, with the number as
shorthand:

| | | |
|---|---|---|
| **1** | Beginner | You have barely held a racquet. You want someone patient. |
| **2** | Improving | You can rally a few balls back and you are here to improve. |
| **3** | Social | You keep a rally going, you serve in, and you play for the fun of it. |
| **4** | Club | You have played properly. You have a reliable serve and a side you prefer. |
| **5** | Competitive | You have played matches that counted, and you want a real one. |

Level is held **per sport**, because a competitive tennis player who has never
picked up a padel racquet is two different players. The range is enforced on
join, so nobody arrives to a mismatch, and the feed defaults to the levels you
could actually join.

This is the single biggest lever on the confidence problem. A beginner who can
see *1 — First time holding a racquet* is a beginner who books.

### 3.4 Cost, divided honestly

The host enters what the court costs. Deuce does the division, twice:

- **Per seat** — total ÷ spots. Stable, comparable across the feed, and what
  everyone pays when the game is full.
- **Per player** — total ÷ taken. What you will actually hand over tonight if
  the game runs short.

Neither is stored, because a stored copy of a division can disagree with its own
inputs. Rounding is always up, so the host is never left out of pocket, and the
interface says so once rather than hiding it.

**Deuce takes no cut. There is no fee column in the schema.** No money moves
through the platform; players settle at the club desk as they always have.

### 3.5 A waiting list that closes the loop

A full game used to turn people away, and a freed seat was just a hole. Both are
the same missing thing.

The waiting list is first-in, first-promoted, with no host approval anywhere, and
your position is visible — somebody who knows they are second will keep the
evening free, and somebody who knows they are ninth will not. Promotion happens
automatically the moment a seat opens, however it opens.

Promotion refuses three things: it re-checks level, so nobody is seated into a
game the front door would have turned away; it refuses to seat anyone who is
already playing at that time, because that is a manufactured no-show; and when it
does seat someone, it clears their other waiting-list entries that clash.

The list is capped at ten, beyond which it stops being a waiting list.

### 3.6 A record worth trusting

Every profile carries:

- **Games played**
- **Sportsmanship rating**, averaged from ratings by people you actually played with
- **Reliability** — the share of commitments you kept
- **Missed games**
- **Upheld reports**

Two of those five can only ever move the wrong way, which is precisely what makes
the other three worth anything. A record where nothing can go down is a record
that says nothing.

Hosts have their own record — games hosted, and games hosted that were cancelled
— framed the right way round. A bare cancellation count makes hosting feel risky,
and a feed with no games in it is the only way Deuce fails.

### 3.7 Leaving, and the door that costs nothing

Dropping out inside twelve hours is recorded. Before that, it is free. This
exists because reliability was previously a lie: it counted only people who said
nothing and failed to appear, so a member who abandoned twenty games at two
hours' notice scored a flawless 100%.

The distance from the game is stored as a number rather than a verdict, so the
twelve-hour line can be re-examined, moved, or split in two later without having
thrown the evidence away.

And there is a door. **The moment leaving carries a cost, you have built pressure
on somebody to attend a game they have become uncomfortable about, and that is
the one thing this product cannot do.** So a withdrawal can be marked as a safety
exit: it costs nothing, it is available at any notice, it is invisible to the
host as anything other than an ordinary drop-out, and it quietly reaches the
moderators.

### 3.8 Conversation, scoped and expiring

There are **no direct messages anywhere in Deuce.** A thread opens on the game
when you join and closes a day after you play. It is for the practical things —
which entrance, who is bringing balls, who is getting the tram from campus.

This is a safety decision before it is a product decision, and it is covered in
§4.

### 3.9 Reporting and moderation

Any player can be reported from the game itself, in two taps, for a missed game,
conduct, safety, spam or other. Reports go to student moderators.

**A report only reaches somebody's public record once a moderator has agreed with
it.** An accusation is not a finding, and a product that publishes accusations
has handed every user a weapon.

---

## 4. What Deuce refuses to do

The refusals are the product. Each one costs something obvious and buys something
that is hard to get back once lost.

**No direct messages.** The most requested feature in any social product, and the
one that turns a sports app into a place where a nineteen-year-old gets messaged
by a stranger at midnight. Every conversation on Deuce is attached to a game,
visible to everyone in it, and expires. Removing the private channel removes an
entire category of harm rather than moderating it after the fact.

**No photographs.** Profiles carry a coloured avatar, stable per person. There
are no photo uploads anywhere. This removes appearance from a decision that
should be about level and availability, and it removes an image-moderation
problem that a student-run moderation team cannot staff.

**No full names.** Members appear as a first name and one initial — enough to
greet somebody at a court, not enough to look them up. Programme and year are
deliberately coarse for the same reason: a course code and a year of study
together identify one person in a cohort of thirty.

**No invented data, ever, including locally.** Deuce ships with no accounts, no
games and no ratings. There was a seeding script and it was deleted. Invented
members with invented ratings are fabricated reviews, and a platform whose entire
pitch is *this record is worth trusting* cannot have them — not even in
development, where they might end up in a screenshot.

**No tracking.** There is no analytics SDK, no advertising pixel, no third-party
script. The product carries one cookie, which is strictly necessary, which is why
there is a cookie *notice* rather than a consent gate.

**No fee on the split.** No money moves through Deuce. See §10 for what would
have to change, and be said out loud, before that could ever stop being true.

---

## 5. How it is built

### Stack

| | |
|---|---|
| Framework | Next.js 16, App Router, React 19 |
| Database | Supabase — PostgreSQL with row-level security and Realtime |
| Auth | Supabase Auth, emailed sign-in link, no passwords |
| Rate limiting | Upstash Redis |
| Hosting | Vercel |
| Styling | Tailwind CSS v4, design tokens in one stylesheet |
| Validation | Zod, shared between client and server |

Roughly **12,000 lines of TypeScript** and **3,100 lines of SQL** across
seventeen migrations. **Ten runtime dependencies.** No payment processor, no
analytics, no component library, no ORM.

### The security model is the database, not the application

Access rules live in PostgreSQL row-level security, expressed as predicates —
`is_member()`, `is_in_game()` — that decide who can read what. The application
cannot accidentally widen them, because it is not the thing enforcing them.

This is why several design decisions look stranger than they are. Withdrawals and
the waiting list each get their own table rather than a flag on the seat table,
because the seat table is the predicate behind *who may read this game's thread*.
Widening it is how you silently grant thread access to people who are not in the
game, with nothing raising an error anywhere.

Promotion off the waiting list is a database trigger rather than a line of
application code, because seats empty in more than one way — including a member
deleting their account — and an invariant that depends on somebody remembering to
call a helper is not an invariant.

The RLS rules are asserted by an automated schema test, run in CI.

### Cost to operate

The paid surface is small and entirely usage-priced: Vercel for hosting, Supabase
for database and auth, Upstash for rate limiting, an email sender for the
sign-in links, and a domain. There are no per-seat licences, no third-party
data, and no infrastructure that idles expensively.

At launch scale — one campus, one city — this is a low-tens-of-euros-per-month
operation, and the first cost that scales is transactional email. *The exact
current figure should be confirmed against live billing before this document is
submitted anywhere.*

---

## 6. Trust, safety and privacy

Deuce arranges for people who have not met to be alone together on a court. That
is the product, and it is also the risk, and the design is mostly an answer to
it.

**Structural, not reactive.** No DMs, no photos, no full names, scoped and
expiring threads, a closed membership tied to a verifiable institutional
identity. Most of the harm surface is removed by construction rather than
patrolled afterwards.

**The safety exit.** Any member can leave any game, at any notice, at no cost,
with the host seeing nothing unusual and the moderators seeing everything. No
reputation system may ever make a person feel they must show up.

**Moderation before publication.** Reports reach student moderators. Only upheld
reports become public. Outcomes are a warning or a ban.

**Data protection.** Consent is granular: age confirmation and terms acceptance
are separate, separately-timestamped facts, because bundling them makes both
unprovable. Account deletion removes the member's messages, not just their
profile row. Sign-in emails are deleted after they are sent. The privacy notice
names GDPR obligations directly.

The identity of the data controller, a postal address and a contact mailbox are
required by GDPR art. 13, are read from configuration rather than hardcoded, and
are an explicit launch requirement. **They are currently unset, because there is
no entity to name.** See §11.

**Open determinations.** Two retention questions are unresolved: how long
safety and moderation evidence is kept, and how long unread notifications are
kept. Both are legal determinations about what members were told, not engineering
choices, and neither should be settled in a migration. Both are release gates.

---

## 7. Why now

Three things are true at once, and only recently.

**Padel arrived.** In the space of a few years padel has gone from near-absent to
ubiquitous in Italian cities. Clubs have been built, courts have been converted,
and a large population of people now want to play a doubles-only sport that
structurally cannot be played alone or in pairs. Padel needs four people, every
time. It is a coordination problem wearing a sport costume. *A sourced figure for
Italian court growth should be added here before external submission.*

**Universities got more international and less rooted.** A large share of a
Milan cohort arrives from elsewhere, for one or two years, into a city where the
social groups predate them. They have time, money for a shared court, and no
route in. That population turns over completely every year, which for a campus
product is renewal rather than churn.

**The default tool got worse.** Group chats have grown to a size where posting
into them is a performance. The larger the group, the higher the social cost of
asking, and the less likely anyone is to ask. The coordination problem gets worse
exactly as the number of available players goes up.

---

## 8. Competition

**Playtomic** is the reference point and will be the first question anyone asks.
It is a court-booking platform: it solves *which club has a court free at seven*,
and it solves it well. Deuce solves something upstream of that — *I do not want
to be the one who asks, and I do not know if these people are my level.* Playtomic
assumes you have already arranged four people. Deuce exists because you have not.

Could Playtomic add a social feed? It could add the interface. What it cannot
easily add is the thing that makes the feed work: a closed, verified community
small enough that joining a game with a stranger is reasonable, where a ban
actually costs something and a record cannot be discarded. An open marketplace
cannot produce that, and closing one down to a campus would mean contracting its
market by several orders of magnitude to serve users it does not monetise.

**WhatsApp and Instagram groups** are the real incumbent and hold effectively all
of the current volume. They win on zero friction and universal presence. They
lose on the thing this entire product is about: they have no state, no level, no
record, and no way to see who is in. Deuce does not need to replace them. It
needs to be the link that gets posted into them.

**University sports clubs** serve the committed and the competitive, with
fixtures, membership and training. They are not competitors so much as an
adjacent audience, and a plausible early channel.

**Other social-sport apps** exist in various markets with various degrees of
traction. None of them has solved the cold-start problem for a specific campus,
which is the only problem that matters at the start.

The honest summary: Deuce is not competing for a market that exists. It is trying
to convert an activity currently happening badly in group chats into an activity
happening well somewhere else, for a population nobody is serving specifically.

---

## 9. Go to market

### The campus is the unit

Deuce is not launched into Milan. It is launched into Bocconi, and it is either
alive there or it is nothing. A social product with a hundred users across a city
is dead; a hundred users in one university is a functioning community.

The launch problem is therefore narrow and concrete: **produce enough games in
the first weeks that a member who opens the feed sees something they can join
today.** Everything else follows from that or does not happen.

### Sequence

1. **Seed the hosts, not the players.** A feed with no games in it is the only
   way this fails. The scarce role is the host, and early effort goes to a small
   number of people willing to post games, not to broad signups.
2. **Go where the failure already happens.** The existing group chats are the
   channel. Every unanswered *anyone for padel Thursday?* is a place where a link
   to an actual game belongs.
3. **Target the population with the highest pain.** Exchange students and
   first-years, at the start of term, have the most desire and the least access.
   Term start is the moment; the academic calendar, not a marketing calendar,
   sets the timing.
4. **Make the record visible early.** The reputation system is inert until people
   have played a few games. Until then, the product runs on the closed community
   and the plain-words level scale alone, and both have to carry it.

### Then the second campus

The replication mechanic is deliberately simple: **another campus is another
email domain.** The product, the schema, the moderation model and the venue list
for a city are all reusable. Politecnico, Statale and Cattolica are in the same
city, sharing many of the same clubs, which makes Milan a multi-campus market
before it is a multi-city one.

Two questions have to be answered by the Bocconi launch before any of that is
worth attempting, and this document does not pretend to know the answers:

- Does a single campus reach self-sustaining game volume, and at what size?
- Do campuses want to stay separate, or do they want to play each other? Merging
  them is a product decision with real safety consequences and it should be made
  with evidence, not in advance.

---

## 10. Where it goes

Phases with entry conditions, not dates. Nothing here commits a timeline, and
the roadmap in the repository deliberately carries none.

### Phase 1 — One campus, alive

The current build, launched to Bocconi. Entry condition: the GDPR controller
details exist and are set, and the two retention determinations are made.

Success is not signups. It is a feed where a member opening the app on a Tuesday
finds a game they can join, repeatedly, without anyone intervening manually.

### Phase 2 — The campus works without being pushed

Recurring games, better notification of what is relevant to you, and whatever the
first cohort's behaviour reveals is missing. The only feature list that matters
here is the one Phase 1 produces, which is why it is not written yet.

### Phase 3 — The second campus

Attempted only once Phase 1 has demonstrably worked once. The technical work is
modest; the real work is the moderation model, the venue list for the new
community, and the decision about whether campuses are separate or joined.

### Phase 4 — A network

Multiple Italian universities, each a closed community, sharing a product, a
safety model and a growing map of clubs. This is the end state that makes Deuce a
company rather than a campus utility, and everything before it is a test of
whether the mechanic replicates.

### Revenue

**There is no revenue model in version one, and that is a decision rather than an
omission.** A product whose pitch is a trustworthy record needs the record to be
trustworthy first. Introducing a commercial interest before there is any usage
would distort decisions that should be made on whether they serve the member.

The eventual model, named here so it is not a surprise later, is **a small fee on
the game split** — Deuce handling the money members already exchange, and taking
a modest cut of it. It is the model that aligns best with usage, and it is the
one that only earns anything when the product has actually produced a game.

Three things have to be true and said plainly before it could be introduced:

1. **It is a reversal of a current commitment.** The schema today contains no fee
   column and the interface tells members that Deuce takes no cut. Changing that
   is a change to the deal members signed up for, and it has to be announced as
   one, not slipped in.
2. **It makes Deuce a payment intermediary.** Handling money between members
   engages PSD2 and Italian payment regulation. The route is a licensed provider
   — Stripe Connect or equivalent — acting as the regulated party, with Deuce as
   a platform on top. That is a well-trodden path, and it is not a free one.
3. **It requires an entity.** See §12.

Alternatives exist and are not ruled out: clubs paying to fill off-peak courts is
the model that keeps students free forever, and is probably the better business.
It is not the stated plan because it has not been tested with a single club.

---

## 11. Risks and open questions

Stated as they are, including the ones that are uncomfortable.

### Bocconi is a dependency that is not a relationship

The entire access model rests on the university's email domain. The university
has not sanctioned this and does not know about it. If Bocconi objected, the
product's verification method would disappear overnight.

The mitigation is not technical, it is to convert the dependency into a
relationship — a student association, a sports society, or the university's own
innovation programme. Doing so would also solve distribution, which is the other
hard problem. **This is the single highest-value action available and it has not
been taken.**

### There is no entity, so the liability is personal

Deuce processes student personal data, including reputational data — missed
games, upheld reports — about identifiable people. With no company, the GDPR
data controller is an individual. The code already knows this: the controller
fields are unset configuration and a documented launch blocker.

Forming an entity is cheap and closes the exposure. It should happen before
launch, not after.

### The evidence base is thin

Founder observation and informal conversations. No structured research, no
waitlist, no pilot. The insight is sound and the validation has not been done,
and those are different statements.

### Cold start

A social product with no games is worthless, and the first weeks decide it. The
plan in §9 addresses this directly, but it remains the most likely way Deuce
fails.

### Single founder

One person, solo, building and operating a product with a moderation
responsibility attached to it. This limits pace and creates an obvious
concentration risk. Student moderators reduce the operational load; they do not
change the underlying fact.

### Seasonality

An academic-year product empties in July and reloads in September, and its
audience partly turns over annually. This is manageable and it has to be planned
for rather than discovered.

### Safety

Arranging meetings between strangers carries irreducible risk. §6 describes an
unusually careful design, and a careful design is a mitigation, not an
elimination. A single serious incident would be both a human failure and an
existential one for the product.

### Open decisions

- Retention period for safety and moderation evidence.
- Retention period for unread notifications.
- Whether campuses stay separate or play each other.
- Whether the revenue path is the game split or the club side.

---

## 12. The company today

Stated plainly, because a document that inflates this is worth nothing.

- **A solo founder.** One person: product, engineering, design, copy, and
  whatever operating the thing turns out to require.
- **No legal entity.** Nothing registered. This is a launch blocker for the
  reasons in §11 and is straightforward to fix.
- **No funding, and no ask.** No money raised, no money sought here. The
  operating cost is small enough to be personally absorbed at launch scale.
- **No users.** The product is built and unlaunched. There is no traction
  section because there is no traction.
- **No revenue.**
- **No university relationship.**

### What there is instead

A finished product, built to a standard that is visible in the source and
verifiable by anyone who wants to look. The strongest evidence available about
this project is not a metric, because there are no metrics. It is the record of
what got chosen when nobody was watching:

- A seeding script deleted rather than ship invented ratings on a platform whose
  pitch is a trustworthy record.
- Direct messages refused outright, permanently, rather than built and moderated.
- A reputation system that was shipped, found to reward the wrong behaviour, and
  rebuilt — with the threshold stored as evidence rather than as a verdict so
  that a future judgment can revise it.
- A cost-free safety exit built into a reliability system, on the grounds that
  no incentive may ever pressure somebody to attend a game they have become
  uncomfortable about.
- Consent split into separately timestamped facts because bundling them makes
  both unprovable.
- Access rules enforced in the database, so the application cannot widen them by
  accident.
- Ten runtime dependencies, no tracking, and no analytics on a product that
  would benefit commercially from having them.

None of that is required to launch a campus sports app. All of it is what the
product would need to be worth trusting at the size it is aiming for.

### What happens next

1. Form an entity and set the data controller details.
2. Resolve the two retention determinations.
3. Open a conversation with Bocconi.
4. Launch to one campus and find out whether any of this is right.

---

*Every product claim in this document is verifiable against the Deuce codebase.
Market characterisation is qualitative and unsourced by design; the two places
where an external figure belongs are marked in the text. There are no
projections, and there are no numbers that have not been counted.*
