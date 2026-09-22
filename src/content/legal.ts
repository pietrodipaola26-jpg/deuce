/**
 * The legal pages, written out rather than generated.
 *
 * THESE ARE REAL DOCUMENTS, not lorem ipsum, and they describe what the code in
 * this repository actually does — the two eligible domains, the absence of
 * photographs, the absence of direct messages, the fact that a report only
 * reaches a public record after a moderator agrees. If the product changes, these
 * change in the same commit.
 *
 * WHAT IS DELIBERATELY LEFT FOR THE OPERATOR. The identity of the data
 * controller, a postal address and a contact mailbox are required by GDPR art. 13
 * and cannot be invented here. They are read from the environment so that a
 * deployment with them unset is obvious on the page rather than silently wrong,
 * and docs/SETUP.md lists them as a launch requirement.
 *
 * This is not legal advice. Have somebody qualified read it before you launch.
 */

export type LegalDoc = {
  slug: "terms" | "privacy" | "community" | "cookies";
  title: string;
  updated: string;
  intro: string;
  sections: Array<{ heading: string; body: string[] }>;
};

const OPERATOR = process.env.APP_OPERATOR_NAME?.trim() || null;
const CONTACT = process.env.APP_CONTACT_EMAIL?.trim() || null;
const ADDRESS = process.env.APP_OPERATOR_ADDRESS?.trim() || null;

/** Renders the operator's details, or says plainly that they are not set. */
function operatorLine(): string {
  if (OPERATOR && CONTACT) {
    return `Deuce is operated by ${OPERATOR}${ADDRESS ? `, ${ADDRESS}` : ""}. Reach us at ${CONTACT}.`;
  }
  return "The operator's name, address and contact email have not been configured for this deployment. They are required before launch. See docs/SETUP.md.";
}

