/**
 * Life Advicer — Google Apps Script backend.
 *
 * Serves the animated page (Index.html) and calls Claude Haiku 5.5 on the
 * server, so the Anthropic API key never reaches the browser.
 *
 * Setup: Project Settings > Script Properties > add ANTHROPIC_API_KEY.
 */

const MODEL = 'claude-haiku-5-5';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2026-10-21';

// Cap on "ask a question" calls per day across all visitors, to keep the bill predictable.
const DAILY_ASK_LIMIT = 300;

const STYLE_RULES =
  'Reply in 2-4 short sentences, under 70 words. Stay fully in character, be warm and kind, ' +
  'give one concrete thing the person can actually do. Plain text only: no markdown, no lists, no emoji spam ' +
  '(one emoji at most). Never give medical, legal, or financial instructions; for anything serious, gently ' +
  'suggest talking to a trusted person or a professional.';

const CHARACTERS = {
  sunny: {
    name: 'Sunny',
    persona: 'You are Sunny, a bouncy little sunbeam who gives upbeat advice about motivation, energy, and ' +
      'starting the day well. You are enthusiastic and love exclamation points (but not too many).',
    fallback: 'Hmm, a cloud drifted over my thoughts! Let\'s talk about something else, sunshine!'
  },
  mossy: {
    name: 'Mossy',
    persona: 'You are Mossy, a sleepy, gentle frog who lives on a lily pad. You give calm advice about ' +
      'mindfulness, slowing down, breathing, and noticing small things. You speak slowly and softly, ' +
      'and sometimes say "ribbit".',
    fallback: 'Ribbit... that one is too deep for my little pond. Ask me something else?'
  },
  pip: {
    name: 'Pip',
    persona: 'You are Pip, a sassy but loving cat. You give advice about self-care, rest, boundaries, and ' +
      'treating yourself kindly. You are a bit dramatic and cat-like, but always supportive underneath.',
    fallback: 'Mrow. I\'m going to pretend I didn\'t hear that and nap instead. Try another question!'
  },
  luna: {
    name: 'Luna',
    persona: 'You are Luna, a wise old night owl. You give thoughtful advice about reflection, relationships, ' +
      'sleep, and the bigger picture of life. You are poetic but clear, and occasionally say "hoo".',
    fallback: 'Hoo... the stars are quiet on that one. Ask me something else, little one.'
  },
  bolt: {
    name: 'Bolt',
    persona: 'You are Bolt, a cheerful little robot. You give practical advice about productivity, focus, ' +
      'habits, and getting things done. You occasionally make beep-boop noises and robot jokes.',
    fallback: 'BEEP. That query is outside my circuits. Please insert a different question!'
  }
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Life Advicer')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    // Required so Google Sites can embed the web app in an iframe.
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Same advice for everyone, once per character per day (cached in Script Properties). */
function getDailyAdvice(characterId) {
  const character = getCharacter_(characterId);
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'EEEE, MMMM d, yyyy');
  const props = PropertiesService.getScriptProperties();
  const key = 'daily_' + characterId;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const cached = props.getProperty(key);
    if (cached) {
      const entry = JSON.parse(cached);
      if (entry.date === today) return entry.text;
    }
    const text = callClaude_(character,
      'Today is ' + today + '. Give me your one piece of advice for today. ' +
      'Make it feel fresh and specific to this day (season, day of the week, etc).');
    props.setProperty(key, JSON.stringify({ date: today, text: text }));
    return text;
  } finally {
    lock.releaseLock();
  }
}

/** Personal question for a character. */
function askCharacter(characterId, question) {
  const character = getCharacter_(characterId);
  const q = String(question || '').trim().slice(0, 500);
  if (!q) throw new Error('Type a question first!');
  checkDailyQuota_();
  return callClaude_(character, q);
}

function getCharacter_(characterId) {
  const character = CHARACTERS[characterId];
  if (!character) throw new Error('Unknown character.');
  return character;
}

function checkDailyQuota_() {
  const key = 'asks_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const count = Number(cache.get(key) || 0);
    if (count >= DAILY_ASK_LIMIT) {
      throw new Error('The advice crew is all talked out for today. Come back tomorrow!');
    }
    cache.put(key, String(count + 1), 21600);
  } finally {
    lock.releaseLock();
  }
}

function callClaude_(character, userText) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('No API key yet. Add ANTHROPIC_API_KEY in Project Settings > Script Properties.');
  }

  const response = UrlFetchApp.fetch(API_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION
    },
    payload: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: 'low' },
      system: character.persona + '\n\n' + STYLE_RULES,
      messages: [{ role: 'user', content: userText }]
    }),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const body = JSON.parse(response.getContentText());

  if (status !== 200) {
    console.error('Claude API error', status, response.getContentText());
    if (status === 429 || status === 529) {
      throw new Error(character.name + ' is a little overwhelmed right now. Try again in a moment!');
    }
    throw new Error(character.name + ' couldn\'t think of anything (error ' + status + ').');
  }

  if (body.stop_reason === 'refusal') return character.fallback;

  const text = body.content
    .filter(function (block) { return block.type === 'text'; })
    .map(function (block) { return block.text; })
    .join('')
    .trim();

  return text || character.fallback;
}

/** Run this once from the editor: it asks for permissions and checks that your API key works. */
function testSetup() {
  console.log(askCharacter('sunny', 'Say hi and give me one tiny tip for today.'));
}
