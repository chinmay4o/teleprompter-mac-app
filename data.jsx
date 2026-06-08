/* global React */
// Script data + tokenizer + timing helpers for Cue.

// Cue markers: a line of the form [[Label]] becomes a jump point.
const DEFAULT_SCRIPTS = [
  {
    id: 'launch',
    title: 'Product launch — v3 announce',
    folder: 'YouTube',
    status: 'ready',
    favorite: true,
    updated: '2h ago',
    accent: 'lavender',
    body: `[[Cold open]]
Okay — three years ago we shipped a tiny app that did exactly one thing. Today it does that one thing better than anything else on the market, and I want to show you why.

[[The problem]]
Every creator I talk to says the same sentence: "I know what I want to say, I just freeze the second the light turns red." That freeze is expensive. It's the difference between one clean take and forty.

[[What's new]]
So in version three we rebuilt the whole reading engine around your voice. You don't chase a scroll bar anymore — the script waits for you. Pause to breathe, and it pauses with you. Land a punchline, and it holds the line until you move on.

[[The ask]]
The update is free for everyone, rolling out this week. If it saves you a single re-take, it's done its job. Hit record, read it once, and get back to making things.`,
  },
  {
    id: 'demo',
    title: 'Feature demo — voice sync walkthrough',
    folder: 'Tutorials',
    status: 'ready',
    favorite: false,
    updated: 'Yesterday',
    accent: 'sky',
    body: `[[Hook]]
Let me show you the one setting that changed how I record everything.

[[Setup]]
Open any script, switch the mode to Voice, and just start talking. Notice the prompter isn't moving on a timer — it's following the words coming out of my mouth right now, in real time.

[[Demo the pause]]
Watch what happens when I stop… and think for a second… and the line stays exactly where I left it. No scrambling back, no thumb on a remote.

[[Close]]
That's the whole trick. Read at your own pace, and let the page keep up with you instead of the other way around.`,
  },
  {
    id: 'lesson',
    title: 'Course lesson 04 — composition basics',
    folder: 'Course',
    status: 'draft',
    favorite: true,
    updated: '3 days ago',
    accent: 'sage',
    body: `[[Intro]]
Welcome back. In this lesson we're going to talk about why some shots feel calm and others feel tense — and it almost always comes down to where you put the edges.

[[Rule of thirds]]
Divide your frame into nine equal parts. The four points where those lines cross are where your eye wants to land. Put the important thing there, not dead center.

[[Negative space]]
Now here's the part people skip: the empty area is doing work too. Give your subject somewhere to look, somewhere to move into, and the whole frame starts to breathe.

[[Practice]]
Before next lesson, shoot ten frames of the same subject — five centered, five on a third. Look at them side by side. You'll feel the difference before you can explain it.`,
  },
  {
    id: 'adread',
    title: 'Podcast ad read — 60 seconds',
    folder: 'Podcast',
    status: 'ready',
    favorite: false,
    updated: '5 days ago',
    accent: 'peach',
    body: `[[Ad read]]
This episode is brought to you by the notebook I actually use. I've tried every app, every system, every color-coded nonsense — and I kept coming back to paper.

[[The pitch]]
It lies flat. It never needs charging. And it doesn't ping me while I'm trying to think. Use the code from the show notes and you'll get the starter set for the price of a coffee.

[[Tag]]
Okay — back to the episode.`,
  },
  {
    id: 'standup',
    title: 'Team all-hands — Q3 opening',
    folder: 'Work',
    status: 'draft',
    favorite: false,
    updated: 'Last week',
    accent: 'butter',
    body: `[[Open]]
Morning everyone. Before we get into numbers, I want to start with the thing I'm proudest of this quarter, and it isn't on a slide.

[[The win]]
We said we'd cut setup time in half. We cut it by sixty percent. That's not a metric — that's an hour back in every customer's day, every single day.

[[What's next]]
Next quarter is about depth, not breadth. Fewer new things, done properly. I'd rather ship three features people love than thirty they tolerate.`,
  },
  {
    id: 'vlog',
    title: 'Weekly vlog — intro segment',
    folder: 'YouTube',
    status: 'ready',
    favorite: false,
    updated: 'Just now',
    accent: 'rose',
    body: `[[Intro]]
Hey — welcome back to the channel. If you're new here, this is the place where we figure things out loud and occasionally get it right.

[[This week]]
This week got away from me in the best way, so the plan went out the window and we're just going to talk about what actually happened instead.

[[CTA]]
If that sounds like your kind of mess, the subscribe button is right there. Let's get into it.`,
  },
];

// Tokenize body into a flat list of tokens.
// types: 'word' (carries text + global word index), 'space', 'break', 'cue' (label + index)
function tokenize(body) {
  const lines = body.split('\n');
  const tokens = [];
  let wi = 0;
  const cues = [];
  let prevWasContent = false;
  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) return; // blank line ignored (paragraphs are explicit lines)
    const cueMatch = line.match(/^\[\[(.+)\]\]$/);
    if (cueMatch) {
      const ci = cues.length;
      cues.push({ label: cueMatch[1], wordIndex: wi, tokenIndex: tokens.length });
      tokens.push({ type: 'cue', label: cueMatch[1], cueIndex: ci, wordIndex: wi });
      prevWasContent = false;
      return;
    }
    if (prevWasContent) tokens.push({ type: 'break' });
    const words = line.split(/\s+/);
    words.forEach((w, i) => {
      tokens.push({ type: 'word', text: w, wi });
      wi += 1;
      if (i < words.length - 1) tokens.push({ type: 'space' });
    });
    prevWasContent = true;
  });
  return { tokens, totalWords: wi, cues };
}

function wordCount(body) {
  return tokenize(body).totalWords;
}

// Estimated read time string at a given words-per-minute.
function readTime(body, wpm = 130) {
  const w = wordCount(body);
  const secs = Math.round((w / wpm) * 60);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtTime(secs) {
  secs = Math.max(0, Math.round(secs));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

Object.assign(window, { DEFAULT_SCRIPTS, tokenize, wordCount, readTime, fmtTime });