const LAST_UPDATED = "21 September 2026";

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "cookies",
    title: "Cookies",
    updated: LAST_UPDATED,
    intro:
      "Deuce sets one cookie, and it is the one that keeps you signed in. There is no tracking here, so there is nothing to opt out of.",
    sections: [
      {
        heading: "The whole list",
        body: [
          "A session cookie, set by Supabase Auth when you sign in. It holds the token that proves the request is yours, it is HttpOnly so no script can read it, and it is marked SameSite so it is not sent from other sites. Without it you would be signed out on every page.",
          "That is the entire list. There is no second cookie.",
        ],
      },
      {
        heading: "What Deuce does not set",
        body: [
          "No analytics cookie. Deuce measures nothing about how you use it.",
          "No advertising or retargeting cookie, and no pixel from anybody else.",
          "No social media embeds, no fonts loaded from a third party, no chat widget, no session recorder, no heatmap.",
          "No cookie at all before you sign in. The pages you can read signed out set nothing.",
        ],
      },
      {
        heading: "Why there is no accept or reject choice",
        body: [
          "Under the ePrivacy Directive and the Garante's guidance, a cookie that is strictly necessary to provide a service the user asked for does not require consent. Signing in is that service, and the session cookie is what makes it work.",
          "Showing you an Accept and Reject pair for a cookie you cannot decline without losing the ability to log in would be a choice that is not real. We would rather tell you what it is than stage a decision.",
          "If Deuce ever adds anything that is not strictly necessary, this page changes first and a genuine choice appears with it. That is a promise the product can be held to, because the notice you saw is recorded against your account.",
        ],
      },
      {
        heading: "Local storage",
        body: [
          "Deuce remembers, in your own browser, that you have read the cookie notice, so it stops appearing. It never leaves your device and it is not a cookie.",
          "Clearing your browser data removes it, and the notice comes back.",
        ],
      },
      {
        heading: "Controlling it yourself",
        body: [
          "Every browser lets you see and delete cookies for a site, usually under Privacy or Site settings. Deleting Deuce's session cookie signs you out, which is the only thing it does.",
          "See also the privacy page for everything Deuce stores on its own servers rather than in your browser.",
        ],
      },
    ],
  },
  {
    slug: "community",
    title: "Community rules",
    updated: LAST_UPDATED,
    intro:
      "Four rules. Everybody agrees to them when they create an account, and they are the ones we actually enforce.",
    sections: [
      {
        heading: "1. Turn up when you say you will",
        body: [
          "Joining a game is a commitment to three other people who have arranged their evening around it, and in most cases to a court somebody has already paid to book.",
          "If you cannot make it, leave the game as early as you can so the seat can be filled. Dropping out inside twelve hours posts a line in the game thread so the others find out from you rather than from an empty court.",
          "Hosts mark who turned up after the game. A missed game goes on your record permanently, and your reliability is visible to everyone before they let you into their game.",
        ],
      },
      {
        heading: "2. Be honest about your level",
        body: [
          "The level scale exists so nobody arrives to a mismatch. Deuce will not let you join a game outside the range its host asked for, so setting your level higher than it is only removes the games you would actually enjoy.",
          "Playing below your level to be kind is fine and common. Claiming a level you do not have wastes the ninety minutes of everybody on the court.",
        ],
      },
      {
        heading: "3. Treat the other players decently",
        body: [
          "No harassment, no abuse, no sexual attention that has not been invited, no discrimination on any grounds, and no pressure on anybody to meet you anywhere other than the court in the game.",
          "The game thread is for the game. Do not use it to solicit, to sell, to campaign, or to contact somebody who has not asked to hear from you.",
          "Deuce has no direct messages, by design. If somebody asks you to move a conversation off Deuce and you would rather not, you never have to.",
        ],
      },
      {
        heading: "4. Report anything that is not right",
        body: [
          "Report a player from the game itself. It takes two taps and it goes to a student moderator.",
          "Reports are treated seriously and confidentially. A report only appears as a number on somebody's public profile once a moderator has agreed with it, which is what stops reporting being used as a weapon.",
          "A moderator can close an account outright, and will for anything serious rather than waiting for it to happen twice. Where something is a matter for the police we will say so and help you take it there.",
        ],
      },
      {
        heading: "What happens after a report",
        body: [
          "A student moderator reads it and decides one of three things. A warning, which is recorded on the account and counts on its public profile. A ban, which closes the account immediately and completely. Or a dismissal, when there is no breach of these rules or not enough to go on.",
          "Every decision carries a written reason, and that reason is sent to the people involved rather than kept in a file. If you are warned or banned you are told which rule and why, in a moderator's own words.",
          "A dismissed report leaves no mark, and the person it was about is never told it existed. That is deliberate: a game has two to four people in it, so telling somebody they were reported would effectively name whoever reported them.",
          "If you think a decision is wrong, reply to the message it arrived in. Where there is more than one moderator, a different one will look at it.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy",
    updated: LAST_UPDATED,
    intro:
      "What Deuce stores, who can see it, and how to get rid of it. Short, because Deuce collects very little.",
    sections: [
      {
        heading: "Who is responsible",
        body: [operatorLine()],
      },
      {
        heading: "What we collect",
        body: [
          "Your Bocconi email address. This is the only way Deuce knows you belong here, and it is the only contact detail we hold. It is never shown to another player.",
          "Your first name, your surname initial, your level, the sports you play, and optionally your languages, programme, year and a short bio. All of this is visible to other members, because it is what somebody needs in order to decide about one game.",
          "Your activity: the games you host and join, the messages you write in game threads, the ratings you give, and the attendance marks hosts record about you.",
          "Nothing else. No photograph, no surname, no phone number, no student number, no timetable, no course codes, no location tracking, no advertising identifiers, and no analytics or tracking cookies from anybody else.",
        ],
      },
      {
        heading: "What other people see",
        body: [
          "Members see your display name, level, sports, languages, programme, year, bio, and your record: games played, average rating, the share of games you turned up to, how many games you missed, and the number of reports against you that a moderator has upheld.",
          "Members do not see your email address, your individual ratings, or who rated you. You cannot see who rated you either, only your average. That is what makes the average worth anything.",
          "People who are not signed in see nothing at all. This is enforced by row level security in the database, not by leaving pages unlinked: a request from somebody with no account returns no rows.",
          "A game thread is readable only by the players in that game.",
        ],
      },
      {
        heading: "Why we are allowed to hold it",
        body: [
          "To provide the service you asked for, which is the contractual basis under GDPR art. 6(1)(b): without a name and a level there is no matchmaking.",
          "Consent, which you give explicitly when you create your account, for the optional parts of your profile. You can remove them at any time from your profile page.",
          "Our legitimate interest in keeping members safe, for the reports and moderation records, under art. 6(1)(f).",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "Your profile and activity for as long as you have an account.",
          "When you delete your account, it goes immediately and completely: your profile, your seats in games, the messages you wrote, the ratings you gave, and your notifications. This is a real delete, not a flag that hides you.",
          "Moderation records about upheld reports are kept in a form that no longer identifies you, because a safety record that vanishes when the account does is not a safety record.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You can see and correct everything on your profile page, and delete your account from Settings, without asking anybody.",
          "You also have the right to a copy of your data, to object to processing, and to complain to the Garante per la protezione dei dati personali in Italy.",
          CONTACT
            ? `For anything you cannot do from the app, write to ${CONTACT}.`
            : "A contact address has not been configured for this deployment.",
        ],
      },
      {
        heading: "Where it is held, and who else touches it",
        body: [
          "Deuce runs on Vercel and stores data in Supabase (PostgreSQL), hosted in the EU. Upstash is used to limit how often anyone can ask for a log in link, and holds only a counter against a hashed identifier.",
          "These are processors acting on our instructions. Nobody else receives your data, and none of it is sold, ever.",
          "Cookies: one session cookie so you stay signed in, and nothing else. There is no analytics or advertising cookie. The cookie page lists it in full.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of use",
    updated: LAST_UPDATED,
    intro: "The agreement between you and Deuce. Plain, and shorter than most.",
    sections: [
      {
        heading: "Who can use Deuce",
        body: [
          "Anyone 18 or over with a working @studbocconi.it or @unibocconi.it mailbox. Losing access to that mailbox means losing access to the account, because controlling it is the whole of the verification.",
          "One account per person. Accounts are not transferable.",
          operatorLine(),
          "Deuce is an independent student project. It is not affiliated with, endorsed by, or operated by Università Bocconi, and nothing here should be read as the university's doing.",
        ],
      },
      {
        heading: "What Deuce is, and is not",
        body: [
          "Deuce is a noticeboard with a memory. It lets students post games, join them, and talk about them, and it keeps a record of who turned up.",
          "Deuce does not book courts, does not employ or vet coaches, does not take payment, and takes no cut of what you pay. The court fee is settled directly between you, the other players, and the venue.",
          "Deuce is free. If that ever changes for anything, existing behaviour stays free and you will be told in advance.",
        ],
      },
      {
        heading: "Playing sport is your own risk",
        body: [
          "Tennis and padel carry a risk of injury, and meeting people carries the ordinary risks of meeting people. You play at your own risk and you are responsible for your own fitness, equipment and insurance.",
          "Deuce verifies that a player controls a Bocconi mailbox and shows you their record. It does not vet character, and it cannot guarantee anybody's conduct. Use the record, meet at the court, and report anything that is not right.",
          "Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or anything else that cannot be limited under Italian law.",
        ],
      },
      {
        heading: "Your content",
        body: [
          "What you write in a game thread and in your profile stays yours. You give Deuce permission to show it to the members who are meant to see it, and nothing more.",
          "Do not post anything unlawful, abusive, or that is not yours to post. We can remove content and suspend accounts under the community rules.",
          "Messages cannot be edited or deleted after they are sent, because a thread that can be rewritten is no use to a moderator reading a report about it.",
        ],
      },
      {
        heading: "Ending it",
        body: [
          "You can delete your account at any moment from Settings, with no exit interview.",
          "We can suspend or remove an account that breaks the community rules, or where we are required to. We will tell you why.",
        ],
      },
      {
        heading: "The boring necessities",
        body: [
          "These terms are governed by Italian law, and the courts of Milan have jurisdiction.",
          "If we change them in a way that matters, you will be told in the app before the change takes effect.",
          "If any part of this is unenforceable, the rest still stands.",
        ],
      },
    ],
  },
];

export function legalDoc(slug: string): LegalDoc | undefined {
  return LEGAL_DOCS.find((d) => d.slug === slug);
}
